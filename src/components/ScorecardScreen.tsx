import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { MatchState } from '../types';

interface ScorecardScreenProps {
  matches: Record<string, MatchState>;
}

const ScorecardScreen: React.FC<ScorecardScreenProps> = ({ matches }) => {
  const { id } = useParams<{ id: string }>();
  const match = id ? matches[id] : null;
  const [activeTab, setActiveTab] = useState<1 | 2>(1);

  if (!match) {
    return <div className="text-center p-12 text-slate-400">Match not found.</div>;
  }

  // Determine data based on selected innings
  const inningsData = activeTab === 1 && match.firstInnings ? match.firstInnings : match;
  const hasSecondInnings = match.currentInnings === 2 || match.firstInnings;

  const battingTeam = match.teams.find(t => t.id === inningsData.battingTeamId)!;
  const bowlingTeam = match.teams.find(t => t.id === inningsData.bowlingTeamId)!;

  const formatOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;
  const calculateCRR = (runs: number, balls: number) => {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 6).toFixed(2);
  };

  const getBatsmen = () => battingTeam.players.filter(p => {
    const s = match.stats[p.id];
    const isCurrentInnings = activeTab === match.currentInnings;
    return s?.ballsFaced > 0 || (isCurrentInnings && (p.id === match.strikerId || p.id === match.nonStrikerId));
  });

  const getBowlers = () => bowlingTeam.players.filter(p => {
    const s = match.stats[p.id];
    return s && (s.ballsBowled > 0 || (s.widesBowled || 0) > 0 || (s.noBallsBowled || 0) > 0);
  });
  
  const getDidNotBat = () => battingTeam.players.filter(p => !getBatsmen().includes(p));

  const totalExtras = inningsData.extras.wides + inningsData.extras.noBalls + inningsData.extras.byes + inningsData.extras.legByes;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex gap-4 border-b border-slate-800 pb-4">
        <button 
          className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          onClick={() => setActiveTab(1)}
        >
          {match.teams.find(t => t.id === (match.firstInnings ? match.firstInnings.battingTeamId : match.battingTeamId))?.name} (1st Inn)
        </button>
        {hasSecondInnings && (
          <button 
            className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            onClick={() => setActiveTab(2)}
          >
            {match.teams.find(t => t.id === match.battingTeamId)?.name} (2nd Inn)
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-emerald-700/20 text-emerald-400 px-4 py-3 flex justify-between font-bold">
          <span>{battingTeam.name}</span>
          <span>{inningsData.totalRuns}-{inningsData.wickets} ({formatOvers(inningsData.totalBalls)} Ov)</span>
        </div>

        {/* Batting Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Batter</th>
                <th className="px-4 py-3 font-medium"></th>
                <th className="px-4 py-3 text-right font-medium">R</th>
                <th className="px-4 py-3 text-right font-medium">B</th>
                <th className="px-4 py-3 text-right font-medium">4s</th>
                <th className="px-4 py-3 text-right font-medium">6s</th>
                <th className="px-4 py-3 text-right font-medium">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {getBatsmen().map(p => {
                const s = match.stats[p.id] || { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false, dismissalText: '' };
                const sr = s.ballsFaced > 0 ? ((s.runs / s.ballsFaced) * 100).toFixed(2) : '0.00';
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-4 font-bold text-blue-400">{p.name}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{s.isOut ? s.dismissalText : 'not out'}</td>
                    <td className="px-4 py-4 text-right font-bold">{s.runs}</td>
                    <td className="px-4 py-4 text-right text-slate-300">{s.ballsFaced}</td>
                    <td className="px-4 py-4 text-right text-slate-400">{s.fours}</td>
                    <td className="px-4 py-4 text-right text-slate-400">{s.sixes}</td>
                    <td className="px-4 py-4 text-right text-slate-400">{sr}</td>
                  </tr>
                );
              })}
              
              {/* Extras Row */}
              <tr className="bg-slate-800/20">
                <td className="px-4 py-4 font-bold">Extras</td>
                <td colSpan={6} className="px-4 py-4 text-right font-bold">
                  {totalExtras} <span className="text-slate-400 font-normal text-sm">(b {inningsData.extras.byes}, lb {inningsData.extras.legByes}, w {inningsData.extras.wides}, nb {inningsData.extras.noBalls})</span>
                </td>
              </tr>
              
              {/* Total Row */}
              <tr className="bg-slate-800/50">
                <td className="px-4 py-4 font-bold">Total</td>
                <td colSpan={6} className="px-4 py-4 text-right font-bold">
                  {inningsData.totalRuns} <span className="text-slate-400 font-normal text-sm">({inningsData.wickets} wkts, {formatOvers(inningsData.totalBalls)} Ov, RR: {calculateCRR(inningsData.totalRuns, inningsData.totalBalls)})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Did Not Bat */}
        {getDidNotBat().length > 0 && (
          <div className="px-4 py-4 border-t border-slate-800 flex gap-4 items-center">
            <span className="font-bold text-sm">Did not Bat</span>
            <span className="text-sm text-blue-400">{getDidNotBat().map(p => p.name).join(', ')}</span>
          </div>
        )}

        {/* Bowling Table */}
        <div className="overflow-x-auto border-t-4 border-slate-950">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Bowler</th>
                <th className="px-4 py-3 text-right font-medium">O</th>
                <th className="px-4 py-3 text-right font-medium">M</th>
                <th className="px-4 py-3 text-right font-medium">R</th>
                <th className="px-4 py-3 text-right font-medium">W</th>
                <th className="px-4 py-3 text-right font-medium">NB</th>
                <th className="px-4 py-3 text-right font-medium">WD</th>
                <th className="px-4 py-3 text-right font-medium">ECO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {getBowlers().map(p => {
                const b = match.stats[p.id];
                const eco = b.ballsBowled > 0 ? ((b.runsConceded / b.ballsBowled) * 6).toFixed(2) : '0.00';
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-4 font-bold text-blue-400">{p.name}</td>
                    <td className="px-4 py-4 text-right text-slate-300">{formatOvers(b.ballsBowled)}</td>
                    <td className="px-4 py-4 text-right text-slate-400">{b.maidens}</td>
                    <td className="px-4 py-4 text-right text-slate-300">{b.runsConceded}</td>
                    <td className="px-4 py-4 text-right font-bold text-white">{b.wickets}</td>
                    <td className="px-4 py-4 text-right text-slate-400">{b.noBallsBowled || 0}</td>
                    <td className="px-4 py-4 text-right text-slate-400">{b.widesBowled || 0}</td>
                    <td className="px-4 py-4 text-right text-slate-400">{eco}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <Link 
        to={`/match/${match.id}`}
        className="block w-full py-4 text-center bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all mt-6"
      >
        Back to Dashboard
      </Link>
    </div>
  );
};

export default ScorecardScreen;