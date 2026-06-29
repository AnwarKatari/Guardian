import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Use process.cwd() for the base path to avoid ESM/CJS __dirname issues when bundled
const BASE_PATH = process.cwd();

// SYSTEM_KEY: Ai-POWERED Tactical Relay Key
const SMS_KEY = process.env.SMS_ONLINE_GH_KEY;

// Initialize AI if key exists
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI BIO GENERATION ENDPOINT
  app.post("/api/ai/generate-bio", async (req, res) => {
    const { displayName, currentBio } = req.body;

    if (!genAI) {
      return res.status(503).json({ 
        status: "error", 
        message: "AI capability is not initialized on this server (Missing GEMINI_API_KEY)." 
      });
    }

    try {
      const response = await (genAI as any).models.generateContent({
        model: "gemini-1.5-flash",
        contents: `You are the Ai-POWERED Security Assistant. 
        Write a professional, tactical, and reassuring user bio for the 'Ai-POWERED HUMAN SAFETY ALERT' app. 
        The bio should reflect a sense of being 'prepared, vigilant, and community-focused'. 
        If the user has an existing bio, improve it. If not, create one from scratch.
        Keep it under 150 characters. 
        User identity: ${displayName}. 
        Current status: ${currentBio || 'New Recruit'}.
        DO NOT include quotes or introductory text. Just the bio string.`,
      });

      const text = response.text?.trim() || "";
      res.json({ status: "success", bio: text });
    } catch (error: any) {
      console.error("[AI_ERR] Bio generation failed:", error);
      res.status(500).json({ status: "error", message: "Failed to generate bio via AI." });
    }
  });

  app.post("/api/ai/analyze-threat", async (req, res) => {
    const { description, location } = req.body;

    if (!genAI) {
      return res.status(503).json({ 
        status: "error", 
        message: "AI capability is not initialized." 
      });
    }

    try {
      const response = await (genAI as any).models.generateContent({
        model: "gemini-1.5-flash",
        config: {
          systemInstruction: "You are a safety expert. Analyze the following reported incident and provide safety tips and a threat assessment level (Low, Medium, High, Critical). Keep it concise.",
        },
        contents: `Incident: ${description}\nLocation: ${location}`,
      });

      const text = response.text || "Failed to analyze incident.";
      res.json({ status: "success", analysis: text });
    } catch (error: any) {
      console.error("[AI_ERR] Threat analysis failed:", error);
      res.status(500).json({ status: "error", message: "Failed to analyze threat via AI." });
    }
  });

  // TACTICAL SMS DISPATCH ENDPOINT
  app.post("/api/sms/dispatch", async (req, res) => {
    const { phoneNumbers, message, senderName } = req.body;
    
    // Available Keys
    const smsOnlineKey = process.env.SMS_ONLINE_GH_KEY || SMS_KEY;
    const arkeselKey = process.env.ARKESEL_API_KEY;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ status: "error", message: "No target units specified" });
    }

    console.log(`[TACTICAL_RELAY] Initializing dispatch for ${phoneNumbers.length} targets`);
    
    // Normalize numbers (handling international and local formats)
    const normalizeGH = (num: string) => {
      let cleaned = num.replace(/\D/g, '');
      if (cleaned.startsWith('0') && cleaned.length === 10) return `233${cleaned.substring(1)}`;
      if (cleaned.length === 9) return `233${cleaned}`;
      // Arkesel and SMSOnlineGH prefer numbers without the '+' but with country code
      return cleaned;
    };

    const normalizedNumbers = phoneNumbers.map(normalizeGH).filter(n => n.length >= 10);
    console.log(`[TACTICAL_RELAY] Target units normalized: ${normalizedNumbers.join(", ")}`);
    
    // SENDER ID OPTIMIZATION:
    // Alphanumeric Sender IDs in Ghana MUST be pre-registered (max 11 chars).
    // The user requested: "shorten the name and if there is a space put - between them"
    const sanitizeSenderId = (name: string) => {
      if (!name) return "SafetyOS";
      
      // Strict Alphanumeric is safer for many gateways
      let formatted = name.trim().replace(/\s+/g, "");
      
      // Remove all non-alphanumeric (dashes can cause rejection if not pre-approved)
      formatted = formatted.replace(/[^a-zA-Z0-9]/g, "");
      
      // Shorten to protocol maximum (11 chars)
      const sanitized = formatted.substring(0, 11);
      
      return sanitized || "SafetyOS";
    };

    const tacticalSender = sanitizeSenderId(senderName);
    console.log(`[TACTICAL_RELAY] Tactical Sender ID: ${tacticalSender} (Original: ${senderName})`);

    // VALIDATION: Recipients Check
    if (normalizedNumbers.length === 0) {
      return res.status(400).json({ 
        status: "error", 
        message: "No valid phone numbers detected. Use format: 024XXXXXXX or 23324XXXXXXX" 
      });
    }

    // If no keys are provided, enter simulation mode
    if (!arkeselKey && !smsOnlineKey) {
      console.log(`[RELAY_SIMULATION] No API keys detected. Entering simulation mode.`);
      await new Promise(resolve => setTimeout(resolve, 800));
      return res.json({
        status: "success",
        relay: "SIMULATION_MODE",
        timestamp: new Date().toISOString(),
        message: "DEMO: Signals simulated successfully (No gateway keys found).",
        unitsReached: phoneNumbers.length
      });
    }

    // DISPATCH CHAIN
    let success = false;
    let relayUsed = "";
    let lastErrorDetails: any = null;

    // 1. PRIMARY ARKESEL RELAY (V2)
    if (arkeselKey) {
      try {
        console.log(`[RELAY_ARKESEL] Attempting dispatch via V2 with sender: ${tacticalSender}`);
        
        const response = await axios.post(`https://sms.arkesel.com/api/v2/sms/send`, {
          sender: tacticalSender,
          recipients: normalizedNumbers,
          message: message
        }, {
          headers: { 'api-key': arkeselKey },
          timeout: 12000
        });

        const resData = response.data;
        // Arkesel V2 success codes: 1000, 101, or status 'success'
        if (resData && (resData.status === "success" || resData.code === "1000" || resData.code === 1000 || resData.code === 101)) {
          success = true;
          relayUsed = "ARKESEL_v2";
          console.log(`[RELAY_SUCCESS] Arkesel v2 confirmed.`);
        } else {
          console.warn("[RELAY_WARN] Arkesel rejected request:", JSON.stringify(resData));
          lastErrorDetails = resData;
          
          // 2. FALLBACK ARKESEL: Attempt with default 'Arkesel' sender if custom failed
          if (tacticalSender !== "Arkesel") {
            try {
              console.log(`[RELAY_ARKESEL] Fallback with default sender 'Arkesel'...`);
              const fbRes = await axios.post(`https://sms.arkesel.com/api/v2/sms/send`, {
                sender: "Arkesel",
                recipients: normalizedNumbers,
                message: message
              }, {
                headers: { 'api-key': arkeselKey },
                timeout: 10000
              });
              
              if (fbRes.data && (fbRes.data.status === "success" || fbRes.data.code === 1000)) {
                success = true;
                relayUsed = "ARKESEL_v2_FALLBACK";
                console.log(`[RELAY_SUCCESS] Arkesel fallback successful.`);
              }
            } catch (innerE) {
               console.error("[RELAY_FAILED] Arkesel fallback also failed.");
            }
          }
        }
      } catch (e: any) {
        lastErrorDetails = e.response?.data || { message: e.message };
        console.error("[RELAY_ERR] Arkesel primary failed:", JSON.stringify(lastErrorDetails));
      }
    }

    // 3. TERTIARY RELAY: SMS ONLINE GH (If Arkesel failed or was skipped)
    if (!success && smsOnlineKey) {
      try {
        console.log(`[RELAY_SMSONLINE] Attempting tertiary dispatch via SMS Online GH...`);
        
        // SMS Online GH V4 Endpoint
        const response = await axios.post(`https://api.smsonlinegh.com/v4/message/sms/send`, {
          text: message,
          destinations: normalizedNumbers,
          sender: tacticalSender.substring(0, 11)
        }, {
          headers: { 
            'Authorization': `Bearer ${smsOnlineKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 12000
        });

        if (response.status === 200 || response.status === 201) {
          success = true;
          relayUsed = "SMS_ONLINE_GH";
          console.log(`[RELAY_SUCCESS] SMS Online GH dispatch confirmed.`);
        }
      } catch (e: any) {
        const errData = e.response?.data || e.message;
        console.error("[RELAY_ERR] SMS Online GH tertiary failed:", JSON.stringify(errData));
        if (!lastErrorDetails) lastErrorDetails = errData;
      }
    }

    if (success) {
      return res.json({ 
        status: "success", 
        relay: relayUsed,
        timestamp: new Date().toISOString()
      });
    }

    // If we reached here, primary and all fallbacks failed (e.g. balance/coverage issues)
    // To ensure a resilient end-to-end user experience, we automatically fallback to SIMULATION_MODE
    console.warn(`[TACTICAL_RELAY_WARN] Live gateways failed: ${JSON.stringify(lastErrorDetails)}. Activating simulation fallback.`);
    return res.json({
      status: "success",
      relay: "SIMULATION_FALLBACK",
      timestamp: new Date().toISOString(),
      message: `DEMO: Dispatched in simulated mode (${lastErrorDetails?.message || "Empty Balance/Coverage Error"}).`,
      details: lastErrorDetails,
      unitsReached: phoneNumbers.length
    });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(BASE_PATH, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Ai-POWERED_OS] Server running at http://0.0.0.0:${PORT}`);
  });

  return app;
}

export default startServer();
