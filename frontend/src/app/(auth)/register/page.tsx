"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "@/lib/auth";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api`;

export default function RegisterPage() {
    const router = useRouter();
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
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
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: formData.nombre.trim(),
                    lastName: formData.apellido.trim(),
                    email: formData.correo.trim().toLowerCase(),
                    password: formData.password,
                    phone: formData.celular || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Error al crear la cuenta. Intenta de nuevo.");
                return;
            }

            saveSession(data.user, {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            });

            router.push("/");
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
                    Crea tu Cuenta
                </h2>
                <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
                    Únete a TourneyTru como aficionado para acceder a estadísticas y jugadores.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-surface py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-muted/30">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-4">
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
                                <span className="px-3 bg-surface text-muted-foreground">
                                    ¿Ya tienes cuenta? <Link href="/login" className="text-primary hover:text-primary-light font-bold transition-colors">Inicia sesión</Link>
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
