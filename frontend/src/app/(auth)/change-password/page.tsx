"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import api from "@/lib/api";
import { getUser, saveSession, getAccessToken } from "@/lib/auth";

export default function ChangePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || !currentUser.forcePasswordChange) {
            // Si no está forzado a cambiar contraseña, ir al inicio
            router.push("/");
        } else {
            setUser(currentUser);
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("La nueva contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/force-change-password', { newPassword: password });
            
            // Actualizar la sesión para remover el flag
            if (user) {
                const updatedUser = { ...user, forcePasswordChange: false };
                saveSession(updatedUser, { accessToken: getAccessToken() || "" });
                
                // Redirigir según el rol
                const dashboardRoles = ['admin', 'organizer', 'scorekeeper', 'presi'];
                router.push(dashboardRoles.includes(user.role) ? "/admin/dashboard" : "/");
            }
        } catch (err: any) {
            setError("Error al actualizar la contraseña. Por favor intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null; // Evitar flash UI mientras verifica

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
             style={{ background: 'linear-gradient(160deg, #0f1c2e 0%, #192638 50%, #1a2d47 100%)' }}>
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

            <motion.div
                className="relative z-10 w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}>

                <div className="text-center mb-8">
                    <h1 className="text-white font-black leading-none"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2.4rem, 8vw, 3rem)' }}>
                        NUEVA CONTRASEÑA OBLIGATORIA
                    </h1>
                    <p className="text-white/40 mt-3 text-sm">
                        Por motivos de seguridad, detectamos que estás usando una contraseña temporal. Por favor créale una nueva a tu cuenta para continuar.
                    </p>
                </div>

                <div className="rounded-2xl border p-6 sm:p-8"
                     style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -6, height: 0 }}
                                className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 text-sm font-medium overflow-hidden">
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                                Nueva Contraseña
                            </label>
                            <input
                                type="password" required
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(""); }}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl border text-white placeholder-white/20 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60"
                                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                                Confirmar Contraseña
                            </label>
                            <input
                                type="password" required
                                value={confirmPassword}
                                onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl border text-white placeholder-white/20 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60"
                                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit" disabled={loading}
                                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50"
                                style={{
                                    background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #4684DB 0%, #3a72c4 100%)',
                                    boxShadow: loading ? 'none' : '0 4px 24px rgba(70,132,219,0.4)',
                                }}>
                                {loading ? 'Actualizando...' : 'Guardar y Entrar'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
