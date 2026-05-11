import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { MatchState } from './types';
import HomeScreen from './components/HomeScreen';
import SetupScreen from './components/SetupScreen';
import MatchDashboard from './components/MatchDashboard';
import ScorecardScreen from './components/ScorecardScreen';
import TossScreen from './components/TossScreen';
import LandingPage from './components/LandingPage';

function AppContent() {
  const [matches, setMatches] = useLocalStorage<Record<string, MatchState>>('cricket_matches', {});
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isMatchPage = location.pathname.startsWith('/match/');
  const matchId = isMatchPage ? location.pathname.split('/').pop() : null;

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
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 font-sans">
      {!isLandingPage && (
        <header className="max-w-4xl mx-auto p-4 mb-4 flex justify-between items-center">
          {isMatchPage ? (
            <Link to="/home" className="px-3 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors">Home</Link>
          ) : (
            <Link to="/home" className="text-2xl font-bold text-white">Turf Score</Link>
          )}
          
          <div className="flex gap-4">
            {isMatchPage ? (
              <Link to={`/scorecard/${matchId}`} className="px-3 py-2 bg-[#171717] text-white border border-white/10 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors">Scorecard</Link>
            ) : (
              <Link to="/home" className="px-3 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors">Home</Link>
            )}
          </div>
        </header>
      )}

      <main className={isLandingPage ? "" : "max-w-4xl mx-auto p-4"}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomeScreen matches={matches} />} />
          <Route path="/setup" element={<SetupScreen onCreateMatch={createMatch} />} />
          <Route path="/toss" element={<TossScreen onCreateMatch={createMatch} />} />
          <Route path="/match/:id" element={<MatchDashboardWrapper matches={matches} updateMatch={updateMatch} />} />
          <Route path="/scorecard/:id" element={<ScorecardScreen matches={matches} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
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
