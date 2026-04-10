'use client';

/**
 * SportsUnitsManager
 * Gestión completa de Unidades Deportivas y Campos de una liga.
 * Se puede usar como sección embebida o dentro de un modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, MapPin, Building2, Check, X, RefreshCw, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldData {
    id: string;
    name: string;
    location?: string;
    isActive: boolean;
    sportsUnitId?: string;
}

interface SportsUnit {
    id: string;
    name: string;
    location?: string;
    isActive: boolean;
    fields: FieldData[];
}

interface Props {
    leagueId: string;
    canEdit: boolean;
}

// ─── Formulario inline reutilizable ──────────────────────────────────────────

function InlineForm({
    label,
    initialName = '',
    initialLocation = '',
    onSave,
    onCancel,
    saving,
}: {
    label: string;
    initialName?: string;
    initialLocation?: string;
    onSave: (name: string, location: string) => void;
    onCancel: () => void;
    saving: boolean;
}) {
    const [name, setName] = useState(initialName);
    const [location, setLocation] = useState(initialLocation);

    return (
        <div className="bg-muted/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-xs font-black text-primary uppercase tracking-widest">{label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre *</label>
                    <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') onSave(name, location); if (e.key === 'Escape') onCancel(); }}
                        placeholder="Ej: Estadio Municipal"
                        className="bg-background border border-muted/30 rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/60 transition-colors"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ubicación</label>
                    <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') onSave(name, location); if (e.key === 'Escape') onCancel(); }}
                        placeholder="Ej: Av. Principal 123"
                        className="bg-background border border-muted/30 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 transition-colors"
                    />
                </div>
            </div>
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-muted/10 hover:bg-muted/20 text-sm font-bold text-muted-foreground transition-all">
                    Cancelar
                </button>
                <button
                    onClick={() => onSave(name, location)}
                    disabled={saving || !name.trim()}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/80 text-white text-sm font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Guardar
                </button>
            </div>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SportsUnitsManager({ leagueId, canEdit }: Props) {
    const [units, setUnits] = useState<SportsUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Qué está expandido/editando
    const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
    const [creatingUnit, setCreatingUnit] = useState(false);
    const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
    const [creatingFieldForUnit, setCreatingFieldForUnit] = useState<string | null>(null);
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [confirmDeleteUnit, setConfirmDeleteUnit] = useState<string | null>(null);
    const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null);

    const fetchUnits = useCallback(async () => {
        setLoading(true);
        try {
            const [unitsRes, fieldsRes] = await Promise.all([
                api.get(`/leagues/${leagueId}/sports-units`),
                api.get(`/leagues/${leagueId}/fields`),
            ]);
            const rawUnits: SportsUnit[] = unitsRes.data;
            const rawFields: FieldData[] = fieldsRes.data;
            // Asociar campos a unidades
            const withFields = rawUnits.map(u => ({
                ...u,
                fields: rawFields.filter(f => f.sportsUnitId === u.id),
            }));
            // Expandir todas por default si hay pocas
            if (withFields.length <= 3) {
                setExpandedUnits(new Set(withFields.map(u => u.id)));
            }
            setUnits(withFields);
        } catch {
            setError('Error al cargar unidades deportivas.');
        } finally {
            setLoading(false);
        }
    }, [leagueId]);

    useEffect(() => { fetchUnits(); }, [fetchUnits]);

    const toggleUnit = (id: string) => {
        setExpandedUnits(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── CRUD Unidades ─────────────────────────────────────────────────────────

    const handleCreateUnit = async (name: string, location: string) => {
        if (!name.trim()) return;
        setSaving(true); setError('');
        try {
            await api.post(`/leagues/${leagueId}/sports-units`, { name: name.trim(), location: location.trim() || undefined });
            setCreatingUnit(false);
            await fetchUnits();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Error al crear la unidad.');
        } finally { setSaving(false); }
    };

    const handleUpdateUnit = async (id: string, name: string, location: string) => {
        if (!name.trim()) return;
        setSaving(true); setError('');
        try {
            await api.patch(`/leagues/${leagueId}/sports-units/${id}`, { name: name.trim(), location: location.trim() || undefined });
            setEditingUnitId(null);
            await fetchUnits();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Error al actualizar la unidad.');
        } finally { setSaving(false); }
    };

    const handleDeleteUnit = async (id: string) => {
        setSaving(true); setError('');
        try {
            await api.delete(`/leagues/${leagueId}/sports-units/${id}`);
            setConfirmDeleteUnit(null);
            await fetchUnits();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Error al eliminar la unidad.');
        } finally { setSaving(false); }
    };

    const handleToggleUnit = async (unit: SportsUnit) => {
        setSaving(true); setError('');
        try {
            await api.patch(`/leagues/${leagueId}/sports-units/${unit.id}`, { isActive: !unit.isActive });
            await fetchUnits();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Error al actualizar.');
        } finally { setSaving(false); }
    };

    // ── CRUD Campos ───────────────────────────────────────────────────────────

    const handleCreateField = async (unitId: string, name: string, location: string) => {
        if (!name.trim()) return;
        setSaving(true); setError('');
        try {
            await api.post(`/leagues/${leagueId}/fields`, {
                name: name.trim(),
                location: location.trim() || undefined,
                sportsUnitId: unitId,
            });
            setCreatingFieldForUnit(null);
            await fetchUnits();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Error al crear el campo.');
        } finally { setSaving(false); }
    };

    const handleUpdateField = async (fieldId: string, name: string, location: string) => {
        if (!name.trim()) return;
        setSaving(true); setError('');
        try {
            await api.patch(`/fields/${fieldId}`, { name: name.trim(), location: location.trim() || undefined });
            setEditingFieldId(null);
            await fetchUnits();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Error al actualizar el campo.');
        } finally { setSaving(false); }
    };

    const handleToggleField = async (field: FieldData) => {
        setSaving(true); setError('');
        try {
            await api.patch(`/fields/${field.id}`, { isActive: !field.isActive });
            await fetchUnits();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Error al actualizar.');
        } finally { setSaving(false); }
    };

    const handleDeleteField = async (fieldId: string) => {
        setSaving(true); setError('');
        try {
            await api.delete(`/fields/${fieldId}`);
            setConfirmDeleteField(null);
            await fetchUnits();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Error al eliminar el campo.');
        } finally { setSaving(false); }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm font-bold">Cargando...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">

            {/* Error global */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-700/50 rounded-2xl text-sm text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-200"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Header + botón nueva unidad */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-black text-foreground text-lg">Unidades Deportivas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{units.length} unidad{units.length !== 1 ? 'es' : ''} · {units.reduce((acc, u) => acc + u.fields.length, 0)} campos</p>
                </div>
                {canEdit && !creatingUnit && (
                    <button
                        onClick={() => { setCreatingUnit(true); setEditingUnitId(null); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/80 rounded-2xl text-white text-xs font-black uppercase tracking-widest transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Unidad
                    </button>
                )}
            </div>

            {/* Formulario nueva unidad */}
            {creatingUnit && (
                <InlineForm
                    label="Nueva Unidad Deportiva"
                    onSave={handleCreateUnit}
                    onCancel={() => setCreatingUnit(false)}
                    saving={saving}
                />
            )}

            {/* Lista de unidades */}
            {units.length === 0 && !creatingUnit && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted/10 flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <div>
                        <p className="font-black text-foreground">Sin unidades deportivas</p>
                        <p className="text-sm text-muted-foreground mt-1">Crea la primera unidad para organizar los campos de la liga.</p>
                    </div>
                </div>
            )}

            {units.map(unit => {
                const isExpanded = expandedUnits.has(unit.id);
                const isEditingUnit = editingUnitId === unit.id;

                return (
                    <div key={unit.id} className={`border rounded-2xl overflow-hidden transition-all ${unit.isActive ? 'border-muted/20 bg-surface' : 'border-muted/10 bg-muted/5 opacity-60'}`}>

                        {/* Cabecera de unidad */}
                        {isEditingUnit ? (
                            <div className="p-4">
                                <InlineForm
                                    label={`Editar: ${unit.name}`}
                                    initialName={unit.name}
                                    initialLocation={unit.location ?? ''}
                                    onSave={(name, loc) => handleUpdateUnit(unit.id, name, loc)}
                                    onCancel={() => setEditingUnitId(null)}
                                    saving={saving}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 px-4 py-3">
                                {/* Expand toggle */}
                                <button
                                    onClick={() => toggleUnit(unit.id)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>

                                {/* Icono + nombre */}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Building2 className="w-4 h-4 text-primary/70 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-black text-foreground text-sm truncate">{unit.name}</p>
                                        {unit.location && (
                                            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                                <MapPin className="w-2.5 h-2.5" />{unit.location}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted/10 rounded-lg px-2 py-0.5 shrink-0">
                                        {unit.fields.length} campo{unit.fields.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Acciones unidad */}
                                {canEdit && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => handleToggleUnit(unit)}
                                            title={unit.isActive ? 'Desactivar unidad' : 'Activar unidad'}
                                            className="w-8 h-8 rounded-xl hover:bg-muted/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                                        >
                                            {unit.isActive ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => { setEditingUnitId(unit.id); setExpandedUnits(prev => new Set([...prev, unit.id])); }}
                                            className="w-8 h-8 rounded-xl hover:bg-muted/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        {confirmDeleteUnit === unit.id ? (
                                            <div className="flex items-center gap-1 bg-red-900/30 border border-red-700/50 rounded-xl px-2 py-1">
                                                <span className="text-[10px] text-red-300 font-bold">¿Eliminar?</span>
                                                <button onClick={() => handleDeleteUnit(unit.id)} className="text-red-400 hover:text-red-200 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => setConfirmDeleteUnit(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDeleteUnit(unit.id)}
                                                className="w-8 h-8 rounded-xl hover:bg-muted/10 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Campos de la unidad */}
                        {isExpanded && !isEditingUnit && (
                            <div className="border-t border-muted/10">
                                {/* Lista de campos */}
                                {unit.fields.length === 0 && creatingFieldForUnit !== unit.id && (
                                    <div className="px-4 py-4 text-center text-xs text-muted-foreground font-bold">
                                        Sin campos. Agrega el primero.
                                    </div>
                                )}

                                {unit.fields.map(field => {
                                    const isEditingField = editingFieldId === field.id;
                                    return (
                                        <div key={field.id} className={`border-b border-muted/10 last:border-0 ${!field.isActive ? 'opacity-50' : ''}`}>
                                            {isEditingField ? (
                                                <div className="px-4 py-3">
                                                    <InlineForm
                                                        label={`Editar campo: ${field.name}`}
                                                        initialName={field.name}
                                                        initialLocation={field.location ?? ''}
                                                        onSave={(name, loc) => handleUpdateField(field.id, name, loc)}
                                                        onCancel={() => setEditingFieldId(null)}
                                                        saving={saving}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 px-8 py-2.5">
                                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-foreground truncate">{field.name}</p>
                                                        {field.location && (
                                                            <p className="text-[10px] text-muted-foreground truncate">{field.location}</p>
                                                        )}
                                                    </div>
                                                    {!field.isActive && (
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase bg-muted/10 rounded-lg px-2 py-0.5">Inactivo</span>
                                                    )}
                                                    {canEdit && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                onClick={() => handleToggleField(field)}
                                                                title={field.isActive ? 'Desactivar campo' : 'Activar campo'}
                                                                className="w-7 h-7 rounded-lg hover:bg-muted/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                                                            >
                                                                {field.isActive ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingFieldId(field.id)}
                                                                className="w-7 h-7 rounded-lg hover:bg-muted/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            {confirmDeleteField === field.id ? (
                                                                <div className="flex items-center gap-1 bg-red-900/30 border border-red-700/50 rounded-lg px-1.5 py-1">
                                                                    <span className="text-[9px] text-red-300 font-bold">¿Eliminar?</span>
                                                                    <button onClick={() => handleDeleteField(field.id)} className="text-red-400 hover:text-red-200"><Check className="w-3 h-3" /></button>
                                                                    <button onClick={() => setConfirmDeleteField(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setConfirmDeleteField(field.id)}
                                                                    className="w-7 h-7 rounded-lg hover:bg-muted/10 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-all"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Formulario nuevo campo */}
                                {creatingFieldForUnit === unit.id && (
                                    <div className="px-4 py-3 border-t border-muted/10">
                                        <InlineForm
                                            label="Nuevo Campo"
                                            onSave={(name, loc) => handleCreateField(unit.id, name, loc)}
                                            onCancel={() => setCreatingFieldForUnit(null)}
                                            saving={saving}
                                        />
                                    </div>
                                )}

                                {/* Botón agregar campo */}
                                {canEdit && creatingFieldForUnit !== unit.id && (
                                    <button
                                        onClick={() => { setCreatingFieldForUnit(unit.id); setCreatingUnit(false); }}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-black text-primary/60 hover:text-primary hover:bg-primary/5 transition-all uppercase tracking-widest"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Agregar campo a {unit.name}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
