import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ConversationalHub({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hello! I'm your AI companion. I'm here to talk about safety, health, wellness, or just to keep you company if you're feeling lonely. How are you doing today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10) // Send last 10 messages as history
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans text-neutral-900">
      <header className="p-6 border-b border-neutral-100 flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-xl font-display font-black tracking-tighter text-neutral-900 italic uppercase">Conversational Hub</h2>
          <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest italic">Your personal companion & wellness AI</p>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}
          >
            {msg.role === 'assistant' && (
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 flex-shrink-0">
                <Bot size={20} />
              </div>
            )}
            <div className={cn(
              "px-5 py-3.5 rounded-[24px] max-w-[80%] font-medium text-sm leading-relaxed",
              msg.role === 'user' ? "bg-blue-600 text-white rounded-tr-none" : "bg-neutral-100 text-neutral-800 rounded-tl-none"
            )}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <User size={20} />
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
              <Bot size={20} />
            </div>
            <div className="px-5 py-3.5 rounded-[24px] bg-neutral-100 text-neutral-500 font-medium text-sm">Thinking...</div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-6 border-t border-neutral-100 bg-white">
        <div className="flex items-center gap-3 bg-neutral-100 rounded-full p-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none"
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-neutral-300"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
