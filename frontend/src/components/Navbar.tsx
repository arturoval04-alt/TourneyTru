"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const role = localStorage.getItem("userRole");
            setTimeout(() => {
                setUserRole(role);
            }, 0);
        }
    }, [pathname]);

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("userRole");
            setUserRole(null);
            setIsMenuOpen(false);
            router.push("/");
        }
    };

    const navLinks = [
        { href: "/torneos", label: "Torneos" },
        { href: "/equipos", label: "Equipos" },
        { href: "/jugadores", label: "Jugadores" },
    ];

    return (
        <header className="border-b border-muted/50 bg-surface/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center transform group-hover:scale-105 transition-transform">
                        <Image src="/logo.svg" alt="TourneyTru Logo" width={32} height={32} className="object-contain" priority />
                    </div>
                    <h1 className="text-xl font-black tracking-tight flex items-center text-foreground italic">
                        TourneyTru
                    </h1>
                </Link>
                <nav className="flex items-center gap-6">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`hidden sm:block text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                    <ThemeToggle />

                    {userRole ? (
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="w-9 h-9 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors font-bold uppercase cursor-pointer"
                            >
                                {userRole.substring(0, 1)}
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 mt-3 w-48 bg-surface border border-muted/30 rounded-xl shadow-xl overflow-hidden animate-fade-in-up origin-top-right">
                                    <div className="p-3 border-b border-muted/20 bg-muted/5">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rol Actual</p>
                                        <p className="text-sm font-black text-foreground">{userRole}</p>
                                    </div>
                                    <div className="p-1">
                                        {(userRole === 'admin' || userRole === 'scorekeeper') && (
                                            <Link href="/admin/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-sm text-foreground hover:bg-muted/10 font-medium transition-colors rounded-lg">
                                                Dashboard
                                            </Link>
                                        )}
                                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 font-medium transition-colors rounded-lg cursor-pointer">
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => router.push('/login')}
                            className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-light rounded-full border border-primary/50 transition-all shadow-md cursor-pointer hover:shadow-primary/30"
                        >
                            Iniciar Sesión
                        </button>
                    )}
                </nav>
            </div>
        </header>
    );
}
