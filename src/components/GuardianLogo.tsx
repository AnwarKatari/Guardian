import React from 'react';
import { ShieldAlert, Zap, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface GuardianLogoProps {
  className?: string;
  size?: number;
  pulsing?: boolean;
}

export const GuardianLogo: React.FC<GuardianLogoProps> = ({ 
  className, 
  size = 24, 
  pulsing = true 
}) => {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer Glow/Pulse */}
      {pulsing && (
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"
          style={{ width: size * 1.5, height: size * 1.5 }}
        />
      )}

      {/* Main Container */}
      <div 
        className="relative z-10 bg-neutral-900 rounded-[25%] flex items-center justify-center shadow-2xl border border-white/20 overflow-hidden group"
        style={{ width: size * 1.8, height: size * 1.8 }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4px_4px] opacity-20 pointer-events-none" />
        <ShieldAlert size={size} className="text-blue-500 relative z-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
        
        {/* Detail icons for "Tactical" feel */}
        <div className="absolute top-0 right-0 p-0.5 bg-blue-600/20 text-blue-400 border-b border-l border-white/10">
          <Zap size={size * 0.45} className="fill-current" />
        </div>
      </div>
    </div>
  );
};
