import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowRight,
  User,
  ShieldAlert,
  Eye,
  EyeOff,
  Activity,
  Check,
  PhoneCall,
  Compass,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle, auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile as updateAuthProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { cn } from '../lib/utils';
import { GuardianLogo } from '../components/GuardianLogo';

// Rotating testimonial or feature showcases for the interactive left panel
const FEATURE_SLIDES = [
  {
    icon: Shield,
    title: "Military-Grade SOS",
    tagline: "SECURE TUNNEL",
    desc: "A single 5-second hold triggers a low-frequency encrypted distress signal routed directly to regional security centers & emergency nodes.",
    color: "from-blue-500 to-indigo-500",
    glow: "shadow-blue-500/10"
  },
  {
    icon: Compass,
    title: "Dynamic Safety Anchors",
    tagline: "GEOFENCING V2",
    desc: "Set localized temporal barriers. If your device departs from the established zone without verification, automatic broadcast takes over.",
    color: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/10"
  },
  {
    icon: PhoneCall,
    title: "AI Security Escort",
    tagline: "TACTICAL DISPATCH",
    desc: "Activate simulated incoming phone calls with real-time neural voices to safely deter threats and navigate vulnerable coordinates.",
    color: "from-purple-500 to-pink-500",
    glow: "shadow-purple-500/10"
  },
  {
    icon: Trophy,
    title: "Safety Academy Rewards",
    tagline: "DEFENDER LEVEL",
    desc: "Gain Defender Points, complete tactical drills, and earn specialized credentials for maintaining proactive security habits.",
    color: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/10"
  }
];

