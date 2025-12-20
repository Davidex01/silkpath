import React from 'react';

type Tone = 'gray' | 'blue' | 'green' | 'orange';

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  tone = 'gray',
  children,
  icon,
  className = '',
}) => {
  const tones: Record<Tone, string> = {
    gray: 'bg-slate-100 text-slate-700 ring-slate-200',
    blue: 'bg-blue-50 text-blue-800 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    orange: 'bg-orange-50 text-orange-800 ring-orange-100',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
};