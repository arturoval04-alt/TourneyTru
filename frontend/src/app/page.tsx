'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { Trophy, PlayCircle, BarChart3, Share2, Search } from 'lucide-react';
import api from '@/lib/api';

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

export default function LobbyPage() {
  const router = useRouter();
  const [recentGames, setRecentGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'live' | 'finished'>('live');

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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 selection:bg-primary/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none gap-1">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50 dark:opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-light/50 rounded-full blur-[120px] mix-blend-screen opacity-50 dark:opacity-20"></div>
      </div>

      <Navbar />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background Image with Gradient Fade */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/bg/hero.png"
              alt="Stadium Background"
              fill
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-2 md:py-15 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-6 sm:mb-8 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Plataforma Oficial
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tighter mb-4 sm:mb-6 animate-fade-in-up animation-delay-100 px-2">
              Sigue Cada <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light drop-shadow-sm">Jugada</span>.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 sm:mb-10 animate-fade-in-up animation-delay-200 px-4">
              Resultados en vivo, estadísticas detalladas y gestión completa de torneos de béisbol y softbol en una sola plataforma que llevará los juegos a una inmersión total con el espectador
            </p>

            <div className="flex justify-center mb-6 sm:mb-8 w-full max-w-xl mx-auto animate-fade-in-up animation-delay-300 px-2 sm:px-0">
              <div className="relative flex-1 group w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar torneos por nombre o ubicación..."
                  className="w-full bg-surface/80 backdrop-blur-sm border border-muted/30 rounded-xl py-3 pl-12 pr-4 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium shadow-lg"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
              <button onClick={() => router.push('/torneos')} className="px-6 py-3 bg-primary hover:bg-primary-light text-white font-black rounded-xl border border-primary/50 shadow-lg hover:shadow-primary/40 transition-all cursor-pointer w-full sm:w-auto transform hover:-translate-y-1 text-sm">
                Explorar Torneos
              </button>
              <button onClick={() => router.push('/jugadores')} className="px-6 py-3 bg-surface hover:bg-surface/80 text-foreground font-bold rounded-xl border border-muted/50 hover:border-primary/50 transition-all cursor-pointer w-full sm:w-auto text-sm">
                Ver Jugadores
              </button>
            </div>
          </div>
        </section>

        {/* Features Section - Todo lo que necesitas */}
        <section className="relative bg-surface/30 border-y border-muted/10 md:py-15 sm:py-24 mb-12 sm:mb-1 overflow-hidden">
          {/* Background Image Overlay */}
          <div className="absolute inset-0 z-0 scale-110">
            <Image
              src="/images/bg/features.png"
              alt="Baseball Background"
              fill
              className="object-cover opacity-10 blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12 animate-fade-in-up px-2">
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-3 sm:mb-4">Todo lo que necesitas está aquí</h2>
              <p className="text-muted-foreground text-sm sm:text-base">Herramientas completas para organizar, gestionar y seguir torneos de béisbol y softbol</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="bg-surface border border-muted/20 rounded-3xl p-6 hover:bg-muted/5 hover:border-primary/30 transition-all duration-300 animate-fade-in-up">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Gestión de Torneos</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Crea y administra torneos con facilidad. Configura equipos, campos y árbitros.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-surface border border-muted/20 rounded-3xl p-6 hover:bg-muted/5 hover:border-primary/30 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <PlayCircle className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Scoreboard en Vivo</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Registra jugadas en tiempo real con controles intuitivos y estadísticas automáticas.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-surface border border-muted/20 rounded-3xl p-6 hover:bg-muted/5 hover:border-primary/30 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Estadísticas</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Seguimiento completo de estadísticas de jugadores y equipos. Exporta a PDF/Excel.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-surface border border-muted/20 rounded-3xl p-6 hover:bg-muted/5 hover:border-primary/30 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <Share2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Compartir</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Comparte resultados en redes sociales con imágenes prediseñadas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Games Section */}
        <section className="relative w-full pb-35 overflow-hidden pt-10">
          <div className="relative z-10 max-w-7xl mx-auto px-10 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-3 text-foreground">
                <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                Juegos Recientes
              </h3>
              <div className="flex bg-surface rounded-lg p-1 border border-muted/30 shadow-sm w-full sm:w-auto">
                <button
                  onClick={() => setActiveFilter('live')}
                  className={`flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs font-bold rounded shadow transition-all cursor-pointer text-center ${activeFilter === 'live' ? 'text-white bg-primary animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  En Vivo
                </button>
                <button
                  onClick={() => setActiveFilter('finished')}
                  className={`flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs font-bold rounded shadow transition-all cursor-pointer text-center ${activeFilter === 'finished' ? 'text-white bg-amber-600' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Terminados
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="h-64 bg-surface border border-muted/30 rounded-2xl animate-pulse shadow-sm"></div>
                ))
              ) : (
                recentGames
                  .filter(game => activeFilter === 'live' ? (game.status === 'in_progress' || game.status === 'scheduled') : game.status === 'finished')
                  .length === 0 ? (
                  <div className="col-span-full py-35 text-center bg-surface border border-muted/30 rounded-2xl">
                    <p className="text-muted-foreground font-medium text-lg px-10">
                      No hay partidos {activeFilter === 'live' ? 'en vivo' : 'finalizados'} registrados.

                    </p>
                  </div>
                ) : (
                  recentGames
                    .filter(game => activeFilter === 'live' ? (game.status === 'in_progress' || game.status === 'scheduled') : game.status === 'finished')
                    .map((game) => {
                      const inningLabel = game.status === 'scheduled' ? 'Pre-Game'
                        : game.status === 'finished' ? 'Final'
                          : `${game.half === 'top' ? '▲' : '▼'}${game.currentInning}`;
                      return (
                        <div key={game.id} className="bg-surface border border-muted/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group cursor-pointer flex flex-col transform hover:-translate-y-1">
                          {/* Game Status Header */}
                          <div className="bg-muted/5 px-6 py-4 border-b border-muted/20 flex justify-between items-center group-hover:bg-primary/5 transition-colors">
                            <span className={`text-xs font-black tracking-widest uppercase ${game.status === 'in_progress' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}>
                              {game.status === 'scheduled' ? 'Programado' : game.status === 'finished' ? 'Finalizado' : 'En Curso'}
                            </span>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded border border-muted/30 ${game.status === 'finished' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-surface text-foreground'}`}>
                              {inningLabel}
                            </span>
                          </div>

                          {/* Score Area */}
                          <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center gap-4 sm:gap-6 relative group/score">
                            {/* Tournament Watermark/Logo in Middle - More visible and larger */}
                            {(game.tournament?.logoUrl || (game.tournament as any)?.image || (game.tournament as any)?.logo) && (
                              <div className="absolute inset-0 flex items-center justify-center blur-xs opacity-10 pointer-events-none group-hover/score:opacity-20 transition-opacity">
                                <Image
                                  src={game.tournament?.logoUrl || (game.tournament as any)?.image || (game.tournament as any)?.logo}
                                  alt="Tournament Logo"
                                  width={385}
                                  height={385}
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            )}

                            {/* Away Team */}
                            <div className="flex items-center justify-between gap-5 relative z-10">
                              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-muted/10 rounded-full flex items-center justify-center font-black text-primary text-base sm:text-lg border border-primary/20 shadow-inner group-hover:bg-primary/20 transition-colors overflow-hidden">
                                  {game.awayTeam.logoUrl ? (
                                    <Image
                                      src={game.awayTeam.logoUrl}
                                      alt={game.awayTeam.name}
                                      width={70}
                                      height={70}
                                      className="w-full h-full "
                                      unoptimized
                                    />
                                  ) : (
                                    <span className="text-primary font-black">{game.awayTeam.name.substring(0, 1)}</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-base sm:text-lg text-foreground truncate">{game.awayTeam.name}</p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-black tracking-wider truncate">Visitante</p>
                                </div>
                              </div>
                              <span className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-sm shrink-0">{game.awayScore ?? '-'}</span>
                            </div>

                            {/* Home Team */}
                            <div className="flex items-center justify-between gap-2 relative z-10">
                              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-muted/10 rounded-full flex items-center justify-center font-black text-primary text-base sm:text-lg border border-primary/20 shadow-inner group-hover:bg-primary/20 transition-colors overflow-hidden">
                                  {game.homeTeam.logoUrl ? (
                                    <Image
                                      src={game.homeTeam.logoUrl}
                                      alt={game.homeTeam.name}
                                      width={70}
                                      height={70}
                                      className="w-full h-full"
                                      unoptimized
                                    />
                                  ) : (
                                    <span className="text-primary font-black">{game.homeTeam.name.substring(0, 1)}</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-base sm:text-lg text-foreground truncate">{game.homeTeam.name}</p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-black tracking-wider truncate">Local</p>
                                </div>
                              </div>
                              <span className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-sm shrink-0">{game.homeScore ?? '-'}</span>
                            </div>
                          </div>

                          {/* Action Footer */}
                          <div className="px-4 sm:px-6 py-4 bg-muted/5 border-t border-muted/20 flex items-center justify-between mt-auto gap-2">
                            <div className="text-xs sm:text-sm font-bold text-muted-foreground truncate flex-1">
                              {game.tournament?.name || 'Torneo'}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/gamecast/${game.id}`);
                              }}
                              className={`px-4 sm:px-5 py-2 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors shadow shrink-0 ${game.status === 'finished' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-primary hover:bg-primary-light shadow-primary/20'}`}
                            >
                              {game.status === 'finished' ? 'Ver Boxscore' : 'Gamecast'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                )
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer Section */}
      <footer className="border-t border-muted/20 bg-background pt-6 pb-2 mt-1 relative z-10 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 md:gap-8 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-muted/30 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent"></div>
                  <span className="font-black text-primary text-sm relative z-10">TT</span>
                </div>
                <span className="font-black text-2xl tracking-tight text-foreground">TourneyTru</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[290px]">
                La plataforma líder para la gestión de torneos de cualquier deporte.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Enlaces</h4>
              <ul className="space-y-1">
                <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Inicio</Link></li>
                <li><Link href="/torneos" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Torneos</Link></li>
                <li><Link href="/equipos" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Equipos</Link></li>
                <li><Link href="/jugadores" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Jugadores</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Legal</h4>
              <ul className="space-y-1">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Términos de uso</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Privacidad</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Cookies</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Contacto</h4>
              <ul className="space-y-1 text-sm text-muted-foreground font-medium">
                <li className="hover:text-foreground transition-colors">arturoval04@gmail.com</li>
                <li className="hover:text-foreground transition-colors">+526681697097</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-muted/20 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground text-xs sm:text-sm font-medium">© 2026 TourneyTru. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
