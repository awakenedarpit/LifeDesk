import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'mark';
  className?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  className = 'h-8 w-auto',
  alt = 'LifeDesk',
}) => {
  if (variant === 'mark') {
    return (
      <img
        src="/assets/lifedesk-mark.png"
        alt={alt}
        className={`object-contain select-none flex-shrink-0 ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <span className="inline-flex items-center select-none flex-shrink-0">
      <img
        src="/assets/lifedesk-logo.png"
        alt={alt}
        className={`block dark:hidden object-contain ${className}`}
        draggable={false}
      />
      <img
        src="/assets/lifedesk-logo-dark.png"
        alt={alt}
        className={`hidden dark:block object-contain ${className}`}
        draggable={false}
      />
    </span>
  );
};
