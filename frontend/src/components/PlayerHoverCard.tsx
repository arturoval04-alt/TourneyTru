"use client";

import { useRouter } from "next/navigation";

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
    children,
}: PlayerHoverCardProps) {
    const router = useRouter();

    return (
        <div
            className="relative block w-full h-full cursor-pointer"
            onClick={() => router.push(`/jugadores/${playerId}`)}
        >
            {children}
        </div>
    );
}
