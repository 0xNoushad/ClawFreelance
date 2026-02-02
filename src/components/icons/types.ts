/**
 * Shared types for icon components
 * All icons follow consistent props interface for easy composition
 */

import { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  /** Additional CSS classes */
  className?: string;
  /** Icon size in pixels (default: 24) */
  size?: number;
}

/**
 * Base icon component type
 */
export type IconComponent = React.FC<IconProps>;
