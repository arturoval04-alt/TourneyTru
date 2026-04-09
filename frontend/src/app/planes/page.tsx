"use client";

import Link from "next/link";

const plans = [
    {
        id: "demo",
        label: "Plan Demo",
        subtitle: "Para probar sin compromiso.",
        badge: "Gratis para siempre",
        badgeColor: "bg-green-500/10 text-green-400 border border-green-500/20",
        cardBorder: "border-muted/30",
        highlight: false,
        price: "$0",
        priceNote: null,
        features: [
            { label: "1 liga", icon: "🏟️" },
            { label: "1 torneo", icon: "🏆" },
            { label: "Hasta 8 equipos", icon: "🛡️" },
            { label: "16 jugadores por equipo", icon: "⚾" },
            { label: "Máximo 40 juegos / mes", icon: "📅" },
            { label: "Marcador en vivo", icon: "📊" },
            { label: "Gamecast público", icon: "📱" },
            { label: "Estadísticas automáticas", icon: "📈" },
        ],
        cta: "Crear cuenta gratis",
        ctaHref: "/register",
        ctaStyle: "bg-surface hover:bg-muted/20 border border-muted/30 text-foreground",
    },
    {
        id: "organizador",
        label: "Plan Organizador",
        subtitle: "Para ligas activas que buscan profesionalizarse.",
        badge: "Más popular",
        badgeColor: "bg-primary/10 text-primary border border-primary/30",
        cardBorder: "border-primary/30",
        highlight: true,
        price: "$1200",
        priceNote: "MXN / mes",
        features: [
            { label: "1 liga", icon: "🏟️" },
            { label: "4 torneos", icon: "🏆" },
            { label: "20 equipos por torneo", icon: "🛡️" },
            { label: "Jugadores ilimitados", icon: "⚾" },
            { label: "Juegos ilimitados", icon: "📅" },
            { label: "Marcador en vivo", icon: "📊" },
            { label: "Gamecast público", icon: "📱" },
            { label: "Estadísticas avanzadas", icon: "📈" },
            { label: "Escalable bajo demanda", icon: "⚡" },
        ],
        cta: "Contratar plan",
        ctaHref: "mailto:admin@tourneytru.com?subject=Solicitud Plan Organizador",
        ctaStyle: "bg-primary hover:bg-primary-light text-white shadow-lg shadow-primary/25",
    },
    {
        id: "streamer",
        label: "Plan Streamer",
        subtitle: "Creadores y transmisores independientes.",
        badge: "Por uso",
        badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
        cardBorder: "border-muted/30",
        highlight: false,
        price: "$750",
        priceNote: "MXN / 50 juegos",
        features: [
            { label: "Overlay profesional en transmisión", icon: "📺" },
            { label: "Marcador en tiempo real", icon: "📊" },
            { label: "Panel de control dedicado", icon: "🎛️" },
            { label: "Compatible con Facebook Live", icon: "🔴" },
            { label: "Sin suscripción mensual", icon: "✅" },
            { label: "Paga según uses", icon: "💳" },
        ],
        cta: "Contratar plan",
        ctaHref: "mailto:admin@tourneytru.com?subject=Solicitud Plan Streamer",
        ctaStyle: "bg-surface hover:bg-muted/20 border border-muted/30 text-foreground",
    },
];

const addons = [
    {
        label: "+1 Torneo adicional",
        description: "Agrega otro torneo a tu liga (hasta 20 equipos)",
        price: "+$900 MXN/mes",
    },
    {
        label: "+Equipos extra",
        description: "Más equipos dentro de un torneo existente",
        price: "+$80 MXN / equipo / mes",
    },
];

export default function PlanesPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="border-b border-muted/20 px-4 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-muted/30 flex items-center justify-center">
                            <span className="font-black text-primary text-sm">TT</span>
                        </div>
                        <span className="font-black text-foreground text-sm hidden sm:block">TourneyTru</span>
                    </Link>
                    <Link href="/login" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                        Iniciar sesión
                    </Link>
                </div>
            </div>

            {/* Hero */}
            <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary mb-6 uppercase tracking-widest">
                    Modelos de suscripción transparentes
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-4">
                    Elige tu plan
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Gestiona torneos de béisbol y sóftbol con las herramientas que tu liga necesita.
                    Empieza gratis, escala cuando estés listo.
                </p>
            </div>

            {/* Plans grid */}
            <div className="max-w-5xl mx-auto px-4 pb-10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className={`relative bg-surface border ${plan.cardBorder} rounded-2xl p-6 flex flex-col shadow-sm ${plan.highlight ? 'ring-1 ring-primary/30 scale-[1.02]' : ''}`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                                    <span className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-primary/30">
                                        Más popular
                                    </span>
                                </div>
                            )}

                            {/* Plan header */}
                            <div className="mb-5">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h2 className="text-xl font-black text-foreground leading-tight">{plan.label}</h2>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${plan.badgeColor}`}>
                                        {plan.badge}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{plan.subtitle}</p>
                                <div className="border-t border-muted/20 pt-4">
                                    <span className="text-3xl font-black text-foreground">{plan.price}</span>
                                    {plan.priceNote && (
                                        <span className="text-sm font-semibold text-muted-foreground ml-1">{plan.priceNote}</span>
                                    )}
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-2.5 flex-1 mb-8">
                                {plan.features.map(f => (
                                    <li key={f.label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                                        <span className="text-base leading-none">{f.icon}</span>
                                        <span>{f.label}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <a
                                href={plan.ctaHref}
                                className={`w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${plan.ctaStyle}`}
                            >
                                {plan.cta}
                            </a>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add-ons */}
            <div className="max-w-5xl mx-auto px-4 pb-10">
                <div className="bg-surface border border-muted/30 rounded-2xl p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Plan Organizador</p>
                    <h3 className="text-lg font-black text-foreground mb-1">Expande tu plan cuando lo necesites</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                        Agrega torneos o equipos extra sin cambiar de plan. Pagas solo por lo que usas.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {addons.map(addon => (
                            <div key={addon.label} className="flex items-center justify-between gap-4 p-4 bg-background rounded-xl border border-muted/20">
                                <div>
                                    <p className="text-sm font-bold text-foreground">{addon.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>
                                </div>
                                <span className="text-sm font-black text-primary whitespace-nowrap">{addon.price}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contact */}
            <div className="max-w-5xl mx-auto px-4 pb-16">
                <div className="text-center p-8 bg-surface border border-muted/30 rounded-2xl">
                    <p className="text-lg font-black text-foreground mb-2">¿Tienes preguntas o necesitas algo personalizado?</p>
                    <p className="text-sm text-muted-foreground mb-5">
                        Escríbenos y te diseñamos un plan a medida para tu liga o evento.
                    </p>
                    <a
                        href="mailto:admin@tourneytru.com"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-muted/10 hover:bg-muted/20 border border-muted/30 text-foreground font-bold rounded-xl transition text-sm"
                    >
                        ✉️ admin@tourneytru.com
                    </a>
                </div>

                <div className="mt-8 text-center">
                    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                        ← Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
