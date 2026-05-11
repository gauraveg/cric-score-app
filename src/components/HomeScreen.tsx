import React from 'react';
import { Link } from 'react-router-dom';
import type { MatchState } from '../types';

interface HomeScreenProps {
  matches: Record<string, MatchState>;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ matches }) => {
  const matchList = Object.values(matches).sort((a, b) => {
    return b.id.localeCompare(a.id);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-white">Matches</h2>
        <div className="flex gap-3">
          <Link 
            to="/toss" 
            state={{ isStandalone: true }}
            className="px-4 py-3 bg-transparent border border-white/20 hover:bg-white/5 text-white rounded-xl text-sm font-bold transition-all"
          >
            Coin Flip
          </Link>
          <Link 
            to="/setup" 
            className="px-4 py-3 bg-white hover:bg-neutral-200 text-black rounded-xl text-sm font-bold transition-all shadow-[0_4px_12px_rgba(255,255,255,0.1)]"
          >
            New Match
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {matchList.length === 0 ? (
          <div className="bg-[#171717] border border-white/10 rounded-2xl p-12 text-center">
            <p className="text-neutral-500 mb-4">No matches found</p>
            <Link to="/setup" className="text-white font-bold hover:underline">Create your first match</Link>
          </div>
        ) : (
          matchList.map((match) => (
            <div 
              key={match.id} 
              className="bg-[#171717] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors flex flex-col gap-3 cursor-pointer"
              onClick={() => window.location.href = `/match/${match.id}`}
            >
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white">
                      {match.teams[0]?.name} vs {match.teams[1]?.name}
                    </h3>
                  </div>
                  <div className="flex items-center mt-1 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      match.matchWinner ? 'bg-red-500/20 text-red-500' : 'bg-[#166534] text-[#4ade80]'
                    }`}>
                      {match.matchWinner ? 'ENDED' : 'IN PROGRESS'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {match.maxOvers} Overs | Innings {match.currentInnings}
                  </p>
                  {match.matchWinner && (
                    <p className="text-xs text-neutral-300 font-medium mt-1">{match.matchWinner}</p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-2xl font-bold text-white">
                    {match.totalRuns} / {match.wickets}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-normal uppercase">
                    {Math.floor(match.totalBalls / 6)}.{match.totalBalls % 6} OVERS
                  </p>
                </div>
              </div>
              <div className="flex justify-end w-full mt-1">
                <Link 
                  to={`/scorecard/${match.id}`}
                  onClick={(e) => e.stopPropagation()} // Prevent navigating to /match/:id
                  className="text-[10px] text-white border border-white hover:bg-white/10 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider"
                >
                  SCORECARD
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HomeScreen;
