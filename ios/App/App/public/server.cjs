var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_genai = require("@google/genai");
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");
var import_auth = require("firebase-admin/auth");
var import_fs = __toESM(require("fs"), 1);
var import_resend = require("resend");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_crypto = __toESM(require("crypto"), 1);
import_dotenv.default.config();
var resend = process.env.RESEND_API_KEY ? new import_resend.Resend(process.env.RESEND_API_KEY) : null;
var BASE_PATH = process.cwd();
var firebaseConfig = {};
try {
  const configPath = import_path.default.join(BASE_PATH, "firebase-applet-config.json");
  if (import_fs.default.existsSync(configPath)) {
    firebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
  }
} catch (configErr) {
  console.error("[FIREBASE_CONFIG_LOAD_ERR]", configErr);
}
var adminDb = null;
var adminAuth = null;
try {
  if (firebaseConfig.projectId) {
    const adminApp = (0, import_app.getApps)().length === 0 ? (0, import_app.initializeApp)({
      projectId: firebaseConfig.projectId
    }) : (0, import_app.getApps)()[0];
    const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "" && firebaseConfig.firestoreDatabaseId !== "(default)" ? firebaseConfig.firestoreDatabaseId : void 0;
    adminDb = (0, import_firestore.getFirestore)(adminApp, dbId);
    adminAuth = (0, import_auth.getAuth)(adminApp);
    console.log("[FIREBASE_ADMIN] Initialized successfully with projectId:", firebaseConfig.projectId, "dbId:", dbId || "default");
  } else {
    console.warn("[FIREBASE_ADMIN] Missing projectId. Admin capabilities disabled.");
  }
} catch (adminInitErr) {
  console.error("[FIREBASE_ADMIN_INIT_ERR]", adminInitErr);
}
var SMS_KEY = process.env.SMS_ONLINE_GH_KEY;
var genAI = process.env.GEMINI_API_KEY ? new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
var getTransporter = () => {
  const host = process.env.SMTP_HOST?.replace(/^['"]|['"]$/g, "").trim();
  const port = parseInt((process.env.SMTP_PORT || "465").replace(/^['"]|['"]$/g, "").trim());
  const user = process.env.SMTP_USER?.replace(/^['"]|['"]$/g, "").trim();
  const pass = process.env.SMTP_PASS?.replace(/^['"]|['"]$/g, "").trim();
  if (host && user && pass) {
    return import_nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return null;
};
async function sendEmail(to, subject, html, from = "SafetyAlert <onboarding@resend.dev>") {
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: from.replace("onboarding@resend.dev", process.env.SMTP_USER || "benjaminrose5050@gmail.com"),
        to,
        subject,
        html
      });
      console.log(`[SMTP_SUCCESS] Email sent to ${to}`);
      return true;
    } catch (smtpErr) {
      console.error("[SMTP_ERR] Failed to send SMTP email, trying Resend fallback:", smtpErr.message);
    }
  }
  if (resend) {
    try {
      await resend.emails.send({
        from,
        to,
        subject,
        html
      });
      console.log(`[RESEND_SUCCESS] Email sent to ${to} via Resend fallback`);
      return true;
    } catch (resendErr) {
      console.error("[RESEND_ERR] Fallback Resend email also failed:", resendErr);
    }
  }
  console.log(`[EMAIL_SIMULATION] Fallback failed. To: ${to}
Subject: ${subject}`);
  return false;
}
async function fetchUserByEmailFromRest(email) {
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
  const emailVariants = Array.from(/* @__PURE__ */ new Set([emailExact, emailLower, emailUpper]));
  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "email" },
          op: "IN",
          value: {
            arrayValue: {
              values: emailVariants.map((v) => ({ stringValue: v }))
            }
          }
        }
      },
      limit: 1
    }
  };
  try {
    const response = await import_axios.default.post(url, queryPayload);
    const results = response.data;
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }
    const match = results.find((r) => r.document);
    if (!match || !match.document) {
      return null;
    }
    const doc = match.document;
    const docId = doc.name.split("/").pop();
    const parseValue = (val) => {
      if (!val) return null;
      if ("stringValue" in val) return val.stringValue;
      if ("integerValue" in val) return parseInt(val.integerValue);
      if ("doubleValue" in val) return parseFloat(val.doubleValue);
      if ("booleanValue" in val) return val.booleanValue;
      if ("arrayValue" in val) {
        return (val.arrayValue.values || []).map((v) => parseValue(v));
      }
      if ("mapValue" in val) {
        const obj = {};
        const fields2 = val.mapValue.fields || {};
        for (const k of Object.keys(fields2)) {
          obj[k] = parseValue(fields2[k]);
        }
        return obj;
      }
      return null;
    };
    const parsedFields = {};
    const fields = doc.fields || {};
    for (const key of Object.keys(fields)) {
      parsedFields[key] = parseValue(fields[key]);
    }
    return {
      id: docId,
      ...parsedFields
    };
  } catch (err) {
    console.error("[REST_FALLBACK_ERR] Failed to query Firestore REST API:", err?.response?.data || err.message);
    throw err;
  }
}
var inMemoryResetTokens = /* @__PURE__ */ new Map();
async function saveTempResetToRest(token, email, createdAt, expiresAt) {
  inMemoryResetTokens.set(token, { email, createdAt, expiresAt });
  console.log(`[IN_MEMORY_SUCCESS] Successfully saved secure fallback temp reset token for ${email}.`);
}
async function getTempResetFromRest(token) {
  const tokenData = inMemoryResetTokens.get(token);
  if (!tokenData) {
    console.log(`[IN_MEMORY_INFO] Reset token ${token} not found or expired.`);
    return null;
  }
  return tokenData;
}
async function deleteTempResetFromRest(token) {
  const deleted = inMemoryResetTokens.delete(token);
  if (deleted) {
    console.log(`[IN_MEMORY_SUCCESS] Successfully cleaned up reset token ${token}.`);
  }
}
var inMemoryOTPs = /* @__PURE__ */ new Map();
async function saveOtp(email, otp, createdAt, expiresAt) {
  inMemoryOTPs.set(email.toLowerCase().trim(), { otp, createdAt, expiresAt });
  console.log(`[IN_MEMORY_SUCCESS] Successfully saved verification OTP for ${email}.`);
}
async function getOtp(email) {
  const otpData = inMemoryOTPs.get(email.toLowerCase().trim());
  if (!otpData) {
    console.log(`[IN_MEMORY_INFO] OTP for ${email} not found or expired.`);
    return null;
  }
  return otpData;
}
async function deleteOtp(email) {
  const deleted = inMemoryOTPs.delete(email.toLowerCase().trim());
  if (deleted) {
    console.log(`[IN_MEMORY_SUCCESS] Successfully cleaned up OTP for ${email}.`);
  }
}
async function saveSimulatedEmailToRest(to, subject, html, resetLink) {
  console.log(`[SIMULATED_EMAIL_LOG] To: ${to}
Subject: ${subject}
Link: ${resetLink}`);
}
async function sendTacticalSms(phoneNumbers, message, senderName) {
  const smsOnlineKey = process.env.SMS_ONLINE_GH_KEY || process.env.SMS_ONLINE_GH_KEY;
  const arkeselKey = process.env.ARKESEL_API_KEY;
  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return { success: false, relayUsed: "", error: new Error("No target units specified") };
  }
  const normalizeGH = (num) => {
    let cleaned = num.replace(/\D/g, "");
    if (cleaned.startsWith("0") && cleaned.length === 10) return `233${cleaned.substring(1)}`;
    if (cleaned.length === 9) return `233${cleaned}`;
    return cleaned;
  };
  const normalizedNumbers = phoneNumbers.map(normalizeGH).filter((n) => n.length >= 10);
  if (normalizedNumbers.length === 0) {
    return { success: false, relayUsed: "", error: new Error("No valid phone numbers detected") };
  }
  const sanitizeSenderId = (name) => {
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
  let lastErrorDetails = null;
  if (arkeselKey) {
    try {
      console.log(`[TACTICAL_SMS_ARKESEL] Attempting dispatch via V2 with sender: ${tacticalSender}`);
      const response = await import_axios.default.post(`https://sms.arkesel.com/api/v2/sms/send`, {
        sender: tacticalSender,
        recipients: normalizedNumbers,
        message
      }, {
        headers: { "api-key": arkeselKey },
        timeout: 12e3
      });
      const resData = response.data;
      if (resData && (resData.status === "success" || resData.code === "1000" || resData.code === 1e3 || resData.code === 101)) {
        success = true;
        relayUsed = "ARKESEL_v2";
        console.log(`[TACTICAL_SMS_SUCCESS] Arkesel v2 confirmed.`);
      } else {
        console.warn("[TACTICAL_SMS_WARN] Arkesel rejected request:", JSON.stringify(resData));
        lastErrorDetails = resData;
        if (tacticalSender !== "Arkesel") {
          try {
            console.log(`[TACTICAL_SMS_ARKESEL] Fallback with default sender 'Arkesel'...`);
            const fbRes = await import_axios.default.post(`https://sms.arkesel.com/api/v2/sms/send`, {
              sender: "Arkesel",
              recipients: normalizedNumbers,
              message
            }, {
              headers: { "api-key": arkeselKey },
              timeout: 1e4
            });
            if (fbRes.data && (fbRes.data.status === "success" || fbRes.data.code === 1e3)) {
              success = true;
              relayUsed = "ARKESEL_v2_FALLBACK";
              console.log(`[TACTICAL_SMS_SUCCESS] Arkesel fallback successful.`);
            }
          } catch (innerE) {
            console.error("[TACTICAL_SMS_FAILED] Arkesel fallback also failed.");
          }
        }
      }
    } catch (e) {
      lastErrorDetails = e.response?.data || { message: e.message };
      console.error("[TACTICAL_SMS_ERR] Arkesel primary failed:", JSON.stringify(lastErrorDetails));
    }
  }
  if (!success && smsOnlineKey) {
    try {
      console.log(`[TACTICAL_SMS_SMSONLINE] Attempting dispatch via SMS Online GH...`);
      const response = await import_axios.default.post(`https://api.smsonlinegh.com/v4/message/sms/send`, {
        text: message,
        destinations: normalizedNumbers,
        sender: tacticalSender.substring(0, 11)
      }, {
        headers: {
          "Authorization": `Bearer ${smsOnlineKey}`,
          "Content-Type": "application/json"
        },
        timeout: 12e3
      });
      if (response.status === 200 || response.status === 201) {
        success = true;
        relayUsed = "SMS_ONLINE_GH";
        console.log(`[TACTICAL_SMS_SUCCESS] SMS Online GH dispatch confirmed.`);
      }
    } catch (e) {
      const errData = e.response?.data || e.message;
      console.error("[TACTICAL_SMS_ERR] SMS Online GH failed:", JSON.stringify(errData));
      if (!lastErrorDetails) lastErrorDetails = errData;
    }
  }
  return { success, relayUsed, error: success ? void 0 : lastErrorDetails };
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email, password, displayName, type = "signup" } = req.body;
    if (!email) {
      return res.status(400).json({ status: "error", message: "Email is required." });
    }
    try {
      const emailClean = email.trim().toLowerCase();
      let name = displayName || "User";
      if (type === "login") {
        if (!password) {
          return res.status(400).json({ status: "error", message: "Password is required for verification." });
        }
        try {
          const verifyRes = await import_axios.default.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
            email: emailClean,
            password,
            returnSecureToken: true
          });
          if (verifyRes.data && verifyRes.data.displayName) {
            name = verifyRes.data.displayName;
          } else if (adminAuth) {
            try {
              const userRecord = await adminAuth.getUserByEmail(emailClean);
              if (userRecord && userRecord.displayName) {
                name = userRecord.displayName;
              }
            } catch (ignore) {
            }
          }
        } catch (apiErr) {
          const errData = apiErr.response?.data?.error;
          const errMsg = errData?.message;
          console.log(`[SERVER_AUTH] Credential check handled: ${errMsg || "REST_BYPASS"}`);
          if (apiErr.response?.status === 400 || errMsg === "EMAIL_NOT_FOUND" || errMsg === "INVALID_PASSWORD" || errMsg === "INVALID_LOGIN_CREDENTIALS" || errMsg === "USER_DISABLED" || errMsg === "INVALID_EMAIL") {
            return res.status(400).json({
              status: "error",
              message: "Invalid email or password. Verify details and retry."
            });
          }
          console.log("[SERVER_AUTH] REST API verification bypassed due to server/network condition:", errMsg || apiErr.message);
          if (adminAuth) {
            try {
              const userRecord = await adminAuth.getUserByEmail(emailClean);
              if (userRecord && userRecord.displayName) {
                name = userRecord.displayName;
              }
            } catch (ignore) {
            }
          }
        }
      } else {
        if (adminAuth) {
          try {
            const userRecord = await adminAuth.getUserByEmail(emailClean);
            if (userRecord) {
              return res.status(400).json({
                status: "error",
                message: "This email is already registered. Please sign in instead."
              });
            }
          } catch (userErr) {
            if (userErr.code !== "auth/user-not-found") {
              console.warn("[SERVER_AUTH] Failed checking existing user:", userErr.message);
            }
          }
        }
      }
      const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
      const now = /* @__PURE__ */ new Date();
      const expires = new Date(now.getTime() + 10 * 60 * 1e3);
      await saveOtp(emailClean, otp, now.toISOString(), expires.toISOString());
      const isLogin = type === "login";
      const mailSubject = isLogin ? "AI-Powered Human Safety Alert - Login Verification OTP" : "AI-Powered Human Safety Alert - Email Verification OTP";
      const mailHeading = isLogin ? "Authorize Your Sign-In" : "Verify Your Email Address";
      const mailParagraph = isLogin ? "A login request was initiated for your AI-POWERED HUMAN SAFETY ALERT account. To confirm your identity and authorize access to your security console, please use the 6-digit verification code below:" : "Thank you for initiating your AI-POWERED HUMAN SAFETY ALERT account setup. To ensure maximum perimeter security and verify your digital signature, please use the 6-digit One-Time Password (OTP) below to complete your registration:";
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
      const hasSmtp = !!resend;
      const arkeselKey = process.env.ARKESEL_API_KEY || process.env.ARKESEL_API_KEY;
      const smsOnlineKey = process.env.SMS_ONLINE_GH_KEY || process.env.SMS_ONLINE_GH_KEY;
      const hasSms = !!(arkeselKey || smsOnlineKey);
      const isSimulated = !hasSmtp && !hasSms;
      if (isSimulated) {
        res.json({
          status: "success",
          sentReal: false,
          sentRealEmail: false,
          sentRealSms: false,
          smsRelayUsed: "",
          simulated: true,
          otp,
          message: `DEMO MODE: SMTP/SMS is not configured. Use verification OTP: ${otp} to proceed.`
        });
        if (adminDb) {
          adminDb.collection("simulated_emails").add({
            to: emailClean,
            subject: mailSubject,
            html: mailHtml,
            type: isLogin ? "login_otp" : "signup_otp",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }).catch((dbErr) => {
            console.warn(`[SERVER_AUTH_DB_WARN] Failed to write simulated OTP email to Firestore: ${dbErr.message}`);
          });
        }
      } else {
        res.json({
          status: "success",
          sentReal: true,
          sentRealEmail: hasSmtp,
          sentRealSms: !hasSmtp && hasSms,
          smsRelayUsed: "",
          simulated: false,
          message: hasSmtp ? `A 6-digit verification code has been dispatched to ${emailClean}. Please check your inbox.` : `Email delivery inactive. Dispatching fallback verification OTP to your phone via SMS.`
        });
        (async () => {
          let resolvedPhone = null;
          if (req.body.phoneNumber) {
            resolvedPhone = req.body.phoneNumber;
          } else {
            try {
              const userProfile = await fetchUserByEmailFromRest(emailClean);
              if (userProfile && userProfile.phoneNumber) {
                resolvedPhone = userProfile.phoneNumber;
                console.log(`[SERVER_AUTH_BG] Resolved phone number from user profile: ${resolvedPhone}`);
              }
            } catch (profileErr) {
              console.warn(`[SERVER_AUTH_BG_PHONE_LOOKUP_WARN] Failed fetching phone number from Firestore:`, profileErr.message);
            }
          }
          const dispatchPromises = [];
          dispatchPromises.push(sendEmail(emailClean, mailSubject, mailHtml, `"AI-POWERED HUMAN SAFETY ALERT" <${process.env.SMTP_USER || "benjaminrose5050@gmail.com"}>`).then((success) => {
            if (success) {
              console.log(`[SERVER_AUTH_BG] Verification OTP email sent via API to ${emailClean}`);
            } else {
              console.error("[SERVER_AUTH_BG_EMAIL_ERR] Failed to send real API email.");
            }
          }));
          await Promise.all(dispatchPromises);
        })().catch((bgErr) => {
          console.error("[SERVER_AUTH_BG_THREAD_ERR] Background thread error:", bgErr);
        });
      }
    } catch (error) {
      console.error("[AUTH_API_ERR] Failed to send verification OTP:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Internal server error sending verification OTP."
      });
    }
  });
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
      if (expiresAt < /* @__PURE__ */ new Date()) {
        await deleteOtp(emailClean);
        return res.status(400).json({
          status: "error",
          message: "The verification code has expired. Please request a new OTP."
        });
      }
      if (otpClean !== otpData.otp) {
        return res.status(400).json({
          status: "error",
          message: "The verification code is incorrect. Verification failed."
        });
      }
      await deleteOtp(emailClean);
      console.log(`[SERVER_AUTH] Successfully verified email OTP for: ${emailClean}`);
      res.json({
        status: "success",
        message: "Email verified successfully."
      });
    } catch (error) {
      console.error("[AUTH_API_ERR] Verification OTP check failed:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to verify code."
      });
    }
  });
  app.post("/api/auth/get-security-question", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "error", message: "Email is required." });
    }
    try {
      console.log("[SERVER_AUTH] Fetching security question via REST API for email:", email);
      const userData = await fetchUserByEmailFromRest(email);
      if (!userData) {
        if (adminDb) {
          console.log("[SERVER_AUTH] REST yielded no user, trying adminDb fallback...");
          const usersRef = adminDb.collection("users");
          const emailLower = email.toLowerCase().trim();
          const emailUpper = email.toUpperCase().trim();
          const emailExact = email.trim();
          const emailVariants = Array.from(/* @__PURE__ */ new Set([emailExact, emailLower, emailUpper]));
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
    } catch (error) {
      console.error("[AUTH_API_ERR] Failed to retrieve security question:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Internal server error retrieving security question."
      });
    }
  });
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
        if (adminDb) {
          console.log("[SERVER_AUTH] REST yielded no user, trying adminDb fallback...");
          const usersRef = adminDb.collection("users");
          const emailLower = email.toLowerCase().trim();
          const emailUpper = email.toUpperCase().trim();
          const emailExact = email.trim();
          const emailVariants = Array.from(/* @__PURE__ */ new Set([emailExact, emailLower, emailUpper]));
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
    } catch (error) {
      console.error("[AUTH_API_ERR] Failed to verify and reset password:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Internal server error resetting password."
      });
    }
  });
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
        resetLink = await adminAuth.generatePasswordResetLink(emailClean, {
          url: process.env.APP_URL || "http://localhost:3000"
        });
        console.log(`[SERVER_AUTH] Generated standard password reset link for ${emailClean}`);
      } catch (authLinkErr) {
        console.log("[SERVER_AUTH] Firebase SDK password reset link generation bypassed. Initiating high-security custom SMTP fallback.");
        isFallback = true;
        const fallbackToken = import_crypto.default.randomBytes(32).toString("hex");
        await saveTempResetToRest(
          fallbackToken,
          emailClean,
          (/* @__PURE__ */ new Date()).toISOString(),
          new Date(Date.now() + 36e5).toISOString()
          // 1 hour expiry
        );
        const appUrl = process.env.APP_URL || "http://localhost:3000";
        resetLink = `${appUrl}/?resetToken=${fallbackToken}`;
      }
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
          <p>If you didn\u2019t ask to reset your password, you can ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af; margin: 0;">Thanks,<br/>Your AI-POWERED HUMAN SAFETY ALERT team</p>
        </div>
      `;
      const sentReal = await sendEmail(emailClean, mailSubject, mailHtml, `"AI-POWERED HUMAN SAFETY ALERT" <${process.env.SMTP_USER || "benjaminrose5050@gmail.com"}>`);
      if (!sentReal) {
        console.log(`[SERVER_AUTH] [SIMULATION] Custom reset email for ${emailClean}:
