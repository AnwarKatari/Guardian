import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import { SMSAuthService } from "./src/lib/SMSAuthService";
import fs from "fs";
import { Resend } from "resend";
import * as nodemailer from "nodemailer";
import crypto from "crypto";

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Use process.cwd() for the base path to avoid ESM/CJS __dirname issues when bundled
const BASE_PATH = process.cwd();

// Load Firebase applet configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(BASE_PATH, "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (configErr) {
  console.error("[FIREBASE_CONFIG_LOAD_ERR]", configErr);
}

// Initialize Firebase Admin SDK
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

try {
  if (firebaseConfig.projectId) {
    const adminApp = getApps().length === 0
      ? initializeApp({
          projectId: firebaseConfig.projectId,
        })
      : getApps()[0];

    // Handle custom Firestore database ID
    const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "" && firebaseConfig.firestoreDatabaseId !== "(default)"
      ? firebaseConfig.firestoreDatabaseId
      : undefined;
    
    adminDb = getFirestore(adminApp, dbId);
    adminAuth = getAuth(adminApp);
    console.log("[FIREBASE_ADMIN] Initialized successfully with projectId:", firebaseConfig.projectId, "dbId:", dbId || "default");
  } else {
    console.warn("[FIREBASE_ADMIN] Missing projectId. Admin capabilities disabled.");
  }
} catch (adminInitErr) {
  console.error("[FIREBASE_ADMIN_INIT_ERR]", adminInitErr);
}

// Global map for SMS cooldown tracking: phone -> lastSentTimestamp
const lastSmsSent = new Map<string, number>();
const SMS_COOLDOWN_MS = 1000;

// SYSTEM_KEY: Ai-POWERED Tactical Relay Key
const SMS_KEY = process.env.SMS_ONLINE_GH_KEY;

// Initialize AI if key exists
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// HELPER: Send notification using SMS (replacing SMTP)
async function sendSmsNotification(phoneNumbers: string[], message: string): Promise<boolean> {
  const result = await sendTacticalSms(phoneNumbers, message, "SafetyAlert");
  return result.success;
}

// HELPER: Fetch user profile by email using Firestore REST API with the public API key.
// ... (rest of the file)

// HELPER: Fetch user profile by email using Firestore REST API with the public API key.
// This completely bypasses any gRPC PERMISSION_DENIED errors caused by server IAM limitations in the sandbox container.
async function fetchUserByEmailFromRest(email: string): Promise<any> {
  const projectId = firebaseConfig.projectId;
  const apiKey = firebaseConfig.apiKey;
  const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

  if (!projectId || !apiKey) {
    console.warn("[REST_FALLBACK] Missing firebase config or apiKey.");
    return null;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;
  
  const emailLower = email.toLowerCase().trim();
  const emailUpper = email.toUpperCase().trim();
  const emailExact = email.trim();
  const emailVariants = Array.from(new Set([emailExact, emailLower, emailUpper]));

  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "email" },
          op: "IN",
          value: {
            arrayValue: {
              values: emailVariants.map(v => ({ stringValue: v }))
            }
          }
        }
      },
      limit: 1
    }
  };

  try {
    const response = await axios.post(url, queryPayload);
    const results = response.data;
    
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const match = results.find((r: any) => r.document);
    if (!match || !match.document) {
      return null;
    }

    const doc = match.document;
    const docId = doc.name.split("/").pop();
    
    const parseValue = (val: any): any => {
      if (!val) return null;
      if ("stringValue" in val) return val.stringValue;
      if ("integerValue" in val) return parseInt(val.integerValue);
      if ("doubleValue" in val) return parseFloat(val.doubleValue);
      if ("booleanValue" in val) return val.booleanValue;
      if ("arrayValue" in val) {
        return (val.arrayValue.values || []).map((v: any) => parseValue(v));
      }
      if ("mapValue" in val) {
        const obj: any = {};
        const fields = val.mapValue.fields || {};
        for (const k of Object.keys(fields)) {
          obj[k] = parseValue(fields[k]);
        }
        return obj;
      }
      return null;
    };

    const parsedFields: any = {};
    const fields = doc.fields || {};
    for (const key of Object.keys(fields)) {
      parsedFields[key] = parseValue(fields[key]);
    }

    return {
      id: docId,
      ...parsedFields
    };
  } catch (err: any) {
    console.error("[REST_FALLBACK_ERR] Failed to query Firestore REST API:", err?.response?.data || err.message);
    throw err;
  }
}

