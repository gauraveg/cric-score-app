import React, { useState } from 'react';
import type { MatchState, Ball, Player } from '../types';

interface MatchDashboardProps {
  matchState: MatchState;
  setMatchState: (state: MatchState | ((prev: MatchState) => MatchState)) => void;
}

type PendingAction = {
  type: 'selectBatter' | 'selectBowler' | 'nextOver' | 'inningsTransition' | 'noBallRuns' | 'retireConfirmation' | 'runOut' | 'editTeams' | 'editOvers' | 'wicketType';
  step?: 'confirm' | 'select' | 'team1' | 'team2' | 'selectType' | 'selectFielder';
  message: string;
  replaceTarget?: 'strikerId' | 'nonStrikerId';
  isAutoTriggered?: boolean;
  batterId?: string;
  dismissalType?: 'bowled' | 'catch' | 'stump' | 'runout';
  pendingWicket?: { 
    outPlayerId: string; 
    bowlerId: string; 
    ballType: Ball['type'];
    isRunOut?: boolean;
  };
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

  const updateMatch = (
    ballType: Ball['type'], 
    runs: number, 
    extraRuns: number = 0, 
    isWicket: boolean = false, 
    ignorePending = false,
    wicketInfo?: { dismissalType?: 'bowled' | 'catch' | 'stump' | 'runout', fielderId?: string }
  ) => {
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
      const isAllOutCalculated = prev.wickets + 1 >= battingTeam.players.length;
      if (isWicket) {
        if (isAllOutCalculated) {
           bowlerStats.wickets += 1;
           newState.wickets += 1;
           const strikerStats = { ...newStats[prev.strikerId] };
           strikerStats.isOut = true;
           
           const bowlerName = bowlingTeam.players.find(p => p.id === prev.currentBowlerId)?.name;
           const fielderName = wicketInfo?.fielderId ? bowlingTeam.players.find(p => p.id === wicketInfo.fielderId)?.name : '';
           
           if (wicketInfo?.dismissalType === 'catch') {
               strikerStats.dismissalText = `c ${fielderName} b ${bowlerName}`;
           } else if (wicketInfo?.dismissalType === 'stump') {
               strikerStats.dismissalText = `st ${fielderName} b ${bowlerName}`;
           } else {
               strikerStats.dismissalText = `b ${bowlerName}`;
           }

           newStats[prev.strikerId] = strikerStats;
        } else {
           // Defer wicket tally increment until next batter selected
           // Still record runs conceded etc in bowlerStats
        }
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

      const isAllOut = isAllOutCalculated;
      const isOversFinished = newState.totalBalls >= maxOvers * 6;
      
      const isTargetReached = newState.currentInnings === 2 && newState.totalRuns >= targetScore!;

      if (isWicket && !isAllOut) {
        const replaceTarget = 'strikerId'; // Conventional wicket is always striker
        newState.pendingWicket = {
           outPlayerId: prev.strikerId,
           bowlerId: prev.currentBowlerId,
           ballType: ballType,
           replaceTarget,
           dismissalType: wicketInfo?.dismissalType,
           fielderId: wicketInfo?.fielderId
        };
        newState[replaceTarget] = ''; // Clear the slot to trigger selection UI

        nextPending = { 
          type: 'selectBatter', 
          message: 'Wicket! Select next batter', 
          isAutoTriggered: true,
          replaceTarget
        };
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
    setMatchState(prev => {
      const newState = { ...prev };
      if (prev.pendingWicket) {
        const { outPlayerId, bowlerId, isRunOut, dismissalType, fielderId } = prev.pendingWicket;
        const newStats = { ...prev.stats };
        
        let dismissalText: string;
        if (isRunOut) {
          dismissalText = 'run out';
        } else {
          const bowlerName = prev.teams.flatMap(t => t.players).find(p => p.id === bowlerId)?.name;
          const fielderName = fielderId ? prev.teams.flatMap(t => t.players).find(p => p.id === fielderId)?.name : '';
          
          if (dismissalType === 'catch') {
            dismissalText = `c ${fielderName} b ${bowlerName}`;
          } else if (dismissalType === 'stump') {
            dismissalText = `st ${fielderName} b ${bowlerName}`;
          } else {
            dismissalText = `b ${bowlerName}`;
          }
        }

        // Finalize batter state
        newStats[outPlayerId] = {
          ...newStats[outPlayerId],
          isOut: true,
          dismissalText
        };
        
        // Finalize team wicket tally
        newState.wickets += 1;
        
        // Finalize bowler state
        if (!isRunOut && bowlerId && newStats[bowlerId]) {
          newStats[bowlerId] = {
            ...newStats[bowlerId],
            wickets: (newStats[bowlerId].wickets || 0) + 1
          };
        }
        
        newState.stats = newStats;
        newState.pendingWicket = undefined; // Clear deferred state
      }
      
      const target = pendingAction?.replaceTarget || prev.pendingWicket?.replaceTarget || 'strikerId';
      newState[target] = playerId;
      return newState;
    });
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
      
      const isAllOutCalculated = prev.wickets + 1 >= battingTeam.players.length;
      
      if (isAllOutCalculated) {
          const batterStats = { ...newStats[playerId] };
          batterStats.isOut = true;
          batterStats.dismissalText = 'run out';
          newStats[playerId] = batterStats;
          newState.wickets += 1;
      }

      if (prev.currentBowlerId && newStats[prev.currentBowlerId]) {
        const bowlerStats = { ...newStats[prev.currentBowlerId] };
        bowlerStats.ballsBowled = (bowlerStats.ballsBowled || 0) + 1;
        newStats[prev.currentBowlerId] = bowlerStats;
      }

      newState.stats = newStats;

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
      const isAllOut = isAllOutCalculated;
      if (!isAllOut) {
        const replaceTarget = playerId === prev.strikerId ? 'strikerId' : 'nonStrikerId';
        newState.pendingWicket = {
          outPlayerId: playerId,
          bowlerId: prev.currentBowlerId,
          ballType: 'legal',
          isRunOut: true,
          replaceTarget
        };
        newState[replaceTarget] = ''; // Clear the slot to trigger selection UI

        nextPending = { 
          type: 'selectBatter', 
          message: 'Run Out! Select next batter',
          replaceTarget,
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

  const getRunColor = (runs: number) => {
    switch (runs) {
      case 0: return 'bg-green-50 hover:bg-green-100';
      case 1: return 'bg-green-100 hover:bg-green-200';
      case 2: return 'bg-green-200 hover:bg-green-300';
      case 3: return 'bg-green-300 hover:bg-green-400';
      case 4: return 'bg-green-400 hover:bg-green-500';
      case 6: return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-white hover:bg-neutral-200';
    }
  };

  const getExtraRunColor = (runs: number) => {
    switch (runs) {
      case 0: return 'bg-orange-500/40 hover:bg-orange-500/60 transition-colors';
      case 1: return 'bg-orange-500/50 hover:bg-orange-500/70 transition-colors';
      case 2: return 'bg-orange-500/60 hover:bg-orange-500/80 transition-colors';
      case 3: return 'bg-orange-500/70 hover:bg-orange-500/90 transition-colors';
      case 4: return 'bg-orange-500/80 hover:bg-orange-500 transition-colors';
      case 6: return 'bg-orange-500 transition-colors';
      default: return 'bg-white hover:bg-neutral-200 transition-colors';
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12 relative">
      {/* Score Header */}
      <div className="flex flex-col items-center w-full mb-8">
        <h2 className="text-[56px] font-bold text-white mb-2 leading-none">{totalRuns} / {wickets}</h2>
        <p className="text-[18px] text-neutral-400 mb-6">{formatOvers(totalBalls)} Overs</p>
        <div className="flex gap-6 w-full px-3 justify-center text-xs">
          <span className="text-white font-normal">CRR: {calculateCRR()}</span>
          {currentInnings === 2 && targetScore && (
            <>
              <span className="text-white font-normal">RRR: {calculateRRR()}</span>
              <span className="text-white font-normal">Target: {targetScore}</span>
            </>
          )}
        </div>
        {currentInnings === 2 && targetScore && !matchWinner && (
           <div className="mt-4 bg-[#171717] px-4 py-3 rounded-2xl text-white font-bold text-sm text-center inline-block w-fit">
              Need {targetScore - totalRuns} runs off {(maxOvers * 6) - totalBalls} balls
           </div>
        )}
        {matchWinner && (
          <div className="mt-6 w-full p-4 bg-white text-black rounded-xl text-center">
            <p className="font-black text-xl uppercase tracking-widest">{matchWinner}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col max-w-md mx-auto gap-6 w-full">
        {/* Scorepad */}
        <div className="order-1 lg:order-2 space-y-4">
          <div className="flex justify-between gap-3 w-full">
            {[0, 1, 2, 3, 4, 6].map(runs => (
              <button
                key={runs}
                disabled={!!matchWinner || !!pendingAction || !!matchState.pendingWicket}
                onClick={() => updateMatch('legal', runs)}
                className={`aspect-square flex-1 ${getRunColor(runs)} text-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all rounded-full flex flex-col items-center justify-center shadow-lg min-w-[48px]`}
              >
                <span className="text-xl font-black">{runs === 0 ? 'Dot' : runs}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full">
            <button
              disabled={!!matchWinner || !!pendingAction || !!matchState.pendingWicket}
              onClick={() => updateMatch('wide', 0, 1)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white active:scale-95 transition-all rounded-xl py-4 flex flex-col items-center justify-center shadow-lg"
            >
              <span className="text-sm font-bold">Wide</span>
            </button>
            <button
              disabled={!!matchWinner || !!pendingAction || !!matchState.pendingWicket}
              onClick={() => setPendingAction({ type: 'noBallRuns', message: 'Runs scored off No Ball?', isAutoTriggered: true })}
              className="flex-1 bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white active:scale-95 transition-all rounded-xl py-4 flex flex-col items-center justify-center shadow-lg"
            >
              <span className="text-sm font-bold">No Ball</span>
            </button>
          </div>

          <div className="flex gap-3 w-full">
            <button
              disabled={!!matchWinner || !!pendingAction || !!matchState.pendingWicket}
              onClick={() => setPendingAction({ type: 'wicketType', step: 'selectType', message: 'How was the wicket?' })}
              className="flex-1 bg-red-500/60 hover:bg-red-500/80 disabled:opacity-50 disabled:cursor-not-allowed text-white active:scale-95 transition-all rounded-xl py-4 flex flex-col items-center justify-center shadow-lg"
            >
              <span className="text-sm font-bold">Wicket</span>
            </button>
          </div>
          
          {/* Details Panel */}
          <div className="bg-[#171717] rounded-[20px] p-5 w-full flex flex-col gap-4 mt-8">
            {/* Extras Summary */}
            <div className="flex justify-between items-center w-full">
              <span className="text-sm text-white font-normal">Extras: {extras.wides + extras.noBalls + extras.byes + extras.legByes}</span>
              <span className="text-xs text-neutral-400 font-normal">(Wd: {extras.wides}, Nb: {extras.noBalls}, B: {extras.byes}, Lb: {extras.legByes})</span>
            </div>

            <div className="w-full h-px bg-white/10"></div>

            {/* Batters */}
            <div className="flex flex-col gap-2">
              {[
                { p: striker, role: 'strikerId' as const },
                { p: nonStriker, role: 'nonStrikerId' as const }
              ].map(({ p, role }, idx) => {
                if (!p) {
                   return (
                     <div key={role} className="flex justify-between items-center w-full py-1">
                        <button 
                          onClick={() => setPendingAction({ 
                            type: 'selectBatter', 
                            message: 'Select next batter', 
                            replaceTarget: role,
                            isAutoTriggered: true
                          })}
                          className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-bold hover:bg-neutral-200 transition-colors"
                        >
                          Select {idx === 0 ? 'Striker' : 'Non-Striker'}
                        </button>
                        <span className="text-sm text-neutral-500 italic">Waiting...</span>
                     </div>
                   );
                }

                const s = stats[p.id] || { runs: 0, ballsFaced: 0 };
                const isStriker = idx === 0 && !matchWinner && !pendingAction && !matchState.pendingWicket;
                return (
                  <div key={p.id} className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isStriker ? 'text-white font-bold' : 'text-neutral-400 font-normal'}`}>
                        {p.name} {isStriker && '*'}
                      </span>
                      {!matchWinner && !pendingAction && !matchState.pendingWicket && (
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => changeBatter(p.id)} className="text-[9px] bg-white/10 text-white hover:bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Change</button>
                          <button onClick={() => retireBatter(p.id)} className="text-[9px] bg-red-500/20 text-red-400 hover:bg-red-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Retire</button>
                        </div>
                      )}
                    </div>
                    <span className={`text-sm ${isStriker ? 'text-white font-normal' : 'text-neutral-400 font-normal'}`}>
                      {s.runs} ({s.ballsFaced})
                    </span>
                  </div>
                );
              })}
              {!matchWinner && !pendingAction && !matchState.pendingWicket && nonStrikerId && (
                <button onClick={manualSwapStrike} className="text-[10px] text-white border border-white/20 hover:bg-white/10 py-1.5 rounded-lg mt-2 font-bold uppercase tracking-wider text-center w-full">Swap Strike</button>
              )}
            </div>

            <div className="w-full h-px bg-white/10"></div>

            {/* Bowler */}
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-normal">{bowler?.name || 'No Bowler'}</span>
                {!matchWinner && !pendingAction && (
                  <button
                    onClick={() => setPendingAction({ type: 'selectBowler', message: 'Select Bowler', isAutoTriggered: false })}
                    className="text-[9px] bg-white/10 text-white hover:bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                  >                    Change
                  </button>
                )}
              </div>
              {bowler && (() => {
                const bStats = stats[bowler.id] || { ballsBowled: 0, runsConceded: 0, wickets: 0, maidens: 0 };
                return (
                  <span className="text-sm text-white font-normal">
                    {formatOvers(bStats.ballsBowled)} - {bStats.maidens} - {bStats.runsConceded} - {bStats.wickets}
                  </span>
                );
              })()}
            </div>
          </div>

          <button
            disabled={!matchState.undoHistory?.length || !!matchWinner || !!pendingAction}
            onClick={handleUndo}
            className="w-full py-4 bg-transparent border border-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all"
          >
            Undo Last Action
          </button>

          {!matchWinner && (
             <div className="flex gap-3 w-full">
                <button onClick={handleEditTeams} className="flex-1 py-3 bg-transparent border border-white/20 hover:bg-white/10 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all">Edit Teams</button>
                <button onClick={handleEditOvers} className="flex-1 py-3 bg-transparent border border-white/20 hover:bg-white/10 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all">Edit Overs</button>
             </div>
          )}

          {!matchWinner && (
            <button
              onClick={endMatch}
              className="w-full py-4 bg-transparent border border-red-500 hover:bg-red-500/10 text-red-500 rounded-xl font-bold transition-all"
            >
              End Match
            </button>
          )}
        </div>
      </div>

      {/* Pending Action Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={handleClosePendingAction}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full text-neutral-400 hover:text-white transition-colors"
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
                    className="bg-[#171717] hover:bg-white/10 text-white p-4 rounded-xl font-bold transition-colors border border-white/10"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {pendingAction.type === 'wicketType' && pendingAction.step === 'selectType' && (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => updateMatch('wicket', 0, 0, true, false, { dismissalType: 'bowled' })} 
                  className="bg-[#171717] hover:bg-white/10 text-white p-6 rounded-xl font-bold transition-colors border border-white/10 flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-lg">Bowled</span>
                </button>
                <button 
                  onClick={() => setPendingAction({ ...pendingAction, step: 'selectFielder', dismissalType: 'catch', message: 'Who caught it?' })} 
                  className="bg-[#171717] hover:bg-white/10 text-white p-6 rounded-xl font-bold transition-colors border border-white/10 flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-lg">Caught</span>
                </button>
                <button 
                  onClick={() => setPendingAction({ ...pendingAction, step: 'selectFielder', dismissalType: 'stump', message: 'Who stumped?' })} 
                  className="bg-[#171717] hover:bg-white/10 text-white p-6 rounded-xl font-bold transition-colors border border-white/10 flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-lg">Stumping</span>
                </button>
                <button 
                  onClick={handleRunOutClick} 
                  className="bg-[#171717] hover:bg-white/10 text-white p-6 rounded-xl font-bold transition-colors border border-white/10 flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-lg">Run Out</span>
                </button>
              </div>
            )}

            {pendingAction.type === 'wicketType' && pendingAction.step === 'selectFielder' && (
              <div className="grid grid-cols-2 gap-3">
                {bowlingTeam.players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => updateMatch('wicket', 0, 0, true, false, { dismissalType: pendingAction.dismissalType, fielderId: p.id })}
                    className="bg-[#171717] hover:bg-white/10 text-white p-4 rounded-xl font-bold transition-colors border border-white/10"
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
                  className="flex-1 py-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-all"
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
                    className="bg-neutral-800 hover:bg-neutral-700 p-6 rounded-xl font-bold transition-colors border border-neutral-700 text-center"
                  >
                    <p className="text-xs text-neutral-500 uppercase mb-1">Striker</p>
                    <p className="text-lg">{striker.name}</p>
                  </button>
                )}
                {nonStriker && (
                  <button
                    onClick={() => processRunOut(nonStriker.id)}
                    className="bg-neutral-800 hover:bg-neutral-700 p-6 rounded-xl font-bold transition-colors border border-neutral-700 text-center"
                  >
                    <p className="text-xs text-neutral-500 uppercase mb-1">Non-Striker</p>
                    <p className="text-lg">{nonStriker.name}</p>
                  </button>
                )}
              </div>
            )}

            {pendingAction.type === 'editOvers' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-2">Total Overs</label>
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
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-white text-lg focus:border-violet-500 outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={() => setPendingAction(null)}
                  className="w-full py-4 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold transition-all shadow-lg shadow-violet-500/20"
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
                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${pendingAction.step === 'team1' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400'}`}
                  >
                    {teams[0].name}
                  </button>
                  <button 
                    onClick={() => setPendingAction({...pendingAction, step: 'team2'})}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${pendingAction.step === 'team2' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400'}`}
                  >
                    {teams[1].name}
                  </button>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-neutral-700">
                  <div className="flex gap-2 mb-4">
                    <input 
                      id="edit-player-name"
                      type="text" 
                      placeholder="Add Player"
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-sm outline-none focus:border-violet-500"
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
                      className="bg-white text-black hover:bg-neutral-200 text-black px-4 rounded-lg font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {teams[pendingAction.step === 'team1' ? 0 : 1].players.map(p => (
                      <li key={p.id} className="flex justify-between items-center bg-neutral-900 p-2 rounded px-3 text-sm">
                        <input 
                          value={p.name}
                          onChange={(e) => {
                            const teamIdx = pendingAction.step === 'team1' ? 0 : 1;
                            const newPlayers = teams[teamIdx].players.map(pl => pl.id === p.id ? {...pl, name: e.target.value} : pl);
                            updateTeamPlayers(teamIdx, newPlayers);
                          }}
                          className="bg-transparent outline-none focus:text-white"
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
                  className="w-full py-4 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold shadow-lg shadow-violet-500/20"
                >
                  Done Editing
                </button>
              </div>
            )}

            {pendingAction.type === 'nextOver' && pendingAction.step === 'confirm' && (
              <div className="text-center">
                <p className="text-neutral-400 mb-6">Current over finished. Proceed to the next over?</p>
                <button
                  onClick={() => setPendingAction({ ...pendingAction, step: 'select', message: 'Select Bowler' })}
                  className="w-full py-4 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold text-lg shadow-lg shadow-violet-500/20"
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
                      p.id === currentBowlerId ? 'bg-white text-black border-violet-400' : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700'
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
                    className={`aspect-square ${getExtraRunColor(runs)} text-white p-4 rounded-xl font-black text-2xl transition-colors flex flex-col items-center justify-center`}
                  >
                    <span>{runs}</span>
                    <span className="text-[10px] text-white font-bold uppercase mt-1">Runs</span>
                  </button>
                ))}
              </div>
            )}

            {pendingAction.type === 'inningsTransition' && (
              <div className="space-y-6">
                {pendingAction.step !== 'select' ? (
                  <div className="text-center">
                    <p className="text-neutral-400 mb-6">{battingTeam.name} Innings Finished!</p>
                    <button
                      onClick={startNextInnings}
                      className="w-full py-4 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold text-lg shadow-lg shadow-violet-500/20"
                    >
                      Start 2nd Innings
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div>
                      <label className="text-xs text-neutral-500 font-bold uppercase mb-1 block">Striker</label>
                      <select 
                        className="w-full bg-neutral-800 p-3 rounded-lg border border-neutral-700 outline-none"
                        value={setupStriker}
                        onChange={e => setSetupStriker(e.target.value)}
                      >
                        <option value="">Select Striker</option>
                        {battingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 font-bold uppercase mb-1 block">Non-Striker</label>
                      <select 
                        className="w-full bg-neutral-800 p-3 rounded-lg border border-neutral-700 outline-none"
                        value={setupNonStriker}
                        onChange={e => setSetupNonStriker(e.target.value)}
                      >
                        <option value="">Select Non-Striker</option>
                        {battingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 font-bold uppercase mb-1 block">Bowler</label>
                      <select 
                        className="w-full bg-neutral-800 p-3 rounded-lg border border-neutral-700 outline-none"
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
                      className="w-full py-4 bg-white text-black hover:bg-neutral-200 text-black disabled:opacity-50 text-white rounded-xl font-bold text-lg mt-2 transition-all"
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