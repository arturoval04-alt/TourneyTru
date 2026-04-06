"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<Status>("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("El enlace de verificación no es válido.");
            return;
        }

        api.get(`/auth/verify-email?token=${token}`)
            .then(() => {
                setStatus("success");
            })
            .catch((err) => {
                setStatus("error");
                setMessage(
                    err?.response?.data?.message ||
                    "El enlace de verificación es inválido o ha expirado."
                );
            });
    }, [token]);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-surface py-10 px-8 shadow-xl sm:rounded-2xl border border-muted/30 text-center">

                    {status === "loading" && (
                        <>
                            <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-6" />
                            <h2 className="text-xl font-black text-foreground mb-2">Verificando tu correo...</h2>
                            <p className="text-sm text-muted-foreground">Un momento, por favor.</p>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-black text-foreground mb-2">¡Correo verificado!</h2>
                            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                                Tu cuenta está activa. Ya puedes iniciar sesión y empezar a usar TourneyTru.
                            </p>
                            <Link
                                href="/login"
                                className="block w-full py-3 px-4 bg-primary rounded-xl text-sm font-bold text-white text-center hover:bg-primary-light transition-all"
                            >
                                Iniciar sesión
                            </Link>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-black text-foreground mb-2">Enlace inválido</h2>
                            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                                {message}
                            </p>
                            <Link
                                href="/register"
                                className="block w-full py-3 px-4 bg-primary rounded-xl text-sm font-bold text-white text-center hover:bg-primary-light transition-all mb-3"
                            >
                                Crear cuenta nueva
                            </Link>
                            <Link
                                href="/login"
                                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Ya tengo cuenta — Iniciar sesión
                            </Link>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailContent />
        </Suspense>
    );
}
