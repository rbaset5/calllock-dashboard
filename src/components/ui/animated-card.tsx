import React from "react";
import { cn } from "@/lib/utils";

// --- PROPS INTERFACE ---
export interface AnimatedCardProps {
    companyLogo?: React.ReactNode;
    companyName?: string;
    title: string;
    subtitle?: string;
    tags?: string[];
    metadata?: string;
    variant?: "pink" | "yellow" | "blue" | "purple" | "red" | "green" | "gray";
    className?: string;
    onClick?: () => void;
    children?: React.ReactNode;
}

// --- BORDER VARIANT STYLES ---
const variantClasses = {
    pink: "border-t-pink-500",
    yellow: "border-t-yellow-500",
    blue: "border-t-blue-500",
    purple: "border-t-purple-500",
    red: "border-t-red-500",
    green: "border-t-emerald-500",
    gray: "border-t-gray-300",
};

/**
 * A responsive, theme-adaptive card with a colored top border.
 * Simplified version without 3D tilt effects.
 */
export const AnimatedCard = ({
    companyLogo,
    companyName,
    title,
    subtitle,
    tags,
    metadata,
    variant = "purple",
    className,
    onClick,
    children,
}: AnimatedCardProps) => {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative w-full max-w-sm shrink-0 cursor-pointer overflow-hidden rounded-xl bg-card p-6 shadow-md transition-shadow duration-300 hover:shadow-2xl",
                "border-t-4",
                variantClasses[variant],
                className
            )}
            aria-label={`${title}${companyName ? ` at ${companyName}` : ''}`}
            tabIndex={0}
        >
            <div className="space-y-4">
                {/* Header - only show if companyLogo or companyName provided */}
                {(companyLogo || companyName) && (
                    <div className="flex items-center space-x-3">
                        {companyLogo && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                {companyLogo}
                            </div>
                        )}
                        {companyName && (
                            <span className="font-semibold text-muted-foreground">{companyName}</span>
                        )}
                    </div>
                )}

                {/* Title & Subtitle */}
                <div>
                    <h3 className="text-lg font-bold text-card-foreground">{title}</h3>
                    {subtitle && <p className="text-sm text-primary">{subtitle}</p>}
                </div>

                {/* Tags */}
                {tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                            <span
                                key={index}
                                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Custom children content */}
                {children}

                {/* Footer Metadata */}
                {metadata && (
                    <div className="pt-2 text-right text-xs text-muted-foreground">
                        {metadata}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnimatedCard;