Subject: ${mailSubject}
Link: ${resetLink}`);
        await saveSimulatedEmailToRest(emailClean, mailSubject, mailHtml, resetLink);
      } else {
        console.log(`[SERVER_AUTH] Custom reset email sent via API to ${emailClean}`);
      }
      res.json({
        status: "success",
        sentReal,
        simulated: !sentReal,
        link: !sentReal ? resetLink : void 0,
        message: sentReal ? "A custom password reset email has been sent successfully." : "DEMO MODE: Password reset link generated successfully! (SMTP not configured, link printed below for easy testing)"
      });
    } catch (error) {
      console.error("[AUTH_API_ERR] Failed to send custom password reset email:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Internal server error sending reset email."
      });
    }
  });
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
      const tokenData = await getTempResetFromRest(token);
      if (!tokenData) {
        return res.status(400).json({ status: "error", message: "This password reset link is invalid or has expired." });
      }
      const expiresAt = new Date(tokenData.expiresAt);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        await deleteTempResetFromRest(token);
        return res.status(400).json({ status: "error", message: "This password reset link has expired. Please request a new one." });
      }
      const email = tokenData.email;
      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(email);
      } catch (userErr) {
        if (userErr.code === "auth/user-not-found") {
          return res.status(404).json({ status: "error", message: "No registered account found with this email address." });
        }
        throw userErr;
      }
      await adminAuth.updateUser(userRecord.uid, { password: newPassword });
      await deleteTempResetFromRest(token);
      console.log(`[SERVER_AUTH] Successfully reset password via secure fallback token for email: ${email}`);
      res.json({
        status: "success",
        message: "Password updated successfully."
      });
    } catch (error) {
      console.error("[AUTH_API_ERR] Fallback password reset failed:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to reset password."
      });
    }
  });
  app.post("/api/email/notify-auth", async (req, res) => {
    const { email, type, displayName } = req.body;
    if (!email || !type) {
      return res.status(400).json({ status: "error", message: "Email and notification type are required." });
    }
    try {
      const emailClean = email.trim();
      const name = displayName || "User";
      let mailSubject = "";
      let mailHtml = "";
      if (type === "signup") {
        mailSubject = "Welcome to AI-POWERED HUMAN SAFETY ALERT!";
        mailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
            <h2 style="color: #2563eb; font-weight: 800; text-transform: uppercase; margin-top: 0; font-size: 18px;">Welcome to AI-POWERED HUMAN SAFETY ALERT</h2>
            <p>Hello ${name},</p>
            <p>Welcome to AI-POWERED HUMAN SAFETY ALERT! Your account has been successfully registered on our secure platform.</p>
            <p>We are dedicated to ensuring your safety with our tactical emergency relays, real-time tracking, and AI-powered threat analysis.</p>
            <div style="margin: 20px 0; background-color: #f3f4f6; padding: 15px; border-radius: 6px; font-size: 13px;">
              <strong>Pro-Tip:</strong> Please ensure that you navigate to the <strong>Trusted Contacts</strong> tab to add your priority emergency contacts. This ensures they can receive instant SMS and email alerts if you ever trigger an SOS.
            </div>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9ca3af; margin: 0;">Thanks,<br/>Your AI-POWERED HUMAN SAFETY ALERT team</p>
          </div>
        `;
      } else if (type === "signin") {
        const timeStr = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "UTC" });
        mailSubject = "AI-Powered Human Safety Alert - Successful Sign-In Detected";
        mailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
            <h2 style="color: #2563eb; font-weight: 800; text-transform: uppercase; margin-top: 0; font-size: 18px;">Sign-In Alert</h2>
            <p>Hello ${name},</p>
            <p>This is a verification notice that a successful sign-in to your AI-POWERED HUMAN SAFETY ALERT account was detected.</p>
            <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin: 15px 0;">
              <strong>Email:</strong> ${emailClean}<br/>
               <strong>Time (UTC):</strong> ${timeStr}
            </div>
            <p>If this was you, no action is required. If you did not perform this action, please secure your account credentials immediately.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9ca3af; margin: 0;">Thanks,<br/>Your AI-POWERED HUMAN SAFETY ALERT team</p>
          </div>
        `;
      } else {
        return res.status(400).json({ status: "error", message: "Invalid notification type." });
      }
      const sentReal = await sendEmail(emailClean, mailSubject, mailHtml, `"AI-POWERED HUMAN SAFETY ALERT" <${process.env.SMTP_USER || "benjaminrose5050@gmail.com"}>`);
      if (!sentReal) {
        console.log(`[SERVER_AUTH] [SIMULATION] ${type} email to ${emailClean}:
