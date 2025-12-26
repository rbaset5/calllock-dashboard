"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Info, ShieldCheck, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"

export interface InsuranceSummaryCardProps {
    title: string
    policyNumber: string
    insuredAmount: string
    premiumAmount: string
    coveragePercent: number
    expiryDate: string
    insuranceType: string
    icon?: React.ReactNode
    onManage?: () => void
    tooltipText?: string
    gradientFrom?: string
    gradientTo?: string
    className?: string
}

export const InsuranceSummaryCard: React.FC<InsuranceSummaryCardProps> = ({
    title,
    policyNumber,
    insuredAmount,
    premiumAmount,
    coveragePercent,
    expiryDate,
    insuranceType,
    icon = <ShieldCheck className="h-5 w-5 text-white" />,
    onManage,
    tooltipText = "Your current policy coverage and premium details",
    gradientFrom = "from-indigo-500",
    gradientTo = "to-purple-500",
    className,
}) => {
    return (
        <motion.div
            whileHover={{ y: -5, boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }}
            transition={{ duration: 0.3 }}
            className={cn(
                "relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-md transition-all",
                className
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    "relative flex items-center justify-between bg-gradient-to-r p-4 text-white",
                    gradientFrom,
                    gradientTo
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2">{icon}</div>
                    <div>
                        <h3 className="text-base font-semibold">{title}</h3>
                        <p className="text-xs text-white/80">{insuranceType}</p>
                    </div>
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                className="rounded-full p-1 hover:bg-white/20"
                                aria-label="More Info"
                            >
                                <Info className="h-4 w-4 text-white" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tooltipText}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Content */}
            <div className="space-y-4 p-6">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Policy Number</p>
                    <p className="font-medium">{policyNumber}</p>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">Insured Amount</p>
                        <p className="text-lg font-semibold">{insuredAmount}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Premium</p>
                        <p className="text-lg font-semibold">{premiumAmount}</p>
                    </div>
                </div>

                {/* Progress Visualization */}
                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Coverage Used</p>
                        <p className="text-xs font-medium">{coveragePercent}%</p>
                    </div>
                    <Progress value={coveragePercent} className="h-2" />
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                    Expiry: <span className="font-medium text-foreground">{expiryDate}</span>
                </div>

                {/* Action Button */}
                {onManage && (
                    <Button
                        onClick={onManage}
                        className="mt-4 w-full gap-2"
                        variant="secondary"
                    >
                        Manage Policy <ArrowRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </motion.div>
    )
}
