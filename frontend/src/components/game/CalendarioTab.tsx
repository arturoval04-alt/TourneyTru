'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, RefreshCw, Calendar, Settings, X, Check, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleConfig {
    slots: string[];
    avgDurationMinutes: number;
    minGapMinutes: number;
    allowOverlap: boolean;
}

const DEFAULT_CONFIG: ScheduleConfig = {
    slots: ['19:00', '21:00'],
    avgDurationMinutes: 120,
    minGapMinutes: 30,
    allowOverlap: false,
};

interface SportsUnit {
    id: string;
    name: string;
    location?: string;
    fields: FieldData[];
    scheduleConfig?: ScheduleConfig;
}

interface FieldData {
    id: string;
    name: string;
    location?: string;
    sportsUnit?: { id: string; name: string };
}

interface GameSlot {
    id: string;
    status: string;
    scheduledDate: string;
    startTime?: string | null;
    endTime?: string | null;
    fieldId?: string | null;
    field?: string | null;
    round?: string | null;
    homeTeam: { id: string; name: string; shortName?: string; logoUrl?: string };
    awayTeam: { id: string; name: string; shortName?: string; logoUrl?: string };
    homeScore: number;
    awayScore: number;
}

interface Props {
    tournamentId: string;
    leagueId: string;
    canEdit: boolean;
    games: GameSlot[];
    rounds?: string[];
    onOpenCreateWizard?: (prefill?: { fieldId?: string; scheduledDate?: string; startTime?: string }) => void;
    onGameClick?: (gameId: string) => void;
    onRefresh?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function toYMD(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    return DAYS_ES[d.getDay()];
}

function formatTime(isoOrTime?: string | null): string {
    if (!isoOrTime) return '';
    if (/^\d{2}:\d{2}$/.test(isoOrTime)) return isoOrTime;
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isSameDate(isoDate: string | null | undefined, ymd: string): boolean {
    if (!isoDate) return false;
    return isoDate.slice(0, 10) === ymd;
}

function gameStatusStyle(status: string): string {
    switch (status) {
        case 'live': return 'bg-red-600/90 border-red-500 text-white';
        case 'finished': return 'bg-zinc-700/80 border-zinc-600 text-zinc-300';
        case 'draft': return 'bg-amber-600/70 border-amber-500 text-white';
        default: return 'bg-blue-700/80 border-blue-500 text-white';
    }
}

// ─── Panel de configuración de slots ─────────────────────────────────────────

function ScheduleConfigPanel({
    unit,
    onSave,
    onClose,
}: {
    unit: SportsUnit;
    onSave: (unitId: string, config: ScheduleConfig) => Promise<void>;
    onClose: () => void;
}) {
    const [config, setConfig] = useState<ScheduleConfig>(unit.scheduleConfig ?? DEFAULT_CONFIG);
    const [newSlot, setNewSlot] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const addSlot = () => {
        const s = newSlot.trim();
        if (!s || !/^\d{2}:\d{2}$/.test(s)) { setError('Formato inválido. Usa HH:mm (ej. 19:00)'); return; }
        if (config.slots.includes(s)) { setError('Ese horario ya existe'); return; }
        setConfig(prev => ({ ...prev, slots: [...prev.slots, s].sort() }));
        setNewSlot('');
        setError('');
    };

    const removeSlot = (slot: string) => {
        setConfig(prev => ({ ...prev, slots: prev.slots.filter(s => s !== slot) }));
    };

    const handleSave = async () => {
        let finalSlots = [...config.slots];

        // Guardar automáticamente si dejó un texto pendiente en el input
        const s = newSlot.trim();
        if (s) {
            if (!/^\d{2}:\d{2}$/.test(s)) {
                setError('Formato inválido. Usa HH:mm (ej. 19:00) y confírmalo, o borra el texto insertado para guardar.');
                return;
            }
            if (!finalSlots.includes(s)) {
                finalSlots.push(s);
                finalSlots.sort();
            }
        }

        if (finalSlots.length === 0) { setError('Agrega al menos un horario'); return; }
        
        setSaving(true);
        try {
            await onSave(unit.id, { ...config, slots: finalSlots });
            onClose();
        } catch {
            setError('Error al guardar. Inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-muted/30 rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-foreground text-lg">Configurar horarios</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{unit.name}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Slots predefinidos */}
                <div>
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 block">Horarios predefinidos</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {config.slots.map(slot => (
                            <div key={slot} className="flex items-center gap-1 bg-blue-700/30 border border-blue-600/40 rounded-xl px-3 py-1.5">
                                <Clock className="w-3 h-3 text-blue-400" />
                                <span className="text-sm font-black text-blue-300 tabular-nums">{slot}</span>
                                <button onClick={() => removeSlot(slot)} className="text-blue-400/60 hover:text-red-400 ml-1 transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {config.slots.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Sin horarios. Agrega al menos uno.</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="time"
                            value={newSlot}
                            onChange={e => setNewSlot(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSlot()}
                            className="flex-1 bg-muted/10 border border-muted/20 rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/60"
                            placeholder="19:00"
                        />
                        <button
                            onClick={addSlot}
                            className="px-4 py-2 bg-primary rounded-xl text-white text-sm font-black hover:bg-primary/80 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-400 font-bold mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
                </div>

                {/* Duración promedio */}
                <div>
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 block">
                        Duración promedio de juego
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min={60} max={240} step={15}
                            value={config.avgDurationMinutes}
                            onChange={e => setConfig(prev => ({ ...prev, avgDurationMinutes: Number(e.target.value) }))}
                            className="flex-1 accent-primary"
                        />
                        <span className="text-sm font-black tabular-nums text-foreground w-20 text-right">
                            {Math.floor(config.avgDurationMinutes / 60)}h {config.avgDurationMinutes % 60 > 0 ? `${config.avgDurationMinutes % 60}min` : ''}
                        </span>
                    </div>
                </div>

                {/* Brecha mínima */}
                <div>
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 block">
                        Brecha mínima entre juegos
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min={0} max={120} step={15}
                            value={config.minGapMinutes}
                            disabled={config.allowOverlap}
                            onChange={e => setConfig(prev => ({ ...prev, minGapMinutes: Number(e.target.value) }))}
                            className="flex-1 accent-primary disabled:opacity-30"
                        />
                        <span className="text-sm font-black tabular-nums text-foreground w-20 text-right">
                            {config.allowOverlap ? '—' : config.minGapMinutes === 0 ? 'Ninguna' : `${config.minGapMinutes} min`}
                        </span>
                    </div>
                </div>

                {/* Permitir superposición */}
                <div className="flex items-center justify-between bg-muted/10 border border-muted/20 rounded-2xl px-4 py-3">
                    <div>
                        <p className="text-sm font-black text-foreground">Permitir superposición</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Permite programar 2 juegos al mismo tiempo en este campo</p>
                    </div>
                    <button
                        onClick={() => setConfig(prev => ({ ...prev, allowOverlap: !prev.allowOverlap }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${config.allowOverlap ? 'bg-amber-500' : 'bg-muted/30'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${config.allowOverlap ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                {/* Preview */}
                <div className="bg-muted/5 border border-muted/10 rounded-2xl px-4 py-3 text-xs text-muted-foreground">
                    <span className="font-black text-foreground">Resumen: </span>
                    Slots: <span className="text-primary font-bold">{config.slots.join(', ') || '—'}</span>
                    {' · '}Duración: <span className="text-primary font-bold">{config.avgDurationMinutes}min</span>
                    {!config.allowOverlap && <> · Brecha: <span className="text-primary font-bold">{config.minGapMinutes}min</span></>}
                    {config.allowOverlap && <> · <span className="text-amber-400 font-bold">Superposición permitida</span></>}
                </div>

                {/* Acciones */}
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-muted/10 hover:bg-muted/20 text-sm font-black text-muted-foreground transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 rounded-2xl bg-primary hover:bg-primary/80 text-white text-sm font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalendarioTab({ tournamentId, leagueId, canEdit, games, rounds, onOpenCreateWizard, onGameClick, onRefresh }: Props) {

    const [selectedDate, setSelectedDate] = useState<string>(toYMD(new Date()));
    const [selectedRound, setSelectedRound] = useState<string>('');
    const [sportsUnits, setSportsUnits] = useState<SportsUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [configuringUnit, setConfiguringUnit] = useState<SportsUnit | null>(null);

    const roundDates = React.useMemo(() => {
        if (!selectedRound) return [];
        const gamesInRound = games.filter(g => g.round === selectedRound);
        const dates = new Set(gamesInRound.map(g => g.scheduledDate.slice(0, 10)));
        return Array.from(dates).sort();
    }, [games, selectedRound]);

    // Navegar automáticamente a la primera fecha de la jornada seleccionada
    useEffect(() => {
        if (selectedRound && roundDates.length > 0) {
            setSelectedDate(roundDates[0]);
        }
    }, [selectedRound]); // ignore roundDates in deps to avoid jumping on game updates

    const gamesOnDate = games.filter(g => isSameDate(g.scheduledDate, selectedDate) && (!selectedRound || g.round === selectedRound));

    // Fetch campos + unidades de la liga
    const fetchUnits = useCallback(async () => {
        setLoading(true);
        try {
            const [unitsRes, fieldsRes] = await Promise.all([
                api.get(`/leagues/${leagueId}/sports-units`),
                api.get(`/leagues/${leagueId}/fields`),
            ]);
            const units: SportsUnit[] = unitsRes.data;
            const fields: FieldData[] = fieldsRes.data;

            const unitsWithFields = units.map(u => ({
                ...u,
                fields: fields.filter(f => f.sportsUnit?.id === u.id),
            }));

            const unassigned = fields.filter(f => !f.sportsUnit?.id);
            if (unassigned.length > 0) {
                unitsWithFields.push({ id: '__none__', name: 'Sin Unidad', fields: unassigned });
            }
            setSportsUnits(unitsWithFields);
        } catch (err) {
            console.error('Error cargando campos:', err);
        } finally {
            setLoading(false);
        }
    }, [leagueId]);

    useEffect(() => { fetchUnits(); }, [fetchUnits]);

    const saveScheduleConfig = async (unitId: string, config: ScheduleConfig) => {
        await api.patch(`/leagues/${leagueId}/sports-units/${unitId}/schedule-config`, config);
        setSportsUnits(prev => prev.map(u => u.id === unitId ? { ...u, scheduleConfig: config } : u));
    };


    const changeDate = (delta: number) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + delta);
        setSelectedDate(toYMD(d));
    };

    const getGameForCell = useCallback((fieldId: string, slot: string): GameSlot | null => {
        return gamesOnDate.find(g => {
            if (g.fieldId !== fieldId) return false;
            const gameHour = g.startTime ? formatTime(g.startTime).slice(0, 5) : formatTime(g.scheduledDate).slice(11, 16);
            return gameHour === slot;
        }) ?? null;
    }, [gamesOnDate]);

    const handleEmptyCellClick = (fieldId: string, slot: string) => {
        if (!canEdit || !onOpenCreateWizard) return;
        onOpenCreateWizard({ fieldId, scheduledDate: selectedDate, startTime: slot });
    };

    // ─── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm font-bold">Cargando campos...</span>
            </div>
        );
    }

    const allFields = sportsUnits.flatMap(u => u.fields);
    if (allFields.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/10 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div>
                    <p className="font-black text-foreground text-lg">Sin campos registrados</p>
                    <p className="text-sm text-muted-foreground mt-1">Agrega campos a la liga desde la sección <span className="text-primary font-bold">Unidades Deportivas</span>.</p>
                </div>
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Modal de configuración */}
            {configuringUnit && (
                <ScheduleConfigPanel
                    unit={configuringUnit}
                    onSave={saveScheduleConfig}
                    onClose={() => setConfiguringUnit(null)}
                />
            )}

            <div className="flex flex-col gap-4">

                {/* ── Jornada Selector ── */}
                {rounds && rounds.length > 0 && (
                    <div className="flex items-center justify-between bg-surface/50 border border-muted/20 rounded-2xl px-4 py-2 gap-4">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest shrink-0">Jornada:</span>
                        <select 
                            value={selectedRound} 
                            onChange={e => setSelectedRound(e.target.value)}
                            className="bg-muted/10 border border-muted/20 text-foreground font-bold text-sm px-3 py-1.5 rounded-xl outline-none w-full max-w-xs focus:border-primary/50"
                        >
                            <option value="">Vista Libre (Todas las jornadas)</option>
                            {rounds.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                )}

                {/* ── Barra de fecha ── */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-surface border border-muted/20 rounded-2xl px-4 py-3 gap-4">
                        <button onClick={() => changeDate(-1)} className="w-9 h-9 rounded-xl bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
                            <div className="flex items-center justify-center gap-2 w-full">
                                <Calendar className="w-4 h-4 text-primary shrink-0" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="bg-transparent text-foreground font-black text-base text-center border-none outline-none cursor-pointer w-32 shrink-0"
                                />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest truncate w-full text-center">
                                {formatDateLabel(selectedDate)}
                            </span>
                        </div>
                        <button onClick={() => changeDate(1)} className="w-9 h-9 rounded-xl bg-muted/10 hover:bg-muted/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Días de la jornada activa */}
                    {selectedRound && roundDates.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 custom-scrollbar">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Días con juegos:</span>
                            {roundDates.map(d => (
                                <button
                                    key={d}
                                    onClick={() => setSelectedDate(d)}
                                    className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${selectedDate === d ? 'bg-primary/20 text-primary border-primary/40' : 'bg-muted/10 text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/20'}`}
                                >
                                    {formatDateLabel(d)} {new Date(d + 'T12:00:00').getDate()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Leyenda + acciones ── */}
                <div className="flex items-center gap-3 px-1 flex-wrap">
                    {[
                        { color: 'bg-blue-700/80 border-blue-500', label: 'Programado' },
                        { color: 'bg-red-600/90 border-red-500', label: 'En vivo' },
                        { color: 'bg-zinc-700/80 border-zinc-600', label: 'Finalizado' },
                        { color: 'bg-amber-600/70 border-amber-500', label: 'Borrador' },
                        { color: 'bg-emerald-900/30 border-emerald-700/40', label: 'Libre' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded border ${item.color}`} />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                        </div>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                        {onRefresh && (
                            <button onClick={onRefresh} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
                                <RefreshCw className="w-3.5 h-3.5" />
                                Actualizar
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Grilla por unidad ── */}
                <div className="flex flex-col gap-4">
                    {sportsUnits.filter(u => u.fields.length > 0).map(unit => {
                        const unitSlots = (() => {
                            const cfg = unit.scheduleConfig ?? DEFAULT_CONFIG;
                            const slotSet = new Set<string>(cfg.slots);
                            gamesOnDate.forEach(g => {
                                if (unit.fields.some(f => f.id === g.fieldId)) {
                                    const t = formatTime(g.startTime);
                                    if (t) slotSet.add(t.slice(0, 5));
                                }
                            });
                            const sorted = [...slotSet].sort();
                            return sorted.length > 0 ? sorted : cfg.slots.length > 0 ? cfg.slots : DEFAULT_CONFIG.slots;
                        })();

                        return (
                            <div key={unit.id} className="rounded-2xl border border-muted/20 overflow-hidden">
                                {/* Header de unidad */}
                                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-muted/20">
                                    <span className="text-xs font-black uppercase tracking-widest text-primary/80">{unit.name}</span>
                                    {canEdit && unit.id !== '__none__' && (
                                        <button
                                            onClick={() => setConfiguringUnit(unit)}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                                            title="Configurar horarios"
                                        >
                                            <Settings className="w-3 h-3" />
                                            Configurar
                                        </button>
                                    )}
                                </div>

                                {/* Grid: columna de hora + campos distribuidos en el ancho */}
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: `72px repeat(${unit.fields.length}, 1fr)`,
                                    }}
                                >
                                    {/* Cabecera: esquina + nombres de campos */}
                                    <div className="bg-zinc-900/80 border-b border-r border-muted/20 p-2" />
                                    {unit.fields.map((field, fi) => (
                                        <div
                                            key={field.id}
                                            className={`bg-zinc-900/80 border-b border-muted/20 p-2 text-center ${fi < unit.fields.length - 1 ? 'border-r border-muted/10' : ''}`}
                                        >
                                            <div className="text-[11px] font-black text-foreground uppercase tracking-wide truncate">{field.name}</div>
                                            {field.location && (
                                                <div className="text-[9px] text-muted-foreground/50 truncate mt-0.5">{field.location}</div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Filas de slots */}
                                    {unitSlots.map((slot, slotIdx) => (
                                        <React.Fragment key={slot}>
                                            {/* Etiqueta de hora */}
                                            <div className={`bg-zinc-900/60 flex items-center justify-center border-r border-muted/20 ${slotIdx < unitSlots.length - 1 ? 'border-b border-muted/10' : ''} px-2 py-3`}>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Clock className="w-3 h-3 shrink-0" />
                                                    <span className="text-xs font-black tabular-nums">{slot}</span>
                                                </div>
                                            </div>

                                            {/* Celdas */}
                                            {unit.fields.map((field, fi) => {
                                                const game = getGameForCell(field.id, slot);
                                                const isLastSlot = slotIdx === unitSlots.length - 1;
                                                return (
                                                    <div
                                                        key={`${field.id}-${slot}`}
                                                        className={`p-2 min-h-[90px] flex items-stretch ${!isLastSlot ? 'border-b border-muted/10' : ''} ${fi < unit.fields.length - 1 ? 'border-r border-muted/10' : ''}`}
                                                    >
                                                        {game ? (
                                                            <button
                                                                onClick={() => onGameClick?.(game.id)}
                                                                className={`w-full rounded-xl border px-2 py-2 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${gameStatusStyle(game.status)}`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <span className="text-[9px] font-black opacity-70 tabular-nums">
                                                                        {game.startTime ? formatTime(game.startTime) : formatTime(game.scheduledDate)}
                                                                    </span>
                                                                    {game.status === 'live' && <span className="text-[8px] font-black bg-white/20 rounded px-1 py-0.5 animate-pulse">EN VIVO</span>}
                                                                    {game.status === 'draft' && <span className="text-[8px] font-black bg-white/20 rounded px-1 py-0.5">BORRADOR</span>}
                                                                    {game.status === 'finished' && <span className="text-[8px] font-black tabular-nums opacity-70">{game.awayScore}-{game.homeScore}</span>}
                                                                </div>
                                                                {game.round && <div className="text-[9px] font-bold opacity-60 mb-1 uppercase tracking-wider truncate">{game.round}</div>}
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[11px] font-black leading-tight truncate">{game.awayTeam.shortName || game.awayTeam.name}</p>
                                                                    <p className="text-[9px] font-bold opacity-50 leading-none">vs</p>
                                                                    <p className="text-[11px] font-black leading-tight truncate">{game.homeTeam.shortName || game.homeTeam.name}</p>
                                                                </div>
                                                            </button>
                                                        ) : (
                                                            canEdit ? (
                                                                <button
                                                                    onClick={() => handleEmptyCellClick(field.id, slot)}
                                                                    className="w-full rounded-xl border border-emerald-700/40 bg-emerald-900/30 hover:bg-emerald-800/40 hover:border-emerald-600/60 flex flex-col items-center justify-center gap-1 text-emerald-400/60 hover:text-emerald-300 cursor-pointer transition-all duration-200"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                    <span className="text-[9px] font-black uppercase tracking-widest">Agregar</span>
                                                                </button>
                                                            ) : (
                                                                <div className="w-full rounded-xl border border-muted/10 bg-muted/5" />
                                                            )
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {gamesOnDate.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground font-bold">
                            No hay juegos programados para el {selectedDate}.
                            {canEdit && <span className="text-primary"> Haz clic en cualquier celda verde para programar uno.</span>}
                        </div>
                    )}
                </div>

                {/* ── Resumen del día ── */}
                {gamesOnDate.length > 0 && (
                    <div className="bg-surface border border-muted/20 rounded-2xl px-4 py-3">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">
                            {gamesOnDate.length} juego{gamesOnDate.length !== 1 ? 's' : ''} · {selectedDate}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {gamesOnDate.map(g => (
                                <button key={g.id} onClick={() => onGameClick?.(g.id)} className="flex items-center gap-2 bg-muted/10 hover:bg-muted/20 border border-muted/20 rounded-xl px-3 py-1.5 transition-all">
                                    <div className={`w-2 h-2 rounded-full ${g.status === 'live' ? 'bg-red-500 animate-pulse' : g.status === 'finished' ? 'bg-zinc-500' : g.status === 'draft' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                    <span className="text-xs font-black">{g.awayTeam.shortName || g.awayTeam.name} vs {g.homeTeam.shortName || g.homeTeam.name}</span>
                                    {g.startTime && <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(g.startTime)}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