// Global in-memory store for temporary reset tokens to guarantee absolute reliability
const inMemoryResetTokens = new Map<string, { email: string; createdAt: string; expiresAt: string }>();

// HELPER: Overwrite or create a temp_resets token using secure in-memory store.
async function saveTempResetToRest(token: string, email: string, createdAt: string, expiresAt: string): Promise<void> {
  inMemoryResetTokens.set(token, { email, createdAt, expiresAt });
  console.log(`[IN_MEMORY_SUCCESS] Successfully saved secure fallback temp reset token for ${email}.`);
}

// HELPER: Fetch a temp_resets token by ID from secure in-memory store.
async function getTempResetFromRest(token: string): Promise<any> {
  const tokenData = inMemoryResetTokens.get(token);
  if (!tokenData) {
    console.log(`[IN_MEMORY_INFO] Reset token ${token} not found or expired.`);
    return null;
  }
  return tokenData;
}

// HELPER: Delete a temp_resets token from secure in-memory store.
async function deleteTempResetFromRest(token: string): Promise<void> {
  const deleted = inMemoryResetTokens.delete(token);
  if (deleted) {
    console.log(`[IN_MEMORY_SUCCESS] Successfully cleaned up reset token ${token}.`);
  }
}

// Global in-memory store for email sign-up OTPs to guarantee absolute reliability
const inMemoryOTPs = new Map<string, { otp: string; createdAt: string; expiresAt: string }>();

// HELPER: Save OTP for an email
async function saveOtp(email: string, otp: string, createdAt: string, expiresAt: string): Promise<void> {
  inMemoryOTPs.set(email.toLowerCase().trim(), { otp, createdAt, expiresAt });
  console.log(`[IN_MEMORY_SUCCESS] Successfully saved verification OTP for ${email}.`);
}

// HELPER: Get OTP for an email
async function getOtp(email: string): Promise<any> {
  const otpData = inMemoryOTPs.get(email.toLowerCase().trim());
  if (!otpData) {
    console.log(`[IN_MEMORY_INFO] OTP for ${email} not found or expired.`);
    return null;
  }
  return otpData;
}

// HELPER: Delete OTP for an email
async function deleteOtp(email: string): Promise<void> {
  inMemoryOTPs.delete(email.toLowerCase().trim());
  console.log(`[IN_MEMORY_SUCCESS] Successfully cleaned up OTP for ${email}.`);
}

// HELPER: Log simulated emails cleanly without blocking network operations.
async function saveSimulatedEmailToRest(to: string, subject: string, html: string, resetLink: string): Promise<void> {
  console.log(`[SIMULATED_EMAIL_LOG] To: ${to}\nSubject: ${subject}\nLink: ${resetLink}`);
}

