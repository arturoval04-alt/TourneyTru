"use client";

import Link from "next/link";

const plans = [
    {
        id: "demo",
        label: "Demo",
        badge: "Con aprobación",
        badgeColor: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
        cardBorder: "border-muted/30",
        available: true,
        price: null,
        priceLabel: "Gratis",
        features: [
            { label: "1 liga", icon: "🏟️" },
            { label: "1 torneo por liga", icon: "🏆" },
            { label: "6 equipos por torneo", icon: "🛡️" },
            { label: "25 jugadores por equipo", icon: "⚾" },
            { label: "Marcador en vivo", icon: "📊" },
            { label: "Gamecast público", icon: "📱" },
        ],
        cta: "Solicitar acceso",
        ctaHref: "/register",
        ctaStyle: "bg-primary hover:bg-primary-light text-white shadow-primary/20",
    },
    {
        id: "standard",
        label: "Estándar",
        badge: "Próximamente",
        badgeColor: "bg-muted/20 text-muted-foreground border border-muted/30",
        cardBorder: "border-muted/30",
        available: false,
        price: null,
        priceLabel: "Próximamente",
        features: [
            { label: "1 liga", icon: "🏟️" },
            { label: "3 torneos por liga", icon: "🏆" },
            { label: "10 equipos por torneo", icon: "🛡️" },
            { label: "30 jugadores por equipo", icon: "⚾" },
            { label: "Marcador en vivo", icon: "📊" },
            { label: "Gamecast público", icon: "📱" },
            { label: "Estadísticas avanzadas", icon: "📈" },
        ],
        cta: "Próximamente",
        ctaHref: null,
        ctaStyle: "bg-muted/20 text-muted-foreground cursor-not-allowed",
    },
    {
        id: "pro",
        label: "Pro",
        badge: "Próximamente",
        badgeColor: "bg-muted/20 text-muted-foreground border border-muted/30",
        cardBorder: "border-primary/20",
        available: false,
        price: null,
        priceLabel: "Próximamente",
        highlight: true,
        features: [
            { label: "1 liga", icon: "🏟️" },
            { label: "10 torneos por liga", icon: "🏆" },
            { label: "50 equipos por torneo", icon: "🛡️" },
            { label: "50 jugadores por equipo", icon: "⚾" },
            { label: "Marcador en vivo", icon: "📊" },
            { label: "Gamecast público", icon: "📱" },
            { label: "Estadísticas avanzadas", icon: "📈" },
            { label: "Facebook Live overlay", icon: "📺" },
            { label: "Escáner de alineación IA", icon: "🤖" },
        ],
        cta: "Próximamente",
        ctaHref: null,
        ctaStyle: "bg-muted/20 text-muted-foreground cursor-not-allowed",
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
                    Planes de acceso
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-4">
                    Elige tu plan
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Gestiona torneos de béisbol y sóftbol con las herramientas que tu liga necesita.
                </p>
            </div>

            {/* Plans grid */}
            <div className="max-w-5xl mx-auto px-4 pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className={`relative bg-surface border ${plan.cardBorder} rounded-2xl p-6 flex flex-col shadow-sm ${plan.highlight ? 'ring-1 ring-primary/30' : ''}`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                                    <span className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-primary/30">
                                        Más completo
                                    </span>
                                </div>
                            )}

                            {/* Plan header */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xl font-black text-foreground">{plan.label}</h2>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${plan.badgeColor}`}>
                                        {plan.badge}
                                    </span>
                                </div>
                                <div className="text-2xl font-black text-foreground">
                                    {plan.priceLabel}
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-2.5 flex-1 mb-8">
                                {plan.features.map(f => (
                                    <li key={f.label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                                        <span>{f.icon}</span>
                                        <span>{f.label}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            {plan.ctaHref ? (
                                <Link
                                    href={plan.ctaHref}
                                    className={`w-full text-center py-3 rounded-xl font-bold text-sm transition shadow-lg ${plan.ctaStyle}`}
                                >
                                    {plan.cta}
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    className={`w-full py-3 rounded-xl font-bold text-sm ${plan.ctaStyle}`}
                                >
                                    {plan.cta}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Custom/contact */}
                <div className="mt-12 text-center p-8 bg-surface border border-muted/30 rounded-2xl">
                    <p className="text-lg font-black text-foreground mb-2">¿Necesitas algo personalizado?</p>
                    <p className="text-sm text-muted-foreground mb-4">
                        Escríbenos y te diseñamos un plan a medida para tu liga.
                    </p>
                    <a
                        href="mailto:valdezarturoval@gmail.com"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-muted/10 hover:bg-muted/20 border border-muted/30 text-foreground font-bold rounded-xl transition text-sm"
                    >
                        ✉️ valdezarturoval@gmail.com
                    </a>
                </div>

                {/* Back link */}
                <div className="mt-8 text-center">
                    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                        ← Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
