'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { Trophy, PlayCircle, BarChart3, Share2, Search, ArrowRight, Activity, Users } from 'lucide-react';
import api from '@/lib/api';
// Use motion from framer-motion
import { motion, AnimatePresence, Variants } from 'motion/react';

interface GameItem {
  id: string;
  homeTeam: { name: string; shortName?: string; logoUrl?: string };
  awayTeam: { name: string; shortName?: string; logoUrl?: string };
  homeScore: number;
  awayScore: number;
  currentInning: number;
  half: string;
  status: string;
  tournament?: { name: string; id: string; logoUrl?: string };
}

// Reusable animation variants
const fadeUpObj: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function LobbyPage() {
  const router = useRouter();
  const [recentGames, setRecentGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'live' | 'finished'>('live');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRecentGames = async () => {
      try {
        const { data } = await api.get('/games', { params: { limit: 6 } });
        setRecentGames(data || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchRecentGames();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Basic navigation or filtering logic could go here
      // For now, let's just push to /torneos which has its own search
      router.push('/torneos');
    }
  };

  const filteredGames = recentGames.filter(game =>
    activeFilter === 'live'
      ? (game.status === 'in_progress' || game.status === 'scheduled')
      : game.status === 'finished'
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 overflow-x-hidden">

      {/* ── Background Ambient Glows ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Top center giant glow */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-primary/10 rounded-[100%] blur-[120px] mix-blend-screen opacity-50 dark:opacity-30"></div>
        {/* Bottom right glow */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen opacity-40"></div>
        {/* Bottom left glow */}
        <div className="absolute top-[40%] left-[-10%] w-[30%] h-[50%] bg-primary/5 rounded-full blur-[120px] mix-blend-screen opacity-40"></div>

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('/images/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.03]"></div>
      </div>

      <Navbar />

      <main className="relative z-10 flex flex-col gap-20 sm:gap-32 pb-20">

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════════════════════ */}

        <section className="relative pt-24 sm:pt-32 lg:pt-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col items-center text-center">

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-md shadow-2xl"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            La evolución de llevar un torneo
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[1.05]"
          >
            Sigue Cada <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              Jugada en Vivo
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-zinc-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Resultados en tiempo real, estadísticas avanzadas y gestión profesional de torneos. Una experiencia inmersiva diseñada para jugadores, coaches y aficionados.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md sm:max-w-none"
          >
            <button
              onClick={() => router.push('/torneos')}
              className="px-8 py-4 bg-primary hover:bg-primary-light text-white font-bold rounded-xl border border-primary-light/50 shadow-[0_0_20px_rgba(var(--primary),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary),0.6)] transition-all cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 group"
            >
              Explorar Torneos
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <form onSubmit={handleSearch} className="relative w-full sm:w-auto sm:min-w-[300px] h-[58px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar equipo o torneo..."
                className="w-full h-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm font-medium shadow-2xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </motion.div>

        </section>


        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* ── FEATURES SECTION ──────────────────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════════════════════ */}

        <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full ">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpObj}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Potencia tu Liga</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Diseñado para ofrecer la mejor experiencia deportiva digital.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* Feature 1 */}
            <motion.div variants={fadeUpObj} className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] group-hover:bg-primary/20 transition-colors"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-6 shadow-inner">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Gestión Total</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Crea torneos, organiza rosters, asigna campos y programa juegos en un dashboard intuitivo.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={fadeUpObj} className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] group-hover:bg-blue-500/20 transition-colors"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex items-center justify-center mb-6 shadow-inner">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Scoreboard en Vivo</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Anota bola por bola. Los fans y jugadores verán la actualización al instante, sin recargar la página.
                </p>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={fadeUpObj} className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] group-hover:bg-indigo-500/20 transition-colors"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-inner">
                  <BarChart3 className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Métricas PRO</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Estadísticas automáticas de bateo y pitcheo. Tablas de líderes y métricas al estilo Ligas Mayores.
                </p>
              </div>
            </motion.div>

            {/* Feature 4 */}
            <motion.div variants={fadeUpObj} className="group relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] group-hover:bg-purple-500/20 transition-colors"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center mb-6 shadow-inner">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Perfiles de Jugador</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Cada jugador tiene su propio perfil digital acumulando su historial a lo largo de los torneos.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </section>


        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* ── LIVE GAMES SECTION ────────────────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════════════════════ */}

        <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpObj}
            className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-10"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Gamecast
              </h2>
              <p className="text-zinc-400">La emoción de la liga en tiempo real.</p>
            </div>

            <div className="flex bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-xl w-full sm:w-auto self-start sm:self-auto">
              <button
                onClick={() => setActiveFilter('live')}
                className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer text-center ${activeFilter === 'live' ? 'text-white bg-white/10 shadow-lg border border-white/5' : 'text-zinc-500 hover:text-white'}`}
              >
                En Vivo / Prog
              </button>
              <button
                onClick={() => setActiveFilter('finished')}
                className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer text-center ${activeFilter === 'finished' ? 'text-white bg-white/10 shadow-lg border border-white/5' : 'text-zinc-500 hover:text-white'}`}
              >
                Terminados
              </button>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-72 bg-white/5 border border-white/5 rounded-3xl animate-pulse backdrop-blur-sm"></div>
                ))}
              </motion.div>
            ) : filteredGames.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="w-full py-32 text-center bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <PlayCircle size={28} className="text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-zinc-300 mb-2">No hay juegos aquí</h3>
                <p className="text-zinc-500 max-w-sm">
                  {activeFilter === 'live' ? 'No hay juegos en progreso o programados en este momento.' : 'No hay juegos finalizados recientemente.'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredGames.map((game, i) => {
                  const inningLabel = game.status === 'scheduled' ? 'Pre-Game'
                    : game.status === 'finished' ? 'Final'
                      : `${game.half === 'top' ? '▲' : '▼'}${game.currentInning}`;

                  const isLive = game.status === 'in_progress';
                  const isFinished = game.status === 'finished';

                  return (
                    <motion.div
                      key={game.id}
                      variants={fadeUpObj}
                      onClick={() => router.push(game.status === 'in_progress' ? `/gamecast/${game.id}` : game.status === 'finished' ? `/gamefinalizado/${game.id}` : `/gamescheduled/${game.id}`)}
                      className={`group relative bg-surface hover:bg-surface/80 border rounded-3xl overflow-hidden transition-all duration-500 cursor-pointer flex flex-col ${isLive ? 'border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.1)] hover:shadow-[0_0_30px_rgba(var(--primary),0.2)] hover:border-primary/50' : 'border-white/10 hover:border-white/20 shadow-xl'}`}
                    >
                      {/* Subtie tournament background watermark */}
                      {(game.tournament?.logoUrl) && (
                        <div className="absolute right-[-20%] top-[-10%] w-[80%] aspect-square opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700 pointer-events-none grayscale">
                          <Image src={game.tournament.logoUrl} alt="Logo" fill className="object-contain blur-sm" unoptimized />
                        </div>
                      )}

                      {/* Header */}
                      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center relative z-10">
                        <span className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 ${isLive ? 'text-primary' : 'text-zinc-500'}`}>
                          {isLive && <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>}
                          {isLive ? 'EN CURSO' : game.status === 'scheduled' ? 'PROGRAMADO' : 'FINALIZADO'}
                        </span>
                        <span className={`text-xs font-black px-2.5 py-1 rounded-md border ${isFinished ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-primary/10 text-primary border-primary/20 shadow-inner'}`}>
                          {inningLabel}
                        </span>
                      </div>

                      {/* Teams & Scores */}
                      <div className="p-6 flex-1 flex flex-col justify-center gap-6 relative z-10">

                        {/* Away */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center font-black text-xl border border-white/10 shadow-inner overflow-hidden relative group-hover:bg-white/10 transition-colors">
                              {game.awayTeam.logoUrl ? (
                                <Image src={game.awayTeam.logoUrl} alt={game.awayTeam.name} width={56} height={56} className="object-cover" unoptimized />
                              ) : (
                                <span className="text-zinc-400">{game.awayTeam.name.substring(0, 1)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-lg text-white truncate">{game.awayTeam.shortName || game.awayTeam.name}</p>
                              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">Visita</p>
                            </div>
                          </div>
                          <span className={`text-4xl font-black drop-shadow-lg ${isFinished && game.awayScore > game.homeScore ? 'text-white' : isFinished ? 'text-zinc-500' : 'text-white'}`}>
                            {game.awayScore ?? '-'}
                          </span>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                        {/* Home */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center font-black text-xl border border-white/10 shadow-inner overflow-hidden relative group-hover:bg-white/10 transition-colors">
                              {game.homeTeam.logoUrl ? (
                                <Image src={game.homeTeam.logoUrl} alt={game.homeTeam.name} width={56} height={56} className="object-cover" unoptimized />
                              ) : (
                                <span className="text-zinc-400">{game.homeTeam.name.substring(0, 1)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-lg text-white truncate">{game.homeTeam.shortName || game.homeTeam.name}</p>
                              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">Local</p>
                            </div>
                          </div>
                          <span className={`text-4xl font-black drop-shadow-lg ${isFinished && game.homeScore > game.awayScore ? 'text-white' : isFinished ? 'text-zinc-500' : 'text-white'}`}>
                            {game.homeScore ?? '-'}
                          </span>
                        </div>

                      </div>

                      {/* Footer */}
                      <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                        <div className="text-xs font-bold text-zinc-500 truncate pr-4">
                          {game.tournament?.name || 'Torneo'}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                          {isFinished ? 'Ver Boxscore' : 'Gamecast'}
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* ── CTA BOTTOM ────────────────────────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════════════════════ */}

        <section className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpObj}
            className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-blue-900/20 to-background border border-primary/20 rounded-[2.5rem] p-10 sm:p-16 text-center shadow-2xl"
          >
            <div className="absolute inset-0 bg-[url('/images/grid.svg')] bg-center opacity-10"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-6 ring-8 ring-primary/5">
                <Trophy size={28} />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">Eleva el Nivel de tu Liga</h2>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8">
                Únete a la plataforma que transofrmará la manera de ver y visualizar tu liga.
              </p>
              <button
                onClick={() => router.push('/torneos')}
                className="px-8 py-4 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl shadow-xl transition-all hover:scale-105"
              >
                Comenzar Ahora
              </button>
            </div>
          </motion.div>
        </section>

      </main>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}

      <footer className="border-t border-white/5 bg-background pt-16 gap-10 pb-8 mt-10 relative z-100 w-full">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-8 mb-16">

            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <Image src="/logo-tt.png" alt="TourneyTru Logo" width={32} height={32} className="object-contain" />
                <span className="font-black text-2xl tracking-tight text-white">TourneyTru</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed max-w-[250px]">
                La tecnología al servicio del deporte. Scoreboard oficial, gamecast e identidad digital para torneos.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-white mb-1 text-xs uppercase tracking-widest opacity-80">Explorar</h4>
              <ul className="space-y-4">
                <li><Link href="/ligas" className="text-zinc-500 hover:text-white transition-colors text-xs font-medium">Ligas</Link></li>
                <li><Link href="/torneos" className="text-zinc-500 hover:text-white transition-colors text-xs font-medium">Torneos Activos</Link></li>
                <li><Link href="/equipos" className="text-zinc-500 hover:text-white transition-colors text-xs font-medium">Equipos</Link></li>
                <li><Link href="/jugadores" className="text-zinc-500 hover:text-white transition-colors text-xs font-medium">Directorio de Jugadores</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest opacity-80">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-zinc-500 hover:text-white transition-colors text-xs font-medium">Términos del Servicio</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-white transition-colors text-xs font-medium">Política de Privacidad</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest opacity-80">Soporte</h4>
              <ul className="space-y-3 text-sm text-zinc-500 font-medium">
                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  Sistemas Operativos
                </li>
                <li>arturoval04@gmail.com</li>
                <li>6681697097</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-center gap-4">
            <p className="text-zinc-600 text-sm font-medium">© {new Date().getFullYear()} TourneyTru. Todos los derechos reservados.</p>
            <div className="flex gap-4">
              {/* social icons placehoder */}
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">
                <span className="sr-only">X</span>
                𝕏
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">
                <span className="sr-only">IG</span>
                IG
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
