import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  indicatorColor?: string;
}

export function Progress({
  className,
  value = 0,
  indicatorColor,
  ...props
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'h-full transition-all duration-500 ease-out rounded-full',
          indicatorColor || 'bg-gradient-to-r from-emerald-500 to-teal-400'
        )}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
