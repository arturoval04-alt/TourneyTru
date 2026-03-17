'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Trophy, PlayCircle, BarChart3, Share2, Search } from 'lucide-react';

interface GameItem {
  id: string;
  homeTeam: { name: string; shortName?: string };
  awayTeam: { name: string; shortName?: string };
  homeScore: number;
  awayScore: number;
  currentInning: number;
  half: string;
  status: string;
  tournament?: { name: string; id: string };
}

export default function LobbyPage() {
  const router = useRouter();
  const [recentGames, setRecentGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    fetch(`${apiUrl}/games`)
      .then(res => res.json())
      .then((data: GameItem[]) => {
        setRecentGames(data.slice(0, 6));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 selection:bg-primary/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50 dark:opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-light/20 rounded-full blur-[120px] mix-blend-screen opacity-50 dark:opacity-20"></div>
      </div>

      <Navbar />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Plataforma Oficial
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter mb-6 animate-fade-in-up animation-delay-100">
            Sigue Cada <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light drop-shadow-sm">Jugada</span>.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-10 animate-fade-in-up animation-delay-200">
            Resultados en vivo, estadísticas detalladas y gestión completa de torneos de béisbol y softbol en una sola plataforma de nueva generación.
          </p>

          <div className="flex justify-center mb-8 w-full max-w-xl mx-auto animate-fade-in-up animation-delay-300">
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
            <button onClick={() => router.push('/jugadores')} className="px-6 py-3 bg-surface text-foreground font-bold rounded-xl border border-muted/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer w-full sm:w-auto text-sm">
              Ver Jugadores
            </button>
          </div>
        </section>

        {/* Features Section - Todo lo que necesitas */}
        <section className="bg-surface/30 border-y border-muted/10 py-24 mb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 animate-fade-in-up">
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-3">Todo lo que necesitas</h2>
              <p className="text-muted-foreground text-base">Herramientas completas para organizar, gestionar y seguir torneos de béisbol y softbol</p>
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
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-3 text-foreground">
              <span className="w-1.5 h-5 bg-primary rounded-full"></span>
              Juegos Recientes
            </h3>
            <div className="flex bg-surface rounded-lg p-1 border border-muted/30 shadow-sm">
              <button className="px-3 py-1 text-xs font-bold text-white bg-primary rounded shadow cursor-pointer">En Vivo</button>
              <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Terminados</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-surface border border-muted/30 rounded-2xl animate-pulse shadow-sm"></div>
              ))
            ) : recentGames.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-surface border border-muted/30 rounded-2xl">
                <p className="text-muted-foreground font-medium">No hay partidos registrados en el sistema.</p>
              </div>
            ) : (
              recentGames.map((game) => {
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
                  <div className="p-6 flex-1 flex flex-col justify-center gap-6">
                    {/* Away Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted/10 rounded-full flex items-center justify-center font-black text-primary text-lg border border-primary/20 shadow-inner group-hover:bg-primary/20 transition-colors">
                          {game.awayTeam.name.substring(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-lg text-foreground">{game.awayTeam.name}</p>
                          <p className="text-xs text-muted-foreground uppercase font-black tracking-wider">Visitante</p>
                        </div>
                      </div>
                      <span className="text-3xl font-black text-foreground drop-shadow-sm">{game.awayScore ?? '-'}</span>
                    </div>

                    {/* Home Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted/10 rounded-full flex items-center justify-center font-black text-primary text-lg border border-primary/20 shadow-inner group-hover:bg-primary/20 transition-colors">
                          {game.homeTeam.name.substring(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-lg text-foreground">{game.homeTeam.name}</p>
                          <p className="text-xs text-muted-foreground uppercase font-black tracking-wider">Local</p>
                        </div>
                      </div>
                      <span className="text-3xl font-black text-foreground drop-shadow-sm">{game.homeScore ?? '-'}</span>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="px-6 py-4 bg-muted/5 border-t border-muted/20 flex items-center justify-between mt-auto">
                    <div className="text-sm font-bold text-muted-foreground truncate">
                      {game.tournament?.name || 'Torneo'}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/gamecast/${game.id}`);
                      }}
                      className={`px-5 py-2 text-white text-sm font-bold rounded-lg transition-colors shadow ${game.status === 'finished' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-primary hover:bg-primary-light shadow-primary/20'}`}
                    >
                      {game.status === 'finished' ? 'Ver Boxscore' : 'Gamecast'}
                    </button>
                  </div>
                </div>
              );
              })
            )}
          </div>
        </section>
      </main>

      {/* Footer Section */}
      <footer className="border-t border-muted/20 bg-background pt-16 pb-8 mt-12 relative z-10 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-muted/30 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent"></div>
                  <span className="font-black text-primary text-sm relative z-10">TT</span>
                </div>
                <span className="font-black text-2xl tracking-tight text-foreground">TourneyTru</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[250px]">
                La plataforma líder para la gestión de torneos de béisbol y softbol.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-6">Enlaces</h4>
              <ul className="space-y-4">
                <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Inicio</Link></li>
                <li><Link href="/torneos" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Torneos</Link></li>
                <li><Link href="/equipos" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Equipos</Link></li>
                <li><Link href="/jugadores" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Jugadores</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-6">Legal</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Términos de uso</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Privacidad</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Cookies</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-6">Contacto</h4>
              <ul className="space-y-4 text-sm text-muted-foreground font-medium">
                <li className="hover:text-foreground transition-colors">info@tourneytru.com</li>
                <li className="hover:text-foreground transition-colors">+1 555-0123</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-muted/20 flex flex-col items-center justify-center">
            <p className="text-muted-foreground text-sm font-medium">© 2025 TourneyTru. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
