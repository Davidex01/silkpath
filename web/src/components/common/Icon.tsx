import React from 'react';

export type IconName =
  | 'search'
  | 'deals'
  | 'wallet'
  | 'truck'
  | 'docs'
  | 'shield'
  | 'spark'
  | 'paperclip'
  | 'check'
  | 'clock'
  | 'alert'
  | 'play'
  | 'x'
  | 'star'
  | 'starFill';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', ...rest }) => {
  const common = {
    className: `w-5 h-5 ${className}`,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  } as const;

  switch (name) {
    case 'search':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case 'deals':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M8 7h13" />
          <path d="M8 12h13" />
          <path d="M8 17h13" />
          <path d="M3 7h.01" />
          <path d="M3 12h.01" />
          <path d="M3 17h.01" />
        </svg>
      );
    case 'wallet':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M17 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          <path d="M19 7V5a2 2 0 0 0-2-2H7" />
          <path d="M21 12h-6a2 2 0 0 0 0 4h6v-4Z" />
        </svg>
      );
    case 'truck':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M3 17V6a2 2 0 0 1 2-2h10v13" />
          <path d="M15 8h4l2 3v6h-6" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="17.5" cy="17.5" r="1.5" />
        </svg>
      );
    case 'docs':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h8" />
        </svg>
      );
    case 'shield':
      return (
        <svg
          className={`w-5 h-5 ${className}`}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          {...rest}
        >
          <path
            d="M12 2l7 4v7c0 5-3 8-7 9-4-1-7-4-7-9V6l7-4Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M8.5 12.5l2.3 2.3 4.7-5.1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M12 2l1.5 6.5L20 12l-6.5 1.5L12 20l-1.5-6.5L4 12l6.5-3.5L12 2Z" />
        </svg>
      );
    case 'paperclip':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a2 2 0 0 1-2.83-2.83l7.78-7.78" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case 'play':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M8 5v14l11-7Z" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2Z" />
        </svg>
      );
    case 'starFill':
      return (
        <svg
          className={`w-5 h-5 ${className}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          {...rest}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2Z" />
        </svg>
      );
    default:
      return null;
  }
};