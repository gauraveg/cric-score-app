import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { MatchState } from './types';
import HomeScreen from './components/HomeScreen';
import SetupScreen from './components/SetupScreen';
import MatchDashboard from './components/MatchDashboard';
import ScorecardScreen from './components/ScorecardScreen';
import TossScreen from './components/TossScreen';

function App() {
  const [matches, setMatches] = useLocalStorage<Record<string, MatchState>>('cricket_matches', {});

  const updateMatch = (matchId: string, updatedState: MatchState | ((prev: MatchState) => MatchState)) => {
    setMatches(prev => {
      const match = prev[matchId];
      if (!match) return prev;
      const newState = typeof updatedState === 'function' ? updatedState(match) : updatedState;
      return { ...prev, [matchId]: newState };
    });
  };

  const createMatch = (newMatch: MatchState) => {
    setMatches(prev => ({ ...prev, [newMatch.id]: newMatch }));
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans">
        <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
          <Link to="/" className="text-3xl font-bold text-blue-500">Cricket Scorer</Link>
          <div className="flex gap-4">
            <Link to="/" className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors">Home</Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto">
          <Routes>
            <Route path="/" element={<HomeScreen matches={matches} />} />
            <Route path="/setup" element={<SetupScreen onCreateMatch={createMatch} />} />
            <Route path="/toss" element={<TossScreen onCreateMatch={createMatch} />} />
            <Route path="/match/:id" element={<MatchDashboardWrapper matches={matches} updateMatch={updateMatch} />} />
            <Route path="/scorecard/:id" element={<ScorecardScreen matches={matches} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Wrapper to handle finding the correct match and passing props
const MatchDashboardWrapper: React.FC<{ 
  matches: Record<string, MatchState>, 
  updateMatch: (id: string, state: MatchState | ((prev: MatchState) => MatchState)) => void 
}> = ({ matches, updateMatch }) => {
  const id = window.location.pathname.split('/').pop() || '';
  const match = matches[id];

  if (!match) return <div className="text-center p-12">Match not found.</div>;

  return (
    <MatchDashboard 
      matchState={match} 
      setMatchState={(updated) => updateMatch(id, updated)} 
    />
  );
};

export default App;
