import { useState, useEffect } from 'react';
import { 
  Award, 
  Trophy, 
  Compass, 
  MapPin, 
  Users, 
  Clock, 
  Send, 
  BookOpen, 
  Lock, 
  CheckCircle, 
  ArrowRight, 
  Flame, 
  ShieldAlert, 
  Sparkles,
  Zap,
  Star,
  Activity,
  UserCheck
} from 'lucide-react';
import { collection, query, limit, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: any;
  category: 'onboarding' | 'intel' | 'verification' | 'action';
  checkCondition: (profile: any) => boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  pointsRequired?: number;
  conditionDescription: string;
  icon: any;
  color: string;
}

export default function AcademyPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { user, profile, updateProfile, isLocalMode } = useAuth();
  const [tipText, setTipText] = useState('');
  const [isPostingTip, setIsPostingTip] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'challenges' | 'leaderboard' | 'badges'>('challenges');
  const [leaderboardUsers, setLeaderboardUsers] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [claimAnimateId, setClaimAnimateId] = useState<string | null>(null);

  // Define static safety challenges
  const challenges: Challenge[] = [
    {
      id: 'emergency-contacts',
      title: 'Emergency Circle',
      description: 'Register at least 2 trusted emergency contacts to alert in critical times.',
      points: 150,
      icon: Users,
      category: 'onboarding',
      checkCondition: (p) => p?.emergencyContacts && p.emergencyContacts.length >= 2,
    },
    {
      id: 'safety-zone',
      title: 'Establish Safe Harbor',
      description: 'Setup a custom GPS safety perimeter (Safety Zone) around your home or workplace.',
      points: 100,
      icon: MapPin,
      category: 'onboarding',
      checkCondition: (p) => p?.safetyZones && p.safetyZones.length > 0,
    },
    {
      id: 'offline-maps',
      title: 'Off-grid Offload',
      description: 'Download at least 1 offline regional map to ensure survival guidance without internet.',
      points: 120,
      icon: Compass,
      category: 'action',
      checkCondition: (p) => p?.offlineMaps && p.offlineMaps.length > 0,
    },
    {
      id: 'custom-sos',
      title: 'Tactical Distress Signal',
      description: 'Customize your standard SOS alert broadcast message with specific instructions.',
      points: 80,
      icon: ShieldAlert,
      category: 'onboarding',
      checkCondition: (p) => p?.customSOSMessage && p.customSOSMessage !== 'EMERGENCY: I need help! My current location is attached.',
    },
    {
      id: 'safety-checkin',
      title: 'Sentinel Check-In',
      description: 'Successfully initiate a manual or automated check-in timer to log your status.',
      points: 100,
      icon: Clock,
      category: 'action',
      checkCondition: (p) => p?.lastCheckInAt && p.lastCheckInAt !== '',
    },
    {
      id: 'intel-tip',
      title: 'Community Intel Sherpa',
      description: 'Share a critical safety tip or initiative directly with the community feed below.',
      points: 100,
      icon: Sparkles,
      category: 'intel',
      checkCondition: (p) => p?.completedChallenges?.includes('intel-tip'),
    },
    {
      id: 'mock-test',
      title: 'Dry-Run Readiness Test',
      description: 'Verify your panic countermeasures by completing a Mock Call configuration test.',
      points: 80,
      icon: Activity,
      category: 'action',
      checkCondition: (p) => p?.completedChallenges?.includes('mock-test'),
    }
  ];

  // Define badges
  const badges: Badge[] = [
    {
      id: 'vanguard_scout',
      name: 'Vanguard Scout',
      description: 'First steps in establishing proactive regional safety protocols.',
      pointsRequired: 100,
      conditionDescription: 'Earn 100 total safety points',
      icon: Compass,
      color: 'from-emerald-400 to-teal-500'
    },
    {
      id: 'sentinel_shield',
      name: 'Sentinel Shield',
      description: 'A respected protector equipped with durable backup networks.',
      pointsRequired: 300,
      conditionDescription: 'Earn 300 total safety points',
      icon: Award,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'apex_guardian',
      name: 'Apex Guardian',
      description: 'Distinguished citizen demonstrating peerless security awareness.',
      pointsRequired: 600,
      conditionDescription: 'Earn 600 total safety points',
      icon: Trophy,
      color: 'from-amber-400 to-orange-500'
    },
    {
      id: 'first_responder',
      name: 'First Responder',
      description: 'Demonstrated rapid engagement and reporting of safety incidents.',
      conditionDescription: 'Claim the reported local threat challenge',
      icon: ShieldAlert,
      color: 'from-rose-500 to-red-600'
    },
    {
      id: 'mapmaker',
      name: 'Survival Specialist',
      description: 'Ready to operate in complete communication blackout zones.',
      conditionDescription: 'Claim the Off-grid Offload challenge',
      icon: Zap,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      id: 'intel_marshal',
      name: 'Intel Marshal',
      description: 'Contributed directly to safety education and community-driven intel sharing.',
      conditionDescription: 'Share a safety tip with the community',
      icon: Star,
      color: 'from-cyan-400 to-blue-500'
    }
  ];

  // Load leaderboard from firestore
  useEffect(() => {
    if (isLocalMode) {
      // Offline mode mock leaderboard
      const mockUsers = [
        { uid: 'u1', displayName: 'Aegis_Supervisor', points: 720, badges: ['vanguard_scout', 'sentinel_shield', 'apex_guardian'] },
        { uid: 'u2', displayName: 'Sentinel_Beta', points: 450, badges: ['vanguard_scout', 'sentinel_shield', 'mapmaker'] },
        { uid: 'u3', displayName: 'Grid_Navigator', points: 310, badges: ['vanguard_scout', 'sentinel_shield'] },
        { uid: 'local-user', displayName: profile?.displayName || 'Local User', points: profile?.points || 0, badges: profile?.badges || [] },
        { uid: 'u4', displayName: 'Citizen_Alpha', points: 150, badges: ['vanguard_scout'] },
      ];
      // Sort
      mockUsers.sort((a, b) => b.points - a.points);
      setLeaderboardUsers(mockUsers);
      setLoadingLeaderboard(false);
      return;
    }

    setLoadingLeaderboard(true);
    const q = query(
      collection(db, 'users'),
      orderBy('points', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));

      // If database has very few profiles, enrich with friendly companion profiles
      if (usersList.length < 5) {
        const companions = [
          { uid: 'c1', displayName: 'Aegis_Director', points: 820, badges: ['vanguard_scout', 'sentinel_shield', 'apex_guardian'] },
          { uid: 'c2', displayName: 'Grid_Guardian', points: 540, badges: ['vanguard_scout', 'sentinel_shield', 'mapmaker'] },
          { uid: 'c3', displayName: 'Tactical_Beta', points: 320, badges: ['vanguard_scout', 'sentinel_shield'] },
          { uid: 'c4', displayName: 'Rescue_Scout', points: 150, badges: ['vanguard_scout'] },
        ];
        
        // Merge without repeating current user
        const merged = [...usersList];
        companions.forEach(comp => {
          if (!merged.some((u: any) => u.uid === comp.uid || u.displayName === comp.displayName)) {
            merged.push(comp);
          }
        });
        merged.sort((a: any, b: any) => (b.points || 0) - (a.points || 0));
        setLeaderboardUsers(merged);
      } else {
        setLeaderboardUsers(usersList);
      }
      setLoadingLeaderboard(false);
    }, (error) => {
      console.warn("Silent fallback for leaderboard on snapshot (likely fresh database index restriction):", error);
      // Fetch with simple getDocs or mock if indexes are still provisioning
      getDocs(collection(db, 'users'))
        .then((snapshot) => {
          const list = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
          list.sort((a: any, b: any) => (b.points || 0) - (a.points || 0));
          setLeaderboardUsers(list.slice(0, 10));
          setLoadingLeaderboard(false);
        })
        .catch((err) => {
          handleFirestoreError(err, OperationType.LIST, 'users');
          setLoadingLeaderboard(false);
        });
    });

    return () => unsub();
  }, [user, profile?.points, profile?.displayName, isLocalMode]);

  // Audio synthesizer for feedback sound
  const playClaimSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Play major success arpeggio
      const now = ctx.currentTime;
      playNote(523.25, now, 0.15); // C5
      playNote(659.25, now + 0.1, 0.15); // E5
      playNote(783.99, now + 0.2, 0.15); // G5
      playNote(1046.50, now + 0.3, 0.4); // C6
    } catch (e) {
      console.warn("Web Audio not supported or blocked:", e);
    }
  };

  const playHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 200]);
    }
  };

  // Claim points reward for a completed challenge
  const handleClaimReward = async (challengeId: string, points: number) => {
    if (!profile) return;
    
    setClaimAnimateId(challengeId);
    playClaimSound();
    playHaptic();

    // Compute updated lists
    const currentPoints = profile.points || 0;
    const completed = profile.completedChallenges || [];
    const currentBadges = profile.badges || [];

    const nextPoints = currentPoints + points;
    const nextCompleted = [...completed, challengeId];
    
    // Check badge rewards triggered by this point milestone or specific challenges
    const unlockedBadges = [...currentBadges];
    badges.forEach(b => {
      if (unlockedBadges.includes(b.id)) return;
      
      // Point milestone badges
      if (b.pointsRequired && nextPoints >= b.pointsRequired) {
        unlockedBadges.push(b.id);
      }
      
      // Special action badges
      if (b.id === 'mapmaker' && challengeId === 'offline-maps') {
        unlockedBadges.push(b.id);
      }
      if (b.id === 'intel_marshal' && challengeId === 'intel-tip') {
        unlockedBadges.push(b.id);
      }
    });

    try {
      await updateProfile({
        points: nextPoints,
        completedChallenges: nextCompleted,
        badges: unlockedBadges
      });

      // Show toast / notification
      setTimeout(() => setClaimAnimateId(null), 1000);
    } catch (e) {
      console.error("Claim reward failed:", e);
    }
  };

  // Submit community safety intel tip
  const handlePostTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tipText.trim()) return;

    setIsPostingTip(true);
    try {
      // 1. Post to 'posts' collection as an INTEL tip
      if (!isLocalMode) {
        await addDoc(collection(db, 'posts'), {
          authorId: user.uid,
          authorName: profile?.displayName || user.displayName || 'Guardian Operator',
          authorPhoto: (profile?.photoURL && profile.photoURL.length > 5) ? profile.photoURL : (user.photoURL || ''),
          content: `COMMUNITY SAFETY TIP: ${tipText.trim()}`,
          type: 'INTEL',
          likes: [],
          commentCount: 0,
          timestamp: serverTimestamp()
        });
      }

      // 2. Automatically grant points & award completed challenge
      const currentPoints = profile?.points || 0;
      const completed = profile?.completedChallenges || [];
      const currentBadges = profile?.badges || [];

      const nextPoints = currentPoints + 100; // Challenge completion gives 100 points
      const nextCompleted = [...completed, 'intel-tip'];
      
      const unlockedBadges = [...currentBadges];
      if (!unlockedBadges.includes('intel_marshal')) {
        unlockedBadges.push('intel_marshal');
      }
      badges.forEach(b => {
        if (b.pointsRequired && nextPoints >= b.pointsRequired && !unlockedBadges.includes(b.id)) {
          unlockedBadges.push(b.id);
        }
      });

      await updateProfile({
        points: nextPoints,
        completedChallenges: nextCompleted,
        badges: unlockedBadges
      });

      playClaimSound();
      playHaptic();
      setTipText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'posts');
    } finally {
      setIsPostingTip(false);
    }
  };

  const userPoints = profile?.points || 0;
  const userLevel = Math.floor(userPoints / 200) + 1;
  const nextLevelPoints = userLevel * 200;
  const prevLevelPoints = (userLevel - 1) * 200;
  const levelProgress = Math.min(((userPoints - prevLevelPoints) / 200) * 100, 100);

  return (
    <div className="w-full space-y-8 pb-20 relative font-sans text-neutral-900">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 right-0 w-[80%] h-[40%] bg-blue-50/50 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[60%] h-[40%] bg-amber-50/40 blur-[100px] pointer-events-none" />

      {/* Title Header */}
      <section className="relative z-10 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
            <Trophy size={20} />
          </div>
          <div>
            <h2 className="text-xl font-display font-black tracking-tighter italic uppercase leading-none">
              GUARDIAN ACADEMY
            </h2>
            <p className="text-[9px] font-mono font-black uppercase text-neutral-400 tracking-widest mt-1">
              Safety Gamification & Community Hub
            </p>
          </div>
        </div>

        <button 
          onClick={() => setActiveTab('home')}
          className="text-[10px] font-black uppercase bg-neutral-900 text-white hover:bg-neutral-800 px-4 py-2 rounded-xl transition-all shadow-md"
        >
          Return
        </button>
      </section>

      {/* Operator Rank HUD Card */}
      <motion.section 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative p-8 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-[40px] border border-white/5 shadow-2xl overflow-hidden group"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.1)_0%,_transparent_70%)]" />
        <div className="absolute top-0 right-0 p-8 text-neutral-500 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <Award size={120} />
        </div>

        <div className="space-y-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-black text-amber-400 tracking-[0.3em] uppercase">LEVEL {userLevel} OPERATOR</span>
              <h3 className="text-2xl font-display font-black tracking-tight uppercase italic leading-none">
                {profile?.displayName || 'Guardian Cadet'}
              </h3>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                {userPoints}
              </span>
              <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">TOTAL POINTS</span>
            </div>
          </div>

          {/* Level Progress Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
              <span>LVL {userLevel}</span>
              <span>{userPoints} / {nextLevelPoints} PTS TO LEVEL {userLevel + 1}</span>
            </div>
            <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden p-[2px] border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-400 rounded-full"
                transition={{ duration: 1 }}
              />
            </div>
          </div>

          {/* Stats Badges Bar */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
              <Award size={14} className="text-amber-400" />
              <span>UNLOCKED BADGES: {profile?.badges?.length || 0}</span>
            </div>
            <div className="flex gap-1">
              {(profile?.badges || []).slice(0, 4).map((badgeId, i) => {
                const badgeInfo = badges.find(b => b.id === badgeId);
                const BadgeIcon = badgeInfo?.icon || Award;
                return (
                  <div key={i} title={badgeInfo?.name} className="w-7 h-7 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center text-amber-400">
                    <BadgeIcon size={14} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Tabs Menu */}
      <section className="relative z-10 flex border-2 border-neutral-100 rounded-2xl p-1 bg-white shadow-sm">
        {(['challenges', 'badges', 'leaderboard'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={cn(
              "flex-1 py-3 px-1 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all",
              activeSubTab === tab 
                ? "bg-neutral-900 text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            {tab}
          </button>
        ))}
      </section>

      {/* Sub tabs view */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'challenges' && (
          <motion.div 
            key="challenges-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 relative z-10"
          >
            {/* Header Description */}
            <div className="p-5 bg-white border border-neutral-100 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Compass size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-neutral-900 tracking-tight italic">Active Safety Missions</h4>
                <p className="text-[10px] text-neutral-400 font-bold tracking-wide">
                  Complete these safety initiatives to earn points, secure your environment, and rise through the Sentinel ranks.
                </p>
              </div>
            </div>

            {/* Challenges List */}
            <div className="space-y-4">
              {challenges.map((challenge) => {
                const isClaimed = profile?.completedChallenges?.includes(challenge.id);
                const isConditionMet = challenge.checkCondition(profile);
                const isClaimable = isConditionMet && !isClaimed;
                const ChallengeIcon = challenge.icon;

                return (
                  <motion.div
                    key={challenge.id}
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      "p-5 bg-white border rounded-[32px] flex flex-col items-stretch gap-4 shadow-sm relative overflow-hidden transition-all",
                      isClaimed ? "opacity-60 border-neutral-100" : 
                      isClaimable ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-50/10" : "border-neutral-100"
                    )}
                  >
                    {/* Animated shine overlay for claimable state */}
                    {isClaimable && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={cn(
                          "p-4 rounded-2xl shrink-0 transition-transform duration-500",
                          isClaimed ? "bg-neutral-100 text-neutral-400" :
                          isClaimable ? "bg-emerald-100 text-emerald-600 border border-emerald-200" :
                          "bg-blue-50 text-blue-600 border border-blue-100"
                        )}>
                          <ChallengeIcon size={20} />
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-black text-sm text-neutral-900 tracking-tight italic uppercase leading-none">
                              {challenge.title}
                            </h4>
                            <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded shrink-0">
                              +{challenge.points} PTS
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-500 font-bold leading-relaxed italic uppercase tracking-wider">
                            {challenge.description}
                          </p>
                        </div>
                      </div>

                      {/* Call to action */}
                      <div className="w-full sm:w-auto shrink-0 flex items-center justify-end pt-2 sm:pt-0 border-t border-neutral-100 sm:border-t-0">
                        {isClaimed ? (
                          <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-neutral-400 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                            <CheckCircle size={12} className="text-neutral-500" />
                            <span>Claimed</span>
                          </div>
                        ) : isClaimable ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleClaimReward(challenge.id, challenge.points)}
                            disabled={claimAnimateId === challenge.id}
                            className="w-full sm:w-auto flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer relative overflow-hidden"
                          >
                            {claimAnimateId === challenge.id ? (
                              <span className="flex items-center gap-1 animate-pulse">
                                Processing...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Sparkles size={12} />
                                Claim Reward
                              </span>
                            )}
                          </motion.button>
                        ) : (
                          <div className="w-full sm:w-auto flex items-center justify-center gap-1 text-neutral-400 border border-neutral-200 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                            <Lock size={10} />
                            <span>Locked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Intel Tip Share Mini-Station */}
            {!profile?.completedChallenges?.includes('intel-tip') && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white border border-blue-100 rounded-[40px] shadow-sm space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-neutral-900 tracking-tight italic">Share Safety Tips with the Network</h4>
                    <p className="text-[8px] text-neutral-400 font-black uppercase tracking-widest">Instant +100 PTS and claim the Intel Sherpa Badge</p>
                  </div>
                </div>

                <form onSubmit={handlePostTip} className="space-y-4">
                  <textarea
                    value={tipText}
                    onChange={(e) => setTipText(e.target.value)}
                    placeholder="E.g., High-water advisory at West River Road. Streetlights currently down around Central Square..."
                    className="w-full p-4 text-xs font-bold italic bg-neutral-50 rounded-2xl border border-neutral-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    rows={3}
                    maxLength={300}
                    required
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">{tipText.length}/300 chars</span>
                    <button
                      type="submit"
                      disabled={isPostingTip || !tipText.trim()}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-200 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      {isPostingTip ? (
                        <span>Publishing...</span>
                      ) : (
                        <>
                          <span>Share & Earn</span>
                          <Send size={10} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'badges' && (
          <motion.div 
            key="badges-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 relative z-10"
          >
            {/* Header Badge Progress */}
            <div className="p-5 bg-white border border-neutral-100 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Award size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-neutral-900 tracking-tight italic">Aegis Medallions</h4>
                <p className="text-[10px] text-neutral-400 font-bold tracking-wide">
                  Your distinguished honors and tactical safety badges. Keep completing challenges to fill your showcase.
                </p>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 gap-4">
              {badges.map((badge) => {
                const isUnlocked = profile?.badges?.includes(badge.id);
                const BadgeIcon = badge.icon;

                return (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: isUnlocked ? 1.03 : 1 }}
                    className={cn(
                      "p-6 bg-white border rounded-[36px] flex flex-col items-center text-center gap-4 shadow-sm relative overflow-hidden transition-all",
                      isUnlocked 
                        ? `border-amber-200 bg-gradient-to-b from-white to-amber-50/10 shadow-[0_8px_20px_rgba(245,158,11,0.08)]` 
                        : "border-neutral-100 opacity-60"
                    )}
                  >
                    {/* Glow ring for unlocked */}
                    {isUnlocked && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent opacity-50" />
                    )}

                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative z-10",
                      isUnlocked 
                        ? `bg-gradient-to-tr ${badge.color} text-white` 
                        : "bg-neutral-100 text-neutral-300"
                    )}>
                      {isUnlocked ? (
                        <BadgeIcon size={24} className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.15)] animate-pulse" />
                      ) : (
                        <Lock size={18} />
                      )}
                    </div>

                    <div className="space-y-1 relative z-10">
                      <h4 className={cn(
                        "text-xs font-black tracking-tight uppercase leading-none italic",
                        isUnlocked ? "text-neutral-900" : "text-neutral-400"
                      )}>
                        {badge.name}
                      </h4>
                      <p className="text-[9px] text-neutral-400 font-bold leading-relaxed line-clamp-2 italic uppercase">
                        {isUnlocked ? badge.description : badge.conditionDescription}
                      </p>
                    </div>

                    {isUnlocked ? (
                      <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[8px] font-black uppercase tracking-widest relative z-10">
                        UNLOCKED
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-neutral-100 text-neutral-400 rounded-full text-[8px] font-black uppercase tracking-widest">
                        LOCKED
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'leaderboard' && (
          <motion.div 
            key="leaderboard-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 relative z-10"
          >
            {/* Podium for top 3 */}
            {!loadingLeaderboard && leaderboardUsers.length >= 3 && (
              <div className="flex justify-around items-end pt-10 pb-4 bg-white border border-neutral-100 rounded-[40px] shadow-sm px-4">
                {/* 2nd Place */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl border-4 border-slate-300 overflow-hidden shadow-md bg-neutral-100">
                      <img 
                        src={leaderboardUsers[1]?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(leaderboardUsers[1]?.uid || 'user2')}`} 
                        alt={leaderboardUsers[1]?.displayName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-xs font-black shadow-sm">
                      🥈
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-neutral-900 tracking-tight italic uppercase max-w-[80px] truncate">
                      {leaderboardUsers[1]?.displayName || 'Operator'}
                    </p>
                    <p className="text-[9px] font-mono font-black text-neutral-400">
                      {leaderboardUsers[1]?.points || 0} PTS
                    </p>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center gap-2 -translate-y-4">
                  <div className="relative">
                    <div className="w-18 h-18 rounded-[24px] border-4 border-yellow-400 overflow-hidden shadow-xl shadow-yellow-500/10 bg-neutral-100">
                      <img 
                        src={leaderboardUsers[0]?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(leaderboardUsers[0]?.uid || 'user1')}`} 
                        alt={leaderboardUsers[0]?.displayName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -top-4 -right-3 w-9 h-9 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center text-sm font-black shadow-md animate-bounce">
                      👑
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-neutral-900 tracking-tight italic uppercase max-w-[100px] truncate">
                      {leaderboardUsers[0]?.displayName || 'Aegis'}
                    </p>
                    <p className="text-[10px] font-mono font-black text-amber-500">
                      {leaderboardUsers[0]?.points || 0} PTS
                    </p>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl border-4 border-orange-300 overflow-hidden shadow-sm bg-neutral-100">
                      <img 
                        src={leaderboardUsers[2]?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(leaderboardUsers[2]?.uid || 'user3')}`} 
                        alt={leaderboardUsers[2]?.displayName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center text-[10px] font-black shadow-sm">
                      🥉
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-neutral-900 tracking-tight italic uppercase max-w-[70px] truncate">
                      {leaderboardUsers[2]?.displayName || 'Sentinel'}
                    </p>
                    <p className="text-[8px] font-mono font-black text-neutral-400">
                      {leaderboardUsers[2]?.points || 0} PTS
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard list */}
            <div className="p-6 bg-white border border-neutral-100 rounded-[40px] shadow-sm space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Users size={16} className="text-blue-500" />
                <h4 className="text-xs font-black uppercase text-neutral-900 tracking-tight italic">Global Safety Leaderboard</h4>
              </div>

              {loadingLeaderboard ? (
                <div className="py-12 text-center text-neutral-400 font-bold uppercase tracking-widest animate-pulse">
                  Querying Tactical Leaderboard...
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboardUsers.map((lbUser, idx) => {
                    const isCurrentUser = lbUser.uid === user?.uid;
                    return (
                      <div 
                        key={lbUser.uid}
                        className={cn(
                          "p-4 rounded-2xl flex items-center gap-4 transition-all",
                          isCurrentUser 
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100 shadow-sm scale-[1.01]" 
                            : "bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-100"
                        )}
                      >
                        {/* Rank */}
                        <div className="w-6 text-center font-mono font-black italic text-xs text-neutral-400 shrink-0">
                          #{idx + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-xl bg-neutral-200 overflow-hidden shrink-0">
                          <img 
                            src={lbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(lbUser.uid || 'user')}`} 
                            alt={lbUser.displayName} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs font-black tracking-tight uppercase italic truncate",
                            isCurrentUser ? "text-blue-700 font-black" : "text-neutral-800"
                          )}>
                            {lbUser.displayName || 'Guardian Operator'}
                            {isCurrentUser && <span className="text-[8px] bg-blue-600 text-white ml-2 px-1.5 py-0.5 rounded uppercase tracking-widest font-sans font-black">YOU</span>}
                          </p>
                          <div className="flex gap-1 mt-1">
                            {(lbUser.badges || []).slice(0, 3).map((badgeId: string, idxBadge: number) => {
                              const bInfo = badges.find(b => b.id === badgeId);
                              const BIcon = bInfo?.icon || Award;
                              return (
                                <div key={idxBadge} title={bInfo?.name} className="w-4 h-4 rounded bg-white border border-neutral-100 flex items-center justify-center text-[8px] text-amber-500">
                                  <BIcon size={10} />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Points display */}
                        <div className="text-right shrink-0">
                          <span className={cn(
                            "text-sm font-mono font-black",
                            isCurrentUser ? "text-blue-600" : "text-neutral-700"
                          )}>
                            {lbUser.points || 0}
                          </span>
                          <span className="text-[8px] font-black text-neutral-400 block tracking-widest uppercase leading-none">PTS</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
