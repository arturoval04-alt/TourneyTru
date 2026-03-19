"use client";

import Link from "next/link";
import { useState } from "react";

import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                setError(error.message || "Ocurrió un error.");
                return;
            }

            setSubmitted(true);
        } catch (err) {
            setError("Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-muted/30 shadow-lg relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent"></div>
                        <span className="font-black text-primary text-2xl relative z-10">TT</span>
                    </div>
                </div>
                <h2 className="text-center text-3xl font-black tracking-tight text-foreground">
                    Recuperar contraseña
                </h2>
                <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
                    Ingresa tu correo y te enviaremos instrucciones.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-surface py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-muted/30">

                    {submitted ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium">
                                Si el correo está registrado, recibirás las instrucciones.
                            </div>

                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium text-center">
                                Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en unos momentos. Por favor revisa tu bandeja de entrada.
                            </div>

                            <div className="text-center pt-2">
                                <Link href="/login" className="text-sm font-medium text-primary hover:text-primary-light transition-colors">
                                    Volver al login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div>
                                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                        Correo Electrónico
                                    </label>
                                    <input
                                        id="email" name="email" type="email" required
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setError(""); }}
                                        className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                        placeholder="tu@correo.com"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white transition-all active:scale-[0.98] ${loading ? 'bg-muted cursor-not-allowed' : 'bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'}`}
                                >
                                    {loading ? 'Enviando...' : 'Enviar instrucciones'}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                    Volver al login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
