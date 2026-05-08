import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MatchState, PlayerStats, Team } from '../types';

interface TossScreenProps {
  onCreateMatch: (match: MatchState) => void;
}

const TossScreen: React.FC<TossScreenProps> = ({ onCreateMatch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { teams: Team[]; maxOvers: number } | null;

  const [tossState, setTossState] = useState<'pending' | 'flipping' | 'result' | 'lineup'>('pending');
  const [tossWinnerId, setTossWinnerId] = useState<string | null>(null);
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null);

  // Lineup state
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [currentBowlerId, setCurrentBowlerId] = useState('');

  if (!state || !state.teams) {
    navigate('/setup');
    return null;
  }

  const { teams, maxOvers } = state;
  const team1 = teams[0];
  const team2 = teams[1];

  const handleFlip = () => {
    setTossState('flipping');
    
    // Randomize winner
    setTimeout(() => {
      const winner = Math.random() > 0.5 ? team1 : team2;
      setTossWinnerId(winner.id);
      setTossState('result');
    }, 3000); // 3 second animation
  };

  const handleDecision = (decision: 'bat' | 'bowl') => {
    setTossDecision(decision);
    setTossState('lineup');
  };

  const handleStartMatch = () => {
    if (!strikerId || !nonStrikerId || !currentBowlerId) {
      alert('Please select opening batters and bowler.');
      return;
    }
    if (strikerId === nonStrikerId) {
      alert('Striker and Non-Striker must be different players.');
      return;
    }

    const battingTeamId = tossDecision === 'bat' 
      ? tossWinnerId 
      : teams.find(t => t.id !== tossWinnerId)?.id;
      
    const bowlingTeamId = teams.find(t => t.id !== battingTeamId)?.id;

    if (!battingTeamId || !bowlingTeamId) return;

    const stats: Record<string, PlayerStats> = {};
    teams.forEach(team => {
      team.players.forEach(player => {
        stats[player.id] = {
          runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
          ballsBowled: 0, maidens: 0, runsConceded: 0, wickets: 0,
          isOut: false, dismissalText: '', widesBowled: 0, noBallsBowled: 0
        };
      });
    });

    const newMatch: MatchState = {
      id: crypto.randomUUID(),
      teams,
      battingTeamId,
      bowlingTeamId,
      strikerId,
      nonStrikerId,
      currentBowlerId,
      totalBalls: 0,
      totalRuns: 0,
      wickets: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
      ballLog: [],
      stats,
      isMatchStarted: true,
      maxOvers,
      currentInnings: 1,
    };

    onCreateMatch(newMatch);
    navigate(`/match/${newMatch.id}`);
  };

  const battingTeam = teams.find(t => t.id === (tossDecision === 'bat' ? tossWinnerId : teams.find(x => x.id !== tossWinnerId)?.id));
  const bowlingTeam = teams.find(t => t.id !== battingTeam?.id);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 max-w-md mx-auto animate-in fade-in duration-500">
      <h2 className="text-3xl font-black mb-12 text-center">Match Toss</h2>

      {tossState === 'pending' || tossState === 'flipping' ? (
        <div className="flex flex-col items-center w-full">
          <div className="flex justify-between items-center w-full mb-16 px-4">
            <div className="text-xl font-bold text-blue-400 text-center flex-1">{team1.name}</div>
            <div className="text-slate-500 font-black px-4">VS</div>
            <div className="text-xl font-bold text-blue-400 text-center flex-1">{team2.name}</div>
          </div>

          <div className="relative w-40 h-40 mb-16 perspective-1000">
            <div className={`w-full h-full rounded-full transform-style-3d ${tossState === 'flipping' ? (tossWinnerId === team1.id ? 'animate-flip-heads' : 'animate-flip-tails') : ''}`}>
              {/* Heads side */}
              <div className="absolute w-full h-full bg-yellow-500 rounded-full flex items-center justify-center border-8 border-yellow-600 backface-hidden shadow-2xl">
                <span className="text-yellow-900 font-black text-2xl">COIN</span>
              </div>
              {/* Tails side */}
              <div className="absolute w-full h-full bg-yellow-500 rounded-full flex items-center justify-center border-8 border-yellow-600 backface-hidden shadow-2xl rotate-y-180">
                <span className="text-yellow-900 font-black text-2xl">COIN</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleFlip}
            disabled={tossState === 'flipping'}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all"
          >
            {tossState === 'flipping' ? 'Flipping...' : 'Flip Coin'}
          </button>
        </div>
      ) : tossState === 'result' ? (
        <div className="flex flex-col items-center w-full space-y-8 animate-in zoom-in-95">
          <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center border-8 border-green-600 shadow-2xl mb-4">
            <span className="text-green-900 font-black text-6xl">✓</span>
          </div>
          
          <h3 className="text-3xl font-black text-center">
            <span className="text-green-400">{teams.find(t => t.id === tossWinnerId)?.name}</span> won the toss!
          </h3>
          
          <div className="w-full space-y-4">
            <p className="text-center text-slate-400 font-bold mb-2">What will they do first?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => handleDecision('bat')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-600 hover:border-blue-500 rounded-xl font-black text-xl transition-all"
              >
                BAT
              </button>
              <button 
                onClick={() => handleDecision('bowl')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-600 hover:border-blue-500 rounded-xl font-black text-xl transition-all"
              >
                BOWL
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-in slide-in-from-bottom-4">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-blue-400">{battingTeam?.name} will Bat First</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Opening Striker</label>
              <select 
                className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 outline-none focus:border-blue-500"
                value={strikerId}
                onChange={(e) => setStrikerId(e.target.value)}
              >
                <option value="">Select Striker</option>
                {battingTeam?.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Opening Non-Striker</label>
              <select 
                className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 outline-none focus:border-blue-500"
                value={nonStrikerId}
                onChange={(e) => setNonStrikerId(e.target.value)}
              >
                <option value="">Select Non-Striker</option>
                {battingTeam?.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Opening Bowler</label>
              <select 
                className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 outline-none focus:border-blue-500"
                value={currentBowlerId}
                onChange={(e) => setCurrentBowlerId(e.target.value)}
              >
                <option value="">Select Bowler</option>
                {bowlingTeam?.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <button 
            onClick={handleStartMatch}
            disabled={!strikerId || !nonStrikerId || !currentBowlerId || strikerId === nonStrikerId}
            className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/20 transition-all mt-4"
          >
            Start Match!
          </button>
        </div>
      )}
    </div>
  );
};

export default TossScreen;