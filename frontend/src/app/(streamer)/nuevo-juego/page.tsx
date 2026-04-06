'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Plus, Trash2, Shield, Calendar, Hash, Wand2, UploadCloud, Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerRow {
    firstName: string;
    lastName: string;
    number: string;
    position: string;
    dhForPosition: string;
}

interface ReserveRow {
    firstName: string;
    lastName: string;
    number: string;
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const INNINGS_OPTIONS = [5, 7, 9, 11];
const STEP_LABELS = ['Juego', 'Local', 'Visitante', 'Confirmar'];

const emptyPlayer = (): PlayerRow => ({ firstName: '', lastName: '', number: '', position: '', dhForPosition: '' });
const emptyReserve = (): ReserveRow => ({ firstName: '', lastName: '', number: '' });

// ─── Step indicator (same as CreateGameWizard) ───────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: total }).map((_, i) => (
                <React.Fragment key={i}>
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${i < current ? 'bg-blue-500 w-6' : i === current ? 'bg-blue-400 w-6' : 'bg-zinc-700 w-4'}`} />
                </React.Fragment>
            ))}
            <span className="text-xs text-zinc-500 ml-1">{STEP_LABELS[current]}</span>
        </div>
    );
}

// ─── Player row component ─────────────────────────────────────────────────────

const FIELD_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

function PlayerRowInput({
    player,
    index,
    onChange,
    onRemove,
    canRemove,
}: {
    player: PlayerRow;
    index: number;
    onChange: (field: keyof PlayerRow, val: string) => void;
    onRemove: () => void;
    canRemove: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                {/* Order number */}
                <span className="text-xs text-zinc-600 font-bold w-4 shrink-0 text-center">{index + 1}</span>

                {/* Name + Last name */}
                <input
                    className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    placeholder="Nombre"
                    value={player.firstName}
                    onChange={e => onChange('firstName', e.target.value)}
                />
                <input
                    className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    placeholder="Apellido"
                    value={player.lastName}
                    onChange={e => onChange('lastName', e.target.value)}
                />

                {/* Number */}
                <input
                    className="w-12 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="#"
                    type="number"
                    min={0}
                    max={99}
                    value={player.number}
                    onChange={e => onChange('number', e.target.value)}
                />

                {/* Position */}
                <select
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-1 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={player.position}
                    onChange={e => { onChange('position', e.target.value); if (e.target.value !== 'DH') onChange('dhForPosition', ''); }}
                >
                    <option value="">Pos</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {/* Remove */}
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={!canRemove}
                    className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* DH: batea por (sub-row) */}
            {player.position === 'DH' && (
                <div className="flex items-center gap-2 pl-6">
                    <span className="text-[10px] text-amber-500 font-semibold whitespace-nowrap">Batea por:</span>
                    <select
                        className="flex-1 bg-zinc-900 border border-amber-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                        value={player.dhForPosition}
                        onChange={e => onChange('dhForPosition', e.target.value)}
                    >
                        <option value="">— Posición defensiva —</option>
                        {FIELD_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
}

// ─── Reserve row component (no position field) ───────────────────────────────

function ReserveRowInput({
    reserve,
    index,
    onChange,
    onRemove,
    canRemove,
}: {
    reserve: ReserveRow;
    index: number;
    onChange: (field: keyof ReserveRow, val: string) => void;
    onRemove: () => void;
    canRemove: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            <input
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                placeholder="Nombre"
                value={reserve.firstName}
                onChange={e => onChange('firstName', e.target.value)}
            />
            <input
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                placeholder="Apellido"
                value={reserve.lastName}
                onChange={e => onChange('lastName', e.target.value)}
            />
            <input
                className="w-12 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="#"
                type="number"
                min={0}
                max={99}
                value={reserve.number}
                onChange={e => onChange('number', e.target.value)}
            />
            <button
                type="button"
                onClick={onRemove}
                disabled={!canRemove}
                className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
}

// ─── AI photo scanner (inline, no roster cross-ref needed in wizard) ──────────

function AIPhotoButton({ onResults }: { onResults: (rows: PlayerRow[]) => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [scanning, setScanning] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setScanning(true);
        try {
            const base64Full = await new Promise<string>((res, rej) => {
                const reader = new FileReader();
                reader.onloadend = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsDataURL(file);
            });
            const mimeType = base64Full.split(';')[0].split(':')[1];
            const imageBase64 = base64Full.split(',')[1];

            const { data } = await api.post('/vision/lineup', { imageBase64, mimeType });
            const rows: PlayerRow[] = (data as { name: string; position: string }[]).map(p => ({
                firstName: p.name?.split(' ')[0] ?? '',
                lastName: p.name?.split(' ').slice(1).join(' ') ?? '',
                number: '',
                position: p.position ?? '',
                dhForPosition: '',
            }));
            if (rows.length > 0) onResults(rows);
            else toast.warning('La IA no detectó jugadores en la imagen.');
        } catch {
            toast.error('Error al analizar la imagen. Intenta de nuevo.');
        } finally {
            setScanning(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={scanning}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors disabled:opacity-50"
            >
                {scanning ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                {scanning ? 'Analizando...' : 'Escanear con IA'}
            </button>
            <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleFile} />
        </>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NuevoJuego() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 0 — game config
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 5);
    const [scheduledDate, setScheduledDate] = useState(today);
    const [scheduledTime, setScheduledTime] = useState(nowTime);
    const [maxInnings, setMaxInnings] = useState(9);

    // Step 1 — home team
    const [homeTeamName, setHomeTeamName] = useState('');
    const [homePlayers, setHomePlayers] = useState<PlayerRow[]>([emptyPlayer()]);
    const [homeReserves, setHomeReserves] = useState<ReserveRow[]>([]);

    // Step 2 — away team
    const [awayTeamName, setAwayTeamName] = useState('');
    const [awayPlayers, setAwayPlayers] = useState<PlayerRow[]>([emptyPlayer()]);
    const [awayReserves, setAwayReserves] = useState<ReserveRow[]>([]);

    // ── Player helpers ─────────────────────────────────────────────────────────
    const updatePlayer = (list: PlayerRow[], setList: (l: PlayerRow[]) => void, i: number, field: keyof PlayerRow, val: string) => {
        const updated = [...list];
        updated[i] = { ...updated[i], [field]: val };
        setList(updated);
    };

    const addPlayer = (list: PlayerRow[], setList: (l: PlayerRow[]) => void) =>
        setList([...list, emptyPlayer()]);

    const removePlayer = (list: PlayerRow[], setList: (l: PlayerRow[]) => void, i: number) => {
        if (list.length <= 1) return;
        setList(list.filter((_, idx) => idx !== i));
    };

    const updateReserve = (list: ReserveRow[], setList: (l: ReserveRow[]) => void, i: number, field: keyof ReserveRow, val: string) => {
        const updated = [...list];
        updated[i] = { ...updated[i], [field]: val };
        setList(updated);
    };

    const addReserve = (list: ReserveRow[], setList: (l: ReserveRow[]) => void) =>
        setList([...list, emptyReserve()]);

    const removeReserve = (list: ReserveRow[], setList: (l: ReserveRow[]) => void, i: number) =>
        setList(list.filter((_, idx) => idx !== i));

    // ── Navigation ─────────────────────────────────────────────────────────────
    const canNext = () => {
        if (step === 0) return scheduledDate.length > 0 && maxInnings > 0;
        if (step === 1) return homeTeamName.trim().length > 0;
        if (step === 2) return awayTeamName.trim().length > 0;
        return false;
    };

    const handleNext = () => {
        setError(null);
        setStep(s => s + 1);
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setError(null);
        setSubmitting(true);
        try {
            const dateTime = scheduledTime
                ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
                : new Date(`${scheduledDate}T12:00:00`).toISOString();

            const toDto = (p: PlayerRow) => ({
                firstName: p.firstName.trim() || '—',
                lastName: p.lastName.trim() || '—',
                number: p.number ? parseInt(p.number) : undefined,
                position: p.position || undefined,
                dhForPosition: (p.position === 'DH' && p.dhForPosition) ? p.dhForPosition : undefined,
            });

            const toReserveDto = (r: ReserveRow) => ({
                firstName: r.firstName.trim() || '—',
                lastName: r.lastName.trim() || '—',
                number: r.number ? parseInt(r.number) : undefined,
            });

            const { data } = await api.post('/streamer/games', {
                homeTeamName: homeTeamName.trim(),
                awayTeamName: awayTeamName.trim(),
                homePlayers: homePlayers.filter(p => p.firstName || p.lastName).map(toDto),
                awayPlayers: awayPlayers.filter(p => p.firstName || p.lastName).map(toDto),
                homeReserves: homeReserves.filter(r => r.firstName || r.lastName).map(toReserveDto),
                awayReserves: awayReserves.filter(r => r.firstName || r.lastName).map(toReserveDto),
                scheduledDate: dateTime,
                maxInnings,
            });

            toast.success('¡Juego creado!');
            window.location.href = `/game/${data.id}`;
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Error creando el juego';
            setError(msg);
            setSubmitting(false);
        }
    };

    const homeFilled = homePlayers.filter(p => p.firstName || p.lastName).length;
    const awayFilled = awayPlayers.filter(p => p.firstName || p.lastName).length;
    const homeReservesFilled = homeReserves.filter(r => r.firstName || r.lastName).length;
    const awayReservesFilled = awayReserves.filter(r => r.firstName || r.lastName).length;

    return (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            {/* Backdrop click → dashboard */}
            <div className="absolute inset-0" onClick={() => router.push('/dashboard')} />

            {/* Panel — bottom sheet mobile, centered modal desktop */}
            <div className="relative z-10 w-full sm:max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95dvh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                    <div className="flex flex-col gap-1">
                        <h2 className="font-bold text-white text-base">Nuevo Juego Rápido</h2>
                        <StepIndicator current={step} total={4} />
                    </div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="mx-5 mt-3 px-4 py-2.5 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300 shrink-0">
                        {error}
                    </div>
                )}

                {/* Content — scrollable */}
                <div className="overflow-y-auto flex-1 px-5 py-4">

                    {/* ── STEP 0: Configuración ── */}
                    {step === 0 && (
                        <div className="flex flex-col gap-5">
                            {/* Fecha y hora */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                                        <Calendar size={11} /> Fecha
                                    </label>
                                    <input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={e => setScheduledDate(e.target.value)}
                                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Hora</label>
                                    <input
                                        type="time"
                                        value={scheduledTime}
                                        onChange={e => setScheduledTime(e.target.value)}
                                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Entradas */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                                    <Hash size={11} /> Número de entradas
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {INNINGS_OPTIONS.map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setMaxInnings(n)}
                                            className={`py-2.5 rounded-lg font-bold text-sm transition-colors ${maxInnings === n ? 'bg-blue-600 text-white' : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400">
                                Llena los equipos y jugadores en los siguientes pasos. Los lineups los puedes armar directamente en el scorekeeper.
                            </div>
                        </div>
                    )}

                    {/* ── STEP 1: Equipo Local ── */}
                    {step === 1 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                                    <Shield size={11} /> Nombre del equipo local
                                </label>
                                <input
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white font-semibold placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                                    placeholder="Ej: Diablos Rojos"
                                    value={homeTeamName}
                                    autoFocus
                                    onChange={e => setHomeTeamName(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                                    Jugadores <span className="normal-case font-normal text-zinc-600">(opcional)</span>
                                </label>

                                {/* Column headers */}
                                <div className="flex items-center gap-2 px-1">
                                    <span className="w-4" />
                                    <span className="flex-1 text-[10px] text-zinc-600 font-semibold uppercase">Nombre</span>
                                    <span className="flex-1 text-[10px] text-zinc-600 font-semibold uppercase">Apellido</span>
                                    <span className="w-12 text-[10px] text-zinc-600 font-semibold uppercase text-center">#</span>
                                    <span className="w-16 text-[10px] text-zinc-600 font-semibold uppercase text-center">Pos</span>
                                    <span className="w-7" />
                                </div>

                                {homePlayers.map((p, i) => (
                                    <PlayerRowInput
                                        key={i}
                                        player={p}
                                        index={i}
                                        onChange={(f, v) => updatePlayer(homePlayers, setHomePlayers, i, f, v)}
                                        onRemove={() => removePlayer(homePlayers, setHomePlayers, i)}
                                        canRemove={homePlayers.length > 1}
                                    />
                                ))}

                                <div className="flex items-center gap-4 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => addPlayer(homePlayers, setHomePlayers)}
                                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                                    >
                                        <Plus size={13} /> Añadir jugador
                                    </button>
                                    <AIPhotoButton onResults={rows => setHomePlayers(rows.length ? rows : [emptyPlayer()])} />
                                </div>
                            </div>

                            {/* Banca / Reservas */}
                            <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
                                        Banca / Reservas <span className="normal-case font-normal text-zinc-600">(opcional)</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => addReserve(homeReserves, setHomeReserves)}
                                        className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-semibold transition-colors"
                                    >
                                        <Plus size={12} /> Añadir
                                    </button>
                                </div>

                                {homeReserves.length === 0 && (
                                    <p className="text-xs text-zinc-600 italic">Sin jugadores de banca.</p>
                                )}

                                {homeReserves.map((r, i) => (
                                    <ReserveRowInput
                                        key={i}
                                        reserve={r}
                                        index={i}
                                        onChange={(f, v) => updateReserve(homeReserves, setHomeReserves, i, f, v)}
                                        onRemove={() => removeReserve(homeReserves, setHomeReserves, i)}
                                        canRemove={true}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: Equipo Visitante ── */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                                    <Shield size={11} /> Nombre del equipo visitante
                                </label>
                                <input
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white font-semibold placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                                    placeholder="Ej: Tigres del Norte"
                                    value={awayTeamName}
                                    autoFocus
                                    onChange={e => setAwayTeamName(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                                    Jugadores <span className="normal-case font-normal text-zinc-600">(opcional)</span>
                                </label>

                                <div className="flex items-center gap-2 px-1">
                                    <span className="w-4" />
                                    <span className="flex-1 text-[10px] text-zinc-600 font-semibold uppercase">Nombre</span>
                                    <span className="flex-1 text-[10px] text-zinc-600 font-semibold uppercase">Apellido</span>
                                    <span className="w-12 text-[10px] text-zinc-600 font-semibold uppercase text-center">#</span>
                                    <span className="w-16 text-[10px] text-zinc-600 font-semibold uppercase text-center">Pos</span>
                                    <span className="w-7" />
                                </div>

                                {awayPlayers.map((p, i) => (
                                    <PlayerRowInput
                                        key={i}
                                        player={p}
                                        index={i}
                                        onChange={(f, v) => updatePlayer(awayPlayers, setAwayPlayers, i, f, v)}
                                        onRemove={() => removePlayer(awayPlayers, setAwayPlayers, i)}
                                        canRemove={awayPlayers.length > 1}
                                    />
                                ))}

                                <div className="flex items-center gap-4 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => addPlayer(awayPlayers, setAwayPlayers)}
                                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                                    >
                                        <Plus size={13} /> Añadir jugador
                                    </button>
                                    <AIPhotoButton onResults={rows => setAwayPlayers(rows.length ? rows : [emptyPlayer()])} />
                                </div>
                            </div>

                            {/* Banca / Reservas */}
                            <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
                                        Banca / Reservas <span className="normal-case font-normal text-zinc-600">(opcional)</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => addReserve(awayReserves, setAwayReserves)}
                                        className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-semibold transition-colors"
                                    >
                                        <Plus size={12} /> Añadir
                                    </button>
                                </div>

                                {awayReserves.length === 0 && (
                                    <p className="text-xs text-zinc-600 italic">Sin jugadores de banca.</p>
                                )}

                                {awayReserves.map((r, i) => (
                                    <ReserveRowInput
                                        key={i}
                                        reserve={r}
                                        index={i}
                                        onChange={(f, v) => updateReserve(awayReserves, setAwayReserves, i, f, v)}
                                        onRemove={() => removeReserve(awayReserves, setAwayReserves, i)}
                                        canRemove={true}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Confirmar ── */}
                    {step === 3 && (
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle2 size={18} />
                                <p className="font-semibold text-white text-sm">Todo listo — revisa y confirma</p>
                            </div>

                            {/* Summary */}
                            <div className="flex flex-col gap-2">
                                <div className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between text-sm">
                                    <span className="text-zinc-400">Fecha</span>
                                    <span className="text-white font-semibold">
                                        {new Date(`${scheduledDate}T${scheduledTime || '12:00'}`).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>
                                <div className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between text-sm">
                                    <span className="text-zinc-400">Entradas</span>
                                    <span className="text-white font-semibold">{maxInnings}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Local', name: homeTeamName, count: homeFilled, reserves: homeReservesFilled },
                                    { label: 'Visitante', name: awayTeamName, count: awayFilled, reserves: awayReservesFilled },
                                ].map(({ label, name, count, reserves }) => (
                                    <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                        <div className="px-3 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400">{label}</div>
                                        <div className="px-3 py-2.5">
                                            <p className="text-white font-bold text-sm truncate">{name}</p>
                                            <p className="text-zinc-500 text-xs mt-0.5">{count} jugador{count !== 1 ? 'es' : ''}</p>
                                            {reserves > 0 && (
                                                <p className="text-amber-600 text-xs mt-0.5">{reserves} en banca</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-zinc-800 shrink-0 flex items-center gap-3">
                    {/* Back */}
                    {step > 0 && (
                        <button
                            type="button"
                            onClick={() => { setError(null); setStep(s => s - 1); }}
                            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors font-semibold"
                        >
                            <ChevronLeft size={16} /> Atrás
                        </button>
                    )}

                    {/* Next / Submit */}
                    <div className="flex-1">
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!canNext()}
                                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                {step === 2 ? 'Revisar' : 'Siguiente'} <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} />
                                {submitting ? 'Creando juego...' : 'Crear juego e ir al scorekeeper'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
