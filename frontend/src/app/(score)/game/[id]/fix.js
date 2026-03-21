const fs = require('fs');
const path = 'c:/Users/Arturo/Documents/ScoreKeeper/frontend/src/app/(score)/game/[id]/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/<div className="bg-surface border border-muted\/30 p-1 rounded-xl shadow-sm inline-flex">/g, '<div className="bg-surface border border-muted/30 p-1 rounded-xl shadow-sm inline-flex flex-wrap sm:flex-nowrap justify-center gap-1">');

c = c.replace(/px-6 py-2\.5 rounded-lg text-sm font-bold transition-all/g, 'px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex-1 sm:flex-none justify-center');

c = c.replace(/<div className="bg-surface border border-muted\/30 rounded-2xl p-6 shadow-lg">/g, '<div className="bg-surface border border-muted/30 rounded-2xl p-4 sm:p-6 shadow-lg overflow-x-auto">');

c = c.replace(/<div className="bg-surface border border-muted\/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">/g, '<div className="bg-surface border border-muted/30 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden group overflow-x-auto">');

c = c.replace(/<div className="bg-surface border border-muted\/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">/g, '<div className="bg-surface border border-muted/30 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden overflow-x-auto">');

c = c.replace(/<div className="bg-surface border border-muted\/30 rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-300">/g, '<div className="bg-surface border border-muted/30 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">');

fs.writeFileSync(path, c, 'utf8');
console.log('Fixed score page wrapper');
