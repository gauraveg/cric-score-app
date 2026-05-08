import React from 'react';
import { Link } from 'react-router-dom';
import type { MatchState } from '../types';

interface HomeScreenProps {
  matches: Record<string, MatchState>;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ matches }) => {
  const matchList = Object.values(matches).sort((a, b) => {
    // Basic sorting, maybe by ID or creation time if we had it
    return b.id.localeCompare(a.id);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Matches</h2>
        <Link 
          to="/setup" 
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          New Match
        </Link>
      </div>

      <div className="grid gap-4">
        {matchList.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <p className="text-slate-500 mb-4">No matches found</p>
            <Link to="/setup" className="text-blue-500 font-bold hover:underline">Create your first match</Link>
          </div>
        ) : (
          matchList.map((match) => (
            <Link 
              key={match.id} 
              to={`/match/${match.id}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-lg">
                    {match.teams[0]?.name} vs {match.teams[1]?.name}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    match.matchWinner ? 'bg-slate-800 text-slate-400' : 'bg-green-900/30 text-green-400'
                  }`}>
                    {match.matchWinner ? 'Finished' : 'In Progress'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {match.maxOvers} Overs | Innings {match.currentInnings}
                </p>
                {match.matchWinner && (
                  <p className="text-xs text-blue-400 font-medium mt-2">{match.matchWinner}</p>
                )}
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div>
                  <p className="text-2xl font-black text-slate-300">
                    {match.totalRuns} / {match.wickets}
                  </p>
                  <p className="text-xs text-slate-500 font-bold uppercase">
                    {Math.floor(match.totalBalls / 6)}.{match.totalBalls % 6} Overs
                  </p>
                </div>
                <Link 
                  to={`/scorecard/${match.id}`}
                  onClick={(e) => e.stopPropagation()} // Prevent navigating to /match/:id
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider"
                >
                  Scorecard
                </Link>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default HomeScreen;
