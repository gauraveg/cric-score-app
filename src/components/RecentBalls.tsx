import React from 'react';
import type { Ball } from '../types';

interface RecentBallsProps {
  balls: Ball[];
  maxBalls?: number;
}

const RecentBalls: React.FC<RecentBallsProps> = ({ balls, maxBalls = 18 }) => {
  const recentBalls = balls.slice(0, maxBalls);

  const getBallStyle = (ball: Ball) => {
    if (ball.isWicket) return 'bg-[#bf1f1f] text-white';
    
    if (ball.type === 'wide' || ball.type === 'noball') {
      const runs = ball.runs;
      switch (runs) {
        case 0: return 'bg-[#bd5326]/40 text-white';
        case 1: return 'bg-[#bd5326]/50 text-white';
        case 2: return 'bg-[#bd5326]/60 text-white';
        case 3: return 'bg-[#bd5326]/70 text-white';
        case 4: return 'bg-[#bd5326]/80 text-white';
        case 6: return 'bg-[#bd5326] text-white';
        default: return 'bg-[#bd5326] text-white';
      }
    }

    // Legal ball
    switch (ball.runs) {
      case 0: return 'bg-green-50 text-black';
      case 1: return 'bg-green-100 text-black';
      case 2: return 'bg-green-200 text-black';
      case 3: return 'bg-green-300 text-black';
      case 4: return 'bg-green-400 text-black';
      case 6: return 'bg-green-500 text-white';
      default: return 'bg-white text-black';
    }
  };

  const getBallText = (ball: Ball) => {
    if (ball.isWicket) return 'W';
    if (ball.type === 'wide') return `${ball.extras}WD`;
    if (ball.type === 'noball') return `${ball.runs}+${ball.extras}NB`;
    return ball.runs.toString();
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar items-center">
      {recentBalls.map((ball, idx) => (
        <React.Fragment key={idx}>
          {ball.isEndOfOver && idx !== 0 && (
            <div className="w-px h-8 bg-neutral-600 mx-1 flex-shrink-0"></div>
          )}
          <div 
            className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${getBallStyle(ball)}`}
          >
            {getBallText(ball)}
          </div>
        </React.Fragment>
      ))}
      {balls.length === 0 && (
        <div className="text-neutral-500 italic text-sm py-2">No balls bowled yet</div>
      )}
    </div>
  );
};

export default RecentBalls;
