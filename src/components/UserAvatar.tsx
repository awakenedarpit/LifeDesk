import React, { useState, useEffect } from 'react';

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
  textClassName?: string;
}

function getInitials(name?: string): string {
  if (!name) return 'LD';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  className = 'w-8 h-8 rounded-full',
  textClassName = 'text-xs',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const cleanSrc = (src || '').trim();
  if (!cleanSrc || failed) {
    return (
      <span
        aria-label={name || 'Student Avatar'}
        className={`${className} inline-flex items-center justify-center bg-surface-container text-primary-ink font-bold border border-outline-variant select-none flex-shrink-0 ${textClassName}`}
      >
        {getInitials(name)}
      </span>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={name || 'Student Avatar'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} object-cover flex-shrink-0`}
    />
  );
};
