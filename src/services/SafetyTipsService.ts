export interface SafetyTip {
  id: string;
  title: string;
  category: string;
  content: string;
  actionItem: string;
}

export interface SchedulerConfig {
  enabled: boolean;
  time: string; // "HH:MM"
  lastSentDate: string | null; // "YYYY-MM-DD"
  receivedTipIds: string[];
}

export const SAFETY_TIPS: SafetyTip[] = [
  {
    id: "tip_1",
    title: "The 10-Foot Boundary Check",
    category: "SITUATIONAL AWARENESS",
    content: "Observe a 10-foot boundary around your entry points. Before unlocking your door or exiting your vehicle, pause for 3 seconds to scan the immediate perimeter for anomalies.",
    actionItem: "Action: Pause and scan before entering or exiting transit transition spaces."
  },
  {
    id: "tip_2",
    title: "Offline Communications Plan",
    category: "EMERGENCY PLANNING",
    content: "When navigating low-signal environments, preload the local offline database maps. Your safety console relies on local device registers and cached responder protocols.",
    actionItem: "Action: Open 'Offline Numbers' and update the region cached directory."
  },
  {
    id: "tip_3",
    title: "Maintaining the Reaction Gap",
    category: "PHYSICAL SECURITY",
    content: "Keep at least two arms' lengths of distance when conversing with strangers. This reaction gap provides the precious fraction of a second needed to evade an unexpected threat.",
    actionItem: "Action: Be conscious of your physical spacing in transition points today."
  },
  {
    id: "tip_4",
    title: "The PACE Escape Framework",
    category: "EMERGENCY PLANNING",
    content: "Designate a Primary, Alternate, Contingency, and Emergency (PACE) evacuation route for your daily commute. Ensure your priority contacts are aware of your Alternate option.",
    actionItem: "Action: Identify a secondary route to your primary residence today."
  },
  {
    id: "tip_5",
    title: "EXIF Metadata Sanitization",
    category: "DIGITAL FORENSICS",
    content: "Disable automatic geolocation tags on your mobile camera app. Shared photos carry precise lat/long coordinates that bad actors can use to compile your daily route maps.",
    actionItem: "Action: Inspect your device's camera settings and turn off geotagging."
  },
  {
    id: "tip_6",
    title: "Instant Vehicle Lock Protocol",
    category: "SITUATIONAL AWARENESS",
    content: "Immediately lock your doors the moment you enter your vehicle—do not wait to check your phone or enter GPS settings first. Keep windows rolled up at least 90% in heavy traffic.",
    actionItem: "Action: Make door-locking the absolute first step of your vehicle startup routine."
  },
  {
    id: "tip_7",
    title: "Strategic Transit Positioning",
    category: "URBAN MOVEMENT",
    content: "When riding public transit, position yourself near the conductor, emergency pull-chords, or emergency exit doorways. Avoid the extreme ends of train cars.",
    actionItem: "Action: Mind your positioning on public platforms and trains."
  },
  {
    id: "tip_8",
    title: "Active Perimeter Hardening",
    category: "HOME SECURITY",
    content: "Ensure all external entry doors utilize secondary security deadbolts or physical door jammer braces. Standard smart locks are vulnerable to structural bypass and physical lockpicking.",
    actionItem: "Action: Check that primary deadbolts are engaged before retiring for the night."
  },
  {
    id: "tip_9",
    title: "Storm Surge & Flood Evacuation",
    category: "ENVIRONMENTAL THREATS",
    content: "During sudden high-precipitation advisories, seek vertical elevations immediately. Avoid sub-surface parking structures or attempting to cross standing pools of water.",
    actionItem: "Action: Review safety zones and local elevated emergency structures."
  },
  {
    id: "tip_10",
    title: "Transition Space Mindfulness",
    category: "SITUATIONAL AWARENESS",
    content: "Elevators, stairwells, and dimly lit garages are high-risk transition spaces. Keep your head up, avoid screen distractions, and remove at least one earphone to listen for footsteps.",
    actionItem: "Action: Keep devices pocketed while traversing parking structures and elevators."
  },
  {
    id: "tip_11",
    title: "Unseen SOS Press Orientation",
    category: "COVERT SOS",
    content: "The 5-second long-press SOS does not require screen visibility. Familiarize yourself with the physical placement of the central alert pad to trigger discreet signals without look cues.",
    actionItem: "Action: Visit the SOS terminal and muscle-memorize the press trigger placement."
  },
  {
    id: "tip_12",
    title: "Identify Nearest Secondary Exits",
    category: "SITUATIONAL AWARENESS",
    content: "Whenever stepping into a new restaurant, bar, or building, proactively locate two escape paths. Often, service corridors or kitchen exits are the safest way out in active emergencies.",
    actionItem: "Action: Make exit-spotting a subconscious habit upon entering public indoor locations."
  },
  {
    id: "tip_13",
    title: "First Aid & Tourniquet Primer",
    category: "TACTICAL MEDICINE",
    content: "A bleeding-control utility is the single most valuable asset in your field pack. Learn the general placements of pressure application points on upper and lower limbs.",
    actionItem: "Action: Ensure your trauma pack is stocked and stored in an accessible compartment."
  },
  {
    id: "tip_14",
    title: "Municipal Blue-Light Coordinates",
    category: "TACTICAL URBANISM",
    content: "Scan your daily path for municipal blue-light emergency columns or high-resolution street safety cameras. Know where these safe points lie relative to your commute.",
    actionItem: "Action: Mentally map out the positions of security points on your route today."
  },
  {
    id: "tip_15",
    title: "The Secure Handshake Passphrase",
    category: "EMERGENCY PLANNING",
    content: "Define a safe, natural-sounding duress word with your trusted contacts (e.g., 'Have you seen that blue notebook?'). It signals extreme distress without escalating tension with a captor.",
    actionItem: "Action: Draft and coordinate a simple family/contact code word tonight."
  }
];

const CONFIG_KEY = "daily_safety_tips_config";
const HISTORY_KEY = "daily_safety_tips_history";

export const getSchedulerConfig = (): SchedulerConfig => {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // use default
    }
  }
  return {
    enabled: true,
    time: "09:00",
    lastSentDate: null,
    receivedTipIds: []
  };
};

export const saveSchedulerConfig = (config: SchedulerConfig): void => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const getReceivedTipsHistory = (): { tipId: string; sentAt: string }[] => {
  const saved = localStorage.getItem(HISTORY_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // use default
    }
  }
  return [];
};

export const addTipToHistory = (tipId: string): void => {
  const history = getReceivedTipsHistory();
  const entry = { tipId, sentAt: new Date().toISOString() };
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...history]));
};

export const clearTipsHistory = (): void => {
  localStorage.removeItem(HISTORY_KEY);
  const config = getSchedulerConfig();
  config.receivedTipIds = [];
  config.lastSentDate = null;
  saveSchedulerConfig(config);
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
};

export const sendBrowserNotification = (title: string, message: string): void => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: message,
        icon: "/shield-logo-placeholder.png" // Fallback icon path
      });
    } catch (err) {
      console.error("Failed to trigger native Notification:", err);
    }
  }
};
