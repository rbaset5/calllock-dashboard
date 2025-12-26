"use client";
// Force rebuild for reference fix

import React, { useState, useEffect, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Type definitions
interface Particle {
    id: number;
    left: number;
    duration: number;
    opacity: number;
}

interface CardTransform {
    rotateX: number;
    rotateY: number;
    translateY: number;
    scale: number;
}

// Custom hook for 3D card effects
const useCardTransform = () => {
    const [transform, setTransform] = useState<CardTransform>({
        rotateX: 0,
        rotateY: 0,
        translateY: 0,
        scale: 1,
    });

    const handleMouseMove = (
        e: MouseEvent<HTMLDivElement>,
        cardRef: React.RefObject<HTMLDivElement>
    ): void => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const rotateX = (y / rect.height) * -15; // Slightly reduced for better UX in a list
        const rotateY = (x / rect.width) * 15;

        setTransform({
            rotateX,
            rotateY,
            translateY: -10,
            scale: 1.01,
        });
    };

    const handleMouseLeave = (): void => {
        setTransform({
            rotateX: 0,
            rotateY: 0,
            translateY: 0,
            scale: 1,
        });
    };

    return { transform, handleMouseMove, handleMouseLeave };
};

// Particle system hook
const useParticles = (isActive: boolean) => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const particleId = useRef<number>(0);

    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            const newParticle: Particle = {
                id: particleId.current++,
                left: Math.random() * 100,
                duration: Math.random() * 3 + 2,
                opacity: Math.random() * 0.5 + 0.2,
            };

            setParticles((prev) => [...prev, newParticle]);

            setTimeout(() => {
                setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
            }, newParticle.duration * 1000);
        }, 1000); // Slower interval for performance in lists

        return () => clearInterval(interval);
    }, [isActive]);

    return particles;
};

// Ripple effect hook
const useRipple = () => {
    const [ripples, setRipples] = useState<
        Array<{ id: number; x: number; y: number }>
    >([]);
    const rippleId = useRef<number>(0);

    const createRipple = (e: MouseEvent<HTMLDivElement>): void => {
        const rect = e.currentTarget.getBoundingClientRect();
        const size = 60;
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const newRipple = {
            id: rippleId.current++,
            x,
            y,
        };

        setRipples((prev) => [...prev, newRipple]);

        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);
    };

    return { ripples, createRipple };
};

interface FloatingCardProps {
    children: ReactNode;
    className?: string;
    onClick?: (e: MouseEvent<HTMLDivElement>) => void;
    showParticles?: boolean;
}

export const FloatingCard: React.FC<FloatingCardProps> = ({
    children,
    className,
    onClick,
    showParticles = true
}) => {
    const { transform, handleMouseMove, handleMouseLeave } = useCardTransform();
    const { ripples, createRipple } = useRipple();
    const particles = useParticles(showParticles);
    const cardRef = useRef<HTMLDivElement>(null);

    const getTransformStyle = (): string => {
        return `translateY(${transform.translateY}px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg) scale(${transform.scale})`;
    };

    const handleInternalClick = (e: MouseEvent<HTMLDivElement>): void => {
        createRipple(e);
        onClick?.(e);
    };

    return (
        <div
            className="perspective-1000 w-full mb-4"
            onMouseMove={(e) => handleMouseMove(e, cardRef)}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: "1000px" }}
        >
            <div
                ref={cardRef}
                onClick={handleInternalClick}
                className={cn(
                    "relative h-auto p-5 rounded-3xl backdrop-blur-3xl cursor-pointer transition-all duration-500 transform-gpu preserve-3d overflow-visible",
                    "bg-white dark:bg-surface-dark border border-black/10 dark:border-white/20 shadow-soft dark:shadow-white/5",
                    className
                )}
                style={{
                    transform: getTransformStyle(),
                }}
            >
                {/* Particles */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    {particles.map((particle) => (
                        <div
                            key={particle.id}
                            className="absolute w-0.5 h-0.5 rounded-full bg-black/20 dark:bg-white/40"
                            style={{
                                left: `${particle.left}%`,
                                opacity: particle.opacity,
                                animation: `particleFloat ${particle.duration}s linear infinite`,
                            }}
                        />
                    ))}
                </div>

                {/* Ripples */}
                {ripples.map((ripple) => (
                    <span
                        key={ripple.id}
                        className="absolute w-15 h-15 rounded-full pointer-events-none bg-black/10 dark:bg-white/10"
                        style={{
                            left: ripple.x,
                            top: ripple.y,
                            animation: "ripple 0.6s ease-out",
                        }}
                    />
                ))}

                {/* Card Content */}
                <div className="relative z-10 h-full flex flex-col">
                    {children}
                </div>

                <style jsx global>{`
          @keyframes particleFloat {
            0% {
              transform: translateY(100%) scale(0);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(-100%) scale(1);
              opacity: 0;
            }
          }

          @keyframes ripple {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            100% {
              transform: scale(4);
              opacity: 0;
            }
          }
        `}</style>
            </div>
        </div>
    );
};

export default FloatingCard;
