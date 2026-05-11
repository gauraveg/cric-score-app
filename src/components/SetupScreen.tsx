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
          <div key={team.id} className="bg-transparent border border-white/10 rounded-2xl p-5">
            <input 
              className="bg-transparent text-xl font-bold mb-4 w-full outline-none border-b border-transparent focus:border-white text-white transition-colors"
              value={team.name}
              onChange={(e) => {
                const newTeams = [...teams];
                newTeams[idx].name = e.target.value;
                setTeams(newTeams);
              }}
            />
            <ul className="space-y-2 mb-4">
              {team.players.map(player => (
                <li key={player.id} className="flex justify-between items-center bg-transparent border border-white/10 p-2.5 rounded-lg px-4">
                  <span className="text-white text-sm">{player.name}</span>
                  <button onClick={() => removePlayer(idx, player.id)} className="text-red-500 hover:text-red-400 p-1 font-bold">✕</button>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleAddPlayerClick(idx)}
              className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black rounded-lg text-sm font-bold transition-colors"
            >
              + Add Player
            </button>
          </div>
        ))}
      </div>

      <div className="bg-transparent border border-white/10 rounded-2xl p-5 space-y-6">
        <h2 className="text-xl font-bold text-white">Match Settings</h2>
        
        <div>
          <label className="block text-xs font-normal text-neutral-400 mb-2">Number of Overs</label>
          <input 
            type="number"
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 outline-none focus:border-white text-white text-base transition-colors"
            value={maxOvers}
            onChange={(e) => setMaxOvers(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <button 
          onClick={handleStart}
          className="w-full py-4 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold text-base transition-colors"
        >
          Proceed to Toss
        </button>
      </div>

      {addingPlayerTeamIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#171717] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 text-white">Add Player to {teams[addingPlayerTeamIdx].name}</h3>
            <input 
              autoFocus
              type="text"
              placeholder="Player Name"
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 outline-none focus:border-white text-white mb-6 transition-colors"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmAddPlayer()}
            />
            <div className="flex gap-3">
              <button 
                onClick={cancelAddPlayer}
                className="flex-1 py-3 bg-transparent border border-white/10 hover:bg-white/5 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAddPlayer}
                disabled={!newPlayerName.trim()}
                className="flex-1 py-3 bg-white hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-bold transition-all"
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
