import * as React from "react";
import { ReferralCard } from "@/components/ui/referral-card";
import { Zap, Crown, Users } from "lucide-react";

/**
 * A demo component to showcase the ReferralCard.
 */
const ReferralCardDemo = () => {
    // Data for the "How it works" section
    const referralSteps = [
        {
            icon: <Zap className="h-4 w-4" />,
            text: "Share your invite link",
        },
        {
            icon: <Crown className="h-4 w-4" />,
            text: (
                <>
                    Your friend gets <span className="font-semibold text-card-foreground">10 credits</span>{" "}
                    when they subscribe
                </>
            ),
        },
        {
            icon: <Users className="h-4 w-4" />,
            text: (
                <>
                    You receive <span className="font-semibold text-card-foreground">10 credits</span> for
                    each referral
                </>
            ),
        },
    ];

    return (
        <div className="flex min-h-[500px] w-full items-center justify-center bg-background p-4">
            <ReferralCard
                badgeText="Earn 10+ credits"
                title="Refer & Earn"
                description="for each friend that you invite"
                imageUrl="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=320"
                steps={referralSteps}
                referralLink="https://21st.dev/lavikatiyar"
            />
        </div>
    );
};

export default ReferralCardDemo;
