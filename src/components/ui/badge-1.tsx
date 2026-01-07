'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'relative inline-flex items-center gap-1 overflow-visible rounded-full border text-sm font-bold transition-all duration-200 cursor-pointer shadow-sm active:scale-95 group select-none',
    {
        variants: {
            variant: {
                default: 'bg-white border-gray-200 text-gray-900 hover:border-gray-300 hover:bg-gray-50',
                black: 'bg-black border-black text-white hover:bg-gray-900',
                outline: 'bg-transparent border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50',
            },
            size: {
                default: 'h-9 px-3.5',
                sm: 'h-8 px-2.5 text-xs',
                lg: 'h-11 px-2 gap-1',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
    count?: number;
    icon?: React.ReactNode;
}

function Badge({ className, variant, size, count, icon, children, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
            {icon && <div className="shrink-0">{icon}</div>}
            <span className="truncate">{children}</span>
            {count !== undefined && (
                <div className="absolute -top-1.5 -right-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-[2.5px] border-white bg-black px-1 text-[11px] font-black text-white shadow-[0_2px_5px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.1)] ring-0">
                    {count}
                </div>
            )}
        </div>
    );
}

export { Badge, badgeVariants };
