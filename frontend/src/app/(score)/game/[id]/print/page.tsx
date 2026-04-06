'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { GameBoxscoreDto, BoxscoreTeam } from '@/types/boxscore';

function LineScore({ homeTeam, awayTeam }: { homeTeam: BoxscoreTeam; awayTeam: BoxscoreTeam }) {
    const maxInning = Math.max(9, ...Object.keys(homeTeam.runsByInning).map(Number), ...Object.keys(awayTeam.runsByInning).map(Number));
    const innings = Array.from({ length: maxInning }, (_, i) => i + 1);

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>
            <thead>
                <tr style={{ background: '#1e3a5f', color: 'white' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', width: '160px' }}>Equipo</th>
                    {innings.map(i => (
                        <th key={i} style={{ padding: '6px 8px', textAlign: 'center', minWidth: '28px' }}>{i}</th>
                    ))}
                    <th style={{ padding: '6px 10px', textAlign: 'center', borderLeft: '2px solid #4a7ab5' }}>R</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>H</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>E</th>
                </tr>
            </thead>
            <tbody>
                {[awayTeam, homeTeam].map((team, idx) => (
                    <tr key={team.teamId} style={{ background: idx % 2 === 0 ? '#f8f9fa' : 'white', borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#1a1a1a' }}>{team.teamName}</td>
                        {innings.map(i => (
                            <td key={i} style={{ padding: '6px 8px', textAlign: 'center', color: '#444' }}>
                                {team.runsByInning[i] ?? '0'}
                            </td>
                        ))}
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 'bold', color: '#1a1a1a', borderLeft: '2px solid #adb5bd' }}>{team.totalRuns}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#444' }}>{team.totalHits}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#444' }}>{team.totalErrors}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function BattingTable({ team }: { team: BoxscoreTeam }) {
    const batters = team.lineup.filter(b => !b.isFlex || b.atBats > 0 || b.bb > 0 || b.runs > 0);
    const totals = batters.reduce((acc, b) => ({
        ab: acc.ab + b.atBats,
        r: acc.r + b.runs,
        h: acc.h + b.hits,
        rbi: acc.rbi + b.rbi,
        bb: acc.bb + b.bb,
        so: acc.so + b.so,
    }), { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0 });

    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ background: '#1e3a5f', color: 'white', padding: '6px 10px', fontWeight: 'bold', fontSize: '13px' }}>
                {team.teamName} — Bateo
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr style={{ background: '#e9ecef', color: '#444', borderBottom: '1px solid #adb5bd' }}>
                        <th style={{ padding: '5px 10px', textAlign: 'left' }}>Jugador</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '36px' }}>Pos</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>AB</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>R</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>H</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '36px' }}>RBI</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>BB</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>SO</th>
                    </tr>
                </thead>
                <tbody>
                    {batters.map((b, idx) => (
                        <tr key={`${b.playerId}-${idx}`} style={{ background: idx % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '5px 10px', color: '#1a1a1a' }}>
                                {b.isStarter ? (
                                    `${b.battingOrder}. ${b.firstName} ${b.lastName}`
                                ) : (
                                    <span style={{ paddingLeft: '16px', color: '#666', fontSize: '11px' }}>
                                        {b.firstName} {b.lastName}
                                    </span>
                                )}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', color: '#555', fontFamily: 'monospace' }}>{b.position}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 'bold' }}>{b.atBats}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>{b.runs}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>{b.hits}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>{b.rbi}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', color: '#666' }}>{b.bb}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', color: '#666' }}>{b.so}</td>
                        </tr>
                    ))}
                    <tr style={{ background: '#e9ecef', fontWeight: 'bold', borderTop: '2px solid #adb5bd', fontSize: '12px' }}>
                        <td style={{ padding: '5px 10px' }} colSpan={2}>TOTALES</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>{totals.ab}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>{totals.r}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>{totals.h}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>{totals.rbi}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>{totals.bb}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>{totals.so}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function PitchingTable({ team }: { team: BoxscoreTeam }) {
    const pitchers = team.lineup.filter(p => (p.pitchingIPOuts ?? 0) > 0 || p.position === 'P' || p.position === '1');
    if (pitchers.length === 0) return null;

    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ background: '#1e3a5f', color: 'white', padding: '6px 10px', fontWeight: 'bold', fontSize: '13px' }}>
                {team.teamName} — Pitcheo
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr style={{ background: '#e9ecef', color: '#444', borderBottom: '1px solid #adb5bd' }}>
                        <th style={{ padding: '5px 10px', textAlign: 'left' }}>Lanzador</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '40px' }}>IP</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>H</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>R</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>RL</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>BB</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '30px' }}>K</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center', width: '50px' }}>ERA</th>
                    </tr>
                </thead>
                <tbody>
                    {pitchers.map((p, idx) => {
                        const outs = p.pitchingIPOuts ?? 0;
                        const ip = `${Math.floor(outs / 3)}.${outs % 3}`;
                        const er = p.pitchingEarnedRuns ?? 0;
                        // ERA = (ER / IP) * 9 innings; IP in decimal = outs / 3
                        const era = outs > 0 ? ((er / (outs / 3)) * 9).toFixed(2) : '---';
                        return (
                            <tr key={`${p.playerId}-${idx}`} style={{ background: idx % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                <td style={{ padding: '5px 10px', color: '#1a1a1a' }}>{p.firstName} {p.lastName}</td>
                                <td style={{ padding: '5px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>{ip}</td>
                                <td style={{ padding: '5px 6px', textAlign: 'center' }}>{p.pitchingHits ?? 0}</td>
                                <td style={{ padding: '5px 6px', textAlign: 'center', color: '#666' }}>{p.pitchingRuns ?? 0}</td>
                                <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 'bold' }}>{er}</td>
                                <td style={{ padding: '5px 6px', textAlign: 'center' }}>{p.pitchingBB ?? 0}</td>
                                <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 'bold' }}>{p.pitchingSO ?? 0}</td>
                                <td style={{ padding: '5px 6px', textAlign: 'center', color: '#1e3a5f', fontWeight: 'bold' }}>{era}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div style={{ fontSize: '10px', color: '#888', padding: '3px 10px' }}>
                R = carreras totales · RL = carreras limpias · ERA = promedio de carreras limpias (RL / IP × 9)
            </div>
        </div>
    );
}

export default function PrintBoxScore() {
    const params = useParams();
    const [boxscore, setBoxscore] = useState<GameBoxscoreDto | null>(null);
    const [error, setError] = useState(false);
    const [gameDate, setGameDate] = useState('');

    useEffect(() => {
        const id = params.id as string;
        Promise.all([
            api.get(`/games/${id}/boxscore`),
            api.get(`/games/${id}`).catch(() => ({ data: null })),
        ]).then(([bsRes, gameRes]) => {
            setBoxscore(bsRes.data);
            if (gameRes.data?.scheduledDate) {
                setGameDate(new Date(gameRes.data.scheduledDate).toLocaleDateString('es-MX', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                }));
            }
        }).catch(() => setError(true));
    }, [params.id]);

    // Auto-print once boxscore is loaded
    useEffect(() => {
        if (boxscore) {
            const timer = setTimeout(() => window.print(), 600);
            return () => clearTimeout(timer);
        }
    }, [boxscore]);

    const printStyles = `
        @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            @page { margin: 1.5cm; }
        }
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background: white;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
        }
    `;

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc3545' }}>
                <p>Error al cargar el boxscore. Cierra esta ventana e intenta de nuevo.</p>
            </div>
        );
    }

    if (!boxscore) {
        return (
            <>
                <style>{printStyles}</style>
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    Cargando boxscore...
                </div>
            </>
        );
    }

    const { homeTeam, awayTeam } = boxscore;

    return (
        <>
            <style>{printStyles}</style>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 24px' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '3px solid #1e3a5f', paddingBottom: '16px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 6px', color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Boxscore Oficial
                    </h1>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a', margin: '6px 0' }}>
                        {awayTeam.teamName}
                        <span style={{ color: '#1e3a5f', margin: '0 12px', fontSize: '22px' }}>
                            {awayTeam.totalRuns} – {homeTeam.totalRuns}
                        </span>
                        {homeTeam.teamName}
                    </div>
                    {gameDate && (
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{gameDate}</div>
                    )}
                </div>

                {/* Line Score */}
                <h2 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', margin: '0 0 6px' }}>
                    Carrera por Entradas
                </h2>
                <LineScore homeTeam={homeTeam} awayTeam={awayTeam} />

                {/* Batting — Away first, then Home */}
                <h2 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', margin: '16px 0 6px' }}>
                    Estadísticas de Bateo
                </h2>
                <BattingTable team={awayTeam} />
                <BattingTable team={homeTeam} />

                {/* Pitching */}
                <h2 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', margin: '16px 0 6px' }}>
                    Estadísticas de Pitcheo
                </h2>
                <PitchingTable team={awayTeam} />
                <PitchingTable team={homeTeam} />

                {/* MVPs */}
                {(boxscore.winningPitcher || boxscore.mvpBatter1 || boxscore.mvpBatter2) && (
                    <div style={{ marginTop: '20px', padding: '12px 16px', background: '#fffbeb', border: '1px solid #f0c040', borderRadius: '6px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#7c5e00', marginBottom: '6px', textTransform: 'uppercase' }}>
                            Destacados
                        </div>
                        <div style={{ fontSize: '12px', color: '#555', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            {boxscore.winningPitcher && (
                                <span>⚾ <strong>Pitcher Ganador:</strong> {boxscore.winningPitcher.firstName} {boxscore.winningPitcher.lastName}</span>
                            )}
                            {boxscore.mvpBatter1 && (
                                <span>🏆 <strong>MVP Bateador #1:</strong> {boxscore.mvpBatter1.firstName} {boxscore.mvpBatter1.lastName}</span>
                            )}
                            {boxscore.mvpBatter2 && (
                                <span>🥈 <strong>MVP Bateador #2:</strong> {boxscore.mvpBatter2.firstName} {boxscore.mvpBatter2.lastName}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="no-print" style={{ marginTop: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                    Esta página se imprimirá automáticamente. Si no, usa <strong>Ctrl+P</strong> (o Cmd+P en Mac).
                    <button
                        onClick={() => window.print()}
                        style={{ marginLeft: '12px', padding: '6px 16px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                    >
                        Imprimir ahora
                    </button>
                    <button
                        onClick={() => window.close()}
                        style={{ marginLeft: '8px', padding: '6px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    >
                        Cerrar
                    </button>
                </div>

            </div>
        </>
    );
}