export default function AuthLanding() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const { setLocalMode, isLocalMode, sendWelcomeNotification, sendSignInNotification } = useAuth();

  // Password reset state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Token reset state (for custom SMTP fallback)
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetWithTokenModal, setShowResetWithTokenModal] = useState(false);
  const [resetTokenError, setResetTokenError] = useState<string | null>(null);
  const [resetTokenSuccess, setResetTokenSuccess] = useState<string | null>(null);
  const [resetTokenLoading, setResetTokenLoading] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('resetToken');
    if (token) {
      setResetToken(token);
      setShowResetWithTokenModal(true);
      // Clean up the query param
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // OTP Verification Stage State
  const [otpStage, setOtpStage] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpStatusMessage, setOtpStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setTimeout(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleResetWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setResetTokenError("Please enter your new password.");
      return;
    }
    if (newPassword.length < 6) {
      setResetTokenError("Password must be at least 6 characters.");
      return;
    }
    setResetTokenLoading(true);
    setResetTokenError(null);
    setResetTokenSuccess(null);

    try {
      const response = await fetch("/api/auth/reset-password-with-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: newPassword.trim() })
      });
      const data = await response.json();
      if (data.status === "success") {
        setResetTokenSuccess("Password reset successfully! You can now log in with your new password.");
        setNewPassword('');
        setTimeout(() => {
          setShowResetWithTokenModal(false);
        }, 3000);
      } else {
        throw new Error(data.message || "Failed to reset password.");
      }
    } catch (err: any) {
      console.warn("Token reset handled warning:", err.message || err);
      setResetTokenError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setResetTokenLoading(false);
    }
  };

  const handleSendResetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your email address first.");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    if (isLocalMode) {
      setTimeout(() => {
        setForgotSuccess("Simulation: Password reset link has been successfully simulated for " + forgotEmail.trim() + "!");
        setForgotLoading(false);
      }, 1000);
      return;
    }

    try {
      const response = await fetch("/api/auth/send-custom-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await response.json();
      if (data.status === "success") {
        setForgotSuccess(data.message || "A password reset link has been sent to your email address.");
      } else {
        throw new Error(data.message || "Failed to process password reset request.");
      }
    } catch (err: any) {
      console.warn("Forgot password email dispatch handled warning:", err.message || err);
      setForgotError(err.message || "Failed to send password reset email. Please ensure the email is correct.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Fake live telemetry events to simulate advanced tech network (styled for light mode)
  const [telemetry, setTelemetry] = useState<string[]>([
    "SATELLITE_LINK: Established GPS cluster 14A",
    "NODE_STATUS: All continental relays online",
    "ENCRYPTION: AES-256 session handshakes active"
  ]);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % FEATURE_SLIDES.length);
    }, 6000);

    const telemetryInterval = setInterval(() => {
      const nodes = ["London Hub", "New York Node", "Tokyo Relay", "Sydney Relay", "Berlin Node", "SafeZone 4"];
      const messages = [
        `VERIFICATION: Ping verified at ${nodes[Math.floor(Math.random() * nodes.length)]}`,
        `SATELLITE: GPS coordinates updated (+/- 1.4m)`,
        `SECURITY: Heartbeat handshake succeeded`,
        `ACADEMY: Defender level sync updated`
      ];
      setTelemetry((prev) => {
        const next = [messages[Math.floor(Math.random() * messages.length)], ...prev];
        return next.slice(0, 3);
      });
    }, 4500);

    return () => {
      clearInterval(slideInterval);
      clearInterval(telemetryInterval);
    };
  }, []);

  const passwordStrength = (() => {
    let score = 0;
    const feedback = { label: 'Weak', color: 'bg-neutral-200', textClass: 'text-neutral-400', width: 'w-1/3' };
    if (!password) return feedback;
    
    if (password.length >= 6) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

    if (score === 1) {
      return { label: 'Weak', color: 'bg-red-500', textClass: 'text-red-500', width: 'w-1/3' };
    } else if (score === 2) {
      return { label: 'Medium', color: 'bg-amber-500', textClass: 'text-amber-500', width: 'w-2/3' };
    } else if (score === 3) {
      return { label: 'Strong Security', color: 'bg-emerald-500', textClass: 'text-emerald-500', width: 'w-full' };
    }
    return feedback;
  })();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);
    try {
      setLocalMode(false);
      if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
      }
      
      // Initiate server-side OTP dispatch before doing final Firebase auth
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password, 
          displayName: mode === 'signup' ? displayName : undefined,
          phoneNumber: mode === 'signup' ? phoneNumber.trim() : undefined,
          type: mode 
        })
      });
      const data = await response.json();
      
      if (data.status === "success") {
        setOtpStage(true);
        setOtpCountdown(60);
        setOtpValue('');
        setOtpError(null);
        
        if (data.simulated && data.otp) {
          setOtpStatusMessage(`A secure verification code has been dispatched to ${email}. (Sandbox Code: ${data.otp})`);
        } else {
          setOtpStatusMessage(`A secure verification code has been dispatched to ${email}. Please check your inbox.`);
        }
      } else {
        throw new Error(data.message || "Failed to dispatch verification OTP.");
      }
    } catch (err: any) {
      console.warn("Auth credential dispatch handled warning:", err.message || err);
      let msg = err.message.replace('Firebase: ', '');
      if (err.code === 'auth/operation-not-allowed') {
        msg = "Email registration is currently disabled.";
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "Invalid email or password. Verify details and retry.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "This email is already registered. Please sign in instead.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || otpValue.length !== 6) return;

    setLoading(true);
    setOtpError(null);

    try {
      // 1. Verify OTP with Server API
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otpValue.trim() })
      });
      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(data.message || "Invalid or expired verification code.");
      }

      if (mode === 'signup') {
        // 2. Complete Firebase signup since OTP is verified!
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const nameVal = displayName || 'Operator';
        await updateAuthProfile(userCredential.user, { displayName: nameVal });

        // Save the phone number to user profile document immediately
        try {
          const userRef = doc(db, 'users', userCredential.user.uid);
          await setDoc(userRef, {
            uid: userCredential.user.uid,
            displayName: nameVal,
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            countryCode: 'GH',
            emergencyContacts: [],
            safetyZones: [],
            isSharingLocation: false,
            evidenceSync: true,
            trustedContactIds: [],
            onboardingComplete: false,
            isPrivacyMode: false,
            isOnline: true,
            lastSeen: new Date().toISOString(),
            voiceSentinelEnabled: false,
            securityOverlayActive: false,
            autoCheckInInterval: 0,
            lastCheckInAt: '',
            bio: '',
            gender: 'other',
            customSOSMessage: "EMERGENCY: I need help! My current location is attached.",
            fakeCallSettings: {
              callerName: "Security Dispatch",
              triggerDelay: 5,
              voiceType: 'neutral'
            },
            points: 0,
            badges: [],
            completedChallenges: []
          }, { merge: true });
        } catch (dbErr) {
          console.error("Failed to save phone number to Firestore:", dbErr);
        }

        // Trigger welcome email notification via AuthContext service
        await sendWelcomeNotification(email, nameVal);
      } else {
        // 2. Complete Firebase signin since OTP is verified!
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Trigger signin email notification via AuthContext service
        await sendSignInNotification(email, userCredential.user.displayName || "Operator");
      }

      // Clean up states
      setOtpStage(false);
      setOtpValue('');
      setOtpStatusMessage(null);
    } catch (err: any) {
      console.warn("OTP Verification & Authentication handled warning:", err.message || err);
      let msg = err.message.replace('Firebase: ', '');
      if (err.code === 'auth/email-already-in-use') {
        msg = "This email is already registered. Please sign in instead.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "Invalid credentials. Verify your details and retry.";
      }
      setOtpError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setOtpError(null);
    setOtpStatusMessage(null);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password,
          displayName: mode === 'signup' ? displayName : undefined,
          phoneNumber: mode === 'signup' ? phoneNumber.trim() : undefined,
          type: mode 
        })
      });
      const data = await response.json();
      if (data.status === "success") {
        setOtpCountdown(60);
        setOtpValue('');
        if (data.simulated && data.otp) {
          setOtpStatusMessage(`A fresh verification code has been dispatched to ${email}. (Sandbox Code: ${data.otp})`);
        } else {
          setOtpStatusMessage(`A fresh verification code has been dispatched to ${email}.`);
        }
      } else {
        throw new Error(data.message || "Failed to dispatch verification OTP.");
      }
    } catch (err: any) {
      setOtpError(err.message || "Failed to resend verification OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      setLocalMode(false);
      await signInWithGoogle();
    } catch (err: any) {
      console.warn("Google Auth handled warning:", err.message || err);
      const errStr = (err.message || "").toLowerCase() + " " + (err.code || "").toLowerCase();
      if (errStr.includes("unauthorized") || errStr.includes("domain") || errStr.includes("auth-domain")) {
        setError("Authorized Domain Missing: Please add this current Vercel/custom domain to the 'Authorized Domains' list in your Firebase Console (Authentication > Settings > Authorized Domains).");
      } else {
        setError(`Failed to coordinate Google Auth cluster: ${err.message || "Connection refused"}. (Note: If hosting on Vercel, ensure your Vercel URL is added to your Firebase Console under Authentication > Settings > Authorized Domains).`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-blue-500/10 flex overflow-hidden">
      
      {/* LEFT SIDE: Futuristic Information Pane (Clean elegant off-white background) */}
      <div className="hidden lg:flex lg:w-1/2 bg-white border-r border-neutral-100 flex-col justify-between p-12 relative overflow-hidden shrink-0">
        
        {/* Dynamic Glowing Accents */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500/5 blur-[180px] pointer-events-none rounded-full" />
        <div className="absolute bottom-[-25%] right-[-10%] w-[70%] h-[70%] bg-indigo-500/5 blur-[150px] pointer-events-none rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.005)_1px,transparent_1px)] bg-[size:30px_30px]" />

        {/* Brand/System Identifier */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
            <GuardianLogo size={28} pulsing={true} />
          </div>
          <div>
            <h1 className="font-display font-black text-xl tracking-tight italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 leading-none">
              AI-POWERED HUMAN SAFETY ALERT
            </h1>
            <span className="text-[7px] tracking-widest block font-sans not-italic text-neutral-400 font-black mt-1 uppercase">TACTICAL PERSONAL PROTECTION PROTOCOL</span>
          </div>
        </div>

        {/* Dynamic Feature Slider / Content Container */}
        <div className="my-auto relative z-10 max-w-lg space-y-12">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
                  {FEATURE_SLIDES[activeSlide].tagline}
                </span>
                <div className="h-[1px] flex-1 bg-neutral-100" />
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-display font-black italic tracking-tight uppercase leading-none text-neutral-900">
                  {FEATURE_SLIDES[activeSlide].title}
                </h2>
                <p className="text-neutral-500 text-sm leading-relaxed font-bold italic">
                  {FEATURE_SLIDES[activeSlide].desc}
                </p>
              </div>

              <div className={cn(
                "w-14 h-14 rounded-2xl bg-gradient-to-tr flex items-center justify-center text-white shadow-lg transition-all",
                FEATURE_SLIDES[activeSlide].color,
                FEATURE_SLIDES[activeSlide].glow
              )}>
                {(() => {
                  const Icon = FEATURE_SLIDES[activeSlide].icon;
                  return <Icon size={26} />;
                })()}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-2.5">
            {FEATURE_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === activeSlide ? "w-8 bg-blue-600" : "w-2.5 bg-neutral-200 hover:bg-neutral-300"
                )}
              />
            ))}
          </div>
        </div>

        {/* Live System Telemetry / Live Activity Feeds */}
        <div className="relative z-10 border-t border-neutral-100 pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            <span className="text-[8px] font-black uppercase tracking-[0.25em] text-neutral-400">Global Protection Matrix</span>
          </div>
          <div className="space-y-1.5 font-mono text-[9px] text-neutral-400">
            {telemetry.map((log, i) => (
              <motion.p
                key={`${log}-${i}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1 - i * 0.3, y: 0 }}
                className="flex items-center gap-2 uppercase font-semibold"
              >
                <span className="text-blue-500/60">❯</span>
                <span>{log}</span>
              </motion.p>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT SIDE: Gorgeous High-Contrast White/Light Interactive Auth Module */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative overflow-y-auto bg-neutral-50">
        
        {/* Mobile-Only header elements */}
        <div className="lg:hidden flex flex-col items-center gap-4 text-center mb-8 relative z-10">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 shadow-sm">
            <GuardianLogo size={36} pulsing={true} />
          </div>
          <div>
            <h1 className="font-display font-black text-xl tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              AI-POWERED HUMAN SAFETY ALERT
            </h1>
          </div>
        </div>

        {/* Main Auth Container Card (Brilliant Premium White Card) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[440px] bg-white border border-neutral-200/60 rounded-[40px] p-8 sm:p-10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.03)] relative overflow-hidden"
        >
          {/* Subtle inside shine */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-50 to-transparent" />
          
          <div className="space-y-8">
            
            {/* Form Title & Interactive Sliding Switch Panel */}
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black italic tracking-tight text-neutral-900 uppercase font-display">
                  {otpStage ? 'Verify Email' : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </h2>
                <p className="text-neutral-500 text-xs font-bold leading-relaxed italic">
                  {otpStage 
                    ? `Verification code dispatched to ${email}` 
                    : (mode === 'login' 
                        ? 'Sign in to access your security console' 
                        : 'Create a secure account to protect yourself')}
                </p>
              </div>

              {/* Mode Toggle Tabs */}
              {!otpStage && (
                <div className="relative p-1 bg-neutral-50 border border-neutral-200/50 rounded-2xl flex items-center justify-between">
                  <button
                    onClick={() => { setMode('login'); setError(null); }}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] italic rounded-xl text-center transition-all z-10",
                      mode === 'login' ? "text-neutral-900 bg-white border border-neutral-200 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setMode('signup'); setError(null); }}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] italic rounded-xl text-center transition-all z-10",
                      mode === 'signup' ? "text-neutral-900 bg-white border border-neutral-200 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {otpStage ? (
              /* OTP Verification Form */
              <form onSubmit={handleVerifyOtpAndSignUp} className="space-y-6">
                
                {otpStatusMessage && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-xs italic font-bold">
                    {otpStatusMessage}
                  </div>
                )}

                {otpError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs italic font-bold">
                    {otpError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1 block text-center">
                    6-Digit Verification Code
                  </label>
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setOtpValue(val);
                    }}
                    placeholder="123456"
                    className="w-full h-14 bg-neutral-50 border border-neutral-200 rounded-2xl text-center text-2xl font-mono tracking-[12px] font-black focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-neutral-300 text-neutral-900"
                  />
                  <p className="text-[10px] font-bold text-neutral-500 text-center italic mt-1.5">
                    Don't see the code? Please make sure to check your <strong>Spam</strong> or <strong>Junk</strong> folder.
                  </p>
                </div>

                <div className="space-y-4">
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading || otpValue.length !== 6}
                    className="w-full h-12 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] italic transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? (
                      <>
                        <Activity size={14} className="animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <span>{mode === 'signup' ? 'Verify & Create Account' : 'Verify & Sign In'}</span>
                        <ArrowRight size={14} strokeWidth={3} />
                      </>
                    )}
                  </motion.button>

                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStage(false);
                        setOtpValue('');
                        setError(null);
                        setOtpError(null);
                        setOtpStatusMessage(null);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-600 italic"
                    >
                      ❮ Back to Sign Up
                    </button>

                    {otpCountdown > 0 ? (
                      <span className="text-[10px] font-mono font-black uppercase text-neutral-400 tracking-wider">
                        Resend in {otpCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500 italic"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              </form>
            ) : (
              <>
                {/* Error Notification Alert (Smooth Animation) */}
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs italic"
                    >
                      <ShieldAlert className="shrink-0 text-red-500 mt-0.5" size={16} />
                      <div className="space-y-0.5 animate-pulse">
                        <p className="font-black uppercase tracking-wider text-[10px]">Access Denied</p>
                        <p className="text-red-700 text-[10px] font-bold">{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Auth Credentials Form */}
                <form onSubmit={handleEmailAuth} className="space-y-5">
                  
                  {/* Full Name & Phone Number Input (Signup mode only) */}
                  <AnimatePresence mode="wait">
                    {mode === 'signup' && (
                      <motion.div 
                        key="signup-extra-fields"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-5"
                      >
                        {/* Full Name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Full Name</label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                            <input 
                              type="text" 
                              required
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="e.g. Benjamin Rose"
                              className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-4 text-xs focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-neutral-400 font-bold uppercase italic tracking-wider text-neutral-900"
                            />
                          </div>
                        </div>

                        {/* Telephone Contact */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Contact Telephone</label>
                          <div className="relative group">
                            <PhoneCall className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                            <input 
                              type="tel" 
                              required
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="e.g. 0244123456"
                              className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-4 text-xs focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-neutral-400 font-bold tracking-wider text-neutral-900"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email Input Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-4 text-xs focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-neutral-400 text-neutral-900 font-bold tracking-wider"
                      />
                    </div>
                  </div>

                  {/* Password Input Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Password</label>
                      {mode === 'login' && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setForgotEmail(email);
                            setForgotError(null);
                            setForgotSuccess(null);
                            setShowForgotModal(true);
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500 italic"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-12 text-xs focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-neutral-400 text-neutral-900 font-mono tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Checklist (Interactive for Sign Up) */}
                  <AnimatePresence>
                    {mode === 'signup' && password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 p-3 bg-neutral-50 border border-neutral-200 rounded-2xl"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Pass Security Score</span>
                          <span className={cn("text-[9px] font-black uppercase tracking-widest italic", passwordStrength.textClass)}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        {/* Progress Bar indicator */}
                        <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all duration-500", passwordStrength.color, passwordStrength.width)} />
                        </div>
                        {/* Requirements validation list */}
                        <div className="grid grid-cols-2 gap-y-1.5 pt-1 text-[8px] font-black uppercase tracking-widest">
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-3 h-3 rounded-full flex items-center justify-center shrink-0 border", password.length >= 6 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-neutral-100 text-neutral-400 border-neutral-200")}>
                              <Check size={8} strokeWidth={4} />
                            </div>
                            <span className={password.length >= 6 ? "text-neutral-700 font-extrabold" : "text-neutral-400"}>6+ CHARS</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-3 h-3 rounded-full flex items-center justify-center shrink-0 border", /[0-9]/.test(password) ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-neutral-100 text-neutral-400 border-neutral-200")}>
                              <Check size={8} strokeWidth={4} />
                            </div>
                            <span className={/[0-9]/.test(password) ? "text-neutral-700 font-extrabold" : "text-neutral-400"}>CONTAIN NUM</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-3 h-3 rounded-full flex items-center justify-center shrink-0 border", /[A-Z]/.test(password) ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-neutral-100 text-neutral-400 border-neutral-200")}>
                              <Check size={8} strokeWidth={4} />
                            </div>
                            <span className={/[A-Z]/.test(password) ? "text-neutral-700 font-extrabold" : "text-neutral-400"}>UPPERCASE</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-3 h-3 rounded-full flex items-center justify-center shrink-0 border", /[^A-Za-z0-9]/.test(password) ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-neutral-100 text-neutral-400 border-neutral-200")}>
                              <Check size={8} strokeWidth={4} />
                            </div>
                            <span className={/[^A-Za-z0-9]/.test(password) ? "text-neutral-700 font-extrabold" : "text-neutral-400"}>SPECIAL CHR</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Active Button */}
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-blue-600 text-white rounded-2xl font-black font-sans text-xs uppercase tracking-[0.25em] italic transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 pointer-events-auto"
                  >
                    {loading ? (
                      <>
                        <Activity size={14} className="animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                        <ArrowRight size={14} strokeWidth={3} className="pt-0.5" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Separator Divider */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-[1px] bg-neutral-200" />
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest italic">Or sign in with</span>
                    <div className="flex-1 h-[1px] bg-neutral-200" />
                  </div>

                  {/* Google Social OAuth Button */}
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleGoogleAuth}
                    className="w-full h-12 bg-white border border-neutral-200 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest italic text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all pointer-events-auto shadow-sm"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92(..)?3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </motion.button>
                </div>
              </>
            )}

          </div>
        </motion.div>

        {/* Password Reset Modal Overlay */}
        <AnimatePresence>
          {showForgotModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowForgotModal(false)}
                className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-neutral-100 space-y-6 overflow-hidden text-neutral-900"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-black italic tracking-tighter uppercase text-neutral-900 font-display">Reset Password</h3>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest italic">
                    Enter your email to receive a password reset link
                  </p>
                </div>

                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs italic font-bold">
                    {forgotError}
                  </div>
                )}

                {forgotSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs italic font-bold">
                    {forgotSuccess}
                  </div>
                )}

                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Account Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-xs focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-neutral-400 text-neutral-900 font-bold tracking-wider"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 h-11 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={forgotLoading}
                      className="flex-[2] h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                    >
                      {forgotLoading ? <Activity size={12} className="animate-spin" /> : "Send Reset Link"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {showResetWithTokenModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowResetWithTokenModal(false)}
                className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-neutral-100 space-y-6 overflow-hidden text-neutral-900"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-black italic tracking-tighter uppercase text-neutral-900 font-display">Choose New Password</h3>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest italic">
                    Establish your secure profile credentials
                  </p>
                </div>

                {resetTokenError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs italic font-bold">
                    {resetTokenError}
                  </div>
                )}

                {resetTokenSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs italic font-bold">
                    {resetTokenSuccess}
                  </div>
                )}

                <form onSubmit={handleResetWithToken} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">New Password</label>
                    <input 
                      type="password" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-xs focus:bg-white focus:border-blue-600 outline-none transition-all text-neutral-900 font-mono tracking-widest"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowResetWithTokenModal(false)}
                      className="flex-1 h-11 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={resetTokenLoading}
                      className="flex-[2] h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                    >
                      {resetTokenLoading ? <Activity size={12} className="animate-spin" /> : "Save Password"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer info/Terms */}
        <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 opacity-40 text-[9px] font-black uppercase tracking-[0.2em] relative z-10 text-neutral-500 text-center px-4">
          <p>© 2026 GUARDIAN PLATFORM</p>
          <p className="hover:text-blue-600 cursor-pointer">Security Protocol</p>
          <p className="hover:text-blue-600 cursor-pointer">Satellite Operations</p>
        </div>

      </div>

    </div>
  );
}
