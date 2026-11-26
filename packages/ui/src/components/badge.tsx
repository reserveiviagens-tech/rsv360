import * as React from 'react';
import { cn } from '../lib/cn';
import { rsvColors } from '../tokens';

export const badgeVariants = ['default', 'amber', 'outline', 'success'] as const;
export type BadgeVariant = (typeof badgeVariants)[number];

const variantClass: Record<BadgeVariant, string> = {
  default: 'rsv-badge-default border-transparent text-white',
  amber: 'rsv-badge-amber border-transparent text-white',
  outline: 'rsv-badge-outline bg-transparent',
  success: 'rsv-badge-success border-transparent text-white',
};

const variantStyle: Record<BadgeVariant, React.CSSProperties> = {
  default: { backgroundColor: rsvColors.midnight },
  amber: { backgroundColor: rsvColors.amberBright },
  outline: { borderColor: rsvColors.textMuted, color: rsvColors.textPrimary },
  success: { backgroundColor: rsvColors.action },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', style, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'rsv-badge inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        variantClass[variant],
        className,
      )}
      style={{ ...variantStyle[variant], ...style }}
      data-variant={variant}
      {...props}
    >
      {children}
    </span>
  );
}