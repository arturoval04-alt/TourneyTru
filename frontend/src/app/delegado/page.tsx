'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function DelegadoIndexPage() {
    const router = useRouter();

    useEffect(() => {
        const user = getUser();
        if (!user || user.role !== 'delegado') {
            router.replace('/login');
            return;
        }
        if (user.delegateTeamId) {
            router.replace(`/delegado/equipo/${user.delegateTeamId}`);
        } else {
            // Sin equipo asignado — mostrar mensaje en lugar de loop
            router.replace('/login');
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
