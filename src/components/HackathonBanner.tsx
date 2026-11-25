import React, { useEffect, useState } from 'react';

interface HackathonBannerProps {
  src?: string;
  alt: string;
  className?: string;
}

export const HackathonBanner: React.FC<HackathonBannerProps> = ({
  src,
  alt,
  className = 'w-14 h-14 sm:w-16 sm:h-16 rounded-xl',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const cleanSrc = (src || '').trim();
  if (!cleanSrc || failed) {
    return (
      <div
        className={`${className} bg-surface-container text-primary-ink border border-outline-variant flex items-center justify-center flex-shrink-0`}
        aria-label={alt}
      >
        <span className="material-symbols-outlined text-[24px]">terminal</span>
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} object-cover flex-shrink-0 ring-1 ring-outline-variant`}
    />
  );
};
