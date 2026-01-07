'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center justify-center rounded-md border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                primary: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
                secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
                success: 'border-transparent bg-success-500 text-white hover:bg-success-600',
                warning: 'border-transparent bg-warning-500 text-white hover:bg-warning-600',
                info: 'border-transparent bg-info-500 text-white hover:bg-info-600',
                destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
            },
            appearance: {
                default: '',
                light: 'bg-opacity-15 border-transparent',
                outline: 'bg-transparent',
                ghost: 'bg-transparent border-transparent',
            },
            size: {
                lg: 'h-8 px-3 text-sm',
                md: 'h-7 px-2.5',
                sm: 'h-6 px-2 text-[10px]',
                xs: 'h-5 px-1.5 text-[10px]',
            },
            shape: {
                default: 'rounded-md',
                circle: 'rounded-full aspect-square p-0 flex items-center justify-center',
            },
        },
        compoundVariants: [
            { variant: 'success', appearance: 'light', className: 'bg-success-50 text-success-700 border-success-100' },
            { variant: 'warning', appearance: 'light', className: 'bg-warning-50 text-warning-700 border-warning-100' },
            { variant: 'info', appearance: 'light', className: 'bg-info-50 text-info-700 border-info-100' },
            { variant: 'destructive', appearance: 'light', className: 'bg-error-50 text-error-700 border-error-100' },
        ],
        defaultVariants: {
            variant: 'primary',
            appearance: 'default',
            size: 'md',
            shape: 'default',
        },
    }
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
    asChild?: boolean;
}

function BadgeV2({ className, variant, appearance, size, shape, asChild = false, ...props }: BadgeProps) {
    const Comp = asChild ? Slot : 'div';
    return (
        <Comp
            className={cn(badgeVariants({ variant, appearance, size, shape }), className)}
            {...props}
        />
    );
}

function BadgeDot({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
    return (
        <span
            className={cn('inline-block h-2 w-2 rounded-full bg-current', className)}
            {...props}
        />
    );
}

export { BadgeV2 as Badge, badgeVariants, BadgeDot };