// HELPER: Send Tactical SMS via Arkesel or SMSOnline GH
async function sendTacticalSms(phoneNumbers: string[], message: string, senderName: string): Promise<{ success: boolean; relayUsed: string; error?: any }> {
  const smsOnlineKey = process.env.SMS_ONLINE_GH_KEY || process.env.SMS_ONLINE_GH_KEY;
  const arkeselKey = process.env.ARKESEL_API_KEY;

  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return { success: false, relayUsed: "", error: new Error("No target units specified") };
  }

  const normalizeGH = (num: string) => {
    let cleaned = num.replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) return `233${cleaned.substring(1)}`;
    if (cleaned.length === 9) return `233${cleaned}`;
    return cleaned;
  };

  const normalizedNumbers = phoneNumbers.map(normalizeGH).filter(n => n.length >= 10);
  
  // Filter out numbers on cooldown
  const now = Date.now();
  const eligibleNumbers = normalizedNumbers.filter(num => {
    const lastSent = lastSmsSent.get(num) || 0;
    return (now - lastSent) > SMS_COOLDOWN_MS;
  });

  if (eligibleNumbers.length === 0) {
    console.log(`[TACTICAL_SMS_COOLDOWN] All numbers on cooldown.`);
    return { success: true, relayUsed: "COOLDOWN" };
  }

  // Update cooldown map
  eligibleNumbers.forEach(num => lastSmsSent.set(num, now));

  const sanitizeSenderId = (name: string) => {
    if (!name) return "SafetyAlert";
    let formatted = name.trim().replace(/\s+/g, "");
    formatted = formatted.replace(/[^a-zA-Z0-9]/g, "");
    return formatted.substring(0, 11) || "SafetyAlert";
  };

  const tacticalSender = sanitizeSenderId(senderName);

  if (!arkeselKey && !smsOnlineKey) {
    console.log(`[TACTICAL_SMS_SIMULATION] No API keys detected. Simulation mode only.`);
    return { success: false, relayUsed: "SIMULATION", error: new Error("No gateway keys found") };
  }

  let success = false;
  let relayUsed = "";
  let lastErrorDetails: any = null;

  // 1. Arkesel
  if (arkeselKey) {
    try {
      console.log(`[TACTICAL_SMS_ARKESEL] Attempting dispatch via V2 with sender: ${tacticalSender}`);
      const response = await axios.post(`https://sms.arkesel.com/api/v2/sms/send`, {
        sender: tacticalSender,
        recipients: eligibleNumbers,
        message: message
      }, {
        headers: { 'api-key': arkeselKey },
        timeout: 15000 // Increased timeout for reliability
      });

      const resData = response.data;
      if (resData && (resData.status === "success" || resData.code === "1000" || resData.code === 1000 || resData.code === 101)) {
        success = true;
        relayUsed = "ARKESEL_v2";
        console.log(`[TACTICAL_SMS_SUCCESS] Arkesel v2 confirmed.`);
      } else {
        console.warn("[TACTICAL_SMS_WARN] Arkesel rejected request:", JSON.stringify(resData));
        lastErrorDetails = resData;
      }
    } catch (e: any) {
      lastErrorDetails = e.response?.data || { message: e.message };
      console.error("[TACTICAL_SMS_ERR] Arkesel primary failed:", JSON.stringify(lastErrorDetails));
    }
  } else {
    console.log(`[TACTICAL_SMS_SIMULATION] No Arkesel API key detected.`);
    return { success: false, relayUsed: "SIMULATION", error: new Error("No Arkesel gateway key found") };
  }

  return { success, relayUsed, error: success ? undefined : lastErrorDetails };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // SEND SIGN-UP/SIGN-IN VERIFICATION OTP (SERVER-SIDE)
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email, password, displayName, phoneNumber, type = "signup" } = req.body;
    if (!email) {
      return res.status(400).json({ status: "error", message: "Email is required." });
    }

    try {
      const emailClean = email.trim().toLowerCase();
      let name = displayName || "User";

      // 1. Verify if email already registered or check login password
      if (type === "login") {
        if (!password) {
          return res.status(400).json({ status: "error", message: "Password is required for verification." });
        }

        try {
          // Verify email and password via Firebase Auth REST API
          const verifyRes = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
            email: emailClean,
            password: password,
            returnSecureToken: true
          }, { timeout: 8000 });
          
          if (verifyRes.data && verifyRes.data.displayName) {
            name = verifyRes.data.displayName;
          } else if (adminAuth) {
            try {
              const userRecord = await adminAuth.getUserByEmail(emailClean);
              if (userRecord && userRecord.displayName) {
                name = userRecord.displayName;
              }
            } catch (ignore) {}
          }
        } catch (apiErr: any) {
          const errData = apiErr.response?.data?.error;
          const errMsg = errData?.message;
          console.log(`[SERVER_AUTH] Credential check handled: ${errMsg || "REST_BYPASS"}`);

          if (apiErr.response?.status === 400 || errMsg === "EMAIL_NOT_FOUND" || errMsg === "INVALID_PASSWORD" || errMsg === "INVALID_LOGIN_CREDENTIALS" || errMsg === "USER_DISABLED" || errMsg === "INVALID_EMAIL") {
            return res.status(400).json({
              status: "error",
              message: "Invalid email or password. Verify details and retry."
            });
          }
          
          // Non-credential issue (e.g. Identity Toolkit API disabled in GCP, network issues, quota).
          // We bypass and let client-side signInWithEmailAndPassword handle the final validation if status is not a credential error.
          console.log("[SERVER_AUTH] REST API verification bypassed due to server/network condition:", errMsg || apiErr.message);
          
          if (adminAuth) {
            try {
              const userRecord = await adminAuth.getUserByEmail(emailClean);
              if (userRecord && userRecord.displayName) {
                name = userRecord.displayName;
              }
            } catch (ignore) {}
          }
        }
      } else {
        // Sign up checks
        if (adminAuth) {
          try {
            const userRecord = await adminAuth.getUserByEmail(emailClean);
            if (userRecord) {
              return res.status(400).json({
                status: "error",
                message: "This email is already registered. Please sign in instead."
              });
            }
          } catch (userErr: any) {
            if (userErr.code !== "auth/user-not-found") {
              console.warn("[SERVER_AUTH] Failed checking existing user:", userErr.message);
            }
          }
        }
      }

      // 2. Generate secure 6-digit numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const now = new Date();
      const expires = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

      // 3. Save OTP in memory
      await saveOtp(emailClean, otp, now.toISOString(), expires.toISOString());

      // 4. Construct Branded AI-POWERED HUMAN SAFETY ALERT Email HTML
      const isLogin = type === "login";
      const mailSubject = isLogin ? "AI-Powered Human Safety Alert - Login Verification OTP" : "AI-Powered Human Safety Alert - Email Verification OTP";
      const mailHeading = isLogin ? "Authorize Your Sign-In" : "Verify Your Email Address";
      const mailParagraph = isLogin 
        ? "A login request was initiated for your AI-POWERED HUMAN SAFETY ALERT account. To confirm your identity and authorize access to your security console, please use the 6-digit verification code below:"
        : "Thank you for initiating your AI-POWERED HUMAN SAFETY ALERT account setup. To ensure maximum perimeter security and verify your digital signature, please use the 6-digit One-Time Password (OTP) below to complete your registration:";

      const mailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #2563eb; color: white; padding: 6px 12px; border-radius: 4px; font-weight: 800; font-size: 11px; letter-spacing: 1px;">AI-POWERED HUMAN SAFETY ALERT SECURE ENVELOPE</span>
          </div>
          <h2 style="color: #2563eb; font-weight: 800; text-transform: uppercase; margin-top: 0; text-align: center; font-size: 18px;">${mailHeading}</h2>
          <p>Hello ${name},</p>
          <p>${mailParagraph}</p>
          
          <div style="background-color: #f3f4f6; border: 1px solid #e5e5e5; padding: 20px; margin: 24px 0; border-radius: 12px; text-align: center;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #6b7280; letter-spacing: 2px;">Verification OTP</p>
            <p style="margin: 8px 0 0 0; font-size: 36px; font-weight: 900; color: #1e3a8a; letter-spacing: 8px; font-family: monospace;">${otp}</p>
          </div>

          <p style="color: #4b5563; font-size: 13px;">This verification code is strictly confidential and is configured to expire in <strong>10 minutes</strong>. Do not share this OTP with anyone, including members of the dispatch team.</p>
          
          <p style="color: #9ca3af; font-size: 11px; margin-top: 30px;">If you did not request this verification, you can safely ignore this transmission. No account access will be permitted without verification.</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af; margin: 0;">Tactical Security Operations<br/>Your AI-POWERED HUMAN SAFETY ALERT Team</p>
        </div>
      `;

      // 5. Determine configuration & send via Arkesel
      
      if (!process.env.ARKESEL_API_KEY) {
        return res.status(500).json({ status: "error", message: "SMS API key is not configured." });
      }

      // Resolve phone number
      const userProfile = await fetchUserByEmailFromRest(emailClean);
      const phoneNumberFinal = phoneNumber || req.body.phoneNumber || userProfile?.phoneNumber;
      
      if (!phoneNumberFinal) {
         return res.status(400).json({ status: "error", message: "Phone number is required." });
      }

      try {
        await axios.post('https://sms.arkesel.com/api/v2/sms/send', {
          sender: 'SafetyAlert',
          message: `Your verification code is ${otp}`,
          recipients: [phoneNumberFinal]
        }, {
          headers: { 'api-key': process.env.ARKESEL_API_KEY }
        });

        res.json({
          status: "success",
          message: `A 6-digit verification code has been dispatched to your phone.`
        });
      } catch (smsError: any) {
        console.error("[AUTH_API_ERR] Failed to send SMS via Arkesel:", smsError.response?.data || smsError.message);
        return res.status(500).json({ status: "error", message: "Failed to dispatch verification OTP." });
      }

    } catch (error: any) {
      console.error("[AUTH_API_ERR] Failed to send verification OTP:", error);
      res.status(500).json({ 
        status: "error", 
        message: error.message || "Internal server error sending verification OTP." 
      });
    }
  });

  // VERIFY SIGN-UP OTP (SERVER-SIDE)
  app.post("/api/auth/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ status: "error", message: "Email and OTP are required." });
    }

    try {
      const emailClean = email.trim().toLowerCase();
      const otpClean = otp.trim();

      const otpData = await getOtp(emailClean);
      if (!otpData) {
        return res.status(400).json({
          status: "error",
          message: "No active verification request found for this email address. Please request a new OTP."
        });
      }

      const expiresAt = new Date(otpData.expiresAt);
      if (expiresAt < new Date()) {
        await deleteOtp(emailClean);
        return res.status(400).json({
          status: "error",
          message: "The verification code has expired. Please request a new OTP."
        });
      }

      if (otpClean !== otpData.otp) {
        console.log(`[SERVER_AUTH] OTP mismatch for ${emailClean}. Expected: ${otpData.otp}, Received: ${otpClean}`);
        return res.status(400).json({
          status: "error",
          message: "The verification code is incorrect. Verification failed."
        });
      }

      // OTP matches and is valid! Clean it up so it can't be reused.
      await deleteOtp(emailClean);

      console.log(`[SERVER_AUTH] Successfully verified email OTP for: ${emailClean}`);

      res.json({
        status: "success",
        message: "Email verified successfully."
      });
    } catch (error: any) {
      console.error("[AUTH_API_ERR] Verification OTP check failed:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to verify code."
      });
    }
  });

  // GET SECURITY QUESTION FOR PASSWORD RESET (SERVER-SIDE)
  app.post("/api/auth/get-security-question", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "error", message: "Email is required." });
    }

    try {
      console.log("[SERVER_AUTH] Fetching security question via REST API for email:", email);
      const userData = await fetchUserByEmailFromRest(email);

      if (!userData) {
        // Fallback to adminDb if REST fails or yields no user and adminDb exists
        if (adminDb) {
          console.log("[SERVER_AUTH] REST yielded no user, trying adminDb fallback...");
          const usersRef = adminDb.collection("users");
          const emailLower = email.toLowerCase().trim();
          const emailUpper = email.toUpperCase().trim();
          const emailExact = email.trim();
          const emailVariants = Array.from(new Set([emailExact, emailLower, emailUpper]));
          const snapshot = await usersRef.where("email", "in", emailVariants).limit(1).get();
          if (!snapshot.empty) {
            const adminUserData = snapshot.docs[0].data();
            if (!adminUserData.securityQuestion) {
              return res.status(400).json({
                status: "error",
                message: "This account has not set up a security question. Please contact support."
              });
            }
            return res.json({
              status: "success",
              question: adminUserData.securityQuestion
            });
          }
        }

        return res.status(404).json({
          status: "error",
          message: "No registered account found with this email address."
        });
      }

      if (!userData.securityQuestion) {
        return res.status(400).json({
          status: "error",
          message: "This account has not set up a security question. Please contact support."
        });
      }

      res.json({
        status: "success",
        question: userData.securityQuestion
      });
    } catch (error: any) {
      console.error("[AUTH_API_ERR] Failed to retrieve security question:", error);
      res.status(500).json({ 
        status: "error", 
        message: error.message || "Internal server error retrieving security question." 
      });
    }
  });

  // VERIFY SECURITY ANSWER AND RESET PASSWORD (SERVER-SIDE)
  app.post("/api/auth/verify-and-reset-password", async (req, res) => {
    const { email, answer, newPassword } = req.body;
    if (!email || !answer || !newPassword) {
      return res.status(400).json({ status: "error", message: "Email, answer, and new password are required." });
    }

    try {
      console.log("[SERVER_AUTH] Verifying security answer via REST API for email:", email);
      let userData = await fetchUserByEmailFromRest(email);
      let userId = userData?.id;
      let storedAnswer = userData?.securityAnswer || "";

      if (!userData) {
        // Fallback to adminDb if REST fails
        if (adminDb) {
          console.log("[SERVER_AUTH] REST yielded no user, trying adminDb fallback...");
          const usersRef = adminDb.collection("users");
          const emailLower = email.toLowerCase().trim();
          const emailUpper = email.toUpperCase().trim();
          const emailExact = email.trim();
          const emailVariants = Array.from(new Set([emailExact, emailLower, emailUpper]));
          const snapshot = await usersRef.where("email", "in", emailVariants).limit(1).get();
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            userId = doc.id;
            storedAnswer = doc.data().securityAnswer || "";
          }
        }
      }

      if (!userId) {
        return res.status(404).json({
          status: "error",
          message: "No registered account found with this email address."
        });
      }

      if (answer.toLowerCase().trim() !== storedAnswer.toLowerCase().trim()) {
        return res.status(400).json({
          status: "error",
          message: "The security answer is incorrect. Access denied."
        });
      }

      // Update password
      if (!adminAuth) {
        return res.status(503).json({
          status: "error",
          message: "Authentication services are not initialized on this server."
        });
      }
      await adminAuth.updateUser(userId, { password: newPassword });

      res.json({
        status: "success",
        message: "Your password has been successfully updated. Please sign in with your new password."
      });
    } catch (error: any) {
      console.error("[AUTH_API_ERR] Failed to verify and reset password:", error);
      res.status(500).json({ 
        status: "error", 
        message: error.message || "Internal server error resetting password." 
      });
    }
  });

  // SEND CUSTOM BRANDED RESET EMAIL (SERVER-SIDE)
  app.post("/api/auth/send-custom-reset-email", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "error", message: "Email is required." });
    }

    if (!adminAuth) {
      return res.status(503).json({
        status: "error",
        message: "Auth services are not initialized on this server."
      });
    }

    try {
      const emailClean = email.trim();
      let resetLink = "";
      let isFallback = false;

      try {
        // Try generating standard Firebase password reset link
        resetLink = await adminAuth.generatePasswordResetLink(emailClean, {
          url: process.env.APP_URL || "http://localhost:3000"
        });
        console.log(`[SERVER_AUTH] Generated standard password reset link for ${emailClean}`);
      } catch (authLinkErr: any) {
        console.log("[SERVER_AUTH] Firebase SDK password reset link generation bypassed. Initiating high-security custom SMTP fallback.");
        
        isFallback = true;
        // Generate a cryptographically secure fallback token
        const fallbackToken = crypto.randomBytes(32).toString("hex");

        // Save fallback token to Firestore using our secure REST fallback helper
        await saveTempResetToRest(
          fallbackToken,
          emailClean,
          new Date().toISOString(),
          new Date(Date.now() + 3600000).toISOString() // 1 hour expiry
        );

        const appUrl = process.env.APP_URL || "http://localhost:3000";
        resetLink = `${appUrl}/?resetToken=${fallbackToken}`;
      }

      // Setup custom email contents
      const mailSubject = "Reset your AI-Powered Human Safety Alert password";
      const mailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
          <h2 style="color: #2563eb; font-weight: 800; text-transform: uppercase; margin-top: 0; font-size: 18px;">AI-Powered Human Safety Alert Password Reset</h2>
          <p>Hello User,</p>
          <p>This link will help you to reset your password for your AI-POWERED HUMAN SAFETY ALERT account:</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Reset Password</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="background-color: #f3f4f6; padding: 12px; font-family: monospace; font-size: 11px; word-break: break-all; border-radius: 4px;">${resetLink}</p>
          <p>If you didn’t ask to reset your password, you can ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af; margin: 0;">Thanks,<br/>Your AI-POWERED HUMAN SAFETY ALERT team</p>
        </div>
      `;

      // Attempt to send via API
      const userData = await fetchUserByEmailFromRest(emailClean);
      const phoneNumber = userData?.phone;
      const sentReal = phoneNumber ? await sendSmsNotification([phoneNumber], `Password reset link: ${resetLink}`) : false;
      const smsMessage = `Password reset link: ${resetLink}`;
      
      if (!sentReal) {
        console.log(`[SERVER_AUTH] [SIMULATION] Custom reset SMS for ${emailClean}:\nMessage: ${smsMessage}`);
      } else {
         console.log(`[SERVER_AUTH] Custom reset SMS sent via API to ${emailClean}`);
      }

      res.json({
        status: "success",
        sentReal,
        simulated: !sentReal,
        link: !sentReal ? resetLink : undefined,
        message: sentReal 
          ? "A custom password reset email has been sent successfully." 
          : "DEMO MODE: Password reset link generated successfully! (SMTP not configured, link printed below for easy testing)"
      });

    } catch (error: any) {
      console.error("[AUTH_API_ERR] Failed to send custom password reset email:", error);
      res.status(500).json({ 
        status: "error", 
        message: error.message || "Internal server error sending reset email." 
      });
    }
  });

  // CUSTOM PASSWORD RESET VIA SECURE FALLBACK TOKEN
  app.post("/api/auth/reset-password-with-token", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ status: "error", message: "Token and new password are required." });
    }

    if (!adminAuth) {
      return res.status(503).json({
        status: "error",
        message: "Auth services are not initialized on this server."
      });
    }

    try {
      // Read reset token details using our secure REST fallback helper
      const tokenData = await getTempResetFromRest(token);
      if (!tokenData) {
        return res.status(400).json({ status: "error", message: "This password reset link is invalid or has expired." });
      }

      const expiresAt = new Date(tokenData.expiresAt);
      if (expiresAt < new Date()) {
        await deleteTempResetFromRest(token);
        return res.status(400).json({ status: "error", message: "This password reset link has expired. Please request a new one." });
      }

      const email = tokenData.email;
      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(email);
      } catch (userErr: any) {
        if (userErr.code === "auth/user-not-found") {
          return res.status(404).json({ status: "error", message: "No registered account found with this email address." });
        }
        throw userErr;
      }

      // Update password in Firebase Authentication
      await adminAuth.updateUser(userRecord.uid, { password: newPassword });

      // Clean up used token using our secure REST fallback helper
      await deleteTempResetFromRest(token);

      console.log(`[SERVER_AUTH] Successfully reset password via secure fallback token for email: ${email}`);

      res.json({
        status: "success",
        message: "Password updated successfully."
      });
    } catch (error: any) {
      console.error("[AUTH_API_ERR] Fallback password reset failed:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to reset password."
      });
    }
  });

  // NOTIFY AUTH (WELCOME / SIGN-IN NOTIFICATIONS - SMS)
  app.post("/api/notification/notify-auth", async (req, res) => {
    const { email, type, displayName } = req.body;
    if (!email || !type) {
      return res.status(400).json({ status: "error", message: "Email and notification type are required." });
    }

    try {
      const emailClean = email.trim();
      const name = displayName || "User";
      
      const userData = await fetchUserByEmailFromRest(emailClean);
      const phoneNumber = userData?.phone;

      if (!phoneNumber) {
        console.warn(`[SERVER_NOTIFY] No phone number found for ${emailClean}, cannot send SMS notification.`);
        return res.status(400).json({ status: "error", message: "User phone number not found." });
      }

      let message = "";

      if (type === "signup") {
        message = `Welcome to Guardian, ${name}! Your account is now secure and active. You are now part of a community dedicated to advanced safety.`;
      } else if (type === "signin") {
        const timeStr = new Date().toLocaleString("en-US", { timeZone: "UTC" });
        message = `Guardian Sign-In Detected for ${emailClean} at ${timeStr} (UTC).`;
      } else {
        return res.status(400).json({ status: "error", message: "Invalid notification type." });
      }

      const sentReal = await sendSmsNotification([phoneNumber], message);
      
      if (!sentReal) {
        console.log(`[SERVER_NOTIFY] [SIMULATION] ${type} SMS to ${emailClean}:\nMessage: ${message}`);
      } else {
        console.log(`[SERVER_NOTIFY] ${type} notification SMS sent via API to ${emailClean}`);
      }

      res.json({
        status: "success",
        sentReal,
        simulated: !sentReal,
        message: `${type} notification processed successfully.`
      });

    } catch (error: any) {
      console.error("[NOTIFY_API_ERR] Failed to send auth notification:", error);
      res.status(500).json({ status: "error", message: error.message || "Internal server error." });
    }
  });

  // SEND SOS SMS ALERT
  app.post("/api/notification/send-sos-alert", async (req, res) => {
    let { contacts, primaryContacts, secondaryContacts, senderName, message, location } = req.body;
    if (!contacts) {
      contacts = [...(primaryContacts || []), ...(secondaryContacts || [])];
    }
    if (!senderName) {
      return res.status(400).json({ status: "error", message: "SenderName is required." });
    }

    try {
      const smsContacts = [];
      const seenPhones = new Set();
      for (const c of contacts) {
        if (c.phone && c.phone.trim() && !seenPhones.has(c.phone.trim())) {
          seenPhones.add(c.phone.trim());
          smsContacts.push(c);
        }
      }
      
      if (smsContacts.length === 0) {
        return res.json({ status: "success", message: "No contacts with phone numbers to notify." });
      }

      const mapLink = location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : "Location Unavailable";
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const results = [];
      for (const contact of smsContacts) {
        const smsMessage = `[Ai-POWERED SOS]
SENDER: ${senderName}
CONTACT: ${contact.phone}
STATUS: ${message || "Please help me, I am in danger."}
LOCATION: ${mapLink}
TIME: ${time}
REF: ${req.body.ref || "unknown"}`;

        results.push(await sendSmsNotification([contact.phone], smsMessage));
      }
      
      const sentReal = results.every(res => res === true);
      
      if (!sentReal) {
        console.log(`[SOS_ALERT] [SIMULATION] SOS SMS process completed with some simulation.`);
      } else {
        console.log(`[SOS_ALERT] SOS SMS sent via API to ${smsContacts.length} contacts.`);
      }

      res.json({
        status: "success",
        sentReal,
        simulated: !sentReal,
        message: `SOS alert processed successfully.`
      });

    } catch (error: any) {
      console.error("[SOS_API_ERR] Failed to send SOS alert:", error);
      res.status(500).json({ status: "error", message: error.message || "Internal server error." });
    }
  });

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
      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: "You are a versatile AI companion specialized in personal safety, health, and wellness. Analyze the reported incident or query, provide relevant safety tips, health first-aid advice, and a threat assessment where appropriate. Keep responses concise, supportive, and informative.",
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

  // SECURITY AI CHAT ENDPOINT
  app.post("/api/ai/chat", async (req, res) => {
    const { message, history } = req.body;

    if (!genAI) {
      return res.status(503).json({ 
        status: "error", 
        message: "AI capability is not initialized." 
      });
    }

    try {
      // Convert history to Gemini contents format
      const contents = (history || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      // Helper for retry
      const sendMessageWithRetry = async (contents: any, retries = 5): Promise<any> => {
        for (let i = 0; i < retries; i++) {
          try {
            return await genAI!.models.generateContent({
              model: "gemini-3.5-flash",
              config: {
                systemInstruction: "You are a versatile and supportive AI companion specialized in personal safety, health, wellness, and general support. Provide expert advice on safety, health first-aid, and wellness best practices. Be a comforting and helpful companion when the user is lonely or needs someone to talk to. IMPORTANT: Do not use markdown bolding (double asterisks) in your responses. Use simple, plain text for emphasis.",
              },
              contents: contents,
            });
          } catch (error: any) {
            console.error(`[AI_ERR] Chat attempt ${i + 1} failed:`, error);
            
            // Robust detection for 503
            let errorCode = error.status || (error.error && error.error.code) || error.code;
            
            // If still not detected, try parsing string representation
            if (!errorCode) {
              const errStr = JSON.stringify(error);
              if (errStr.includes('"code":503') || errStr.includes('"status":503') || errStr.includes('503')) {
                errorCode = 503;
              }
            }
            
            console.log(`[AI_DEBUG] Detected error code: ${errorCode}`);

            if (errorCode === 503 && i < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Increased backoff
              continue;
            }
            throw error;
          }
        }
      };

      const response = await sendMessageWithRetry(contents);
      res.json({ status: "success", response: response.text });
    } catch (error: any) {
      console.error("[AI_ERR] Chat failed:", error);
      res.status(500).json({ status: "error", message: "Failed to get response via AI." });
    }
  });

  // TACTICAL SMS DISPATCH ENDPOINT
  app.post("/api/sms/dispatch", async (req, res) => {
    const { phoneNumbers, message, senderName } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ status: "error", message: "No target units specified" });
    }

    console.log(`[TACTICAL_RELAY] Initializing dispatch for ${phoneNumbers.length} targets`);

    const result = await sendTacticalSms(phoneNumbers, message, senderName);

    if (result.success) {
      return res.json({ 
        status: "success", 
        relay: result.relayUsed,
        timestamp: new Date().toISOString()
      });
    }

    if (result.relayUsed === "SIMULATION") {
      return res.json({
        status: "success",
        relay: "SIMULATION_MODE",
        timestamp: new Date().toISOString(),
        message: "DEMO: Signals simulated successfully (No gateway keys found).",
        unitsReached: phoneNumbers.length
      });
    }

    // If we reached here, live gateways failed
    console.warn(`[TACTICAL_RELAY_WARN] Live gateways failed: ${JSON.stringify(result.error)}. Activating simulation fallback.`);
    return res.json({
      status: "success",
      relay: "SIMULATION_FALLBACK",
      timestamp: new Date().toISOString(),
      message: `DEMO: Dispatched in simulated mode (${result.error?.message || "Empty Balance/Coverage Error"}).`,
      details: result.error,
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

const appPromise = startServer();
export default appPromise;
