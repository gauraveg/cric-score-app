import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Team, Player, MatchState } from '../types';

interface SetupScreenProps {
  onCreateMatch?: (match: MatchState) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = () => {
  const navigate = useNavigate();
  const [lastTeams, setLastTeams] = useLocalStorage<Team[]>('last_teams', [
    { id: '1', name: 'Team 1', players: [] },
    { id: '2', name: 'Team 2', players: [] }
  ]);
  const [teams, setTeams] = useState<Team[]>(lastTeams);
  const [maxOvers, setMaxOvers] = useState(5);
  const [addingPlayerTeamIdx, setAddingPlayerTeamIdx] = useState<number | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayerClick = (teamIndex: number) => {
    setAddingPlayerTeamIdx(teamIndex);
    setNewPlayerName('');
  };

  const confirmAddPlayer = () => {
    if (addingPlayerTeamIdx === null || !newPlayerName.trim()) return;
    
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: newPlayerName.trim()
    };

    const newTeams = [...teams];
    newTeams[addingPlayerTeamIdx].players.push(newPlayer);
    setTeams(newTeams);
    
    setAddingPlayerTeamIdx(null);
    setNewPlayerName('');
  };

  const cancelAddPlayer = () => {
    setAddingPlayerTeamIdx(null);
    setNewPlayerName('');
  };

  const removePlayer = (teamIndex: number, playerId: string) => {
    const newTeams = [...teams];
    newTeams[teamIndex].players = newTeams[teamIndex].players.filter(p => p.id !== playerId);
    setTeams(newTeams);
  };

  const handleStart = () => {
    if (teams[0].players.length < 2 || teams[1].players.length < 1) {
      alert('Each team needs at least 2 players.');
      return;
    }

    setLastTeams(teams);
    navigate('/toss', { state: { teams, maxOvers } });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 px-4 max-w-md mx-auto">
      <div className="grid grid-cols-1 gap-6">
        {teams.map((team, idx) => (
          <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <input 
              className="bg-transparent text-xl font-bold mb-4 w-full outline-none border-b border-transparent focus:border-blue-500"
              value={team.name}
              onChange={(e) => {
                const newTeams = [...teams];
                newTeams[idx].name = e.target.value;
                setTeams(newTeams);
              }}
            />
            <ul className="space-y-2 mb-4">
              {team.players.map(player => (
                <li key={player.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded px-3">
                  <span>{player.name}</span>
                  <button onClick={() => removePlayer(idx, player.id)} className="text-red-400 hover:text-red-300 p-2">×</button>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleAddPlayerClick(idx)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors"
            >
              + Add Player
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold">Match Settings</h2>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Number of Overs</label>
          <input 
            type="number"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500"
            value={maxOvers}
            onChange={(e) => setMaxOvers(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <button 
          onClick={handleStart}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-500/20"
        >
          Proceed to Toss
        </button>
      </div>

      {addingPlayerTeamIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 text-white">Add Player to {teams[addingPlayerTeamIdx].name}</h3>
            <input 
              autoFocus
              type="text"
              placeholder="Player Name"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500 mb-6"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmAddPlayer()}
            />
            <div className="flex gap-3">
              <button 
                onClick={cancelAddPlayer}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAddPlayer}
                disabled={!newPlayerName.trim()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupScreen;
