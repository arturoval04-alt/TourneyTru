'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export default function StreamerLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        if (!isLoggedIn()) {
            router.replace('/login');
            return;
        }
        const user = getUser();
        if (!user || user.role !== 'streamer') {
            router.replace('/');
        }
    }, [router]);

    return (
        <>
            <Navbar />
            <main>{children}</main>
        </>
    );
}
