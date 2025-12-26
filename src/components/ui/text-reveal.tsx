"use client";

import React, { FC, ReactNode, useRef, Fragment } from "react";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";

interface TextRevealByWordProps {
    text: string;
    className?: string;
    isStatic?: boolean;
}

const TextRevealByWord: FC<TextRevealByWordProps> = ({
    text,
    className,
    isStatic = false,
}) => {
    const targetRef = useRef<HTMLDivElement | null>(null);

    const { scrollYProgress } = useScroll({
        target: isStatic ? undefined : targetRef,
    });
    const words = text.split(/\s+/).filter(Boolean);

    return (
        <div ref={targetRef} className={cn(isStatic ? "" : "relative z-0 h-[200vh]", className)}>
            <div
                className={cn(
                    isStatic
                        ? "flex flex-wrap items-center"
                        : "sticky top-0 mx-auto flex h-[50%] max-w-4xl items-center bg-transparent px-[1rem] py-[5rem]"
                )}
            >
                <p
                    className={cn(
                        "subpixel-antialiased tracking-tight transition-colors duration-200",
                        isStatic
                            ? "text-[17px] leading-[22px] text-[#1C1E21] dark:text-gray-200"
                            : "flex flex-wrap p-5 text-2xl font-bold text-black/20 dark:text-white/20 md:p-8 md:text-3xl lg:p-10 lg:text-4xl xl:text-5xl"
                    )}
                >
                    {words.map((word, i) => {
                        const start = i / words.length;
                        const end = start + 1 / words.length;

                        // Logic for "Matt James" style bold/grey splits if wanted, 
                        // but for now we'll support a static mode that matches the screenshot's color intent.
                        return (
                            <Fragment key={i}>
                                <Word
                                    progress={scrollYProgress}
                                    range={[start, end]}
                                    isStatic={isStatic}
                                >
                                    {word}
                                </Word>
                                {i < words.length - 1 && " "}
                            </Fragment>
                        );
                    })}
                </p>
            </div>
        </div>
    );
};

interface WordProps {
    children: ReactNode;
    progress: MotionValue<number>;
    range: [number, number];
    isStatic?: boolean;
}

const Word: FC<WordProps> = ({ children, progress, range, isStatic }) => {
    const opacity = useTransform(progress, range, [0, 1]);

    // Custom logic to match the "bold font with grey" requirement for connector words
    // Expanded list to catch more Meta-style transition words
    const connectorWords = [
        "who", "did", "a", "at", "just", "became", "reported", "an",
        "in", "of", "on", "with", "for", "to", "the", "and", "is", "was",
        "has", "had", "been", "were", "are", "from", "by", "that"
    ];
    const isConnector = connectorWords.includes(String(children).toLowerCase());

    if (isStatic) {
        return (
            <span className={cn(
                "inline-block",
                isConnector
                    ? "text-[#8A8D91] dark:text-gray-400 font-normal"
                    : "text-[#1C1E21] dark:text-white font-semibold"
            )}>
                {children}
            </span>
        );
    }

    return (
        <span className="xl:lg-3 relative mx-1 lg:mx-2.5">
            <span className={"absolute opacity-30"}>{children}</span>
            <motion.span
                style={{ opacity: opacity }}
                className={"text-black dark:text-white"}
            >
                {children}
            </motion.span>
        </span>
    );
};

export { TextRevealByWord };
