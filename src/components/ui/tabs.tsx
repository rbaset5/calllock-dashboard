'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as ArkTabs } from '@ark-ui/react/tabs';

const tabsListVariants = cva('flex items-center shrink-0', {
    variants: {
        variant: {
            default: 'bg-muted p-1 rounded-lg',
            outline: 'border border-border rounded-lg p-0',
            line: 'border-b border-border w-full justify-start rounded-none',
        },
        size: {
            default: 'gap-1',
            sm: 'gap-1',
            lg: 'gap-2',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});

const tabsTriggerVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm',
    {
        variants: {
            variant: {
                default: 'rounded-md text-muted-foreground hover:text-foreground data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm',
                outline: 'text-muted-foreground hover:text-foreground border-r border-border last:border-r-0 first:rounded-l-md last:rounded-r-md rounded-none data-[selected]:bg-muted data-[selected]:text-foreground',
                line: 'rounded-none border-b-2 border-transparent bg-transparent text-muted-foreground shadow-none data-[selected]:border-primary data-[selected]:bg-transparent data-[selected]:text-primary data-[selected]:shadow-none hover:text-foreground',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

const tabsContentVariants = cva(
    'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    {
        variants: {
            variant: {
                default: '',
                outline: '',
                line: '',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

interface TabsContextValue {
    variant?: 'default' | 'outline' | 'line';
}

const TabsContext = React.createContext<TabsContextValue>({});

const Tabs = React.forwardRef<
    React.ElementRef<typeof ArkTabs.Root>,
    React.ComponentPropsWithoutRef<typeof ArkTabs.Root> & VariantProps<typeof tabsListVariants>
>(({ className, variant, ...props }, ref) => (
    <TabsContext.Provider value={{ variant: variant || 'default' }}>
        <ArkTabs.Root
            ref={ref}
            className={cn('w-full', className)}
            {...props}
        />
    </TabsContext.Provider>
));
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<
    React.ElementRef<typeof ArkTabs.List>,
    React.ComponentPropsWithoutRef<typeof ArkTabs.List> & VariantProps<typeof tabsListVariants>
>(({ className, size, ...props }, ref) => {
    const { variant } = React.useContext(TabsContext);
    return (
        <ArkTabs.List
            ref={ref}
            className={cn(tabsListVariants({ variant, size }), className)}
            {...props}
        />
    );
});
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof ArkTabs.Trigger>,
    React.ComponentPropsWithoutRef<typeof ArkTabs.Trigger>
>(({ className, ...props }, ref) => {
    const { variant } = React.useContext(TabsContext);
    return (
        <ArkTabs.Trigger
            ref={ref}
            className={cn(tabsTriggerVariants({ variant }), className)}
            {...props}
        />
    );
});
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
    React.ElementRef<typeof ArkTabs.Content>,
    React.ComponentPropsWithoutRef<typeof ArkTabs.Content>
>(({ className, ...props }, ref) => {
    const { variant } = React.useContext(TabsContext);
    return (
        <ArkTabs.Content
            ref={ref}
            className={cn(tabsContentVariants({ variant }), className)}
            {...props}
        />
    );
});
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
