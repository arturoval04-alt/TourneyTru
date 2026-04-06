'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Plus, Play, Trash2, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface QuickGame {
    id: string;
    status: string;
    homeScore: number;
    awayScore: number;
    scheduledDate: string;
    maxInnings: number;
    homeTeam: { id: string; name: string };
    awayTeam: { id: string; name: string };
}

const STATUS_LABEL: Record<string, string> = {
    scheduled: 'Programado',
    in_progress: 'En vivo',
    finished: 'Finalizado',
};

const STATUS_COLOR: Record<string, string> = {
    scheduled: 'text-muted-foreground bg-muted/30',
    in_progress: 'text-green-600 bg-green-500/10',
    finished: 'text-primary bg-primary/10',
};

export default function StreamerDashboard() {
    const router = useRouter();
    const [games, setGames] = useState<QuickGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [firstName, setFirstName] = useState('');

    useEffect(() => {
        setFirstName(getUser()?.firstName ?? '');
    }, []);

    const fetchGames = () => {
        setLoading(true);
        api.get('/streamer/games')
            .then(({ data }) => setGames(data))
            .catch(() => toast.error('Error cargando juegos'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchGames(); }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Eliminar este juego? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/streamer/games/${id}`);
            toast.success('Juego eliminado');
            fetchGames();
        } catch {
            toast.error('Error eliminando el juego');
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-foreground">
                            Mis Juegos Rápidos
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {firstName ? `Hola, ${firstName}. ` : ''}Crea y lleva juegos sin configurar un torneo completo.
                        </p>
                    </div>
                    <Link
                        href="/nuevo-juego"
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Juego
                    </Link>
                </div>

                {/* Games list */}
                {loading ? (
                    <div className="text-center py-16 text-muted-foreground">Cargando...</div>
                ) : games.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-muted/40 rounded-2xl">
                        <p className="text-muted-foreground font-medium">Aún no tienes juegos.</p>
                        <Link href="/nuevo-juego" className="mt-4 inline-block text-primary font-bold text-sm hover:underline">
                            Crear primer juego →
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {games.map((g) => (
                            <div key={g.id} className="bg-surface border border-muted/30 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                                {/* Status icon */}
                                <div className="hidden sm:flex flex-col items-center justify-center w-10 text-muted-foreground">
                                    {g.status === 'finished' ? (
                                        <CheckCircle className="w-5 h-5 text-primary" />
                                    ) : g.status === 'in_progress' ? (
                                        <Play className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <Clock className="w-5 h-5" />
                                    )}
                                </div>

                                {/* Game info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-foreground text-base">
                                            {g.homeTeam.name}
                                        </span>
                                        <span className="text-xl font-black text-primary">
                                            {g.homeScore} – {g.awayScore}
                                        </span>
                                        <span className="font-black text-foreground text-base">
                                            {g.awayTeam.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[g.status] || ''}`}>
                                            {STATUS_LABEL[g.status] || g.status}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(g.scheduledDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {g.maxInnings} entradas
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {g.status !== 'finished' && (
                                        <Link
                                            href={`/game/${g.id}`}
                                            className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                                        >
                                            {g.status === 'in_progress' ? 'Continuar' : 'Iniciar'}
                                        </Link>
                                    )}
                                    {g.status === 'finished' && (
                                        <Link
                                            href={`/gamefinalizado/${g.id}`}
                                            className="px-4 py-1.5 bg-muted text-foreground rounded-lg text-xs font-bold hover:bg-muted/70 transition-colors"
                                        >
                                            Ver resumen
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => handleDelete(g.id)}
                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
