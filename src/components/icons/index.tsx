import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const defaultProps: IconProps = {
  size: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function createIcon(path: React.ReactNode, viewBox = '0 0 24 24') {
  return function Icon({ size = 24, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        {...defaultProps}
        {...props}
      >
        {path}
      </svg>
    );
  };
}

// Logo & Branding - Freelancer Crab with Laptop
export const ClawLogo = ({ size = 32, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" {...props}>
    <defs>
      <linearGradient id="claw-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--accent-cyan)" />
        <stop offset="100%" stopColor="#00a8bb" />
      </linearGradient>
    </defs>
    {/* Body */}
    <path d="M60 15 C30 15 15 35 15 52 C15 68 28 82 45 85 L47 92 L53 92 L53 85 C56 86 64 86 67 85 L67 92 L73 92 L75 85 C92 82 105 68 105 52 C105 35 90 15 60 15Z" fill="url(#claw-gradient)" />
    {/* Left Cybernetic Claw */}
    <path d="M18 48 L5 38 L0 44 L10 52 L0 62 L5 68 L18 58 Z" fill="url(#claw-gradient)" />
    <rect x="12" y="46" width="8" height="14" rx="1" fill="url(#claw-gradient)" />
    {/* Right Cybernetic Claw */}
    <path d="M102 48 L115 38 L120 44 L110 52 L120 62 L115 68 L102 58 Z" fill="url(#claw-gradient)" />
    <rect x="100" y="46" width="8" height="14" rx="1" fill="url(#claw-gradient)" />
    {/* Antenna */}
    <path d="M42 20 Q32 8 30 14" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" />
    <path d="M78 20 Q88 8 90 14" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" />
    <circle cx="30" cy="14" r="3" fill="var(--accent-cyan)" />
    <circle cx="90" cy="14" r="3" fill="var(--accent-cyan)" />
    {/* Eyes */}
    <circle cx="42" cy="38" r="7" fill="var(--bg-primary)" />
    <circle cx="78" cy="38" r="7" fill="var(--bg-primary)" />
    <circle cx="44" cy="37" r="3" fill="#f5fbff" />
    <circle cx="80" cy="37" r="3" fill="#f5fbff" />
    {/* Eyebrows */}
    <path d="M34 30 L48 33" stroke="#00a8bb" strokeWidth="2" strokeLinecap="round" />
    <path d="M86 30 L72 33" stroke="#00a8bb" strokeWidth="2" strokeLinecap="round" />
    {/* Mouth - focused expression */}
    <line x1="52" y1="55" x2="68" y2="55" stroke="var(--bg-primary)" strokeWidth="2.5" strokeLinecap="round" />
    {/* Laptop */}
    <rect x="35" y="88" width="50" height="22" rx="2" fill="#1a1a22" />
    <rect x="38" y="91" width="44" height="16" rx="1" fill="var(--bg-primary)" />
    <line x1="41" y1="95" x2="52" y2="95" stroke="var(--accent-cyan)" strokeWidth="1.5" />
    <line x1="41" y1="99" x2="58" y2="99" stroke="#00a8bb" strokeWidth="1.5" />
    <line x1="41" y1="103" x2="48" y2="103" stroke="var(--accent-cyan)" strokeWidth="1.5" />
    <path d="M32 110 L35 106 L85 106 L88 110 Z" fill="#1a1a22" />
  </svg>
);

// Navigation
export const MenuIcon = createIcon(
  <path d="M4 6h16M4 12h16M4 18h16" />
);

export const CloseIcon = createIcon(
  <path d="M6 18L18 6M6 6l12 12" />
);

export const ChevronRightIcon = createIcon(
  <path d="M9 18l6-6-6-6" />
);

export const ChevronDownIcon = createIcon(
  <path d="M6 9l6 6 6-6" />
);

export const ArrowRightIcon = createIcon(
  <path d="M5 12h14M12 5l7 7-7 7" />
);

export const ExternalLinkIcon = createIcon(
  <>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </>
);

// Actions
export const SearchIcon = createIcon(
  <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>
);

export const FilterIcon = createIcon(
  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
);

export const PlusIcon = createIcon(
  <path d="M12 5v14M5 12h14" />
);

export const CheckIcon = createIcon(
  <polyline points="20 6 9 17 4 12" />
);

export const CopyIcon = createIcon(
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>
);

// Status
export const SuccessIcon = createIcon(
  <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </>
);

export const WarningIcon = createIcon(
  <>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>
);

export const ErrorIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </>
);

export const InfoIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </>
);

// Agent & Task
export const AgentIcon = createIcon(
  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
);

export const TaskIcon = createIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
  </>
);

export const BountyIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
    <path d="M12 6v2m0 8v2" />
  </>
);

export const ReputationIcon = createIcon(
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
);

// Security
export const ShieldIcon = createIcon(
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
);

export const LockIcon = createIcon(
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>
);

export const KeyIcon = createIcon(
  <>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </>
);

// Social
export const GithubIcon = createIcon(
  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
);

export const TwitterIcon = createIcon(
  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
);

export const DiscordIcon = createIcon(
  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
);

// Misc
export const TerminalIcon = createIcon(
  <>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </>
);

export const CodeIcon = createIcon(
  <>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </>
);

export const SettingsIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>
);

export const WalletIcon = createIcon(
  <>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
  </>
);

export const ClockIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>
);

export const CalendarIcon = createIcon(
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </>
);

export const LinkIcon = createIcon(
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>
);

export const DocumentIcon = createIcon(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </>
);

export const ActivityIcon = createIcon(
  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
);

export const HealthIcon = createIcon(
  <>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </>
);
