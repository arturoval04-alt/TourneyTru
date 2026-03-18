"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "@/lib/auth";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api`;

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Credenciales incorrectas.");
                return;
            }

            saveSession(data.user, {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            });

            if (data.user.role === "admin" || data.user.role === "scorekeeper") {
                router.push("/admin/dashboard");
            } else {
                router.push("/");
            }
        } catch {
            setError("Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-muted/30 shadow-lg relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent"></div>
                        <span className="font-black text-primary text-2xl relative z-10 group-hover:scale-110 transition-transform">TT</span>
                    </div>
                </div>
                <h2 className="text-center text-3xl font-black tracking-tight text-foreground">
                    Acceso a TourneyTru
                </h2>
                <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
                    Selecciona tu perfil para ingresar.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-surface py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-muted/30">

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Correo Electrónico
                            </label>
                            <input
                                id="email" name="email" type="email" required
                                value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                                className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                placeholder="tu@correo.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Contraseña
                            </label>
                            <input
                                id="password" name="password" type="password" required
                                value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                                className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center">
                                <input
                                    id="remember-me" name="remember-me" type="checkbox"
                                    className="h-4 w-4 text-primary focus:ring-primary border-muted/30 rounded bg-background"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-foreground">
                                    Recordarme
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link href="/forgot-password" className="font-medium text-primary hover:text-primary-light transition-colors">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white transition-all active:scale-[0.98] ${loading ? 'bg-muted cursor-not-allowed' : 'bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'}`}
                            >
                                {loading ? 'Validando...' : 'Entrar a mi cuenta'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-muted/30" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-surface text-muted-foreground">
                                    ¿No tienes cuenta? <Link href="/register" className="text-primary hover:text-primary-light font-bold transition-colors">Regístrate</Link> | <Link href="/" className="text-primary hover:text-primary-light font-bold transition-colors">Ver sin iniciar sesión</Link>
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Volver al inicio</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
