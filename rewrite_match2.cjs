const fs = require('fs');

let content = fs.readFileSync('src/components/MatchDashboard.tsx', 'utf8');

const newHeader = `<div className="flex flex-col items-center w-full mb-6">
        <h2 className="text-6xl font-bold text-white mb-2">{totalRuns} / {wickets}</h2>
        <p className="text-xl text-neutral-400">{formatOvers(totalBalls)} Overs</p>
        <div className="flex gap-6 mt-4">
          <span className="text-sm font-bold text-white uppercase tracking-wider">CRR: {calculateCRR()}</span>
          {currentInnings === 2 && targetScore && (
            <>
              <span className="text-sm font-bold text-white uppercase tracking-wider">RRR: {calculateRRR()}</span>
              <span className="text-sm font-bold text-white uppercase tracking-wider">Target: {targetScore}</span>
            </>
          )}
        </div>
        {currentInnings === 2 && targetScore && !matchWinner && (
           <div className="mt-4 bg-[#171717] border border-white/10 px-6 py-3 rounded-2xl text-white font-bold text-sm">
              Need {targetScore - totalRuns} runs off {(maxOvers * 6) - totalBalls} balls
           </div>
        )}
        {matchWinner && (
          <div className="mt-6 p-4 bg-white text-black rounded-xl text-center w-full max-w-md">
            <p className="font-black text-xl uppercase tracking-widest">{matchWinner}</p>
          </div>
        )}
        <div className="flex w-full gap-2 mt-4 max-w-sm justify-center">
           {!matchWinner && (
             <div className="flex gap-2 w-full justify-center">
                <button onClick={handleEditTeams} className="text-[10px] border border-white/20 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">Edit Teams</button>
                <button onClick={handleEditOvers} className="text-[10px] border border-white/20 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">Edit Overs</button>
             </div>
           )}
        </div>
      </div>`;

content = content.replace(/<div className=\{\`rounded-2xl p-6 text-white[\s\S]*?\{matchWinner && \([\s\S]*?<\/div>[\s\S]*?<\/div>\n\s*\}\)\}\n\s*<\/div>/, newHeader);

fs.writeFileSync('src/components/MatchDashboard.tsx', content);
console.log('Done MatchDashboard');
