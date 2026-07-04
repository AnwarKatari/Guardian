import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin } from 'lucide-react';

interface LocationPrePromptModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export function LocationPrePromptModal({ isOpen, onAllow, onDeny }: LocationPrePromptModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
              <MapPin className="text-blue-600" size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Enable Location</h2>
              <p className="text-neutral-500 text-sm font-medium leading-relaxed">
                To provide real-time safety alerts and help you stay connected with your network, we need access to your location.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={onAllow}
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 transition-all active:scale-95"
              >
                Allow Access
              </button>
              <button
                onClick={onDeny}
                className="w-full py-3.5 text-neutral-400 font-bold text-sm uppercase tracking-[0.1em] hover:text-neutral-600 transition-all"
              >
                Not Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
