import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, User, Bot, Sparkles, MapPin, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

// Leaflet (free maps)
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Transformers.js – runs the AI locally in the browser
import { pipeline, type TextGenerationPipeline } from '@xenova/transformers';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper to fly to a location
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13);
  }, [center, map]);
  return null;
}

// Geocode a place name using Nominatim (free, no key)
async function geocodePlace(place: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MyApp/1.0' }, // Required by Nominatim
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name,
      };
    }
  } catch (e) {
    console.warn('Geocoding failed:', e);
  }
  return null;
}

export default function ConversationalHub() {
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([
    {
      role: 'assistant',
      content:
        "Hello! I'm an AI that runs entirely in your browser. Ask me for directions, places, or just chat. I'll show locations on the map automatically.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mapLocation, setMapLocation] = useState<[number, number] | null>(null);
  const [mapPlaceName, setMapPlaceName] = useState<string | null>(null);
  const [pipelineReady, setPipelineReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const generatorRef = useRef<TextGenerationPipeline | null>(null);

  // Load the AI pipeline once
  useEffect(() => {
    const loadModel = async () => {
      setModelLoading(true);
      try {
        // You can switch to a smaller model: 'Xenova/phi-3-mini-4k-instruct' (2.3 GB)
        // or 'Xenova/tinyllama-1.1b-chat' (1.1B, ~800 MB) for faster loading.
        generatorRef.current = await pipeline(
          'text-generation',
          'Xenova/Phi-3.5-mini-instruct', // ~3.8B parameters – good reasoning
          { device: 'webgpu' } // use WebGPU if available, else falls back to WASM
        );
        setPipelineReady(true);
      } catch (err) {
        console.error('Model load error:', err);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Failed to load the AI model. Please check your internet connection and try again.',
          },
        ]);
      } finally {
        setModelLoading(false);
      }
    };
    if (!generatorRef.current && !modelLoading) {
      loadModel();
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isGenerating || !pipelineReady) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsGenerating(true);

    try {
      // Build the prompt with instruction to output a place JSON
      const prompt = `You are a helpful assistant. If the user asks about a location, include a JSON object at the end like {"place": "exact place name"}. Otherwise, just reply conversationally.\nUser: ${userMessage}\nAssistant:`;

      const result = await generatorRef.current!(prompt, {
        max_new_tokens: 256,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false,
      });

      let aiReply = result[0].generated_text.trim();

      // Try to extract a place name from the AI reply
      let location = null;
      const placeMatch = aiReply.match(/"place"\s*:\s*"([^"]+)"/);
      if (placeMatch) {
        const placeName = placeMatch[1];
        const geo = await geocodePlace(placeName);
        if (geo) {
          location = geo;
          setMapLocation([geo.lat, geo.lng]);
          setMapPlaceName(geo.name);
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiReply }]);
    } catch (error) {
      console.error('Generation error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong while generating a response. Please try again.',
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans text-neutral-900">
      {/* Header */}
      <header className="p-6 border-b border-neutral-100 flex items-center gap-4 flex-shrink-0">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
          <Sparkles size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-display font-black tracking-tighter text-neutral-900 italic uppercase">
            Conversational Hub
          </h2>
          <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest italic">
            AI companion &amp; map navigator
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {modelLoading && (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Loading AI…</span>
            </>
          )}
          {pipelineReady && !modelLoading && (
            <span className="text-green-600">● Ready</span>
          )}
        </div>
      </header>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div className="w-1/2 flex flex-col border-r border-neutral-100">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 flex-shrink-0">
                    <Bot size={20} />
                  </div>
                )}
                <div
                  className={cn(
                    'px-5 py-3.5 rounded-[24px] max-w-[80%] font-medium text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-neutral-100 text-neutral-800 rounded-tl-none'
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <User size={20} />
                  </div>
                )}
              </motion.div>
            ))}
            {isGenerating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                  <Bot size={20} />
                </div>
                <div className="px-5 py-3.5 rounded-[24px] bg-neutral-100 text-neutral-500 font-medium text-sm">
                  Thinking…
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-6 border-t border-neutral-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-3 bg-neutral-100 rounded-full p-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                placeholder={pipelineReady ? 'Ask for directions…' : 'Loading AI…'}
                disabled={!pipelineReady || isGenerating}
                className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!pipelineReady || isGenerating || !input.trim()}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-neutral-300"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Map panel */}
        <div className="w-1/2 h-full relative bg-neutral-50">
          {mapLocation ? (
            <MapContainer
              center={mapLocation}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={mapLocation}>
                <Popup>{mapPlaceName || 'Location'}</Popup>
              </Marker>
              <MapUpdater center={mapLocation} />
            </MapContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <MapPin size={48} className="mb-2" />
              <p className="text-sm font-medium">Ask the AI for a place</p>
              <p className="text-xs">It will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
