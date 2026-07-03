import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Search, 
  ChevronLeft, 
  MoreVertical, 
  Shield, 
  CheckCheck, 
  Lock,
  MessageSquare,
  Loader2,
  Trash2,
  Phone,
  Video,
  User
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  updateDoc,
  limit,
  or,
  and
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Message, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface MessagesPageProps {
  recipientId?: string;
  setActiveTab: (tab: string) => void;
}

export default function MessagesPage({ recipientId, setActiveTab }: MessagesPageProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<{ user: UserProfile, lastMessage?: Message }[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConv, setIsLoadingConv] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Recipients if recipientId is provided
  useEffect(() => {
    if (recipientId) {
      const fetchRecipient = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'users', recipientId));
          if (docSnap.exists()) {
            setSelectedRecipient(docSnap.data() as UserProfile);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchRecipient();
    }
  }, [recipientId]);

  // Load Conversations List
  useEffect(() => {
    if (!user) return;

    // This is a simplified conversation list. 
    // In a production app, you'd likely have a 'conversations' collection.
    // Here we query messages and group them.
    const q = query(
      collection(db, 'messages'),
      or(where('senderId', '==', user.uid), where('receiverId', '==', user.uid)),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        setIsLoadingConv(false);
        setConversations([]);
        return;
      }

      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      const userIds = new Set<string>();
      
      // Add existing conversation partners
      msgs.forEach(m => {
        userIds.add(m.senderId === user.uid ? m.receiverId : m.senderId);
      });

      // Also ensure the currently selected recipient is in the list
      if (selectedRecipient && !userIds.has(selectedRecipient.uid)) {
        userIds.add(selectedRecipient.uid);
      }

      const convos: { user: UserProfile, lastMessage?: Message }[] = [];
      for (const uid of Array.from(userIds)) {
        try {
          const uDoc = await getDoc(doc(db, 'users', uid));
          if (uDoc.exists()) {
            convos.push({
              user: uDoc.data() as UserProfile,
              lastMessage: msgs.find(m => m.senderId === uid || m.receiverId === uid)
            });
          }
        } catch (err) {
          console.error(`Error loading user ${uid}:`, err);
        }
      }
      setConversations(convos);
      setIsLoadingConv(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages', user);
    });

    return () => unsubscribe();
  }, [user, selectedRecipient?.uid]);

  // Load Messages for selected conversation
  useEffect(() => {
    if (!user || !selectedRecipient) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      or(
        and(where('senderId', '==', user.uid), where('receiverId', '==', selectedRecipient.uid)),
        and(where('senderId', '==', selectedRecipient.uid), where('receiverId', '==', user.uid))
      ),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      
      // Mark as read
      snapshot.docs.forEach(d => {
        const data = d.data() as Message;
        if (data.receiverId === user.uid && !data.read) {
          updateDoc(doc(db, 'messages', d.id), { read: true });
        }
      });
    });
  }, [user, selectedRecipient]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRecipient || !newMessage.trim()) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: selectedRecipient.uid,
        content: newMessage.trim(),
        timestamp: serverTimestamp(),
        read: false
      });
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'messages');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-neutral-900">
      {/* Sidebar - Conversations List */}
      <div className={cn(
        "w-full md:w-96 flex flex-col border-r border-neutral-100 bg-white pb-10 md:pb-0",
        selectedRecipient ? "hidden md:flex" : "flex"
      )}>
        <div className="p-8 border-b border-neutral-100 space-y-6">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none text-neutral-900">Messages</h2>
                 <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Private and secure messaging</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                 <Lock size={18} />
              </div>
           </div>
           
           <div className="relative group">
              <input 
                type="text" 
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 bg-neutral-100 border border-transparent rounded-xl pl-12 pr-4 text-[10px] font-black tracking-widest placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-blue-500/50 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-500 transition-colors" size={16} />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
           {isLoadingConv ? (
             <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-full p-4 rounded-3xl flex items-center gap-4 border border-neutral-100 animate-pulse">
                     <div className="w-12 h-12 rounded-[18px] bg-neutral-100 shrink-0" />
                     <div className="flex-1 space-y-2">
                        <div className="h-2 w-20 bg-neutral-100 rounded" />
                        <div className="h-2 w-full bg-neutral-50 rounded" />
                     </div>
                  </div>
                ))}
             </div>
           ) : conversations.length > 0 ? (
             conversations
              .filter(c => c.user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((convo) => (
                <button
                  key={convo.user.uid}
                  onClick={() => setSelectedRecipient(convo.user)}
                  className={cn(
                    "w-full p-4 rounded-3xl flex items-center gap-4 transition-all group border border-transparent",
                    selectedRecipient?.uid === convo.user.uid 
                      ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20 px-6" 
                      : "hover:bg-neutral-50 text-neutral-400"
                  )}
                >
                   <div className="relative shrink-0">
                      <div className={cn(
                        "w-12 h-12 rounded-[18px] bg-neutral-100 overflow-hidden border-2 transition-all group-hover:scale-105",
                        selectedRecipient?.uid === convo.user.uid ? "border-white/20" : "border-neutral-100"
                      )}>
                         <img 
                          src={convo.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${convo.user.uid}`} 
                          alt={convo.user.displayName} 
                          className="w-full h-full object-cover" 
                         />
                      </div>
                      {convo.user.isOnline && (
                         <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_8px_#10b981]" />
                      )}
                   </div>
                   <div className="flex-1 text-left space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                         <span className={cn(
                           "text-[10px] font-black uppercase tracking-tighter italic truncate",
                           selectedRecipient?.uid === convo.user.uid ? "text-white" : "text-neutral-900"
                         )}>
                            {convo.user.displayName}
                         </span>
                         <span className={cn(
                           "text-[7px] font-bold tabular-nums",
                           selectedRecipient?.uid === convo.user.uid ? "text-blue-100" : "text-neutral-400"
                         )}>
                            {convo.lastMessage ? formatDate(convo.lastMessage.timestamp) : ''}
                         </span>
                      </div>
                      <p className={cn(
                        "text-[9px] font-bold truncate tracking-tight uppercase leading-none opacity-60 italic",
                        convo.lastMessage?.receiverId === user?.uid && !convo.lastMessage?.read && "text-blue-400 font-black"
                      )}>
                         {convo.lastMessage?.content || 'No messages'}
                      </p>
                   </div>
                   {convo.lastMessage?.receiverId === user?.uid && !convo.lastMessage?.read && (
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_#60a5fa] shrink-0" />
                   )}
                </button>
              ))
           ) : (
             <div className="p-12 text-center space-y-4 opacity-20 mt-10">
                <MessageSquare size={48} className="mx-auto text-neutral-400" />
                <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed text-neutral-500">No active conversations. Start a chat via the Network page.</p>
             </div>
           )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-neutral-50 relative",
        !selectedRecipient ? "hidden md:flex" : "flex"
      )}>
        {selectedRecipient ? (
          <>
            {/* Chat Header */}
            <header className="p-6 sm:p-8 flex items-center justify-between border-b border-neutral-100 relative z-10 bg-white/80 backdrop-blur-xl">
               <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setSelectedRecipient(null)}
                    className="md:hidden p-3 bg-neutral-100 rounded-xl text-neutral-400 hover:text-neutral-900"
                  >
                     <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-4">
                     <div className="relative">
                        <div className="w-12 h-12 rounded-[20px] bg-neutral-100 border-2 border-white overflow-hidden shadow-sm">
                           <img src={selectedRecipient.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedRecipient.uid}`} alt={selectedRecipient.displayName} className="w-full h-full object-cover" />
                        </div>
                        {selectedRecipient.isOnline && (
                           <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_10px_#10b981]" />
                        )}
                     </div>
                     <div className="space-y-0.5">
                        <h3 className="text-[12px] font-black uppercase tracking-tighter italic text-neutral-900 leading-none">{selectedRecipient.displayName}</h3>
                        <div className="flex items-center gap-1.5">
                           <Shield size={8} className="text-blue-500" />
                           <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 italic">
                              {selectedRecipient.isOnline ? 'Online' : 'Last seen...'}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <button className="p-3 bg-white rounded-xl text-neutral-400 hover:text-blue-500 transition-all active:scale-95 border border-neutral-100 shadow-sm">
                     <Phone size={18} />
                  </button>
                  <button className="p-3 bg-white rounded-xl text-neutral-400 hover:text-blue-500 transition-all active:scale-95 border border-neutral-100 shadow-sm">
                     <Video size={18} />
                  </button>
                  <button className="p-3 bg-transparent rounded-xl text-neutral-400 hover:text-neutral-900 transition-all">
                     <MoreVertical size={18} />
                  </button>
               </div>
            </header>

            {/* Messages Stream */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white"
            >
               {messages.map((msg, idx) => {
                 const isMe = msg.senderId === user?.uid;
                 return (
                   <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%] sm:max-w-[70%]",
                      isMe ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                   >
                     <div className={cn(
                       "p-5 rounded-[28px] text-[11px] font-bold tracking-tight leading-relaxed shadow-sm relative group",
                       isMe 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-neutral-100 text-neutral-900 rounded-tl-none"
                     )}>
                        <p className="italic">{msg.content}</p>
                        <div className={cn(
                          "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
                          isMe ? "right-full mr-4" : "left-full ml-4"
                        )}>
                           <button className="p-2 bg-white/80 rounded-lg text-neutral-400 hover:text-red-500 transition-colors shadow-sm">
                              <Trash2 size={12} />
                           </button>
                        </div>
                     </div>
                     <div className={cn(
                       "flex items-center gap-2 mt-2 px-2 opacity-40 hover:opacity-100 transition-opacity text-neutral-500",
                       isMe ? "flex-row-reverse" : "flex-row"
                     )}>
                        <span className="text-[8px] font-black uppercase tracking-widest italic">{formatDate(msg.timestamp)}</span>
                        {isMe && (
                           <CheckCheck size={10} className={msg.read ? "text-blue-500" : "text-neutral-400"} />
                        )}
                     </div>
                   </motion.div>
                 );
               })}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-neutral-100 bg-white shrink-0">
               <form onSubmit={sendMessage} className="relative group">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full h-16 bg-neutral-100 border border-transparent rounded-[32px] pl-8 pr-20 text-sm font-bold italic tracking-wide placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner relative z-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
                     <button 
                       type="submit"
                       disabled={isSending || !newMessage.trim()}
                       className="w-12 h-12 bg-blue-600 text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-blue-600/20 active:scale-90 disabled:opacity-30 transition-all hover:bg-blue-700"
                     >
                       {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-rotate-12" />}
                     </button>
                  </div>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-10 p-12 text-center relative overflow-hidden bg-white">
             <div className="w-32 h-32 bg-neutral-50 rounded-[48px] border border-neutral-100 flex items-center justify-center shadow-xl relative z-10 group">
                <div className="absolute inset-0 bg-blue-600/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Lock size={64} className="text-neutral-200 group-hover:text-blue-500 transition-colors duration-1000" />
             </div>
             
             <div className="space-y-4 relative z-10 max-w-sm">
                <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-neutral-900">Select a chat</h3>
                <p className="text-[10px] text-neutral-400 font-black leading-relaxed uppercase tracking-widest italic">
                   Pick a conversation from the list or start a new one from the network page to begin messaging.
                </p>
             </div>
             
             <button 
              onClick={() => setActiveTab('network')}
              className="px-10 py-4 bg-white border border-neutral-200 rounded-[24px] text-[10px] font-black uppercase tracking-widest italic hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-95 relative z-10 shadow-sm"
             >
                Find People
             </button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.2); }
      `}} />
    </div>
  );
}
