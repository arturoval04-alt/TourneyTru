'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FieldsReportProps {
    leagueId: string;
    tournamentId?: string;
    tournamentName?: string;
    leagueName?: string;
    rounds?: string[]
}

interface GameEntry {
    id: string;
    scheduledDate: string;
    startTime: string | null;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    tournamentId: string | null;
    homeTeam: { name: string } | null;
    awayTeam: { name: string } | null;
    tournament: { name: string } | null;
}

interface FieldReport {
    fieldId: string;
    fieldName: string;
    location: string | null;
    unitId: string | null;
    unitName: string;
    totalGames: number;
    totalSlots: number;
    occupancyPct: number;
    games: GameEntry[];
}

interface UnitReport {
    unitId: string | null;
    unitName: string;
    fields: FieldReport[];
    totalGames: number;
}

interface OccupancyReport {
    from: string;
    to: string;
    days: number;
    totalGames: number;
    fields: FieldReport[];
    units: UnitReport[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
    scheduled: 'Programado',
    'in-progress': 'En juego',
    completed: 'Final',
    finished: 'Final',
    postponed: 'Pospuesto',
    draft: 'Borrador',
};

const STATUS_BG: Record<string, string> = {
    scheduled: '#1d4ed8',
    'in-progress': '#15803d',
    completed: '#374151',
    finished: '#374151',
    postponed: '#b45309',
    draft: '#92400e',
};

function fmtDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(t: string | null) {
    if (!t) return '—';
    return t.slice(0, 5);
}

function barColor(pct: number) {
    if (pct >= 80) return '#ef4444';
    if (pct >= 50) return '#f59e0b';
    return '#22c55e';
}

// ─── Print template (off-screen, capturado por html2canvas) ───────────────────

function ReportTemplate({
    report,
    scope,
    tournamentName,
    leagueName,
    printRef,
}: {
    report: OccupancyReport;
    scope: 'league' | 'tournament';
    tournamentName?: string;
    leagueName?: string;
    printRef: React.RefObject<HTMLDivElement>;
}) {
    const title = scope === 'tournament' && tournamentName
        ? `Reporte de Ocupación — ${tournamentName}`
        : `Reporte de Ocupación — ${leagueName ?? 'Liga'}`;

    return (
        <div
            ref={printRef}
            style={{
                position: 'absolute', left: '-9999px', top: 0,
                width: '900px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                background: '#0f1117',
                color: '#f1f5f9',
                padding: '40px',
                boxSizing: 'border-box',
            }}
        >
            {/* ── Encabezado ── */}
            <div style={{ borderBottom: '2px solid #334155', paddingBottom: '20px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', color: '#6366f1', marginBottom: '6px' }}>
                            ScoreKeeper · Campos &amp; Unidades
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc', lineHeight: 1.2 }}>{title}</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                            {fmtDate(report.from)} — {fmtDate(report.to)} · {report.days} días
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '36px', fontWeight: 900, color: '#6366f1', lineHeight: 1 }}>{report.totalGames}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>juegos totales</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            Generado: {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Resumen global */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                    {[
                        { label: 'Unidades', val: report.units.length },
                        { label: 'Campos', val: report.fields.length },
                        { label: 'Juegos', val: report.totalGames },
                        { label: 'Ocupación prom.', val: report.fields.length > 0 ? Math.round(report.fields.reduce((s, f) => s + f.occupancyPct, 0) / report.fields.length) + '%' : '—' },
                    ].map(item => (
                        <div key={item.label} style={{ flex: 1, background: '#1e293b', borderRadius: '10px', padding: '12px 16px', border: '1px solid #334155' }}>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#f8fafc' }}>{item.val}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Secciones por unidad ── */}
            {report.units.map(unit => {
                const avgPct = unit.fields.length > 0
                    ? Math.round(unit.fields.reduce((s, f) => s + f.occupancyPct, 0) / unit.fields.length)
                    : 0;
                return (
                    <div key={unit.unitId ?? '__none__'} style={{ marginBottom: '32px' }}>
                        {/* Header unidad */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: '#1e293b', borderRadius: '10px 10px 0 0',
                            padding: '12px 16px', border: '1px solid #334155', borderBottom: 'none',
                        }}>
                            <div>
                                <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#a5b4fc' }}>
                                    {unit.unitName}
                                </span>
                                <span style={{ marginLeft: '10px', fontSize: '11px', color: '#64748b' }}>
                                    {unit.fields.length} campo{unit.fields.length !== 1 ? 's' : ''} · {unit.totalGames} juegos
                                </span>
                            </div>
                            {/* Barra de ocupación unidad */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '100px', height: '6px', background: '#334155', borderRadius: '99px', overflow: 'hidden' }}>
                                    <div style={{ width: `${avgPct}%`, height: '100%', background: barColor(avgPct), borderRadius: '99px' }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc', minWidth: '36px', textAlign: 'right' }}>{avgPct}%</span>
                            </div>
                        </div>

                        {/* Tabla de campos */}
                        <div style={{ border: '1px solid #334155', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                            {unit.fields.map((field, fi) => (
                                <div key={field.fieldId}>
                                    {/* Fila de campo */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 16px',
                                        background: fi % 2 === 0 ? '#0f172a' : '#111827',
                                        borderTop: fi === 0 ? 'none' : '1px solid #1e293b',
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 800, fontSize: '13px', color: '#f1f5f9' }}>{field.fieldName}</div>
                                            {field.location && (
                                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{field.location}</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#f8fafc' }}>{field.totalGames}</div>
                                                <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>juegos / {field.totalSlots} slots</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '80px', height: '5px', background: '#334155', borderRadius: '99px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${field.occupancyPct}%`, height: '100%', background: barColor(field.occupancyPct), borderRadius: '99px' }} />
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 900, color: '#f8fafc', minWidth: '30px' }}>{field.occupancyPct}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabla de juegos si hay */}
                                    {field.games.length > 0 && (
                                        <div style={{ background: '#0a0f1a', borderTop: '1px solid #1e293b' }}>
                                            {/* Header tabla */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '90px 60px 1fr 1fr 90px 80px',
                                                padding: '6px 24px',
                                                background: '#0f172a',
                                                borderBottom: '1px solid #1e293b',
                                            }}>
                                                {['Fecha', 'Hora', 'Partido', 'Torneo', 'Estado', 'Marcador'].map(h => (
                                                    <div key={h} style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#475569' }}>{h}</div>
                                                ))}
                                            </div>
                                            {field.games.map((g, gi) => (
                                                <div key={g.id} style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '90px 60px 1fr 1fr 90px 80px',
                                                    padding: '7px 24px',
                                                    background: gi % 2 === 0 ? 'transparent' : '#0d1424',
                                                    borderBottom: gi < field.games.length - 1 ? '1px solid #1e293b' : 'none',
                                                    alignItems: 'center',
                                                }}>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(g.scheduledDate)}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(g.startTime)}</div>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                                                        {g.homeTeam?.name ?? '?'} vs {g.awayTeam?.name ?? '?'}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: '#64748b' }}>{g.tournament?.name ?? '—'}</div>
                                                    <div>
                                                        <span style={{
                                                            fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px',
                                                            background: STATUS_BG[g.status] ?? '#374151', color: '#fff',
                                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                                        }}>
                                                            {STATUS_LABEL[g.status] ?? g.status}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', textAlign: 'right', paddingRight: '8px' }}>
                                                        {g.homeScore != null ? `${g.homeScore} – ${g.awayScore}` : '—'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Pie */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '10px', color: '#475569' }}>ScoreKeeper — Reporte estadístico generado automáticamente</div>
                <div style={{ fontSize: '10px', color: '#475569' }}>
                    {scope === 'tournament' ? `Torneo: ${tournamentName}` : `Liga completa`} · {fmtDate(report.from)} al {fmtDate(report.to)}
                </div>
            </div>
        </div>
    );
}

// ─── Print template: Matrix (Rol de Juegos en Cuadrícula) ────────────────────

function ScheduleMatrixTemplate({
    report,
    scope,
    tournamentName,
    leagueName,
    printRef,
}: {
    report: OccupancyReport;
    scope: 'league' | 'tournament';
    tournamentName?: string;
    leagueName?: string;
    printRef: React.RefObject<HTMLDivElement>;
}) {
    const allGames = report.fields.flatMap(f => 
        f.games.map(g => ({ ...g, fieldName: f.fieldName, location: f.location, unitName: f.unitName, fieldId: f.fieldId }))
    );

    const datesSet = new Set(allGames.map(g => g.scheduledDate.slice(0, 10)));
    const uniqueDates = Array.from(datesSet).sort();

    const rowKeysSet = new Set(allGames.map(g => `${g.fieldId}|${g.fieldName}|${fmtTime(g.startTime)}`));
    
    const rows = Array.from(rowKeysSet).map(key => {
        const [fieldId, fieldName, time] = key.split('|');
        return { fieldId, fieldName, time };
    }).sort((a, b) => {
        if (a.fieldName !== b.fieldName) return a.fieldName.localeCompare(b.fieldName);
        return a.time.localeCompare(b.time);
    });

    const getGamesForCell = (rowKey: string, date: string) => {
        const [fId, fName, time] = rowKey.split('|');
        return allGames.filter(g => g.fieldId === fId && fmtTime(g.startTime) === time && g.scheduledDate.slice(0, 10) === date);
    };

    return (
        <div
            ref={printRef}
            style={{
                position: 'absolute', left: '-9999px', top: 0,
                width: uniqueDates.length > 5 ? `${180 + uniqueDates.length * 160}px` : '1000px', // expand implicitly if many days
                fontFamily: 'system-ui, -apple-system, sans-serif',
                background: '#0f1117',
                color: '#f1f5f9',
                padding: '40px',
                boxSizing: 'border-box',
            }}
        >
            {/* ── Encabezado ── */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc', marginBottom: '4px' }}>
                    {leagueName ?? 'Liga Local'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 400, letterSpacing: '1px', textTransform: 'uppercase', color: '#cbd5e1' }}>
                    {scope === 'tournament' && tournamentName ? `PROGRAMACIÓN: ${tournamentName}` : 'PROGRAMACIÓN SEMANAL DE CAMPOS'}
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
                    {scope !== 'tournament' ? 'Todas las Ligas / Categorías' : 'Rol Oficial'}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '8px' }}>
                    Semana del {uniqueDates.length > 0 ? fmtDate(uniqueDates[0]) : fmtDate(report.from)} al {uniqueDates.length > 0 ? fmtDate(uniqueDates[uniqueDates.length - 1]) : fmtDate(report.to)}
                </div>
            </div>

            {/* ── Tabla Matricial ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #334155' }}>
                <thead>
                    <tr style={{ background: '#020617', color: '#f8fafc' }}>
                        <th style={{ padding: '12px', border: '1px solid #334155', textAlign: 'left', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', width: '180px' }}>
                            CAMPO / HORARIO
                        </th>
                        {uniqueDates.map(date => {
                            const d = new Date(date + 'T12:00:00');
                            const dayName = d.toLocaleDateString('es-MX', { weekday: 'long' });
                            const dayNum = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                            return (
                                <th key={date} style={{ padding: '12px', border: '1px solid #334155', textAlign: 'center', fontSize: '12px', fontWeight: 900, textTransform: 'capitalize' }}>
                                    {dayName} {dayNum}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => {
                        const rowKey = `${row.fieldId}|${row.fieldName}|${row.time}`;
                        return (
                            <tr key={rowKey}>
                                <td style={{ background: '#0f172a', border: '1px solid #334155', padding: '12px', width: '180px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc', marginBottom: '4px' }}>{row.fieldName}</div>
                                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#93c5fd' }}>{row.time}</div>
                                </td>

                                {uniqueDates.map(date => {
                                    const gamesInCell = getGamesForCell(rowKey, date);
                                    
                                    return (
                                        <td key={date} style={{ border: '1px solid #334155', padding: '0', verticalAlign: 'top', background: '#1e293b' }}>
                                            {gamesInCell.length === 0 ? (
                                                <div style={{ height: '100%', width: '100%', minHeight: '80px', background: '#0f172a' }}></div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80px' }}>
                                                    {gamesInCell.map((game, gi) => (
                                                        <div key={game.id} style={{
                                                            background: '#a13115', // Copper/Orange rustic red
                                                            padding: '12px 10px',
                                                            textAlign: 'center',
                                                            borderBottom: gi < gamesInCell.length - 1 ? '1px solid #7c2d12' : 'none',
                                                            flex: 1,
                                                            display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                                        }}>
                                                            {game.tournament?.name && (
                                                                <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#fed7aa', marginBottom: '4px', lineHeight: 1.1 }}>
                                                                    {game.tournament.name}
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
                                                                {game.homeTeam?.name ?? '?'} vs {game.awayTeam?.name ?? '?'}
                                                            </div>
                                                            {scope === 'league' && leagueName && (
                                                                <div style={{ fontSize: '9px', fontStyle: 'italic', fontWeight: 600, color: '#ffedd5', marginTop: '4px' }}>
                                                                    {leagueName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '10px', color: '#475569' }}>
                ScoreKeeper — Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
    scheduled: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    'in-progress': 'bg-green-500/20 text-green-300 border border-green-500/30',
    completed: 'bg-muted/30 text-muted-foreground border border-muted/20',
    finished: 'bg-muted/30 text-muted-foreground border border-muted/20',
    postponed: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    draft: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
};

function OccupancyBar({ pct }: { pct: number }) {
    const clamp = Math.min(100, Math.max(0, pct));
    const color = clamp >= 80 ? 'bg-red-500' : clamp >= 50 ? 'bg-yellow-400' : 'bg-green-500';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamp}%` }} />
            </div>
            <span className="text-xs font-semibold w-9 text-right text-muted-foreground">{clamp}%</span>
        </div>
    );
}

function FieldRow({ field, expanded, onToggle, showUnit = false }: {
    field: FieldReport; expanded: boolean; onToggle: () => void; showUnit?: boolean;
}) {
    return (
        <div>
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors text-left" onClick={onToggle}>
                <span className="text-muted-foreground/50 text-xs">{expanded ? '▼' : '▶'}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{field.fieldName}</span>
                        {field.location && <span className="text-xs text-muted-foreground truncate">{field.location}</span>}
                        {showUnit && <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 border border-primary/20">{field.unitName}</span>}
                    </div>
                    <div className="mt-1.5 w-40"><OccupancyBar pct={field.occupancyPct} /></div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-base font-black text-foreground">{field.totalGames}</div>
                    <div className="text-[10px] text-muted-foreground">{field.totalSlots} slots</div>
                </div>
            </button>
            {expanded && field.games.length > 0 && (
                <div className="px-4 pb-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="text-muted-foreground border-b border-muted/20">
                                    {['Fecha', 'Hora', 'Partido', 'Torneo', 'Estado', 'Marcador'].map(h => (
                                        <th key={h} className={`text-left py-2 font-semibold uppercase tracking-wide ${h === 'Marcador' ? 'text-right' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {field.games.map(g => (
                                    <tr key={g.id} className="border-b border-muted/10 hover:bg-muted/5">
                                        <td className="py-2 text-muted-foreground">{fmtDate(g.scheduledDate)}</td>
                                        <td className="py-2 text-muted-foreground">{fmtTime(g.startTime)}</td>
                                        <td className="py-2 text-foreground font-semibold">{g.homeTeam?.name ?? '?'} vs {g.awayTeam?.name ?? '?'}</td>
                                        <td className="py-2 text-muted-foreground">{g.tournament?.name ?? '—'}</td>
                                        <td className="py-2">
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[g.status] ?? 'bg-muted/20 text-muted-foreground'}`}>
                                                {STATUS_LABEL[g.status] ?? g.status}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right text-muted-foreground font-mono">
                                            {g.homeScore != null ? `${g.homeScore}–${g.awayScore}` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {expanded && field.games.length === 0 && (
                <div className="px-4 pb-3 text-xs text-muted-foreground italic">Sin juegos en este rango.</div>
            )}
        </div>
    );
}

export default function FieldsReport({ leagueId, tournamentId, tournamentName, leagueName, rounds }: FieldsReportProps) {
    const today = new Date().toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [from, setFrom] = useState(monthAgo);
    const [to, setTo] = useState(today);
    const [selectedRound, setSelectedRound] = useState('');
    const [scope, setScope] = useState<'league' | 'tournament'>(tournamentId ? 'tournament' : 'league');
    const [report, setReport] = useState<OccupancyReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
    const [view, setView] = useState<'units' | 'fields'>('units');
    const printRefStats = useRef<HTMLDivElement>(null!);
    const printRefMatrix = useRef<HTMLDivElement>(null!);

    function applyScope(rep: OccupancyReport): OccupancyReport {
        if (scope === 'league' || !tournamentId) return rep;
        const filterGames = (games: GameEntry[]) => games.filter(g => g.tournamentId === tournamentId);
        const filteredFields = rep.fields.map(f => { const games = filterGames(f.games); return { ...f, games, totalGames: games.length }; });
        const filteredUnits = rep.units.map(u => { const fields = u.fields.map(f => { const games = filterGames(f.games); return { ...f, games, totalGames: games.length }; }); return { ...u, fields, totalGames: fields.reduce((s, f) => s + f.totalGames, 0) }; });
        return { ...rep, fields: filteredFields, units: filteredUnits, totalGames: filteredFields.reduce((s, f) => s + f.totalGames, 0) };
    }

    const fetchReport = useCallback(async () => {
        if (!from || !to) return;
        setLoading(true); setError(null);
        try {
            const roundParam = selectedRound ? `&round=${encodeURIComponent(selectedRound)}` : '';
            const res = await api.get(`/leagues/${leagueId}/fields/report?from=${from}&to=${to}${roundParam}`);
            setReport(res.data);
            setExpandedUnits(new Set((res.data.units as UnitReport[]).map(u => u.unitId ?? '__none__')));
        } catch { setError('No se pudo cargar el reporte.'); }
        finally { setLoading(false); }
    }, [leagueId, from, to, selectedRound]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    const displayed = report ? applyScope(report) : null;

    function toggleUnit(key: string) { setExpandedUnits(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }); }
    function toggleField(id: string) { setExpandedFields(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

    // ── Exportar ──────────────────────────────────────────────────────────────

    const handleExport = async (format: 'pdf' | 'jpg', templateMode: 'stats' | 'matrix') => {
        const targetRef = templateMode === 'stats' ? printRefStats : printRefMatrix;
        if (!displayed || !targetRef.current) return;
        setExporting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(targetRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0f1117',
                logging: false,
            });

            const fileName = `reporte-${templateMode}-${from}-${to}`;

            if (format === 'jpg') {
                const link = document.createElement('a');
                link.download = `${fileName}.jpg`;
                link.href = canvas.toDataURL('image/jpeg', 0.92);
                link.click();
            } else {
                const { jsPDF } = await import('jspdf');
                const imgData = canvas.toDataURL('image/jpeg', 0.92);
                const pxToMm = (px: number) => (px * 25.4) / 96;
                const w = pxToMm(canvas.width / 2);
                const h = pxToMm(canvas.height / 2);
                const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'mm', format: [w, h] });
                pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
                pdf.save(`${fileName}.pdf`);
            }
        } catch (e) {
            console.error(e);
            alert('Error al exportar. Inténtalo de nuevo.');
        } finally {
            setExporting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Template off-screen para captura estadística */}
            {displayed && (
                <div className="absolute opacity-0 pointer-events-none -z-50 w-0 h-0 overflow-hidden">
                    <ReportTemplate
                        report={displayed}
                        scope={scope}
                        tournamentName={tournamentName}
                        leagueName={leagueName}
                        printRef={printRefStats}
                    />
                    <ScheduleMatrixTemplate
                        report={displayed}
                        scope={scope}
                        tournamentName={tournamentName}
                        leagueName={leagueName}
                        printRef={printRefMatrix}
                    />
                </div>
            )}

            <div className="space-y-3">
                {/* ── Filtros + exportar ── */}
                <div className="bg-surface border border-muted/30 rounded-2xl p-4 flex flex-wrap items-end gap-3">
                    {tournamentId && (
                        <div className="flex rounded-xl border border-muted/30 overflow-hidden">
                            <button onClick={() => setScope('tournament')} className={`px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${scope === 'tournament' ? 'bg-primary text-white' : 'bg-surface text-muted-foreground hover:bg-muted/20'}`}>
                                {tournamentName ?? 'Este torneo'}
                            </button>
                            <button onClick={() => setScope('league')} className={`px-3 py-2 text-xs font-bold uppercase tracking-wide border-l border-muted/30 transition-colors ${scope === 'league' ? 'bg-primary text-white' : 'bg-surface text-muted-foreground hover:bg-muted/20'}`}>
                                Toda la liga
                            </button>
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Desde</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} disabled={!!selectedRound} className="bg-background border border-muted/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50" />
                    </div>
                    <div>
                        <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Hasta</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} disabled={!!selectedRound} className="bg-background border border-muted/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50" />
                    </div>
                    {rounds && rounds.length > 0 && (
                        <div>
                            <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Jornada</label>
                            <select 
                                value={selectedRound} 
                                onChange={e => {
                                   setSelectedRound(e.target.value);
                                   if (e.target.value) {
                                       setFrom('2020-01-01'); // Ensure global span so API catches the round dates
                                       setTo('2030-12-31');
                                   }
                                }}
                                className="bg-background border border-muted/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-[38px]"
                            >
                                <option value="">Estricto por fechas</option>
                                {rounds.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    )}
                    <button onClick={fetchReport} disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold uppercase tracking-wide hover:bg-primary/90 disabled:opacity-50 transition-colors h-[38px]">
                        {loading ? 'Cargando…' : 'Consultar'}
                    </button>

                    {displayed && (
                        <div className="ml-auto flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground hidden sm:block">
                                {displayed.days} días · <strong className="text-foreground">{displayed.totalGames}</strong> juegos
                            </span>

                            {/* Vista toggle */}
                            <div className="flex rounded-xl border border-muted/30 overflow-hidden">
                                <button onClick={() => setView('units')} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${view === 'units' ? 'bg-primary text-white' : 'bg-surface text-muted-foreground hover:bg-muted/20'}`}>Por unidad</button>
                                <button onClick={() => setView('fields')} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-l border-muted/30 transition-colors ${view === 'fields' ? 'bg-primary text-white' : 'bg-surface text-muted-foreground hover:bg-muted/20'}`}>Por campo</button>
                            </div>

                            {/* Exportar Estadísticas */}
                            <div className="flex rounded-xl border border-muted/30 overflow-hidden">
                                <button
                                    onClick={() => handleExport('pdf', 'stats')}
                                    disabled={exporting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors disabled:opacity-40"
                                >
                                    {exporting ? (
                                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                                    )}
                                    Ocupación
                                </button>
                                <button
                                    onClick={() => handleExport('pdf', 'matrix')}
                                    disabled={exporting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-l border-muted/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-40"
                                >
                                    Rol Matricial 📅
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {error && <div className="bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl p-3 text-sm">{error}</div>}

                {/* ── Vista por unidad ── */}
                {displayed && view === 'units' && (
                    <div className="space-y-2">
                        {displayed.units.length === 0 && <div className="text-center text-muted-foreground py-12 text-sm">Sin campos activos en el rango seleccionado.</div>}
                        {displayed.units.map(unit => {
                            const key = unit.unitId ?? '__none__';
                            const isOpen = expandedUnits.has(key);
                            const avgPct = unit.fields.length > 0 ? Math.round(unit.fields.reduce((s, f) => s + f.occupancyPct, 0) / unit.fields.length) : 0;
                            return (
                                <div key={key} className="bg-surface border border-muted/30 rounded-2xl overflow-hidden">
                                    <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/10 transition-colors text-left" onClick={() => toggleUnit(key)}>
                                        <span className="text-muted-foreground text-xs">{isOpen ? '▼' : '▶'}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-foreground uppercase tracking-wide">{unit.unitName}</span>
                                                <span className="text-xs bg-muted/20 text-muted-foreground rounded-full px-2 py-0.5">{unit.fields.length} campo{unit.fields.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="mt-1.5 w-48"><OccupancyBar pct={avgPct} /></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-foreground">{unit.totalGames}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">juegos</div>
                                        </div>
                                    </button>
                                    {isOpen && (
                                        <div className="border-t border-muted/20 divide-y divide-muted/10">
                                            {unit.fields.map(field => (
                                                <FieldRow key={field.fieldId} field={field} expanded={expandedFields.has(field.fieldId)} onToggle={() => toggleField(field.fieldId)} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Vista por campo ── */}
                {displayed && view === 'fields' && (
                    <div className="bg-surface border border-muted/30 rounded-2xl overflow-hidden divide-y divide-muted/10">
                        {displayed.fields.length === 0 && <div className="text-center text-muted-foreground py-12 text-sm">Sin campos en el rango seleccionado.</div>}
                        {[...displayed.fields].sort((a, b) => b.totalGames - a.totalGames).map(field => (
                            <FieldRow key={field.fieldId} field={field} showUnit expanded={expandedFields.has(field.fieldId)} onToggle={() => toggleField(field.fieldId)} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
