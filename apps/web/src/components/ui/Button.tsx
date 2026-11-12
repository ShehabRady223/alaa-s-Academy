import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean }

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 border border-brand-600 hover:border-brand-700',
  secondary: 'bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50',
  ghost: 'text-neutral-700 border border-transparent hover:bg-neutral-100',
  danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700',
};
const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-[13px]', md: 'h-9 px-4 text-sm' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, disabled, className, children, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading}
      className={cn('inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60', variants[variant], sizes[size], className)} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export const buttonClass = (variant: Variant = 'secondary', size: Size = 'md') =>
  cn('inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors', variants[variant], sizes[size]);
