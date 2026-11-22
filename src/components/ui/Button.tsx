import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary:
        'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950 border border-transparent disabled:bg-neutral-300 disabled:text-neutral-500',
      secondary:
        'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 border border-transparent disabled:bg-blue-300',
      outline:
        'bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100 disabled:bg-neutral-50 disabled:text-neutral-400',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border border-transparent disabled:bg-rose-300',
      ghost:
        'bg-transparent text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 active:bg-neutral-200/70 disabled:text-neutral-400',
      success:
        'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 border border-transparent disabled:bg-emerald-300',
    };

    const sizeClasses = {
      sm: 'min-h-9 px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5',
      md: 'min-h-10 px-4 py-2 text-sm font-medium rounded-lg gap-2',
      lg: 'min-h-11 px-5 py-2.5 text-sm font-semibold rounded-lg gap-2',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed select-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <Spinner
            size="sm"
            className={
              variant === 'outline' || variant === 'ghost'
                ? 'border-neutral-600'
                : 'border-white'
            }
          />
        )}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
