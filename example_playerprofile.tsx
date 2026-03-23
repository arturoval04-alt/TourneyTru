import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { playerAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Shield, Trophy, ChevronLeft, Loader2, Share2, Download, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const StatComparisonRow = ({ label, val1, val2, invert = false }) => {
    const v1 = Number(val1) || 0;
    const v2 = Number(val2) || 0;
    let rightIsBetter = v2 > v1;
    let leftIsBetter = v1 > v2;
    if (invert) {
        rightIsBetter = v2 < v1;
        leftIsBetter = v1 < v2;
    }

    return (
        <>
            <div className={`p-3 bg-slate-50 rounded-lg flex items-center justify-center font-numbers text-xl font-bold ${leftIsBetter ? 'text-accent' : 'text-slate-700'}`}>
                {val1}
            </div>
            <div className="flex items-center justify-center uppercase text-[10px] md:text-xs font-bold text-slate-400 tracking-wider text-center">
                {label}
            </div>
            <div className={`p-3 bg-slate-50 rounded-lg flex items-center justify-center font-numbers text-xl font-bold ${rightIsBetter ? 'text-blue-500' : 'text-slate-700'}`}>
                {val2}
            </div>
        </>
    );
};

const PlayerProfile = () => {
    const { id } = useParams();
    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resumen');
    const { hasRole } = useAuth();

    // Comparison State
    const [comparisonPlayers, setComparisonPlayers] = useState([]);
    const [selectedOpponentId, setSelectedOpponentId] = useState('');
    const [opponent, setOpponent] = useState(null);

    useEffect(() => {
        fetchPlayerData();
    }, [id]);

    useEffect(() => {
        if (player && player.tournament_id) {
            fetchComparisonPlayers(player.tournament_id);
        }
    }, [player?.tournament_id]);

    useEffect(() => {
        if (selectedOpponentId) {
            fetchOpponentData(selectedOpponentId);
        } else {
            setOpponent(null);
        }
    }, [selectedOpponentId]);

    const fetchComparisonPlayers = async (tournamentId) => {
        try {
            const res = await playerAPI.getAll({ tournament_id: tournamentId });
            setComparisonPlayers(res.data.filter(p => p.id.toString() !== id.toString()));
        } catch (error) {
            console.error('Error fetching comparison players:', error);
        }
    };

    const fetchOpponentData = async (oppId) => {
        try {
            const res = await playerAPI.getOne(oppId);
            setOpponent(res.data);
        } catch (error) {
            console.error('Error fetching opponent data:', error);
            toast.error('Error al cargar datos del rival');
        }
    };

    const fetchPlayerData = async () => {
        setLoading(true);
        try {
            const res = await playerAPI.getOne(id);
            setPlayer(res.data);
        } catch (error) {
            console.error('Error fetching player data:', error);
            toast.error('Error al cargar datos del jugador');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Enlace copiado al portapapeles');
    };

    const handleDownload = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!player) {
        return (
            <div className="container-app py-16 text-center">
                <User className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <h2 className="font-heading text-2xl font-bold mb-2">Jugador no encontrado</h2>
                <Link to="/teams">
                    <Button variant="outline">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Volver a Equipos
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header Profile Section */}
            <div className="hero-gradient text-white py-12 relative">
                <div className="container-app">
                    {player.team_id ? (
                        <Link to={`/teams/${player.team_id}`} className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors font-medium">
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            {player.team_name || 'Volver al equipo'}
                        </Link>
                    ) : (
                        <Link to="/teams" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors font-medium">
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Equipos
                        </Link>
                    )}

                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Player Image with Badge */}
                        <div className="relative flex-shrink-0">
                            <div className="w-48 h-48 md:w-64 md:h-64 rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-xl">
                                {player.image_url ? (
                                    <img
                                        src={player.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}${player.image_url}` : player.image_url}
                                        alt={player.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="h-24 w-24 text-slate-600" />
                                    </div>
                                )}
                            </div>
                            {player.number && (
                                <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-numbers text-3xl font-black shadow-lg border-4 border-slate-900">
                                    {player.number}
                                </div>
                            )}
                        </div>

                        {/* Player Details */}
                        <div className="flex-1 pt-2 w-full">
                            <div className="flex flex-col items-start gap-4">
                                {player.position && (
                                    <Badge className="bg-blue-600 text-white hover:bg-blue-700 uppercase tracking-widest font-semibold px-3 py-1 text-xs">
                                        {player.position}
                                    </Badge>
                                )}

                                <h1 className="font-heading text-4xl md:text-5xl font-black uppercase tracking-tight text-white m-0">
                                    {player.name}
                                </h1>

                                <div className="flex flex-wrap items-center gap-6 text-slate-300">
                                    {player.team_name && (
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-slate-400" />
                                            <span className="font-medium">{player.team_name}</span>
                                        </div>
                                    )}
                                    {player.tournament_name && (
                                        <div className="flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-slate-400" />
                                            <span className="font-medium">{player.tournament_name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Primary Stats Row */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-4">
                                    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 flex flex-col items-center justify-center">
                                        <span className="font-numbers text-3xl font-bold text-accent mb-1">{player.career_stats?.total_goals || 0}</span>
                                        <span className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 font-medium">Goles</span>
                                    </div>
                                    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 flex flex-col items-center justify-center">
                                        <span className="font-numbers text-3xl font-bold text-blue-500 mb-1">{player.career_stats?.total_assists || 0}</span>
                                        <span className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 font-medium">Asistencias</span>
                                    </div>
                                    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 flex flex-col items-center justify-center">
                                        <span className="font-numbers text-3xl font-bold text-white mb-1">{player.career_stats?.matches_played || 0}</span>
                                        <span className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 font-medium">Partidos</span>
                                    </div>
                                    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 flex flex-col items-center justify-center">
                                        <span className="font-numbers text-3xl font-bold text-white mb-1">{player.age || '-'}</span>
                                        <span className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 font-medium">Años</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 mt-4 print:hidden">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium" size="sm" onClick={handleShare}>
                                        <Share2 className="mr-2 h-4 w-4" />
                                        Compartir Stats
                                    </Button>
                                    <Button variant="outline" className="bg-slate-800/50 border-slate-600 hover:bg-slate-700 text-slate-300 focus:text-white hover:text-white focus:bg-slate-700 font-medium" size="sm" onClick={handleDownload}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Descargar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Layout */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="container-app">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="h-14 bg-transparent p-0 border-none gap-6 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                            <TabsTrigger
                                value="resumen"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-slate-900 text-slate-500 font-heading uppercase text-sm rounded-none h-full px-1"
                            >
                                Resumen
                            </TabsTrigger>
                            <TabsTrigger
                                value="estadisticas"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-slate-900 text-slate-500 font-heading uppercase text-sm rounded-none h-full px-1"
                            >
                                Estadísticas
                            </TabsTrigger>
                            <TabsTrigger
                                value="historial"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-slate-900 text-slate-500 font-heading uppercase text-sm rounded-none h-full px-1"
                            >
                                Historial
                            </TabsTrigger>
                            <TabsTrigger
                                value="comparar"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-slate-900 text-slate-500 font-heading uppercase text-sm rounded-none h-full px-1"
                            >
                                Comparar
                            </TabsTrigger>
                        </TabsList>

                        <div className="py-8 bg-slate-50/50 min-h-[400px]">
                            <TabsContent value="resumen" className="mt-0">
                                <Card className="max-w-4xl border-none shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="font-heading uppercase text-xl">Resumen de Temporada</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-lg">
                                                <p className="text-sm text-slate-500 uppercase font-medium">Part. Jugados</p>
                                                <p className="font-numbers text-2xl font-bold">{player.career_stats?.matches_played || 0}</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-lg">
                                                <p className="text-sm text-slate-500 uppercase font-medium">Mins. x Gol</p>
                                                <p className="font-numbers text-2xl font-bold">{player.career_stats?.total_goals ? Math.round((player.career_stats?.matches_played * 90) / player.career_stats.total_goals) : '-'}</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-lg">
                                                <p className="text-sm text-slate-500 uppercase font-medium">Asistencias</p>
                                                <p className="font-numbers text-2xl font-bold text-blue-500">{player.career_stats?.total_assists || 0}</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-lg">
                                                <p className="text-sm text-slate-500 uppercase font-medium">Tarjetas</p>
                                                <p className="font-numbers text-2xl font-bold text-yellow-500">{player.career_stats?.yellow_cards || 0}</p>
                                            </div>
                                        </div>
                                        <p className="text-slate-600 mt-4 leading-relaxed">
                                            {player.name} tiene un rol clave como {player.position || 'jugador de campo'} en la presente temporada con {player.team_name ? <strong>{player.team_name}</strong> : 'su equipo'}.
                                            Registra <strong>{player.career_stats?.total_goals || 0} tantos</strong> en {player.career_stats?.matches_played || 0} apariciones, consolidando un aporte constante en todas las facetas del juego.
                                        </p>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="estadisticas" className="mt-0 pt-4">
                                <Card className="max-w-4xl border-none shadow-sm">
                                    <CardHeader><CardTitle className="font-heading uppercase text-xl">Rendimiento Detallado</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center py-2 border-b"><span className="text-slate-500 font-medium">Goles Anotados</span><span className="font-numbers font-bold text-lg">{player.career_stats?.total_goals || 0}</span></div>
                                            <div className="flex justify-between items-center py-2 border-b"><span className="text-slate-500 font-medium">Asistencias</span><span className="font-numbers font-bold text-lg">{player.career_stats?.total_assists || 0}</span></div>
                                            <div className="flex justify-between items-center py-2 border-b"><span className="text-slate-500 font-medium">Partidos Jugados</span><span className="font-numbers font-bold text-lg">{player.career_stats?.matches_played || 0}</span></div>
                                            <div className="flex justify-between items-center py-2 border-b"><span className="text-slate-500 font-medium">Tarjetas Amarillas</span><span className="font-numbers font-bold text-lg text-yellow-500">{player.career_stats?.yellow_cards || 0}</span></div>
                                            <div className="flex justify-between items-center py-2 border-b"><span className="text-slate-500 font-medium">Tarjetas Rojas</span><span className="font-numbers font-bold text-lg text-red-500">{player.career_stats?.red_cards || 0}</span></div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="historial" className="mt-0 pt-4">
                                <Card className="max-w-4xl border-none shadow-sm">
                                    <CardHeader><CardTitle className="font-heading uppercase text-xl">Trayectoria y Fichajes</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="border-l-2 border-slate-200 pl-4 ml-2 py-2 space-y-6">
                                            <div className="relative">
                                                <div className="absolute -left-[25px] top-1 w-3 h-3 bg-accent rounded-full"></div>
                                                <p className="text-xs text-slate-400 font-medium mb-1">Temporada Actual</p>
                                                <p className="font-bold text-slate-800">{player.team_name || 'Agente Libre'}</p>
                                                <p className="text-sm text-slate-600">Debutó oficialmente en {player.tournament_name || 'el torneo'} como {player.position || 'ficha estelar'}.</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="comparar" className="mt-0 pt-4">
                                <Card className="border-none shadow-sm max-w-4xl">
                                    <CardHeader>
                                        <CardTitle className="font-heading uppercase text-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <span>Comparador Biométrico</span>
                                            <div className="w-full md:w-72">
                                                <Select value={selectedOpponentId} onValueChange={setSelectedOpponentId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona un rival..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {comparisonPlayers.map(p => (
                                                            <SelectItem key={p.id} value={p.id.toString()}>
                                                                {p.name} ({p.team_name})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {!opponent ? (
                                            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                                <User className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                                <p className="text-slate-500 font-medium">Selecciona un jugador del mismo torneo para comparar estadísticas</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-4 text-center">
                                                {/* Header row */}
                                                <div className="flex flex-col items-center justify-center p-2 mb-4">
                                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-slate-200 mb-2 border-2 border-accent shadow-sm">
                                                        {player.image_url ? <img src={player.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}${player.image_url}` : player.image_url} className="w-full h-full object-cover" alt={player.name} /> : <User className="w-full h-full p-4 text-slate-400" />}
                                                    </div>
                                                    <span className="font-bold text-sm leading-tight text-slate-800">{player.name}</span>
                                                    <span className="text-[10px] uppercase text-slate-500">{player.team_name}</span>
                                                </div>
                                                <div className="flex items-center justify-center px-4 md:px-8">
                                                    <span className="font-heading text-2xl font-black text-slate-300 italic">VS</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-2 mb-4">
                                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-slate-200 mb-2 border-2 border-blue-500 shadow-sm">
                                                        {opponent.image_url ? <img src={opponent.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}${opponent.image_url}` : opponent.image_url} className="w-full h-full object-cover" alt={opponent.name} /> : <User className="w-full h-full p-4 text-slate-400" />}
                                                    </div>
                                                    <span className="font-bold text-sm leading-tight text-slate-800">{opponent.name}</span>
                                                    <span className="text-[10px] uppercase text-slate-500">{opponent.team_name}</span>
                                                </div>

                                                {/* Stats rows */}
                                                <StatComparisonRow label="Partidos" val1={player.career_stats?.matches_played || 0} val2={opponent.career_stats?.matches_played || 0} />
                                                <StatComparisonRow label="Goles" val1={player.career_stats?.total_goals || 0} val2={opponent.career_stats?.total_goals || 0} />
                                                <StatComparisonRow label="Asistencias" val1={player.career_stats?.total_assists || 0} val2={opponent.career_stats?.total_assists || 0} />
                                                <StatComparisonRow label="Amarillas" val1={player.career_stats?.yellow_cards || 0} val2={opponent.career_stats?.yellow_cards || 0} invert />
                                                <StatComparisonRow label="Rojas" val1={player.career_stats?.red_cards || 0} val2={opponent.career_stats?.red_cards || 0} invert />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfile;
