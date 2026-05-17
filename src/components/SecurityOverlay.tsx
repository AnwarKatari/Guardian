import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function SecurityOverlay() {
  const { profile, updateProfile } = useAuth();
  const [calcValue, setCalcValue] = useState("");

  if (!profile?.stealthOverlayActive) return null;

  const handleDigit = (d: string) => setCalcValue(v => (v + d).slice(-6));

  const deactivate = () => {
    // Hidden code to deactivate (e.g., 1234)
    if (calcValue === "1234") {
      updateProfile({ stealthOverlayActive: false });
    } else {
      setCalcValue("");
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-neutral-900 flex flex-col items-center justify-center p-8"
      >
        <div className="w-full max-w-xs space-y-8">
          <div className="flex items-center justify-between">
            <Calculator className="text-neutral-700" size={24} />
            <div className="text-right">
              <p className="text-4xl font-light text-white font-mono h-10">{calcValue || "0"}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {['C', '(', ')', '÷', 7, 8, 9, '×', 4, 5, 6, '-', 1, 2, 3, '+', 0, '.', '=', 'BACK'].map((btn, i) => (
              <button
                key={i}
                onClick={() => {
                  if (btn === 'BACK' || (btn === 'C' && calcValue === "1234")) {
                    updateProfile({ stealthOverlayActive: false });
                  } else if (btn === 'C') {
                    setCalcValue("");
                  } else if (typeof btn === 'number' || btn === '.') {
                    handleDigit(btn.toString());
                  } else if (btn === '=') {
                    deactivate();
                  }
                }}
                className={cn(
                  "h-14 rounded-full text-white text-lg font-bold transition-all active:scale-95",
                  btn === 'BACK' ? "bg-red-600/20 text-red-400 text-xs" : 
                  btn === 'C' ? "bg-neutral-700 text-amber-500" :
                  "bg-neutral-800 hover:bg-neutral-700"
                )}
              >
                {btn}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-neutral-800 text-center uppercase tracking-widest font-mono">
            Standard System Calculator v2.1
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
