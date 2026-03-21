const fs = require('fs');
const path = 'c:/Users/Arturo/Documents/ScoreKeeper/frontend/src/app/admin/games/[id]/roster/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/<div key={order} className="flex flex-col sm:flex-row items-center gap-3">/g, '<div key={order} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-muted/5 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-muted/10 sm:border-transparent mb-2 sm:mb-0">');

c = c.replace(/<span className="font-black text-foreground w-6 text-sm text-center">{order}\.<\/span>/g, '<span className="font-black text-primary sm:text-foreground w-full sm:w-6 text-xs sm:text-sm text-left sm:text-center border-b sm:border-0 border-muted/20 pb-1 sm:pb-0">Turno {order}</span>');

c = c.replace(/<div className="flex flex-col sm:flex-row items-center justify-end gap-6 pt-6 border-t border-muted\/20">/g, '<div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-6 pt-6 border-t border-muted/20">');

fs.writeFileSync(path, c, 'utf8');
console.log('Fixed roster page');
