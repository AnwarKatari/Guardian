import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { saveMessage, subscribeToMessages } from '../services/chatService';

export default function ConversationalHub({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, createdAt?: any }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [safetyStatus, setSafetyStatus] = useState<'Safe' | 'Needs Help'>('Safe');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsFetching(false);
      return;
    }

    const unsubscribe = subscribeToMessages(user.uid, (msgs) => {
      setMessages(msgs as { role: 'user' | 'assistant', content: string, createdAt?: any }[]);
      setIsFetching(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Add user message
      await saveMessage(user.uid, 'user', userMessage);

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10),
          location,
          safetyStatus
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Add assistant message
        await saveMessage(user.uid, 'assistant', data.response);
      } else {
        throw new Error('AI response failed');
      }
    } catch (error) {
      console.error(error);
      // Optional: Add a local error message to the chat
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] font-sans text-neutral-900">
      <header className="p-4 bg-[#075E54] text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sparkles size={24} />
          <h2 className="text-lg font-bold">Conversational Hub</h2>
        </div>
        <button 
          onClick={() => setSafetyStatus(prev => prev === 'Safe' ? 'Needs Help' : 'Safe')}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-bold transition-colors",
            safetyStatus === 'Safe' ? "bg-green-600" : "bg-red-600 animate-pulse"
          )}
        >
          {safetyStatus}
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isFetching ? (
          <div className="flex justify-center items-center h-full text-neutral-500 text-sm">
            Loading chat history...
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <motion.div 
                key={msg.createdAt?.toMillis() || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}
              >
                <div className={cn(
                  "px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-sm",
                  msg.role === 'user' 
                    ? "bg-[#DCF8C6] text-neutral-900 rounded-tr-none" 
                    : "bg-white text-neutral-800 rounded-tl-none border border-neutral-100"
                )}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="px-4 py-2 rounded-2xl bg-white text-neutral-500 text-sm border border-neutral-100">Thinking...</div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      <div className="p-4 bg-[#F0F0F0]">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-white px-4 py-2.5 rounded-full text-sm focus:outline-none shadow-sm"
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-[#075E54] text-white rounded-full hover:bg-[#128C7E] transition-colors disabled:bg-neutral-300"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
