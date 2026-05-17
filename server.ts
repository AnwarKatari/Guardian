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
      return cleaned;
    };

    const normalizedNumbers = phoneNumbers.map(normalizeGH);
    console.log(`[TACTICAL_RELAY] Target units normalized: ${normalizedNumbers.join(", ")}`);
    
    // SENDER ID OPTIMIZATION:
    // Alphanumeric Sender IDs in Ghana MUST be pre-registered (max 11 chars).
    // The user requested: "shorten the name and if there is a space put - between them"
    const sanitizeSenderId = (name: string) => {
      if (!name) return "Arkesel";
      
      // User Custom Logic: Replace spaces with '-'
      let formatted = name.trim().replace(/\s+/g, "-");
      
      // Remove restricted characters (Ghana NCA allows alphanumeric + some symbols occasionally but '-' is safe)
      formatted = formatted.replace(/[^a-zA-Z0-9-]/g, "");
      
      // Shorten to protocol maximum (11 chars)
      const sanitized = formatted.substring(0, 11);
      
      // Ensure we don't end with a trailing dash which can look like a truncation error
      const finalSender = sanitized.endsWith("-") ? sanitized.slice(0, -1) : sanitized;
      
      return finalSender || "Arkesel";
    };

    const tacticalSender = sanitizeSenderId(senderName);
    console.log(`[TACTICAL_RELAY] Final Sender ID: ${tacticalSender} (Original: ${senderName})`);

    // VALIDATION: Recipients Check
    if (normalizedNumbers.length === 0) {
      return res.status(400).json({ 
        status: "error", 
        message: "No valid phone numbers detected in your emergency circle. Please add contacts with country codes." 
      });
    }

    // If no Arkesel key is provided, enter simulation mode
    if (!arkeselKey) {
      console.log(`[RELAY_SIMULATION] No ARKESEL_API_KEY detected. Entering simulation mode.`);
      await new Promise(resolve => setTimeout(resolve, 800));
      return res.json({
        status: "success",
        relay: "SIMULATION_MODE",
        timestamp: new Date().toISOString(),
        message: "DEMO (Arkesel Missing): Signal simulated successfully.",
        unitsReached: phoneNumbers.length
      });
    }

    // DISPATCH CHAIN
    let success = false;
    let relayUsed = "";
    let lastError = null;

    // 1. PRIMARY ARKESEL RELAY
    try {
      console.log(`[RELAY] Attempting Arkesel v2 dispatch with sender: ${tacticalSender}`);
      
      const response = await axios.post(`https://sms.arkesel.com/api/v2/sms/send`, {
        sender: tacticalSender,
        recipients: normalizedNumbers,
        message: message
      }, {
        headers: { 'api-key': arkeselKey },
        timeout: 15000 // Increased timeout for reliability
      });

      // Arkesel returns 201 for success usually, or code 101 for successful dispatch in some v2 versions
      // They also return status: 'success'
      const resData = response.data;
      if (resData && (resData.status === "success" || resData.code === "1000" || resData.code === 1000 || resData.code === 101 || response.status === 201)) {
        success = true;
        relayUsed = "ARKESEL_v2";
        console.log(`[RELAY_SUCCESS] Arkesel v2 dispatch confirmed: ${JSON.stringify(resData)}`);
      } else {
        console.warn("[RELAY_WARN] Arkesel rejected request:", resData);
        const errorCode = resData?.code || resData?.status || "UNKNOWN";
        const errorMsg = resData?.message || resData?.error || "No specific error message from gateway.";
        
        lastError = `Arkesel rejection (${errorCode}): ${errorMsg}`;
        
        if (errorCode === "1005" || errorCode === 1005 || errorMsg.includes("Sender ID")) {
          lastError += " | Action: Register Sender ID with Arkesel.";
        }
      }
    } catch (e: any) {
      const errorData = e.response?.data;
      const errorStatus = e.response?.status;
      console.error("[RELAY_ERR] Arkesel primary failed:", errorData || e.message);
      
      lastError = errorData ? 
        `Gateway Error (${errorStatus}): ${JSON.stringify(errorData)}` : 
        `Network/Internal Error: ${e.message}`;
    }

    // 2. FALLBACK RELAY: Attempt with default 'Arkesel' sender ID if the first failed and was custom
    if (!success && tacticalSender !== "Arkesel") {
      try {
        console.log(`[RELAY_FALLBACK] Attempting Arkesel v2 dispatch with default sender: Arkesel`);
        
        const fallbackResponse = await axios.post(`https://sms.arkesel.com/api/v2/sms/send`, {
          sender: "Arkesel",
          recipients: normalizedNumbers,
          message: message
        }, {
          headers: { 'api-key': arkeselKey },
          timeout: 15000
        });

        const fbData = fallbackResponse.data;
        if (fbData && (fbData.status === "success" || fbData.code === "1000" || fbData.code === 1000 || fbData.code === 101 || fallbackResponse.status === 201)) {
          success = true;
          relayUsed = "ARKESEL_v2_FALLBACK";
          console.log(`[RELAY_SUCCESS] Arkesel fallback successful.`);
        } else {
          console.error("[RELAY_FALLBACK_ERR] Fallback gateway rejection:", fbData);
        }
      } catch (fallbackError: any) {
        console.error("[RELAY_FALLBACK_ERR] Fallback failed:", fallbackError.response?.data || fallbackError.message);
      }
    }

    if (success) {
      console.log(`[RELAY_SUCCESS] Dispatched via ${relayUsed}`);
      return res.json({ 
        status: "success", 
        relay: relayUsed,
        timestamp: new Date().toISOString()
      });
    }

    // If we reached here, everything failed
    res.status(500).json({ 
      status: "error", 
      error: "RELAY_NETWORK_FAILURE",
      message: "Arkesel gateway failed or is not authorized. Check if Sender ID is registered.",
      lastError
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
}

startServer();
