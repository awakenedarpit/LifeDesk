import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export const InstallPWA: React.FC = () => {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setPromptEvent(null);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  if (!promptEvent || dismissed) return null;

  return (
    <div className="fixed left-3 right-3 bottom-20 md:left-auto md:right-5 md:bottom-5 z-[100] md:w-[390px]">
      <div className="relative rounded-2xl border border-surface-container bg-surface-container-lowest p-4 shadow-2xl flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Download size={21} />
        </div>
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-sm font-bold text-on-surface">Install LifeDesk</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Use LifeDesk like an app on your device.</p>
          <button type="button" onClick={install} className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary">
            Install
          </button>
        </div>
        <button type="button" onClick={() => setPromptEvent(null)} aria-label="Dismiss" className="absolute right-2 top-2 w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high">
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
