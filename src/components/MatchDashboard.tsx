import React, { useState } from 'react';
import type { MatchState, Ball, Player } from '../types';

interface MatchDashboardProps {
  matchState: MatchState;
  setMatchState: (state: MatchState | ((prev: MatchState) => MatchState)) => void;
}

type PendingAction = {
  type: 'selectBatter' | 'selectBowler' | 'nextOver' | 'inningsTransition' | 'noBallRuns' | 'retireConfirmation' | 'runOut' | 'editTeams' | 'editOvers';
  step?: 'confirm' | 'select' | 'team1' | 'team2';
  message: string;
  replaceTarget?: 'strikerId' | 'nonStrikerId';
  isAutoTriggered?: boolean;
  batterId?: string;
} | null;

const MatchDashboard: React.FC<MatchDashboardProps> = ({ matchState, setMatchState }) => {
  const {
    teams,
    battingTeamId,
    bowlingTeamId,
    strikerId,
    nonStrikerId,
    currentBowlerId,
    totalBalls,
    totalRuns,
    wickets,
    extras,
    ballLog,
    stats,
    maxOvers,
    currentInnings,
    targetScore,
    matchWinner
  } = matchState;

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const battingTeam = teams.find(t => t.id === battingTeamId)!;
  const bowlingTeam = teams.find(t => t.id === bowlingTeamId)!;
  const striker = battingTeam.players.find(p => p.id === strikerId);
  const nonStriker = battingTeam.players.find(p => p.id === nonStrikerId);
  const bowler = bowlingTeam.players.find(p => p.id === currentBowlerId);

  const formatOvers = (balls: number) => {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  };

  const calculateCRR = () => {
    if (totalBalls === 0) return '0.00';
    return ((totalRuns / totalBalls) * 6).toFixed(2);
  };

  const calculateRRR = () => {
    if (!targetScore) return '0.00';
    const runsNeeded = targetScore - totalRuns;
    const ballsRemaining = (maxOvers * 6) - totalBalls;
    if (ballsRemaining <= 0) return runsNeeded > 0 ? '0.00' : '0.00';
    return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
  };

  const updateMatch = (ballType: Ball['type'], runs: number, extraRuns: number = 0, isWicket: boolean = false, ignorePending = false) => {
    if (matchWinner || (!ignorePending && pendingAction)) return;

    let nextPending: PendingAction = null;

    setMatchState(prev => {
      const newState = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { undoHistory, ...stateWithoutHistory } = prev;
      newState.undoHistory = [...(prev.undoHistory || []), stateWithoutHistory].slice(-20);

      const newStats = { ...prev.stats };
      
      const isLegal = ballType === 'legal' || ballType === 'wicket';
      const totalBallRuns = runs + extraRuns;

      newState.totalRuns += totalBallRuns;
      if (ballType === 'wide') newState.extras.wides += extraRuns;
      if (ballType === 'noball') newState.extras.noBalls += extraRuns;
      
      if (isLegal) {
        newState.totalBalls += 1;
      }

      if (isLegal || ballType === 'noball') {
        const strikerStats = { ...newStats[prev.strikerId] };
        strikerStats.runs += runs;
        if (isLegal) strikerStats.ballsFaced += 1;
        if (runs === 4) strikerStats.fours += 1;
        if (runs === 6) strikerStats.sixes += 1;
        newStats[prev.strikerId] = strikerStats;
      }

      const bowlerStats = { ...newStats[prev.currentBowlerId] };
      bowlerStats.runsConceded += totalBallRuns;
      if (isLegal) bowlerStats.ballsBowled += 1;
      if (ballType === 'wide') bowlerStats.widesBowled = (bowlerStats.widesBowled || 0) + extraRuns;
      if (ballType === 'noball') bowlerStats.noBallsBowled = (bowlerStats.noBallsBowled || 0) + 1;
      if (isWicket) {
        bowlerStats.wickets += 1;
        newState.wickets += 1;
        const strikerStats = { ...newStats[prev.strikerId] };
        strikerStats.isOut = true;
        strikerStats.dismissalText = `b ${bowlingTeam.players.find(p => p.id === prev.currentBowlerId)?.name}`;
        newStats[prev.strikerId] = strikerStats;
      }
      newStats[prev.currentBowlerId] = bowlerStats;

      newState.stats = newStats;

      const newBall: Ball = {
        type: ballType,
        runs,
        extras: extraRuns,
        strikerId: prev.strikerId,
        bowlerId: prev.currentBowlerId,
        isWicket,
        isEndOfOver: isLegal && newState.totalBalls % 6 === 0 && newState.totalBalls > 0
      };
      newState.ballLog = [newBall, ...prev.ballLog];

      if (runs % 2 !== 0 && newState.nonStrikerId) {
        const temp = newState.strikerId;
        newState.strikerId = newState.nonStrikerId;
        newState.nonStrikerId = temp;
      }

      const isAllOut = newState.wickets >= battingTeam.players.length;
      const isOversFinished = newState.totalBalls >= maxOvers * 6;
      
      const isTargetReached = newState.currentInnings === 2 && newState.totalRuns >= targetScore!;

      if (isWicket && !isAllOut) {
        const remainingPlayers = battingTeam.players.filter(p => 
          p.id !== newState.strikerId && 
          p.id !== newState.nonStrikerId &&
          !newState.ballLog.some(b => b.isWicket && b.strikerId === p.id)
        );

        if (remainingPlayers.length === 0) {
          // Last man batting alone
          newState.strikerId = newState.nonStrikerId;
          newState.nonStrikerId = '';
        } else {
          nextPending = { type: 'selectBatter', message: 'Wicket! Select next batter', isAutoTriggered: true };
        }
      }

      if (newState.currentInnings === 1 && (isAllOut || isOversFinished)) {
        nextPending = { type: 'inningsTransition', message: 'End of 1st Innings', isAutoTriggered: true };
      } else if (newState.currentInnings === 2 && (isAllOut || isOversFinished || isTargetReached)) {
        // Auto-end match
        const runsToWin = targetScore!;
        if (newState.totalRuns >= runsToWin) {
          newState.matchWinner = `${battingTeam.name} won by ${battingTeam.players.length - newState.wickets} wickets!`;
        } else if (newState.totalRuns === runsToWin - 1) {
          newState.matchWinner = "Match Tied!";
        } else {
          newState.matchWinner = `${bowlingTeam.name} won by ${runsToWin - 1 - newState.totalRuns} runs!`;
        }
      } else if (isLegal && newState.totalBalls % 6 === 0 && !isOversFinished && !isAllOut && !isTargetReached && !nextPending) {
        nextPending = { type: 'nextOver', step: 'confirm', message: 'Over Complete', isAutoTriggered: true };
      }

      return newState;
    });

    if (nextPending) {
      setPendingAction(nextPending);
    }
  };

  const selectNextBatter = (playerId: string) => {
    setMatchState(prev => ({ 
      ...prev, 
      [pendingAction?.replaceTarget || 'strikerId']: playerId 
    }));
    setPendingAction(null);
  };

  const handleUndo = () => {
    if (!matchState.undoHistory || matchState.undoHistory.length === 0) return;
    setMatchState(prev => {
      if (!prev.undoHistory || prev.undoHistory.length === 0) return prev;
      const newHistory = [...prev.undoHistory];
      const prevState = newHistory.pop()!;
      return { ...prevState, undoHistory: newHistory };
    });
  };

  const manualSwapStrike = () => {
    if (matchWinner || pendingAction || !nonStrikerId) return;
    setMatchState(prev => {
      const newState = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { undoHistory, ...stateWithoutHistory } = prev;
      newState.undoHistory = [...(prev.undoHistory || []), stateWithoutHistory].slice(-20);

      const temp = newState.strikerId;
      newState.strikerId = newState.nonStrikerId;
      newState.nonStrikerId = temp;
      return newState;
    });
  };

  const changeBatter = (playerId: string) => {
    setPendingAction({
      type: 'selectBatter',
      message: 'Change Batter',
      replaceTarget: playerId === strikerId ? 'strikerId' : 'nonStrikerId',
      isAutoTriggered: false
    });
  };

  const retireBatter = (playerId: string) => {    setPendingAction({
      type: 'retireConfirmation',
      message: 'Retire Batter?',
      batterId: playerId,
      isAutoTriggered: false
    });
  };

  const confirmRetire = (playerId: string) => {
    let nextPending: PendingAction = null;

    setMatchState(prev => {
      const newState = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { undoHistory, ...stateWithoutHistory } = prev;
      newState.undoHistory = [...(prev.undoHistory || []), stateWithoutHistory].slice(-20);

      const newStats = { ...prev.stats };
      const batterStats = newStats[playerId] ? { ...newStats[playerId] } : { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, ballsBowled: 0, maidens: 0, runsConceded: 0, wickets: 0 };
      batterStats.isOut = true;
      batterStats.dismissalText = 'retired';
      newStats[playerId] = batterStats;
      newState.stats = newStats;

      newState.wickets += 1;

      const isAllOut = newState.wickets >= battingTeam.players.length;
      
      if (!isAllOut) {
         nextPending = { 
            type: 'selectBatter', 
            message: 'Batter Retired! Select next batter',
            replaceTarget: playerId === prev.strikerId ? 'strikerId' : 'nonStrikerId',
            isAutoTriggered: true
         };
      } else {
         if (newState.currentInnings === 1) {
            nextPending = { type: 'inningsTransition', message: 'End of 1st Innings', isAutoTriggered: true };
         } else {
            const runsToWin = targetScore!;
            if (newState.totalRuns >= runsToWin) {
              newState.matchWinner = `${battingTeam.name} won by ${battingTeam.players.length - newState.wickets} wickets!`;
            } else if (newState.totalRuns === runsToWin - 1) {
              newState.matchWinner = "Match Tied!";
            } else {
              newState.matchWinner = `${bowlingTeam.name} won by ${runsToWin - 1 - newState.totalRuns} runs!`;
            }
         }
      }

      return newState;
    });

    if (nextPending) {
      setPendingAction(nextPending);
    } else {
      setPendingAction(null);
    }
  };

  const selectNextBowler = (playerId: string) => {
    setMatchState(prev => {
      const newState = { ...prev, currentBowlerId: playerId };
      if (pendingAction?.type === 'nextOver') {
        const temp = newState.strikerId;
        newState.strikerId = newState.nonStrikerId;
        newState.nonStrikerId = temp;
      }
      return newState;
    });
    setPendingAction(null);
  };

  const startNextInnings = () => {
    setMatchState(prev => {
      const newState = { ...prev };
      
      // Save 1st innings data
      newState.firstInnings = {
        totalRuns: prev.totalRuns,
        totalBalls: prev.totalBalls,
        wickets: prev.wickets,
        extras: { ...prev.extras },
        battingTeamId: prev.battingTeamId,
        bowlingTeamId: prev.bowlingTeamId,
        ballLog: [...prev.ballLog]
      };

      newState.currentInnings = 2;
      newState.targetScore = newState.totalRuns + 1;
      
      const tempId = newState.battingTeamId;
      newState.battingTeamId = newState.bowlingTeamId;
      newState.bowlingTeamId = tempId;

      newState.totalRuns = 0;
      newState.totalBalls = 0;
      newState.wickets = 0;
      newState.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
      newState.ballLog = [];
      newState.strikerId = '';
      newState.nonStrikerId = '';
      newState.currentBowlerId = '';

      return newState;
    });
    setPendingAction({ type: 'inningsTransition', step: 'select', message: 'Select 2nd Innings Players', isAutoTriggered: true });
  };

  const finalizeInningsSetup = (sId: string, nsId: string, bId: string) => {
    setMatchState(prev => ({
      ...prev,
      strikerId: sId,
      nonStrikerId: nsId,
      currentBowlerId: bId
    }));
    setPendingAction(null);
  };

  const endMatch = () => {
    if (!window.confirm('Are you sure you want to end the match and declare a winner?')) return;

    let winner = '';
    if (currentInnings === 1) {
      winner = "Match abandoned / No result";
    } else {
      const runsToWin = targetScore!;
      if (totalRuns >= runsToWin) {
        winner = `${battingTeam.name} won by ${battingTeam.players.length - 1 - wickets} wickets!`;
      } else if (totalRuns === runsToWin - 1) {
        winner = "Match Tied!";
      } else {
        winner = `${bowlingTeam.name} won by ${runsToWin - 1 - totalRuns} runs!`;
      }
    }

    setMatchState(prev => ({ ...prev, matchWinner: winner }));
  };

  const getAvailableBatters = () => {
    return battingTeam.players.filter(p => 
      p.id !== strikerId && 
      p.id !== nonStrikerId &&
      !ballLog.some(b => b.isWicket && b.strikerId === p.id)
    );
  };

  const handleClosePendingAction = () => {
    setPendingAction(null);
  };

  const handleRunOutClick = () => {
    setPendingAction({
      type: 'runOut',
      message: 'Run Out! Which batter is out?',
      isAutoTriggered: true
    });
  };

  const processRunOut = (playerId: string) => {
    setMatchState(prev => {
      const newState = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { undoHistory, ...stateWithoutHistory } = prev;
      newState.undoHistory = [...(prev.undoHistory || []), stateWithoutHistory].slice(-20);

      const newStats = { ...prev.stats };
      
      const batterStats = { ...newStats[playerId] };
      batterStats.isOut = true;
      batterStats.dismissalText = 'run out';
      newStats[playerId] = batterStats;

      if (prev.currentBowlerId && newStats[prev.currentBowlerId]) {
        const bowlerStats = { ...newStats[prev.currentBowlerId] };
        bowlerStats.ballsBowled = (bowlerStats.ballsBowled || 0) + 1;
        newStats[prev.currentBowlerId] = bowlerStats;
      }

      newState.stats = newStats;

      newState.wickets += 1;

      const isAllOut = newState.wickets >= battingTeam.players.length;

      const newBall: Ball = {
        type: 'legal',
        runs: 0,
        extras: 0,
        strikerId: prev.strikerId,
        bowlerId: prev.currentBowlerId,
        isWicket: true,
        isEndOfOver: false
      };
      
      newState.totalBalls += 1; 
      newState.ballLog = [newBall, ...prev.ballLog];

      let nextPending: PendingAction = null;
      if (!isAllOut) {
        nextPending = { 
          type: 'selectBatter', 
          message: 'Run Out! Select next batter',
          replaceTarget: playerId === prev.strikerId ? 'strikerId' : 'nonStrikerId',
          isAutoTriggered: true
        };
      } else if (newState.currentInnings === 1) {
        nextPending = { type: 'inningsTransition', message: 'End of 1st Innings', isAutoTriggered: true };
      } else {
        const runsToWin = targetScore!;
        if (newState.totalRuns >= runsToWin) {
          newState.matchWinner = `${battingTeam.name} won!`;
        } else {
          newState.matchWinner = `${bowlingTeam.name} won!`;
        }
      }

      setPendingAction(nextPending);
      return newState;
    });
  };

  const handleEditTeams = () => {
    setPendingAction({
      type: 'editTeams',
      step: 'team1',
      message: 'Edit Teams',
      isAutoTriggered: false
    });
  };

  const handleEditOvers = () => {
    setPendingAction({
      type: 'editOvers',
      message: 'Change Total Overs',
      isAutoTriggered: false
    });
  };

  const updateTeamPlayers = (teamIdx: number, players: Player[]) => {
    setMatchState(prev => {
      const newTeams = [...prev.teams];
      newTeams[teamIdx] = { ...newTeams[teamIdx], players };
      return { ...prev, teams: newTeams };
    });
  };

  // State for Innings Transition Selection
  const [setupStriker, setSetupStriker] = useState('');
  const [setupNonStriker, setSetupNonStriker] = useState('');
  const [setupBowler, setSetupBowler] = useState('');

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12 relative">
      {/* Score Header */}
      <div className={`rounded-2xl p-6 text-white shadow-xl transition-colors duration-500 ${
        matchWinner ? 'bg-slate-800' : 'bg-blue-600 shadow-blue-500/20'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">
              {battingTeam.name} Innings ({currentInnings === 1 ? '1st' : '2nd'})
            </p>
            <h2 className="text-5xl font-black">
              {totalRuns} / {wickets}
            </h2>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div>
              <p className="text-3xl font-bold">{formatOvers(totalBalls)}</p>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Overs / {maxOvers}</p>
            </div>
            {!matchWinner && (
              <div className="flex flex-col gap-1 mt-1">
                <button onClick={handleEditTeams} className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold uppercase tracking-wider w-full">Edit Teams</button>
                <button onClick={handleEditOvers} className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold uppercase tracking-wider w-full">Edit Overs</button>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-blue-400/30">
          <div>
            <p className="text-[10px] text-blue-200 font-bold uppercase">CRR</p>
            <p className="text-xl font-bold">{calculateCRR()}</p>
          </div>
          {currentInnings === 2 && targetScore && (
            <>
              <div>
                <p className="text-[10px] text-blue-200 font-bold uppercase">Target</p>
                <p className="text-xl font-bold">{targetScore}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-200 font-bold uppercase">RRR</p>
                <p className="text-xl font-bold">{calculateRRR()}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-200 font-bold uppercase">Need</p>
                <p className="text-xl font-bold">{targetScore - totalRuns} off {(maxOvers * 6) - totalBalls}</p>
              </div>
            </>
          )}
        </div>

        {matchWinner && (
          <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl text-center">
            <p className="text-yellow-400 font-black text-xl uppercase tracking-widest">{matchWinner}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
          {/* Batting Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-slate-800/50">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Batters</span>
              {!matchWinner && !pendingAction && nonStrikerId && (
                <button onClick={manualSwapStrike} className="text-xs text-blue-400 font-bold hover:text-blue-300">SWAP STRIKE 🔄</button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Batter</th>
                    <th className="px-4 py-3 text-right">R</th>
                    <th className="px-4 py-3 text-right">B</th>
                    <th className="px-4 py-3 text-right">4s</th>
                    <th className="px-4 py-3 text-right">6s</th>
                    <th className="px-4 py-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {[striker, nonStriker].filter(Boolean).map((p, idx) => {
                    const s = stats[p!.id] || { runs: 0, ballsFaced: 0, fours: 0, sixes: 0 };
                    const sr = s.ballsFaced > 0 ? ((s.runs / s.ballsFaced) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={p!.id} className={idx === 0 && !matchWinner && !pendingAction ? 'bg-blue-500/5' : ''}>
                        <td className="px-4 py-4 font-medium flex justify-between items-center">
                          <div>
                            {p!.name} {idx === 0 && !matchWinner && !pendingAction && <span className="text-blue-500 ml-1">*</span>}
                          </div>
                          {!matchWinner && !pendingAction && (
                            <div className="flex gap-2 ml-2">
                              <button onClick={() => changeBatter(p!.id)} className="text-[10px] bg-slate-800 text-slate-400 hover:text-blue-400 px-2 py-1 rounded uppercase font-bold">Change</button>
                              <button onClick={() => retireBatter(p!.id)} className="text-[10px] bg-slate-800 text-slate-400 hover:text-red-400 px-2 py-1 rounded uppercase font-bold">Retire</button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-bold">{s.runs}</td>
                        <td className="px-4 py-4 text-right text-slate-400">{s.ballsFaced}</td>
                        <td className="px-4 py-4 text-right text-slate-400">{s.fours}</td>
                        <td className="px-4 py-4 text-right text-slate-400">{s.sixes}</td>
                        <td className="px-4 py-4 text-right text-slate-400">{sr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bowling Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-slate-800/50">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Current Bowler</span>
              {!matchWinner && !pendingAction && (
                <button 
                  onClick={() => setPendingAction({ type: 'selectBowler', message: 'Select Bowler', isAutoTriggered: false })} 
                  className="text-xs text-blue-400 font-bold hover:text-blue-300"
                >
                  CHANGE
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-800/30 text-slate-500 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2">Bowler</th>
                    <th className="px-4 py-2 text-right">O</th>
                    <th className="px-4 py-2 text-right">M</th>
                    <th className="px-4 py-2 text-right">R</th>
                    <th className="px-4 py-2 text-right">W</th>
                    <th className="px-4 py-2 text-right">ECON</th>
                  </tr>
                </thead>
                <tbody>
                  {bowler && (() => {
                    const bStats = stats[bowler.id] || { ballsBowled: 0, runsConceded: 0, wickets: 0, maidens: 0 };
                    const economy = bStats.ballsBowled > 0 ? ((bStats.runsConceded / bStats.ballsBowled) * 6).toFixed(2) : '0.00';
                    return (
                      <tr>
                        <td className="px-4 py-4 font-medium">{bowler.name}</td>
                        <td className="px-4 py-4 text-right">{formatOvers(bStats.ballsBowled)}</td>
                        <td className="px-4 py-4 text-right">{bStats.maidens}</td>
                        <td className="px-4 py-4 text-right font-bold">{bStats.runsConceded}</td>
                        <td className="px-4 py-4 text-right font-bold text-red-400">{bStats.wickets}</td>
                        <td className="px-4 py-4 text-right">{economy}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ball Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Recent Balls</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 items-center">
              {ballLog.slice(0, 12).map((ball, i, arr) => (
                <React.Fragment key={i}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                    ball.isWicket ? 'bg-red-500 border-red-400' : 
                    ball.runs === 4 ? 'bg-green-600 border-green-500' :
                    ball.runs === 6 ? 'bg-purple-600 border-purple-500' :
                    ball.type !== 'legal' ? 'bg-yellow-600 border-yellow-500' :
                    'bg-slate-800 border-slate-700'
                  }`}>
                    {ball.isWicket ? 'W' : 
                     ball.type === 'wide' ? `${ball.extras}wd` :
                     ball.type === 'noball' ? (ball.runs > 0 ? `${ball.runs}+NB` : 'NB') :
                     ball.runs}
                  </div>
                  {ball.isEndOfOver && i !== arr.length - 1 && (
                    <div className="flex-shrink-0 w-px h-8 bg-slate-700 mx-1 rounded-full"></div>
                  )}
                </React.Fragment>
              ))}
              {ballLog.length === 0 && <p className="text-slate-600 text-sm">No balls bowled yet</p>}
            </div>
          </div>
        </div>

        {/* Scorepad */}
        <div className="order-1 lg:order-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 6].map(runs => (
              <button
                key={runs}
                disabled={!!matchWinner || !!pendingAction}
                onClick={() => updateMatch('legal', runs)}
                className="aspect-square bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center border border-slate-700"
              >
                <span className="text-2xl font-black">{runs === 0 ? '•' : runs}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{runs === 0 ? 'Dot' : 'Runs'}</span>
              </button>
            ))}
            <button
              disabled={!!matchWinner || !!pendingAction}
              onClick={() => updateMatch('wide', 0, 1)}
              className="aspect-square bg-yellow-900/30 hover:bg-yellow-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-yellow-500 border border-yellow-700/50 active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center"
            >
              <span className="text-xl font-black">WD</span>
              <span className="text-[10px] font-bold uppercase">Wide</span>
            </button>
            <button
              disabled={!!matchWinner || !!pendingAction}
              onClick={() => setPendingAction({ type: 'noBallRuns', message: 'Runs scored off No Ball?', isAutoTriggered: true })}
              className="aspect-square bg-orange-900/30 hover:bg-orange-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-orange-500 border border-orange-700/50 active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center"
            >
              <span className="text-xl font-black">NB</span>
              <span className="text-[10px] font-bold uppercase">No Ball</span>
            </button>
            <div className="flex flex-col gap-2">
              <button
                disabled={!!matchWinner || !!pendingAction}
                onClick={() => updateMatch('wicket', 0, 0, true)}
                className="flex-1 bg-red-900/30 hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 border border-red-700/50 active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center"
              >
                <span className="text-xl font-black">W</span>
                <span className="text-[10px] font-bold uppercase">Wicket</span>
              </button>
              <button
                disabled={!!matchWinner || !!pendingAction}
                onClick={handleRunOutClick}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 border border-slate-700 active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center py-2"
              >
                <span className="text-xs font-black uppercase">Run Out</span>
              </button>
            </div>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Extras</p>
            <p className="text-sm font-medium">
              W: {extras.wides} | NB: {extras.noBalls} | B: {extras.byes} | LB: {extras.legByes}
            </p>
          </div>

          {!matchWinner && (
            <button
              onClick={endMatch}
              className="w-full py-4 bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-600/50 rounded-xl font-bold transition-all"
            >
              End Match
            </button>
          )}
          
          <div className="flex gap-3">
            <button
              disabled={!matchState.undoHistory?.length || !!matchWinner || !!pendingAction}
              onClick={handleUndo}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded-xl text-sm font-bold transition-all"
            >
              Undo
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-sm font-bold transition-all"
            >
              Home
            </button>
            <button
              onClick={() => window.location.href = `/scorecard/${matchState.id}`}
              className="flex-1 py-3 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/50 rounded-xl text-sm font-bold transition-all"
            >
              Scorecard
            </button>
          </div>
        </div>
      </div>

      {/* Pending Action Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-blue-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={handleClosePendingAction}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-2xl font-black mb-6 text-white text-center">{pendingAction.message}</h3>
            
            {pendingAction.type === 'selectBatter' && (
              <div className="grid grid-cols-2 gap-3">
                {getAvailableBatters().map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectNextBatter(p.id)}
                    className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl font-bold transition-colors border border-slate-700"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {pendingAction.type === 'retireConfirmation' && pendingAction.batterId && (
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingAction(null)}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmRetire(pendingAction.batterId!)}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  Retire
                </button>
              </div>
            )}

            {pendingAction.type === 'runOut' && (
              <div className="grid grid-cols-2 gap-4">
                {striker && (
                  <button
                    onClick={() => processRunOut(striker.id)}
                    className="bg-slate-800 hover:bg-slate-700 p-6 rounded-xl font-bold transition-colors border border-slate-700 text-center"
                  >
                    <p className="text-xs text-slate-500 uppercase mb-1">Striker</p>
                    <p className="text-lg">{striker.name}</p>
                  </button>
                )}
                {nonStriker && (
                  <button
                    onClick={() => processRunOut(nonStriker.id)}
                    className="bg-slate-800 hover:bg-slate-700 p-6 rounded-xl font-bold transition-colors border border-slate-700 text-center"
                  >
                    <p className="text-xs text-slate-500 uppercase mb-1">Non-Striker</p>
                    <p className="text-lg">{nonStriker.name}</p>
                  </button>
                )}
              </div>
            )}

            {pendingAction.type === 'editOvers' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Total Overs</label>
                  <input
                    type="number"
                    min="1"
                    value={maxOvers}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0) {
                        setMatchState(prev => ({ ...prev, maxOvers: val }));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-lg focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={() => setPendingAction(null)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  Done
                </button>
              </div>
            )}

            {pendingAction.type === 'editTeams' && (
              <div className="space-y-6">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPendingAction({...pendingAction, step: 'team1'})}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${pendingAction.step === 'team1' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    {teams[0].name}
                  </button>
                  <button 
                    onClick={() => setPendingAction({...pendingAction, step: 'team2'})}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${pendingAction.step === 'team2' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    {teams[1].name}
                  </button>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <div className="flex gap-2 mb-4">
                    <input 
                      id="edit-player-name"
                      type="text" 
                      placeholder="Add Player"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('edit-player-name') as HTMLInputElement;
                        if (!input.value.trim()) return;
                        const teamIdx = pendingAction.step === 'team1' ? 0 : 1;
                        const newPlayer: Player = { id: crypto.randomUUID(), name: input.value.trim() };
                        updateTeamPlayers(teamIdx, [...teams[teamIdx].players, newPlayer]);
                        input.value = '';
                      }}
                      className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {teams[pendingAction.step === 'team1' ? 0 : 1].players.map(p => (
                      <li key={p.id} className="flex justify-between items-center bg-slate-900 p-2 rounded px-3 text-sm">
                        <input 
                          value={p.name}
                          onChange={(e) => {
                            const teamIdx = pendingAction.step === 'team1' ? 0 : 1;
                            const newPlayers = teams[teamIdx].players.map(pl => pl.id === p.id ? {...pl, name: e.target.value} : pl);
                            updateTeamPlayers(teamIdx, newPlayers);
                          }}
                          className="bg-transparent outline-none focus:text-blue-400"
                        />
                        <button 
                          onClick={() => {
                            const teamIdx = pendingAction.step === 'team1' ? 0 : 1;
                            updateTeamPlayers(teamIdx, teams[teamIdx].players.filter(pl => pl.id !== p.id));
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => setPendingAction(null)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20"
                >
                  Done Editing
                </button>
              </div>
            )}

            {pendingAction.type === 'nextOver' && pendingAction.step === 'confirm' && (
              <div className="text-center">
                <p className="text-slate-400 mb-6">Current over finished. Proceed to the next over?</p>
                <button
                  onClick={() => setPendingAction({ ...pendingAction, step: 'select', message: 'Select Bowler' })}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20"
                >
                  Next Over
                </button>
              </div>
            )}

            {(pendingAction.type === 'selectBowler' || (pendingAction.type === 'nextOver' && pendingAction.step === 'select')) && (
              <div className="grid grid-cols-2 gap-3">
                {bowlingTeam.players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectNextBowler(p.id)}
                    className={`p-4 rounded-xl font-bold transition-colors border ${
                      p.id === currentBowlerId ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {pendingAction.type === 'noBallRuns' && (
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2, 3, 4, 6].map(runs => (
                  <button
                    key={runs}
                    onClick={() => {
                      updateMatch('noball', runs, 1, false, true);
                      if (pendingAction?.type === 'noBallRuns') setPendingAction(null);
                    }}
                    className="aspect-square bg-slate-800 hover:bg-slate-700 p-4 rounded-xl font-black text-2xl transition-colors border border-slate-700 flex flex-col items-center justify-center"
                  >
                    <span>{runs}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Runs</span>
                  </button>
                ))}
              </div>
            )}

            {pendingAction.type === 'inningsTransition' && (
              <div className="space-y-6">
                {pendingAction.step !== 'select' ? (
                  <div className="text-center">
                    <p className="text-slate-400 mb-6">{battingTeam.name} Innings Finished!</p>
                    <button
                      onClick={startNextInnings}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20"
                    >
                      Start 2nd Innings
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div>
                      <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Striker</label>
                      <select 
                        className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 outline-none"
                        value={setupStriker}
                        onChange={e => setSetupStriker(e.target.value)}
                      >
                        <option value="">Select Striker</option>
                        {battingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Non-Striker</label>
                      <select 
                        className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 outline-none"
                        value={setupNonStriker}
                        onChange={e => setSetupNonStriker(e.target.value)}
                      >
                        <option value="">Select Non-Striker</option>
                        {battingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Bowler</label>
                      <select 
                        className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 outline-none"
                        value={setupBowler}
                        onChange={e => setSetupBowler(e.target.value)}
                      >
                        <option value="">Select Bowler</option>
                        {bowlingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <button
                      disabled={!setupStriker || !setupNonStriker || !setupBowler || setupStriker === setupNonStriker}
                      onClick={() => finalizeInningsSetup(setupStriker, setupNonStriker, setupBowler)}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-lg mt-2 transition-all"
                    >
                      Confirm Lineup
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchDashboard;