import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const InstallPWA: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone) {
      setInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallEvent(promptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
    }
    setInstallEvent(null);
  };

  if (installed || !visible || !installEvent) return null;

  return (
    <div className="fixed bottom-20 md:bottom-5 right-3 sm:right-5 z-[100] w-[calc(100%-1.5rem)] max-w-sm">
      <div className="bg-surface-container-lowest border border-surface-container rounded-2xl shadow-xl p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Download size={21} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-on-surface">Install LifeDesk</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Add LifeDesk to your device for quick access and an app-like experience.</p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss install prompt"
          className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high flex-shrink-0"
        >
          <X size={16} />
        </button>
        <button
          type="button"
          onClick={install}
          className="absolute right-4 bottom-3 text-xs font-bold text-primary hover:underline"
        >
          Install
        </button>
      </div>
    </div>
  );
};
