"use client"

import React from "react"
import { InsuranceSummaryCard } from "@/components/ui/insurance-summary-card"
import { Car, HeartPulse, Umbrella } from "lucide-react"

const InsuranceSummaryDemo = () => {
    const handleManage = () => alert("Manage Policy clicked!")

    return (
        <div className="flex min-h-screen flex-wrap items-center justify-center gap-6 bg-background p-6">
            <InsuranceSummaryCard
                title="Car Insurance"
                policyNumber="CAR-90871-AB"
                insuredAmount="₹12,00,000"
                premiumAmount="₹9,500/year"
                coveragePercent={70}
                expiryDate="15 Dec 2025"
                insuranceType="Vehicle Protection"
                icon={<Car className="h-5 w-5 text-white" />}
                tooltipText="Covers accidental damage and third-party liability"
                gradientFrom="from-blue-500"
                gradientTo="to-cyan-500"
                onManage={handleManage}
            />

            <InsuranceSummaryCard
                title="Health Insurance"
                policyNumber="HLT-45092-BK"
                insuredAmount="₹8,00,000"
                premiumAmount="₹12,200/year"
                coveragePercent={45}
                expiryDate="10 Aug 2026"
                insuranceType="Medical Coverage"
                icon={<HeartPulse className="h-5 w-5 text-white" />}
                tooltipText="Includes hospitalization and cashless treatment benefits"
                gradientFrom="from-pink-500"
                gradientTo="to-red-400"
                onManage={handleManage}
            />

            <InsuranceSummaryCard
                title="Travel Insurance"
                policyNumber="TRV-33088-CN"
                insuredAmount="₹5,00,000"
                premiumAmount="₹2,400/year"
                coveragePercent={85}
                expiryDate="22 Jan 2026"
                insuranceType="International Trips"
                icon={<Umbrella className="h-5 w-5 text-white" />}
                tooltipText="Protects against trip cancellations and emergencies abroad"
                gradientFrom="from-purple-500"
                gradientTo="to-indigo-500"
                onManage={handleManage}
            />
        </div>
    )
}

export default InsuranceSummaryDemo
