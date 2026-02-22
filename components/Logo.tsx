'use client';

import { useState } from 'react';

const logoPath = process.env.NEXT_PUBLIC_LOGO_IMAGE || '/logo.png';

type LogoProps = {
  className?: string;
  alt?: string;
  fallback?: React.ReactNode;
  label?: React.ReactNode;
  height?: number;
};

export default function Logo({ className = '', alt = 'Logo', fallback, label, height = 40 }: LogoProps) {
  const [error, setError] = useState(false);

  if (error) return <>{fallback}</>;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={logoPath}
        alt={alt}
        style={{ height, width: 'auto', maxHeight: height, objectFit: 'contain' }}
        onError={() => setError(true)}
      />
      {label}
    </span>
  );
}
