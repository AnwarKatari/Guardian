# Ai-POWERED: Tactical Safety Engine & Guardian Academy

Ai-POWERED is a high-performance personal safety and emergency coordination application built for high-stakes environments. It combines a military-grade tactical interface with robust emergency coordination tools and a proactive community safety gamification system.

The application is engineered to operate seamlessly as an **Android App (APK)**, a **Windows Desktop App (EXE)**, an **iOS App**, and a fully **Responsive Web App**. On desktop screens, it expands into a widescreen tactical bento-grid dashboard, while on mobile devices, it automatically snaps into a compact, thumb-optimized native-feeling security terminal.

---

## 🛡️ Ten Core Capabilities

1. **Tactical Hold-to-Trigger SOS Panel**: An interactive, anti-accidental safety gesture requiring a continuous 5-second hold down countdown to register and dispatch active distress alerts.
2. **High-Intensity Haptic Feedback Engine**: Delivers physical vibration rhythms (`600ms active, 100ms idle`) directly into the device hardware during hold phases to provide high-stress operator reassurance, terminating in a custom triple-vibration confirmation upon dispatch.
3. **Native SMS Bridge with Server Proxy & Simulation Fallback**: Complete server-side SMS integration connected with Arkesel, SMSOnlineGH, and Twilio. It includes an automatic local gateway simulator that logs messages if API key credit balances are empty.
4. **Dynamic Country-Specific Emergency Hotline Mapping**: Automatically detects the user's geofenced regional profile and maps the correct local emergency lines (Police, Fire, Ambulance) with oversized shortcut cards on primary screens.
5. **Automated Safety Watchdog Check-ins**: Operates as a passive fail-safe utility. If the operator enters a high-risk zone, they can activate a countdown check-in timer; if it reaches zero without a manual check-in reset, the system automatically starts a distress broadcast.
6. **AI-Powered Crowdsourced Intel Classifier (Gemini API)**: Leverages server-side Gemini-1.5-Flash processing via the Google Gen AI SDK to analyze and score community threat inputs, weeding out false coordinates and malicious misinformation.
7. **Offline Black-out Maps & Regional Directory Caching**: Automatically serializes key emergency numbers, coordinates, and custom map sectors, enabling offline reading and navigation in total carrier blackout areas.
8. **Guardian Academy Training Modules**: A gamified security curriculum rewarding operators with safety score points, daily challenge credits, and custom milestone badges (such as *Vanguard Scout*, *Sentinel Shield*, and *Apex Guardian*).
9. **Global Social Leaderboard with Companion Profiles**: Displays friendly readiness rankings alongside active companion nodes (*Aegis Supervisor*, *Sentinel Beta*, and *Grid Navigator*) to motivate regular training.
10. **Daily Safety Tips Scheduler**: A timezone-aligned tactical training engine that delivers daily crisis preparedness insights via native browser Push APIs, complete with timezone configuration and persistent delivery logs.

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

## 📱 How to Generate the Android APK (Step-by-Step)

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

## 🚀 Foolproof Build Sequence (Guaranteed Clean)

To avoid dependency issues and build failures, follow this sequence exactly every time you want a fresh build:

```bash
# 1. Completely wipe all previous build artifacts, dependencies, and native projects
npm run clean:all

# 2. Re-install all dependencies from scratch
npm install

# 3. Build the web assets and sync native projects in one go
npm run build:mobile

# 4. Build the Android APK (requires Android SDK configured in your local env)
cd android
./gradlew assembleDebug
# Result: android/app/build/outputs/apk/debug/app-debug.apk
```

*Note: Native builds rely on your local environment (Java, Android SDK, Xcode). Ensure these are installed and configured according to the official Capacitor/Android/iOS docs if you run into environment errors.*

---

---

## 🎨 Customizing App Icons

To replace the default icon with a custom "Guardian" design, follow these steps to ensure your app displays the correct icon on mobile home screens:

### 1. Generate Your Icon Set
Use a tool like [AppIcon.co](https://appicon.co/) or Adobe Express to generate a complete set of icons from a high-resolution source image (e.g., 1024x1024 PNG).
- **Required**: A full set of Android `mipmap` folders and an iOS `AppIcon.appiconset` package.

### 2. Update Android
1.  Copy your generated `mipmap` folders into `android/app/src/main/res/`.
2.  Ensure `android/app/src/main/AndroidManifest.xml` correctly references these in the `<application>` tag:
    ```xml
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    ```

### 3. Update iOS
1.  Open your project in Xcode: `npx cap open ios`
2.  Navigate to `App` > `App` > `Assets.xcassets` in the Xcode file navigator.
3.  Select `AppIcon`.
4.  Drag and drop your generated iOS icons into the appropriate slots shown in the Xcode interface.
5.  Build the app from Xcode to propagate the change.


To compile a native Windows standalone application:

1.  **Build the Web Application**:
    ```bash
    npm run build
    ```
2.  **Add Electron or Capacitor-Electron Build Support**:
    ```bash
    npm run desktop:build
    ```
3.  **Package into Windows Installer**:
    The electron packager utilizes `electron-builder` to bundle the app assets into a single standalone `Guardian_Tactical_Engine.exe` executable ready for offline Windows deployment.

---

## 🔑 Tactical Credentials (API Keys)

To maintain secure data relays and SMS broadcasts, you **MUST** configure the following keys.

### 🔒 Security and the `dist` Folder
The application architecture is **security-first**. 
- **Server-Side Projection**: All sensitive API keys (Arkesel, SMSOnlineGH, Twilio, Gemini) are handled strictly on the server (`server.ts`).
- **No Client Exposure**: These keys are **NOT** bundled into the `dist/` folder shared with the browser. 
- **Runtime Injection**: Keys are read from the system's environment variables (`process.env`) at execution time.

| Service | Key Variable | Description |
| :--- | :--- | :--- |
| **Arkesel** | `ARKESEL_API_KEY` | Primary SMS relay (emergency broadcasts) |
| **SMSOnlineGH** | `SMS_ONLINE_GH_KEY` | Secondary fallback SMS relay |
| **Twilio** | `TWILIO_ACCOUNT_SID` | Global SMS & Voice fallback |
| **Gemini** | `GEMINI_API_KEY` | AI threat and moderation classification |
| **Firebase** | `VITE_FIREBASE_API_KEY` | Client-side database synchronization |

### 🛠️ Configuration Steps
1. **AI Studio**: Go to **Settings > Secrets** and add `ARKESEL_API_KEY` and `GEMINI_API_KEY`.
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
