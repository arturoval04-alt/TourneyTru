"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        nombre: "",
        apellido: "",
        celular: "",
        correo: "",
        ciudad: "",
        password: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically integrate with your auth backend
        alert("¡Cuenta General creada con éxito!\nAhora podrías iniciar sesión para ver Estadísticas de Jugadores detalladas.");
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
                            <label htmlFor="celular" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Celular</label>
                            <input
                                type="tel" name="celular" id="celular" required
                                className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                placeholder="+52 123 456 7890" onChange={handleChange} value={formData.celular}
                            />
                        </div>

                        <div>
                            <label htmlFor="ciudad" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Ciudad</label>
                            <input
                                type="text" name="ciudad" id="ciudad" required
                                className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                placeholder="Monterrey" onChange={handleChange} value={formData.ciudad}
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
                                type="password" name="password" id="password" required
                                className="block w-full px-4 py-2 bg-background border border-muted/30 rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                                placeholder="••••••••" onChange={handleChange} value={formData.password}
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-[0.98] cursor-pointer"
                            >
                                Crear Cuenta General
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
