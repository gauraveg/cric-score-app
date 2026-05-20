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
  const [isNewPlayerCaptain, setIsNewPlayerCaptain] = useState(false);

  const handleAddPlayerClick = (teamIndex: number) => {
    setAddingPlayerTeamIdx(teamIndex);
    setNewPlayerName('');
    setIsNewPlayerCaptain(false);
  };

  const confirmAddPlayer = () => {
    if (addingPlayerTeamIdx === null || !newPlayerName.trim()) return;
    
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: newPlayerName.trim()
    };

    const newTeams = [...teams];
    const team = newTeams[addingPlayerTeamIdx];
    team.players.push(newPlayer);
    
    if (isNewPlayerCaptain) {
      team.captainId = newPlayer.id;
      team.name = `${newPlayer.name}'s team`;
    }
    
    setTeams(newTeams);
    
    setAddingPlayerTeamIdx(null);
    setNewPlayerName('');
    setIsNewPlayerCaptain(false);
  };

  const cancelAddPlayer = () => {
    setAddingPlayerTeamIdx(null);
    setNewPlayerName('');
    setIsNewPlayerCaptain(false);
  };

  const makeCaptain = (teamIndex: number, playerId: string, playerName: string) => {
    const newTeams = [...teams];
    newTeams[teamIndex].captainId = playerId;
    newTeams[teamIndex].name = `${playerName}'s team`;
    setTeams(newTeams);
  };

  const removePlayer = (teamIndex: number, playerId: string) => {
    const newTeams = [...teams];
    const team = newTeams[teamIndex];
    team.players = team.players.filter(p => p.id !== playerId);
    if (team.captainId === playerId) {
      team.captainId = undefined;
    }
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
              {team.players.map(player => {
                const isCaptain = team.captainId === player.id;
                return (
                  <li key={player.id} className="flex items-center bg-transparent border border-white/10 p-2.5 rounded-lg px-4 gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm font-medium truncate block">
                        {player.name} {isCaptain && <span className="text-[10px] text-neutral-400 font-normal ml-1">(C)</span>}
                      </span>
                    </div>
                    
                    {!isCaptain && (
                      <button 
                        onClick={() => makeCaptain(idx, player.id, player.name)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[10px] text-white font-bold transition-colors whitespace-nowrap"
                      >
                        Set Captain
                      </button>
                    )}
                    
                    {isCaptain && (
                      <div className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-[10px] text-white font-bold whitespace-nowrap">
                        Captain
                      </div>
                    )}

                    <button 
                      onClick={() => removePlayer(idx, player.id)} 
                      className="text-red-500 hover:text-red-400 p-2 font-bold ml-1"
                      title="Remove Player"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
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
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 outline-none focus:border-white text-white mb-4 transition-colors"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmAddPlayer()}
            />
            <label className="flex items-center gap-3 mb-6 cursor-pointer group">
              <input 
                type="checkbox"
                className="w-5 h-5 rounded border-white/10 bg-[#1a1a1a] checked:bg-white transition-all cursor-pointer"
                checked={isNewPlayerCaptain}
                onChange={(e) => setIsNewPlayerCaptain(e.target.checked)}
              />
              <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">Make this player captain</span>
            </label>
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
