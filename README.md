# Ai-POWERED: Tactical Safety Engine

Ai-POWERED is a high-performance personal safety application built for high-stakes environments. It combines a military-grade tactical interface with robust emergency coordination tools.

## 🛡️ Core Capabilities

- **Tactical SOS**: Instant broadcast of your distress signal and realtime GPS coordinates to your trusted circle.
- **Native SMS Bridge**: Secure integration with mobile messaging protocols for high-reliability alerts.
- **Biometric Identity**: Secure profile management with cloud-synced tactical identification.
- **Safety Check-ins**: Automated timers that trigger alerts if you fail to check in.
- **Tactical Hub**: One-tap access to local emergency services (Ambulance, Fire, Police).
- **Onboarding Protocol**: Guided setup for new operators to initialize their defense profile.

---

## 🚀 Environment & Setup

### Local Development (Export)
If you export this code, follow these steps:
1. **Node.js**: Ensure you are on version **22.0.0** or higher.
2. **Setup**: Duplicate `.env.example` to `.env` and populate your Firebase credentials.
3. **Execution**:
   ```bash
   npm install
   npm run dev
   ```

---

### 📱 How to Generate the Android APK (Step-by-Step)

If you are using **Android Studio** to generate your app:

1.  **Prepare the Web Bundle**: Run this in your terminal:
    ```bash
    npm run mobile:build
    ```
    *This compiles your React code and syncs it into the Android project.*

2.  **Open the CORRECT Folder**:
    -   Launch **Android Studio**.
    -   Select **"Open"** (or "Open an Existing Project").
    -   **CRITICAL**: Navigate into the folder where your project is stored and select the **`android`** folder specifically.
    -   **DO NOT** open the root project folder; Android Studio will only recognize the app if you open the `/android` directory.

3.  **Wait for Gradle Sync**:
    -   Once opened, wait for the status bar at the bottom to finish "Gradle Sync". This might take a few minutes the first time.

4.  **Generate the APK**:
    -   In the top menu, go to: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
    -   Android Studio will compile your app. When finished, a notification popup will appear in the bottom right corner.
    -   Click **"locate"** in that popup to find your `app-debug.apk` file.

5.  **Install on Phone**:
    -   Transfer this `.apk` file to your Android phone and open it to install.

---

## 🛠️ Distribution & Native Compiles

### Unified Build Protocol
Prepare the codebase for all target platforms:
```bash
npm run app:bundle
```

### Mobile (Android APK)
1. **Prepare**: The `android` deployment folder is initialized and permissions (SMS, GPS, Camera) are configured.
2. **Build**: `npm run mobile:build`
3. **Open**: `npm run mobile:open` (Launches Android Studio)
4. **Compile**: In Android Studio, select `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
5. **Note**: The APK will automatically include the tactical SMS and Location listeners.

### Desktop (Windows/Mac/Linux)
1. **Build**: `npm run desktop:build`
2. **Open**: `npx cap open electron`
3. **Package**: Use `electron-builder` (bundled in the electron directory) for distribution.

---

## 🔑 Tactical Credentials (API Keys)

To maintain secure data relays and SMS broadcasts, you **MUST** configure the following keys.

### 🔒 Security and the `dist` Folder
The application architecture is **security-first**. 
- **Server-Side Projection**: All sensitive API keys (Arkesel, SMSOnlineGH, Twilio) are handled strictly on the server (`server.ts`).
- **No Client Exposure**: These keys are **NOT** bundled into the `dist/` folder shared with the browser. 
- **Runtime Injection**: Keys are read from the system's environment variables (`process.env`) at execution time.

| Service | Key Variable | Description |
| :--- | :--- | :--- |
| **Arkesel** | `ARKESEL_API_KEY` | Primary SMS relay (emergency broadcasts) |
| **SMSOnlineGH** | `SMS_ONLINE_GH_KEY` | Secondary fallback SMS relay |
| **Twilio** | `TWILIO_ACCOUNT_SID` | Global SMS & Voice fallback |
| **Firebase** | `VITE_FIREBASE_API_KEY` | Client-side database synchronization |

### 🛠️ Configuration Steps
1. **AI Studio**: Go to **Settings > Secrets** and add `ARKESEL_API_KEY`.
2. **Local/Manual Build**: Create a `.env` file in the root (copying `.env.example`) and paste your keys there BEFORE running:
   ```bash
   npm run build
   ```
   *Note: The keys are used by the server at runtime, not baked into the static build.*

---

## 📡 Tactical Persistence
- **Logs**: Every SOS trigger, check-in, and incident is recorded in `system_logs` for forensics.
- **Assets**: Identity visuals are stored in Firebase Storage with owner-only write permissions.
- **Sync**: Real-time profile propagation across all active tactical nodes.

---
© 2026 Ai-POWERED Systems. Tactical Intelligence for Personal Safety.
