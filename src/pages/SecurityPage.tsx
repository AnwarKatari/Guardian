import { useState } from 'react';
import { MessageSquare, Send, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export default function SecurityPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Hello, I am your Security AI Assistant. How can I help with your safety today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I couldn\'t get a response.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-white rounded-[32px] border border-neutral-100 shadow-sm">
      <div className="flex items-center gap-2 text-blue-600 mb-6">
        <ShieldAlert size={24} />
        <h2 className="text-xl font-black italic uppercase">Security AI Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm p-4 rounded-2xl max-w-[80%] ${m.role === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-neutral-100'}`}>
            {m.text}
          </div>
        ))}
        {isLoading && <div className="text-sm p-4 rounded-2xl bg-neutral-100 text-neutral-400">AI is thinking...</div>}
      </div>

      <div className="flex gap-2">
        <input 
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask a security question..."
          className="flex-1 px-4 py-4 bg-neutral-50 rounded-2xl text-sm outline-none focus:border-blue-500 border"
        />
        <button onClick={sendMessage} className="p-4 bg-blue-600 text-white rounded-2xl"><Send size={20} /></button>
      </div>
    </div>
  );
}
