"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import api from "@/lib/api";
import { saveSession } from "@/lib/auth";

const PLANS = [
    {
        key: "demo",
        label: "Demo",
        badge: "Con aprobación",
        highlight: false,
        priceNote: "Solicitud por correo",
        limits: ["1 liga", "1 torneo", "6 equipos por torneo", "25 jugadores por equipo"],
        cta: "Solicitar acceso",
        ctaHref: "/register",
        available: true,
    },
    {
        key: "standard",
        label: "Estándar",
        badge: "Próximamente",
        highlight: true,
        priceNote: "Precio por definir / mes",
        limits: ["1 liga", "3 torneos por liga", "10 equipos por torneo", "30 jugadores por equipo"],
        cta: "Próximamente",
        ctaHref: null,
        available: false,
    },
    {
        key: "pro",
        label: "Pro",
        badge: "Próximamente",
        highlight: false,
        priceNote: "Precio por definir / mes",
        limits: ["1 liga", "10 torneos por liga", "50 equipos por torneo", "50 jugadores por equipo"],
        cta: "Próximamente",
        ctaHref: null,
        available: false,
    },
];

export default function LoginPage() {
    const [email, setEmail]               = useState("");
    const [password, setPassword]         = useState("");
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showPlans, setShowPlans]       = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', {
                email: email.trim().toLowerCase(),
                password,
            });
            saveSession({
                id: data.user.id,
                email: data.user.email,
                firstName: data.user.firstName,
                lastName: data.user.lastName,
                role: data.user.role,
                phone: data.user.phone ?? null,
                profilePicture: data.user.profilePicture ?? null,
                scorekeeperLeagueId: data.user.scorekeeperLeagueId ?? null,
                maxLeagues: data.user.maxLeagues ?? 0,
                maxTournamentsPerLeague: data.user.maxTournamentsPerLeague ?? 0,
                maxTeamsPerTournament: data.user.maxTeamsPerTournament ?? 0,
                maxPlayersPerTeam: data.user.maxPlayersPerTeam ?? 25,
                planLabel: data.user.planLabel ?? 'public',
                forcePasswordChange: data.user.forcePasswordChange ?? false,
            }, {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            });
            const dashboardRoles = ['admin', 'organizer', 'scorekeeper', 'presi'];
            if (data.user.forcePasswordChange) {
                router.push("/change-password");
            } else {
                router.push(dashboardRoles.includes(data.user.role) ? "/admin/dashboard" : "/");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            setError(msg === "Invalid credentials" || msg === "Unauthorized"
                ? "Credenciales incorrectas."
                : "Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
             style={{ background: 'linear-gradient(160deg, #0f1c2e 0%, #192638 50%, #1a2d47 100%)' }}>

            {/* Background diamond pattern */}
            <div className="absolute inset-0 opacity-[0.035]" aria-hidden="true">
                <svg width="100%" height="100%">
                    <defs>
                        <pattern id="dp" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                            <path d="M40 8 L72 40 L40 72 L8 40 Z" fill="none" stroke="white" strokeWidth="1"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#dp)"/>
                </svg>
            </div>

            {/* Glow accents */}
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 -translate-y-1/2 pointer-events-none"
                 style={{ background: 'radial-gradient(circle, #4684DB 0%, transparent 70%)' }} aria-hidden="true"/>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-8 translate-y-1/2 pointer-events-none"
                 style={{ background: 'radial-gradient(circle, #4684DB 0%, transparent 70%)' }} aria-hidden="true"/>

            {/* Card */}
            <motion.div
                className="relative z-10 w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}>

                {/* Brand */}
                <div className="flex flex-col items-center justify-center gap-3 mb-8">
                    <Image src="/logo-tt.png" alt="TourneyTru Logo" width={80} height={80} className="object-contain" priority />
                    <span className="text-white/50 text-xs font-bold tracking-[0.3em] uppercase">TourneyTru</span>
                </div>

                {/* Hero headline */}
                <div className="text-center mb-8">
                    <p className="text-primary text-[10px] font-bold tracking-[0.3em] uppercase mb-3">
                        Plataforma de béisbol y sóftbol
                    </p>
                    <h1 className="text-white font-black leading-none"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2.4rem, 8vw, 3rem)' }}>
                        GESTIONA TU <span style={{ color: '#4684DB' }}>TORNEO</span><br/>
                        EN TIEMPO REAL
                    </h1>
                </div>

                {/* Form card */}
                <div className="rounded-2xl border p-6 sm:p-8"
                     style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -6, height: 0 }}
                                className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 text-sm font-medium overflow-hidden">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                                </svg>
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                                Correo electrónico
                            </label>
                            <input
                                id="email" name="email" type="email" required autoComplete="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(""); }}
                                placeholder="tu@correo.com"
                                className="w-full px-4 py-3 rounded-xl border text-white placeholder-white/20 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60"
                                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    Contraseña
                                </label>
                                <Link href="/forgot-password"
                                      className="text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors">
                                    ¿La olvidaste?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="password" name="password"
                                    type={showPassword ? "text" : "password"}
                                    required autoComplete="current-password"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(""); }}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-12 rounded-xl border text-white placeholder-white/20 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60"
                                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                                    {showPassword ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="pt-1 space-y-2.5">
                            <button
                                type="submit" disabled={loading}
                                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50"
                                style={{
                                    background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #4684DB 0%, #3a72c4 100%)',
                                    boxShadow: loading ? 'none' : '0 4px 24px rgba(70,132,219,0.4)',
                                }}>
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                        Validando...
                                    </span>
                                ) : 'Entrar a mi cuenta'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowPlans(true)}
                                className="w-full py-3 px-4 rounded-xl text-sm font-bold transition-all active:scale-[0.98] border hover:bg-primary/8 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                style={{ color: '#4684DB', background: 'transparent', borderColor: 'rgba(70,132,219,0.3)' }}>
                                Ver planes de organización
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer links */}
                <div className="mt-6 space-y-2.5 text-center">
                    <p className="text-sm text-white/40">
                        ¿No tienes cuenta?{' '}
                        <Link href="/register" className="font-bold text-primary hover:text-primary-light transition-colors">
                            Regístrate
                        </Link>
                    </p>
                    <Link href="/" className="block text-xs text-white/20 hover:text-white/45 transition-colors">
                        ← Ver torneos sin iniciar sesión
                    </Link>
                </div>
            </motion.div>

            {/* ══ PLANS MODAL — bottom sheet mobile / centered desktop ══════ */}
            <AnimatePresence>
                {showPlans && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-40"
                            style={{ background: 'rgba(10,16,26,0.85)', backdropFilter: 'blur(6px)' }}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowPlans(false)}
                            aria-hidden="true"
                        />
                        <motion.div
                            role="dialog" aria-modal="true" aria-label="Planes de organización"
                            className="fixed inset-x-0 bottom-0 z-50
                                       sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8 sm:w-[700px]
                                       w-full max-h-[92dvh] overflow-y-auto
                                       rounded-t-3xl sm:rounded-2xl border shadow-2xl"
                            style={{ background: 'linear-gradient(160deg, #1a2d47 0%, #192638 100%)', borderColor: 'rgba(255,255,255,0.1)' }}
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: "spring", damping: 32, stiffness: 300 }}>

                            {/* Drag handle */}
                            <div className="sm:hidden flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}/>
                            </div>

                            {/* Header */}
                            <div className="flex items-start justify-between px-5 pt-4 pb-4 sm:px-6 sm:pt-5 border-b"
                                 style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                <div>
                                    <h2 className="text-white font-black text-2xl sm:text-xl leading-tight"
                                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                        PLANES DE ORGANIZACIÓN
                                    </h2>
                                    <p className="text-white/35 text-sm mt-1">Elige el plan que mejor se adapte a tu liga</p>
                                </div>
                                <button onClick={() => setShowPlans(false)} aria-label="Cerrar planes"
                                        className="text-white/35 hover:text-white transition-colors rounded-xl hover:bg-white/8 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 ml-3">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>

                            {/* Cards */}
                            <div className="p-5 sm:p-6 flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4">
                                {PLANS.map((plan, i) => (
                                    <motion.div
                                        key={plan.key}
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06, duration: 0.3 }}
                                        className="rounded-2xl border relative overflow-hidden"
                                        style={{
                                            background: plan.highlight ? 'rgba(70,132,219,0.1)' : 'rgba(255,255,255,0.04)',
                                            borderColor: plan.highlight ? 'rgba(70,132,219,0.4)' : 'rgba(255,255,255,0.1)',
                                        }}>
                                        {plan.highlight && (
                                            <div className="absolute inset-0 pointer-events-none"
                                                 style={{ background: 'linear-gradient(135deg, rgba(70,132,219,0.15) 0%, transparent 60%)' }}
                                                 aria-hidden="true"/>
                                        )}
                                        <div className="relative flex sm:flex-col gap-0 p-4 sm:p-5">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-white font-black text-lg sm:text-xl"
                                                          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                                        {plan.label}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0
                                                        ${plan.key === 'demo' ? 'text-primary border-primary/40' : 'text-white/35 border-white/10'}`}
                                                          style={{ background: plan.key === 'demo' ? 'rgba(70,132,219,0.15)' : 'rgba(255,255,255,0.05)' }}>
                                                        {plan.badge}
                                                    </span>
                                                </div>
                                                <p className={`text-xs mb-3 ${plan.key === 'demo' ? 'text-primary/80 font-semibold' : 'text-white/40'}`}>
                                                    {plan.priceNote}
                                                </p>
                                                <ul className="grid grid-cols-2 sm:grid-cols-1 gap-x-3 gap-y-1.5">
                                                    {plan.limits.map(l => (
                                                        <li key={l} className="flex items-center gap-1.5 text-white/50 text-xs sm:text-sm">
                                                            <svg className={`w-3 h-3 flex-shrink-0 ${plan.highlight ? 'text-primary' : 'text-white/25'}`}
                                                                 fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                                            </svg>
                                                            {l}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="flex sm:block items-center mt-0 sm:mt-4 ml-3 sm:ml-0 flex-shrink-0">
                                                {plan.available ? (
                                                    <Link href={plan.ctaHref!}
                                                          className="flex items-center justify-center sm:w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white whitespace-nowrap transition-all hover:opacity-90 active:scale-[0.98]"
                                                          style={{ background: 'linear-gradient(135deg, #4684DB 0%, #3a72c4 100%)', boxShadow: '0 4px 14px rgba(70,132,219,0.3)' }}>
                                                        {plan.cta}
                                                    </Link>
                                                ) : (
                                                    <div className="flex items-center justify-center sm:w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white/20 border whitespace-nowrap cursor-not-allowed select-none"
                                                         style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                                        {plan.cta}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="px-5 pb-6 sm:px-6 text-center">
                                <p className="text-white/20 text-xs leading-relaxed">
                                    ¿Necesitas más capacidad? Los planes incluirán add-ons de torneos y equipos adicionales.<br/>
                                    Contacto: <span className="text-primary/50">valdezarturoval@gmail.com</span>
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
