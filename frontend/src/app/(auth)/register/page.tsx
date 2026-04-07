"use client";

import Link from "next/link";
import { useState } from "react";
import api from "@/lib/api";

type Intent = "viewer" | "organizer" | "streamer";

export default function RegisterPage() {
    const [intent, setIntent] = useState<Intent>("viewer");
    const [formData, setFormData] = useState({
        nombre: "",
        apellido: "",
        celular: "",
        correo: "",
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [registeredEmail, setRegisteredEmail] = useState("");
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        if (formData.password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/register', {
                email: formData.correo.trim().toLowerCase(),
                password: formData.password,
                firstName: formData.nombre.trim(),
                lastName: formData.apellido.trim(),
                phone: formData.celular || undefined,
                ...(intent === "organizer" ? {
                    organizerRequestNote: "Solicitud de acceso como organizador desde el formulario de registro.",
                } : intent === "streamer" ? {
                    organizerRequestNote: "Solicitud de acceso como Streamer desde el formulario de registro.",
                } : {}),
            });

            setRegisteredEmail(formData.correo.trim().toLowerCase());
        } catch (err: unknown) {
            const msg = (err as any)?.response?.data?.message;
            if (msg?.includes('correo') || msg?.includes('already')) {
                setError("Ya existe una cuenta con ese correo.");
            } else {
                setError(msg || "Error de conexión con el servidor.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setResendMessage("");
        try {
            await api.post('/auth/resend-verification', { email: registeredEmail });
            setResendMessage("Correo reenviado. Revisa tu bandeja de entrada.");
        } catch {
            setResendMessage("No se pudo reenviar. Intenta de nuevo en un momento.");
        } finally {
            setResendLoading(false);
        }
    };

    // — Pantalla de éxito: revisa tu correo —
    if (registeredEmail) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-surface py-10 px-8 shadow-xl sm:rounded-2xl border border-muted/30 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-foreground mb-2">Revisa tu correo</h2>
                        <p className="text-sm text-muted-foreground mb-1 leading-relaxed">
                            Te enviamos un enlace de verificación a:
                        </p>
                        <p className="text-sm font-semibold text-primary mb-6">{registeredEmail}</p>
                        <p className="text-xs text-muted-foreground mb-8 leading-relaxed">
                            Haz clic en el enlace del correo para activar tu cuenta.
                            El enlace expira en <strong className="text-foreground">24 horas</strong>.
                        </p>

                        {resendMessage && (
                            <p className="text-xs text-primary mb-4">{resendMessage}</p>
                        )}

                        <button
                            onClick={handleResend}
                            disabled={resendLoading}
                            className="w-full py-2.5 px-4 border border-muted/30 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-muted/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                        >
                            {resendLoading ? "Reenviando..." : "Reenviar correo"}
                        </button>

                        <Link
                            href="/login"
                            className="block w-full py-2.5 px-4 bg-primary rounded-xl text-sm font-bold text-white text-center hover:bg-primary-light transition-all"
                        >
                            Ir al inicio de sesión
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // — Formulario de registro —
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-muted/30 shadow-lg relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent"></div>
                        <span className="font-black text-primary text-2xl relative z-10 group-hover:scale-110 transition-transform">TT</span>
                    </div>
                </div>
                <h2 className="text-center text-3xl font-black tracking-tight text-foreground">
                    Crea tu Cuenta
                </h2>
                <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
                    Únete a TourneyTru para seguir estadísticas en tiempo real.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-surface py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-muted/30">

                    {/* Intent selector */}
                    <div className="mb-6">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">¿Cómo quieres usar TourneyTru?</p>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setIntent("viewer")}
                                className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all ${intent === "viewer"
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-muted/30 bg-background text-muted-foreground hover:border-muted/60"
                                    }`}
                            >
                                {intent === "viewer" && (
                                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                                )}
                                <span className="text-xl mb-1">👀</span>
                                <span className="font-bold text-sm">Solo ver</span>
                                <span className="text-xs mt-0.5 opacity-70">Estadísticas y juegos en vivo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIntent("organizer")}
                                className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all ${intent === "organizer"
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-muted/30 bg-background text-muted-foreground hover:border-muted/60"
                                    }`}
                            >
                                {intent === "organizer" && (
                                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                                )}
                                <span className="text-xl mb-1">🏆</span>
                                <span className="font-bold text-sm">Quiero organizar</span>
                                <span className="text-xs mt-0.5 opacity-70">Crear y gestionar torneos</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIntent("streamer")}
                                className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all ${intent === "streamer"
                                    ? "border-purple-500 bg-purple-500/10 text-foreground"
                                    : "border-muted/30 bg-background text-muted-foreground hover:border-muted/60"
                                    }`}
                            >
                                {intent === "streamer" && (
                                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500" />
                                )}
                                <span className="text-xl mb-1">📺</span>
                                <span className="font-bold text-sm">Soy Streamer</span>
                                <span className="text-xs mt-0.5 opacity-70">Transmito juegos en vivo</span>
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="nombre" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Nombre</label>
                                <input
                                    type="text" name="nombre" id="nombre" required
                                    className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                    placeholder="Juan" onChange={handleChange} value={formData.nombre}
                                />
                            </div>
                            <div>
                                <label htmlFor="apellido" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Apellido</label>
                                <input
                                    type="text" name="apellido" id="apellido" required
                                    className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                    placeholder="Pérez" onChange={handleChange} value={formData.apellido}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="celular" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Celular <span className="text-muted-foreground/60 normal-case font-normal">(opcional)</span></label>
                            <input
                                type="tel" name="celular" id="celular"
                                className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                placeholder="+52 123 456 7890" onChange={handleChange} value={formData.celular}
                            />
                        </div>

                        <div>
                            <label htmlFor="correo" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Correo Electrónico</label>
                            <input
                                type="email" name="correo" id="correo" required
                                className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                placeholder="tu@correo.com" onChange={handleChange} value={formData.correo}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Contraseña</label>
                            <input
                                type="password" name="password" id="password" required minLength={8}
                                className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                placeholder="Mín. 8 caracteres" onChange={handleChange} value={formData.password}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">Debe incluir mayúscula, minúscula y número.</p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Confirmar Contraseña</label>
                            <input
                                type="password" name="confirmPassword" id="confirmPassword" required
                                className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                placeholder="••••••••" onChange={handleChange} value={formData.confirmPassword}
                            />
                        </div>

                        {intent === "organizer" && (
                            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                                <p className="text-xs font-bold text-primary mb-1">Solicitud de acceso como organizador</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Tu cuenta se creará como visitante. Para activar el acceso de organizador, manda un correo a{" "}
                                    <span className="text-primary font-semibold">admin@tourneytru.com</span>{" "}
                                    con tu nombre y correo registrado. Recibirás respuesta en máximo 2 días hábiles.
                                </p>
                            </div>
                        )}

                        {intent === "streamer" && (
                            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                                <p className="text-xs font-bold text-purple-400 mb-1">Solicitud de acceso como Streamer</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Tu cuenta se creará como visitante. Para activar el acceso de Streamer, manda un correo a{" "}
                                    <span className="text-purple-400 font-semibold">admin@tourneytru.com</span>{" "}
                                    con tu nombre, correo registrado y el torneo/liga que deseas transmitir. Recibirás respuesta en máximo 2 días hábiles.
                                </p>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white transition-all active:scale-[0.98] ${loading ? "bg-muted cursor-not-allowed" : "bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer"}`}
                            >
                                {loading ? "Creando cuenta..." : "Crear Cuenta"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-muted/30" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-surface text-muted-foreground text-center">
                                    ¿Ya tienes cuenta? <br className="sm:hidden" /> <Link href="/login" className="text-primary hover:text-primary-light font-bold transition-colors">Inicia sesión</Link>
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
