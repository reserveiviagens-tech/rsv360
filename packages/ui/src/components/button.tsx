import * as React from 'react';
import { cn } from '../lib/cn';
import { rsvColors } from '../tokens';

export const buttonVariants = ['primary', 'outline', 'ghost', 'amber'] as const;
export type ButtonVariant = (typeof buttonVariants)[number];

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'rsv-btn-primary text-white border-transparent hover:opacity-90 disabled:opacity-50',
  outline:
    'rsv-btn-outline bg-transparent border hover:bg-black/5 disabled:opacity-50',
  ghost: 'rsv-btn-ghost bg-transparent hover:bg-black/5 disabled:opacity-50',
  amber:
    'rsv-btn-amber text-white border-transparent hover:opacity-90 disabled:opacity-50',
};

const variantStyle: Record<ButtonVariant, React.CSSProperties> = {
  primary: { backgroundColor: rsvColors.action },
  outline: { borderColor: rsvColors.textMuted, color: rsvColors.textPrimary },
  ghost: { color: rsvColors.textPrimary },
  amber: { backgroundColor: rsvColors.amber },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading = false, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'rsv-button inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          variantClass[variant],
          className,
        )}
        style={variantStyle[variant]}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        data-variant={variant}
        data-loading={loading ? 'true' : undefined}
        {...props}
      >
        {loading ? (
          <>
            <span className="rsv-button-spinner" aria-hidden />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = 'RsvButton';