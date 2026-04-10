"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { clearSession, getUser, AuthUser } from "@/lib/auth";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setTimeout(() => {
                setUser(getUser());
            }, 0);
        }
    }, [pathname]);

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            clearSession();
            setUser(null);
            setIsMenuOpen(false);
            router.push("/");
        }
    };

    const navLinks = [
        { href: "/ligas", label: "Ligas" },
        { href: "/torneos", label: "Torneos" },
        { href: "/equipos", label: "Equipos" },
        { href: "/jugadores", label: "Jugadores" },
        { href: "/planes", label: "Planes" },
    ];

    return (
        <header className="border-b border-muted/50 bg-surface/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300 shadow-sm relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                    <div className="relative flex items-center justify-center transform group-hover:scale-105 transition-transform">
                        <Image src="/logo-tt.png" alt="TourneyTru Logo" width={36} height={36} className="object-contain" priority />
                    </div>
                    <h1 className="text-xl font-black tracking-tight flex items-center text-foreground italic">
                        TourneyTru
                    </h1>
                </Link>
                <nav className="flex items-center gap-3 sm:gap-6">
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

                    {user?.role ? (
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="w-9 h-9 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors font-bold uppercase cursor-pointer"
                            >
                                {user.role.substring(0, 1)}
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 mt-3 w-48 bg-surface border border-muted/30 rounded-xl shadow-xl overflow-hidden animate-fade-in-up origin-top-right">
                                    <div className="p-3 border-b border-muted/20 bg-muted/5">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rol Actual</p>
                                        <p className="text-sm font-black text-foreground">{user.role}</p>
                                    </div>
                                    <div className="p-1">
                                        {(user.role === 'admin' || user.role === 'organizer' || user.role === 'scorekeeper' || user.role === 'presi' || user.role === 'delegado') && (
                                            <Link href="/admin/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-sm text-foreground hover:bg-muted/10 font-medium transition-colors rounded-lg">
                                                Dashboard
                                            </Link>
                                        )}
                                        {user.role === 'streamer' && (
                                            <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-sm text-foreground hover:bg-muted/10 font-medium transition-colors rounded-lg">
                                                Mis Juegos
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
                            className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary-light rounded-full border border-primary/50 transition-all shadow-md cursor-pointer hover:shadow-primary/30"
                        >
                            Acceder
                        </button>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button 
                        className="sm:hidden p-1 text-muted-foreground hover:text-foreground transition-colors ml-1 cursor-pointer"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                </nav>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMobileMenuOpen && (
                <div className="sm:hidden absolute top-16 left-0 w-full bg-surface border-b border-muted/50 shadow-xl py-2 px-4 flex flex-col gap-1 animate-fade-in-down z-40">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-3 text-base font-bold rounded-lg transition-colors ${isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            )}
        </header>
    );
}