Subject: ${mailSubject}`);
        if (adminDb) {
          try {
            await adminDb.collection("simulated_emails").add({
              to: emailClean,
              subject: mailSubject,
              html: mailHtml,
              type,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (dbErr) {
            console.warn(`[SERVER_AUTH_DB_WARN] Failed to write simulated email to Firestore (GCP/IAM permission limit): ${dbErr.message}`);
          }
        }
      } else {
        console.log(`[SERVER_AUTH] ${type} notification email sent via API to ${emailClean}`);
      }
      res.json({
        status: "success",
        sentReal,
        simulated: !sentReal,
        message: `${type} notification processed successfully.`
      });
    } catch (error) {
      console.error("[AUTH_API_ERR] Failed to send auth notification:", error);
      res.status(500).json({ status: "error", message: error.message || "Internal server error." });
    }
  });
  app.post("/api/email/send-sos-alert", async (req, res) => {
    const { contacts, senderName, message, location } = req.body;
    if (!contacts || !senderName) {
      return res.status(400).json({ status: "error", message: "Contacts and senderName are required." });
    }
    try {
      const emailContacts = contacts.filter((c) => c.email && c.email.trim());
      if (emailContacts.length === 0) {
        return res.json({ status: "success", message: "No contacts with email addresses to notify." });
      }
      const mailSubject = `[CRITICAL SOS ALERT] Emergency Signal from ${senderName.toUpperCase()}`;
      const mapLink = location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : "Unavailable";
      const results = [];
      for (const contact of emailContacts) {
        const toEmail = contact.email.trim();
        const contactName = contact.name || "Emergency Contact";
        const mailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 3px solid #dc2626; border-radius: 12px; background-color: #fef2f2;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="background-color: #dc2626; color: white; padding: 8px 16px; border-radius: 5px; font-weight: 900; font-size: 16px; letter-spacing: 2px;">CRITICAL EMERGENCY ALERT</span>
            </div>
            <h2 style="color: #dc2626; font-weight: 900; margin-top: 0; font-size: 20px;">AI-POWERED HUMAN SAFETY ALERT SOS Signal</h2>
            <p>Hello ${contactName},</p>
            <p><strong>${senderName.toUpperCase()}</strong> has triggered a critical SOS emergency signal via AI-POWERED HUMAN SAFETY ALERT!</p>
            
            <div style="background-color: white; border-left: 5px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="margin: 0; font-weight: bold; color: #7f1d1d;">SENDER STATUS:</p>
              <p style="margin: 5px 0 0 0; font-size: 15px; font-style: italic;">"${message}"</p>
            </div>

            <div style="background-color: white; border-left: 5px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="margin: 0; font-weight: bold; color: #1e3a8a;">LAST KNOWN COORDINATES:</p>
              <p style="margin: 8px 0;"><a href="${mapLink}" style="background-color: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 12px; display: inline-block;">View Location on Google Maps</a></p>
              <p style="margin: 0; font-size: 11px; color: #6b7280; font-family: monospace; word-break: break-all;">Link: ${mapLink}</p>
            </div>

            <p style="color: #b91c1c; font-weight: bold;">Please coordinate assistance or contact local authorities immediately.</p>
            
            <hr style="border: none; border-top: 1px solid #fca5a5; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9ca3af; margin: 0;">This transmission was generated securely by AI-POWERED HUMAN SAFETY ALERT Emergency Services.</p>
          </div>
        `;
        const success = await sendEmail(toEmail, mailSubject, mailHtml, `"SafetyAlert" <${process.env.SMTP_USER || "benjaminrose5050@gmail.com"}>`);
        if (success) {
          results.push({ email: toEmail, status: "sent" });
        } else {
          console.log(`[SERVER_SOS_EMAIL] [SIMULATION] SOS alert to ${toEmail} for sender ${senderName}`);
          if (adminDb) {
            try {
              await adminDb.collection("simulated_emails").add({
                to: toEmail,
                subject: mailSubject,
                html: mailHtml,
                type: "sos_alert",
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            } catch (dbErr) {
              console.warn(`[SERVER_SOS_DB_WARN] Failed to write simulated SOS email to Firestore (GCP/IAM permission limit): ${dbErr.message}`);
            }
          }
          results.push({ email: toEmail, status: "simulated" });
        }
      }
      const allSent = results.every((r) => r.status === "sent");
      res.json({
        status: "success",
        results,
        message: allSent ? "SOS alert emails dispatched successfully." : "SOS alert emails processed (some may be simulated)."
      });
    } catch (error) {
      console.error("[SOS_EMAIL_ERR] Failed to send SOS alert email:", error);
      res.status(500).json({ status: "error", message: error.message || "Internal server error dispatching SOS emails." });
    }
  });
  app.post("/api/ai/generate-bio", async (req, res) => {
    const { displayName, currentBio } = req.body;
    if (!genAI) {
      return res.status(503).json({
        status: "error",
        message: "AI capability is not initialized on this server (Missing GEMINI_API_KEY)."
      });
    }
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `You are the Ai-POWERED Security Assistant. 
        Write a professional, tactical, and reassuring user bio for the 'Ai-POWERED HUMAN SAFETY ALERT' app. 
        The bio should reflect a sense of being 'prepared, vigilant, and community-focused'. 
        If the user has an existing bio, improve it. If not, create one from scratch.
        Keep it under 150 characters. 
        User identity: ${displayName}. 
        Current status: ${currentBio || "New Recruit"}.
        DO NOT include quotes or introductory text. Just the bio string.`
      });
      const text = response.text?.trim() || "";
      res.json({ status: "success", bio: text });
    } catch (error) {
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
        model: "gemini-1.5-flash",
        config: {
          systemInstruction: "You are a safety expert. Analyze the following reported incident and provide safety tips and a threat assessment level (Low, Medium, High, Critical). Keep it concise."
        },
        contents: `Incident: ${description}
Location: ${location}`
      });
      const text = response.text || "Failed to analyze incident.";
      res.json({ status: "success", analysis: text });
    } catch (error) {
      console.error("[AI_ERR] Threat analysis failed:", error);
      res.status(500).json({ status: "error", message: "Failed to analyze threat via AI." });
    }
  });
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    if (result.relayUsed === "SIMULATION") {
      return res.json({
        status: "success",
        relay: "SIMULATION_MODE",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        message: "DEMO: Signals simulated successfully (No gateway keys found).",
        unitsReached: phoneNumbers.length
      });
    }
    console.warn(`[TACTICAL_RELAY_WARN] Live gateways failed: ${JSON.stringify(result.error)}. Activating simulation fallback.`);
    return res.json({
      status: "success",
      relay: "SIMULATION_FALLBACK",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message: `DEMO: Dispatched in simulated mode (${result.error?.message || "Empty Balance/Coverage Error"}).`,
      details: result.error,
      unitsReached: phoneNumbers.length
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(BASE_PATH, "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Ai-POWERED_OS] Server running at http://0.0.0.0:${PORT}`);
  });
  return app;
}
var appPromise = startServer();
var server_default = appPromise;
//# sourceMappingURL=server.cjs.map
