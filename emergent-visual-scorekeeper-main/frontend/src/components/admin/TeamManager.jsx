import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Users, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

export const TeamManager = ({ 
  isOpen, 
  onClose, 
  teams, 
  onUpdateTeam, 
  currentLineup,
  onUpdateLineup,
  activeTeam 
}) => {
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editName, setEditName] = useState('');

  const positions = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
  const battingOrder = Array.from({ length: 9 }, (_, i) => i + 1);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    
    const newPlayer = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      position: '',
      battingOrder: null,
      stats: { avg: '.000', hits: 0, rbi: 0, so: 0, ab: 0 }
    };
    
    const updatedLineup = [...(currentLineup || []), newPlayer];
    onUpdateLineup(updatedLineup);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (playerId) => {
    const updatedLineup = currentLineup.filter(p => p.id !== playerId);
    onUpdateLineup(updatedLineup);
  };

  const handleUpdatePlayer = (playerId, field, value) => {
    const updatedLineup = currentLineup.map(p => 
      p.id === playerId ? { ...p, [field]: value } : p
    );
    onUpdateLineup(updatedLineup);
  };

  const handleSaveEdit = (playerId) => {
    if (editName.trim()) {
      handleUpdatePlayer(playerId, 'name', editName.trim());
    }
    setEditingPlayer(null);
    setEditName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white" aria-describedby="team-manager-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Users className="w-5 h-5" />
            Gestión de Alineación - {activeTeam?.name || 'Equipo'}
          </DialogTitle>
        </DialogHeader>
        <p id="team-manager-description" className="sr-only">
          Gestiona la alineación del equipo, agrega o elimina jugadores
        </p>

        <div className="space-y-4">
          {/* Add Player */}
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del jugador"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
              data-testid="new-player-input"
            />
            <Button 
              onClick={handleAddPlayer}
              className="bg-blue-600 hover:bg-blue-500"
              data-testid="add-player-btn"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>

          {/* Player List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {(!currentLineup || currentLineup.length === 0) ? (
                <div className="text-center text-slate-500 py-8">
                  No hay jugadores en la alineación
                </div>
              ) : (
                currentLineup.map((player, index) => (
                  <div 
                    key={player.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    data-testid={`lineup-player-${index}`}
                  >
                    {/* Batting Order */}
                    <select
                      value={player.battingOrder || ''}
                      onChange={(e) => handleUpdatePlayer(player.id, 'battingOrder', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-14 bg-slate-700 border-slate-600 rounded px-2 py-1 text-sm text-white"
                      data-testid={`batting-order-${index}`}
                    >
                      <option value="">-</option>
                      {battingOrder.map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>

                    {/* Player Name */}
                    {editingPlayer === player.id ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white text-sm"
                          autoFocus
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(player.id)}
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveEdit(player.id)}
                          className="bg-green-600 hover:bg-green-500"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setEditingPlayer(null); setEditName(''); }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="flex-1 font-medium">{player.name}</span>
                    )}

                    {/* Position */}
                    <select
                      value={player.position || ''}
                      onChange={(e) => handleUpdatePlayer(player.id, 'position', e.target.value)}
                      className="w-16 bg-slate-700 border-slate-600 rounded px-2 py-1 text-sm text-white"
                      data-testid={`position-select-${index}`}
                    >
                      <option value="">Pos</option>
                      {positions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>

                    {/* Actions */}
                    {editingPlayer !== player.id && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingPlayer(player.id); setEditName(player.name); }}
                          className="text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemovePlayer(player.id)}
                          className="text-red-400 hover:text-red-300"
                          data-testid={`remove-player-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm text-slate-400">
            <span>Jugadores: {currentLineup?.length || 0}</span>
            <span>Con posición: {currentLineup?.filter(p => p.position).length || 0}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamManager;
