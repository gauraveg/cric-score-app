export interface Player {
  id: string;
  name: string;
}

export interface PlayerStats {
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  ballsBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  isOut?: boolean;
  dismissalText?: string;
  widesBowled?: number;
  noBallsBowled?: number;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  captainId?: string;
}

export interface Ball {
  type: 'legal' | 'wide' | 'noball' | 'wicket';
  runs: number; // Runs scored off the bat
  extras: number;
  strikerId: string;
  bowlerId: string;
  isWicket: boolean;
  isEndOfOver?: boolean;
}

export interface InningsState {
  totalRuns: number;
  totalBalls: number;
  wickets: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  battingTeamId: string;
  bowlingTeamId: string;
  ballLog: Ball[];
}

export type MatchHistoryState = Omit<MatchState, 'undoHistory'>;

export interface MatchState {
  id: string;
  teams: Team[];
  battingTeamId: string;
  bowlingTeamId: string;
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  totalBalls: number;
  totalRuns: number;
  wickets: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  ballLog: Ball[];
  stats: Record<string, PlayerStats>; // Player ID -> Stats
  isMatchStarted: boolean;
  maxOvers: number;
  maxOversPerBowler: number;
  currentInnings: 1 | 2;
  targetScore?: number;
  matchWinner?: string;
  firstInnings?: InningsState;
  undoHistory?: MatchHistoryState[];
  pendingWicket?: {
    outPlayerId: string;
    bowlerId: string;
    isRunOut?: boolean;
    replaceTarget: 'strikerId' | 'nonStrikerId';
    ballType: Ball['type'];
    dismissalType?: 'bowled' | 'catch' | 'stump' | 'runout';
    fielderId?: string;
  };
}
