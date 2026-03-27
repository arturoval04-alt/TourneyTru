'use client';

import Image from 'next/image';

interface PlayerAvatarProps {
  photoUrl: string | null;
  firstName: string;
  number?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { container: 'w-10 h-10', text: 'text-base', badge: 'w-4 h-4 text-[9px] -bottom-0.5 -right-0.5' },
  md: { container: 'w-16 h-16', text: 'text-2xl', badge: 'w-6 h-6 text-[10px] -bottom-1 -right-1' },
  lg: { container: 'w-32 h-32 sm:w-40 sm:h-40', text: 'text-5xl', badge: 'w-10 h-10 text-sm -bottom-3 -right-3' },
};

// Deterministic color from first name
const AVATAR_COLORS = [
  'bg-sky-600', 'bg-indigo-600', 'bg-emerald-600',
  'bg-violet-600', 'bg-rose-600', 'bg-amber-600',
  'bg-teal-600', 'bg-pink-600',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function PlayerAvatar({ photoUrl, firstName, number, size = 'md' }: PlayerAvatarProps) {
  const s = SIZE_MAP[size];
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '?';
  const color = getColorFromName(firstName || '?');

  return (
    <div className={`relative shrink-0 ${s.container}`}>
      <div className={`${s.container} rounded-full overflow-hidden border-2 border-primary shadow-lg`}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={firstName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 128px, 160px"
          />
        ) : (
          <div className={`w-full h-full rounded-full ${color} flex items-center justify-center`}>
            <span className={`${s.text} font-black text-white leading-none`}>{initial}</span>
          </div>
        )}
      </div>

      {number != null && (
        <div
          className={`absolute ${s.badge} bg-primary text-white font-black rounded-full flex items-center justify-center border-2 border-background shadow`}
        >
          {number}
        </div>
      )}
    </div>
  );
}
