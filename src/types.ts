import { type User } from 'firebase/auth';

export enum IncidentType {
  THEFT = 'theft',
  HARASSMENT = 'harassment',
  ACCIDENT = 'accident',
  THREAT = 'threat',
  OTHER = 'other'
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  FALSE_ALARM = 'false_alarm'
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  countryCode?: string;
  phoneNumber?: string;
  bio?: string;
  lastLocation?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  emergencyContacts: EmergencyContact[];
  safetyZones: SafetyZone[];
  isSharingLocation: boolean;
  evidenceSync?: boolean;
  trustedContactIds: string[];
  fakeCallSettings?: FakeCallSettings;
  offlineMaps?: OfflineRegion[];
  customSOSMessage?: string;
  onboardingComplete?: boolean;
  isPrivacyMode?: boolean;
  isOnline?: boolean;
  gender?: 'male' | 'female' | 'other';
  lastSeen?: string;
  voiceSentinelEnabled?: boolean;
  securityOverlayActive?: boolean;
  stealthOverlayActive?: boolean;
  autoCheckInInterval?: number; 
  lastCheckInAt?: string;
  followingIds?: string[];
  followerIds?: string[];
}

export interface OfflineRegion {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  downloadedAt: string;
  sizeMB: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  isVerified: boolean;
  verificationCode?: string;
}

export interface FakeCallSettings {
  callerName: string;
  triggerDelay: number; // in seconds
  voiceType: 'masculine' | 'feminine' | 'neutral';
}

export interface SafetyZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface Incident {
  id: string;
  reporterId: string;
  reporterName?: string;
  type: IncidentType;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  mediaUrls: string[];
  timestamp: string;
  severity: Severity;
  isResolved: boolean;
  aiAnalysis?: string;
}

export interface Alert {
  id: string;
  senderId: string;
  senderName?: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  status: AlertStatus;
  message?: string;
}

export enum PostType {
  UPDATE = 'UPDATE',
  STATUS = 'STATUS',
  CHECK_IN = 'CHECK_IN',
  INTEL = 'INTEL'
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  type: PostType;
  likes: string[];
  timestamp: any;
  lastEdited?: any;
  location?: {
    lat: number;
    lng: number;
    label?: string;
  };
  commentCount?: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  timestamp: any;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any;
  read: boolean;
}

export interface Friendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted';
  timestamp: any;
}
