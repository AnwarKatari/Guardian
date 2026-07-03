import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { Download } from 'lucide-react';

export function InstallAppButton() {
  const { install, isInstallable } = useInstallPrompt();

  if (!isInstallable) return null;

  return (
    <button
      onClick={install}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md"
    >
      <Download size={14} />
      Install Sentinel
    </button>
  );
}
