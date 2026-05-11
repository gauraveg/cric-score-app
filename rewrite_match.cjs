const fs = require('fs');

let content = fs.readFileSync('src/components/MatchDashboard.tsx', 'utf8');

// Replace Header Score Block
content = content.replace(/<div className=\{\`rounded-2xl p-6 text-white[\s\S]*?\{matchWinner && \([\s\S]*?<\/div>[\s\S]*?<\/div>\n\s*\}\)\}\n\s*<\/div>/, `<div className="flex flex-col items-center w-full mb-6">
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
           <div className="mt-4 bg-[#171717] px-6 py-3 rounded-2xl text-white font-bold text-sm">
              Need {targetScore - totalRuns} runs off {(maxOvers * 6) - totalBalls} balls
           </div>
        )}
        {matchWinner && (
          <div className="mt-6 p-4 bg-white text-black rounded-xl text-center w-full">
            <p className="font-black text-xl uppercase tracking-widest">{matchWinner}</p>
          </div>
        )}
        <div className="flex w-full gap-2 mt-4 max-w-sm justify-between">
           {!matchWinner && (
             <div className="flex gap-2 w-full">
                <button onClick={handleEditTeams} className="flex-1 text-[10px] border border-white/20 hover:bg-white/10 px-2 py-1 rounded font-bold uppercase tracking-wider">Edit Teams</button>
                <button onClick={handleEditOvers} className="flex-1 text-[10px] border border-white/20 hover:bg-white/10 px-2 py-1 rounded font-bold uppercase tracking-wider">Edit Overs</button>
             </div>
           )}
        </div>
      </div>`);

// Replace Batting Stats Box styles
content = content.replace(/className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"/g, 'className="bg-[#171717] border border-white/10 rounded-2xl overflow-hidden"');
content = content.replace(/bg-neutral-800\/50/g, 'bg-white/5');
content = content.replace(/text-violet-400/g, 'text-white');
content = content.replace(/text-violet-500/g, 'text-white');
content = content.replace(/hover:text-violet-400/g, 'hover:text-white');
content = content.replace(/hover:text-violet-300/g, 'hover:text-neutral-300');
content = content.replace(/divide-neutral-800/g, 'divide-white/10');
content = content.replace(/bg-violet-500\/5/g, 'bg-white/5');
content = content.replace(/bg-neutral-800\/30/g, 'bg-transparent border-b border-white/10');
content = content.replace(/border-t border-violet-400\/30/g, 'border-t border-white/10');
content = content.replace(/bg-violet-600 shadow-violet-500\/20/g, 'bg-[#171717]');
content = content.replace(/text-violet-100/g, 'text-neutral-400');
content = content.replace(/text-violet-200/g, 'text-neutral-400');
content = content.replace(/border-violet-500\/50/g, 'border-white/10');
content = content.replace(/bg-violet-600/g, 'bg-white text-black');
content = content.replace(/hover:bg-violet-500/g, 'hover:bg-neutral-200 text-black');
content = content.replace(/text-violet-500/g, 'text-white');

// Scorepad replacements
content = content.replace(/className="aspect-square bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center border border-neutral-700"/g, 'className="aspect-square bg-white hover:bg-neutral-200 text-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all rounded-[28px] flex flex-col items-center justify-center shadow-lg"');

content = content.replace(/className="aspect-square bg-yellow-900\/30 hover:bg-yellow-900\/50 disabled:opacity-50 disabled:cursor-not-allowed text-yellow-500 border border-yellow-700\/50 active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center"/g, 'className="aspect-square bg-transparent hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-white active:scale-95 transition-all rounded-xl flex flex-col items-center justify-center"');

content = content.replace(/className="aspect-square bg-orange-900\/30 hover:bg-orange-900\/50 disabled:opacity-50 disabled:cursor-not-allowed text-orange-500 border border-orange-700\/50 active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center"/g, 'className="aspect-square bg-transparent hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-white active:scale-95 transition-all rounded-xl flex flex-col items-center justify-center"');

content = content.replace(/className="flex-1 bg-red-900\/30 hover:bg-red-900\/50 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 border border-red-700\/50 active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center"/g, 'className="flex-1 bg-[#ff666999] hover:bg-[#ff6669] disabled:opacity-50 disabled:cursor-not-allowed text-black active:scale-95 transition-all rounded-xl flex flex-col items-center justify-center"');

content = content.replace(/className="flex-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-300 border border-neutral-700 active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center py-2"/g, 'className="flex-1 bg-[#ff666999] hover:bg-[#ff6669] disabled:opacity-50 disabled:cursor-not-allowed text-black active:scale-95 transition-all rounded-xl flex flex-col items-center justify-center py-2"');

// Extra panel
content = content.replace(/bg-neutral-900\/50 border border-neutral-800 rounded-xl p-4/g, 'bg-[#171717] border border-white/10 rounded-2xl p-4');

// Bottom buttons
content = content.replace(/w-full py-4 bg-red-600\/20 hover:bg-red-600\/40 text-red-500 border border-red-600\/50 rounded-xl font-bold transition-all/g, 'w-full py-4 bg-transparent border border-red-500/50 hover:bg-red-500/10 text-red-500 rounded-xl font-bold transition-all');

content = content.replace(/flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-300 rounded-xl text-sm font-bold transition-all/g, 'flex-1 py-3 bg-transparent border border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all');

content = content.replace(/flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-xl text-sm font-bold transition-all/g, 'flex-1 py-3 bg-transparent border border-white/20 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all');

content = content.replace(/flex-1 py-3 bg-violet-600\/20 hover:bg-violet-600\/40 text-violet-400 border border-violet-500\/50 rounded-xl text-sm font-bold transition-all/g, 'flex-1 py-3 bg-transparent border border-white hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all');

content = content.replace(/className="text-xs text-neutral-500 font-bold uppercase mb-1"/g, 'className="text-xs text-neutral-500 font-bold mb-1"');

content = content.replace(/bg-neutral-900 border border-neutral-800 rounded-xl p-4/g, 'bg-[#171717] border border-white/10 rounded-2xl p-5');

content = content.replace(/className="bg-neutral-800 hover:bg-neutral-700 p-4 rounded-xl font-bold transition-colors border border-neutral-700"/g, 'className="bg-[#171717] hover:bg-white/10 text-white p-4 rounded-xl font-bold transition-colors border border-white/10"');

fs.writeFileSync('src/components/MatchDashboard.tsx', content);
console.log('MatchDashboard updated');
