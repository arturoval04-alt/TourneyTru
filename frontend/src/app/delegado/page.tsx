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
        const assignments = user.delegateAssignments ?? [];
        if (assignments.length > 1) {
            router.replace('/admin/dashboard?tab=equipos');
        } else if (assignments[0]?.teamId || user.delegateTeamId) {
            const targetTeamId = assignments[0]?.teamId || user.delegateTeamId;
            router.replace(`/delegado/equipo/${targetTeamId}`);
        } else if (user.delegateTeamId) {
            router.replace(`/delegado/equipo/${user.delegateTeamId}`);
        } else {
            router.replace('/admin/dashboard?tab=equipos');
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
