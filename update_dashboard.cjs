const fs = require('fs');

let content = fs.readFileSync('src/components/MatchDashboard.tsx', 'utf8');

// 1. Scoring Panel
const oldScoringPanel = /\{\/\* Scorepad \*\/\}[\s\S]*?(?=\{\/\* Pending Action Modal \*\/\})/m;

const newScoringPanel = `{/* Scorepad */}
        <div className="order-1 lg:order-2 space-y-4">
          <div className="flex justify-between gap-3 w-full">
            {[0, 1, 2, 3, 4, 6].map(runs => (
              <button
                key={runs}
                disabled={!!matchWinner || !!pendingAction}
                onClick={() => updateMatch('legal', runs)}
                className="aspect-square flex-1 bg-white hover:bg-neutral-200 text-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all rounded-full flex flex-col items-center justify-center shadow-lg min-w-[48px]"
              >
                <span className="text-xl font-black">{runs === 0 ? 'Dot' : runs}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full">
            <button
              disabled={!!matchWinner || !!pendingAction}
              onClick={() => updateMatch('wide', 0, 1)}
              className="flex-1 bg-transparent hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-white active:scale-95 transition-all rounded-xl py-4 flex flex-col items-center justify-center"
            >
              <span className="text-sm font-normal">Wide</span>
            </button>
            <button
              disabled={!!matchWinner || !!pendingAction}
              onClick={() => setPendingAction({ type: 'noBallRuns', message: 'Runs scored off No Ball?', isAutoTriggered: true })}
              className="flex-1 bg-transparent hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-white active:scale-95 transition-all rounded-xl py-4 flex flex-col items-center justify-center"
            >
              <span className="text-sm font-normal">No Ball</span>
            </button>
          </div>

          <div className="flex gap-3 w-full">
            <button
              disabled={!!matchWinner || !!pendingAction}
              onClick={() => updateMatch('wicket', 0, 0, true)}
              className="flex-1 bg-[#e7000b] hover:bg-[#ff4d55] disabled:opacity-50 disabled:cursor-not-allowed text-white active:scale-95 transition-all rounded-xl py-4 flex flex-col items-center justify-center"
            >
              <span className="text-sm font-bold">Wicket</span>
            </button>
            <button
              disabled={!!matchWinner || !!pendingAction}
              onClick={handleRunOutClick}
              className="flex-1 bg-[#e7000b] hover:bg-[#ff4d55] disabled:opacity-50 disabled:cursor-not-allowed text-white active:scale-95 transition-all rounded-xl py-4 flex flex-col items-center justify-center"
            >
              <span className="text-sm font-bold">Run Out</span>
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
              {[striker, nonStriker].filter(Boolean).map((p, idx) => {
                const s = stats[p!.id] || { runs: 0, ballsFaced: 0 };
                const isStriker = idx === 0 && !matchWinner && !pendingAction;
                return (
                  <div key={p!.id} className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                      <span className={\`text-sm \${isStriker ? 'text-white font-bold' : 'text-neutral-400 font-normal'}\`}>
                        {p!.name} {isStriker && '*'}
                      </span>
                      {!matchWinner && !pendingAction && (
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => changeBatter(p!.id)} className="text-[8px] bg-white/10 text-white hover:bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Change</button>
                          <button onClick={() => retireBatter(p!.id)} className="text-[8px] bg-red-500/20 text-red-400 hover:bg-red-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Retire</button>
                        </div>
                      )}
                    </div>
                    <span className={\`text-sm \${isStriker ? 'text-white font-normal' : 'text-neutral-400 font-normal'}\`}>
                      {s.runs} ({s.ballsFaced})
                    </span>
                  </div>
                );
              })}
              {!matchWinner && !pendingAction && nonStrikerId && (
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
                    className="text-[8px] bg-white/10 text-white hover:bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                  >
                    Change
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
            <button
              onClick={endMatch}
              className="w-full py-4 bg-transparent border border-red-500 hover:bg-red-500/10 text-red-500 rounded-xl font-bold transition-all"
            >
              End Match
            </button>
          )}
        </div>
      </div>

      `;

content = content.replace(oldScoringPanel, newScoringPanel);

// 2. Remove old Batter and Bowler tables from the layout
const removeTables = /<div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">[\s\S]*?\{\/\* Scorepad \*\/\}/m;
content = content.replace(removeTables, `<div className="flex flex-col max-w-md mx-auto gap-6 w-full">
        {/* Scorepad */}`);

// 4. Update the header
const newHeader = `<div className="flex flex-col items-center w-full mb-8">
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
           <div className="mt-4 w-full bg-[#171717] px-4 py-3 rounded-2xl text-white font-bold text-sm text-center">
              Need {targetScore - totalRuns} runs off {(maxOvers * 6) - totalBalls} balls
           </div>
        )}
        {matchWinner && (
          <div className="mt-6 w-full p-4 bg-white text-black rounded-xl text-center">
            <p className="font-black text-xl uppercase tracking-widest">{matchWinner}</p>
          </div>
        )}
        <div className="flex w-full gap-2 mt-4 justify-center">
           {!matchWinner && (
             <div className="flex gap-2 justify-center">
                <button onClick={handleEditTeams} className="text-[10px] border border-white/20 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider">Edit Teams</button>
                <button onClick={handleEditOvers} className="text-[10px] border border-white/20 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider">Edit Overs</button>
             </div>
           )}
        </div>
      </div>`;

content = content.replace(/<div className="flex flex-col items-center w-full mb-6">[\s\S]*?<\/div>\n      <\/div>/, newHeader);

// Ensure the Home and Scorecard links are removed if they existed at the bottom
content = content.replace(/<button[^>]*onClick=\{\(\) => window\.location\.href = '\/'\}[^>]*>[\s\S]*?<\/button>/, '');
content = content.replace(/<button[^>]*onClick=\{\(\) => window\.location\.href = `\/scorecard\/\$\{matchState\.id\}`\}[^>]*>[\s\S]*?<\/button>/, '');

fs.writeFileSync('src/components/MatchDashboard.tsx', content);
console.log('MatchDashboard rewritten to exact pen specs');