import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent text-white border border-accent shadow-soft-sm ' +
    'hover:-translate-y-px hover:shadow-soft active:scale-[0.97] active:shadow-none ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
  secondary:
    'bg-paper-raised text-ink border border-black/10 shadow-soft-sm ' +
    'hover:-translate-y-px hover:shadow-soft active:scale-[0.97] active:shadow-none ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
  ghost:
    'bg-transparent text-ink-muted border border-transparent ' +
    'hover:bg-black/5 hover:text-ink active:scale-[0.97] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 select-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
