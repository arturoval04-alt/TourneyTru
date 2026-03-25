"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface PlayerHoverCardProps {
    playerId: string;
    firstName: string;
    lastName: string;
    photoUrl?: string | null;
    position?: string | null;
    number?: number | null;
    teamName?: string | null;
    children: React.ReactNode;
}

export default function PlayerHoverCard({
    playerId,
    firstName,
    lastName,
    photoUrl,
    position,
    number,
    teamName,
    children,
}: PlayerHoverCardProps) {
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback(() => {
        timerRef.current = setTimeout(() => setVisible(true), 900);
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setVisible(false);
    }, []);

    const handleClick = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setVisible(false);
        router.push(`/jugadores/${playerId}`);
    }, [router, playerId]);

    const fullName = `${firstName} ${lastName}`;

    return (
        <div
            ref={wrapperRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div onClick={handleClick} className="cursor-pointer">
                {children}
            </div>

            {visible && (
                <div
                    className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 animate-fade-in-up"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#212833] border-r border-b border-muted/30 rotate-45" />

                    <div
                        onClick={handleClick}
                        className="bg-[#212833] border border-muted/30 rounded-xl shadow-2xl p-4 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {/* Photo */}
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-muted/20 border-2 border-primary/30 shrink-0">
                                {photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt={fullName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Image
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`}
                                        alt={fullName}
                                        width={48}
                                        height={48}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white text-sm leading-tight truncate">
                                    {fullName}
                                </p>
                                {teamName && (
                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                        {teamName}
                                    </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    {position && (
                                        <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded">
                                            {position}
                                        </span>
                                    )}
                                    {number != null && (
                                        <span className="text-[10px] font-black text-muted-foreground">
                                            #{number}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-muted/20 text-center text-[10px] font-bold text-primary/80 uppercase tracking-widest">
                            Ver perfil →
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
