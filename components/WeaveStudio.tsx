
import React, { useState, useMemo } from 'react';
import { LibraryWeave, WeaveStudioState, WeaveStudioCell } from '../types';
import { WEAVE_LIBRARY } from '../services/weaveLibrary';
import { WeaveThumbnail } from './WeaveThumbnail';
import { FlipIcon, ShiftUpIcon, ShiftDownIcon, ShiftLeftIcon, ShiftRightIcon, PlusIcon, TrashIcon, GridFillIcon, ListIcon, PencilIcon, PaletteIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import { CustomWeaveModal } from './CustomWeaveModal';
import { InteractiveGrid } from './InteractiveGrid';

interface WeaveStudioProps {
    onSaveToLibrary: (weave: LibraryWeave) => void;
}

const DEFAULT_CELL_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6'];

const DEFAULT_CELL = (idx: number): WeaveStudioCell => ({
    weave: null,
    faceMode: 'face',
    offsetX: 0,
    offsetY: 0,
    forceState: 'none',
    color: DEFAULT_CELL_COLORS[idx % DEFAULT_CELL_COLORS.length]
});

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number): number => (a * b) / (gcd(a, b) || 1);

const WeaveBox: React.FC<{
    cell: WeaveStudioCell;
    onUpdate: (updates: Partial<WeaveStudioCell>) => void;
    warpLabel: string;
    weftLabel: string;
    onDesign: () => void;
}> = ({ cell, onUpdate, warpLabel, weftLabel, onDesign }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const data = e.dataTransfer.getData('weave-obj');
        if (data) {
            onUpdate({ weave: JSON.parse(data), forceState: 'none' });
        }
    };

    // Calculate shifted weave for the preview
    const reflectedWeave = useMemo(() => {
        if (!cell.weave) return null;
        if (cell.offsetX === 0 && cell.offsetY === 0) return cell.weave;
        const { draft, pegPlan, harnesses } = cell.weave;
        const w = draft[0].length, h = pegPlan.length;
        const nextPeg = pegPlan.map(row => [...row]);
        const shiftY = ((cell.offsetY % h) + h) % h;
        const syPeg = shiftY > 0 ? [...nextPeg.slice(h - shiftY), ...nextPeg.slice(0, h - shiftY)] : nextPeg;
        const shiftX = ((cell.offsetX % w) + w) % w;
        const finalPeg = shiftX > 0 ? syPeg.map(row => [...row.slice(w - shiftX), ...row.slice(0, w - shiftX)]) : syPeg;
        return { ...cell.weave, pegPlan: finalPeg };
    }, [cell.weave, cell.offsetX, cell.offsetY]);

    return (
        <div 
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col bg-gray-900 border-2 rounded-xl overflow-hidden transition-all h-64 ${isDragOver ? 'border-blue-500 bg-blue-900/20 scale-[1.02] shadow-2xl' : 'border-gray-800 hover:border-gray-700'}`}
        >
            <div className="flex justify-between items-center p-2 bg-gray-800/50 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <input type="color" value={cell.color} onChange={e => onUpdate({ color: e.target.value })} className="w-4 h-4 rounded-full border-none p-0 cursor-pointer overflow-hidden bg-transparent" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{warpLabel} × {weftLabel}</span>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => onUpdate({ forceState: cell.forceState === 'up' ? 'none' : 'up', weave: null })} className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${cell.forceState === 'up' ? 'bg-white text-black border-white' : 'text-gray-500 border-gray-700 hover:border-gray-500'}`}>UP</button>
                    <button onClick={() => onUpdate({ forceState: cell.forceState === 'down' ? 'none' : 'down', weave: null })} className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${cell.forceState === 'down' ? 'bg-black text-white border-white' : 'text-gray-500 border-gray-700 hover:border-gray-500'}`}>DN</button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 relative group">
                {cell.weave ? (
                    <div className="relative w-full h-full">
                         <WeaveThumbnail weave={reflectedWeave!} faceMode={cell.faceMode} showGrid className="w-full h-full shadow-2xl rounded-lg" />
                         <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={onDesign} className="p-1.5 bg-blue-600 text-white rounded shadow-lg hover:bg-blue-500"><PencilIcon className="w-3 h-3" /></button>
                            <button onClick={() => onUpdate({ weave: null, forceState: 'none' })} className="p-1.5 bg-red-600 text-white rounded shadow-lg hover:bg-red-500"><TrashIcon className="w-3 h-3" /></button>
                         </div>
                    </div>
                ) : (
                    <div className="text-center flex flex-col items-center gap-3">
                        {cell.forceState === 'none' ? (
                            <button onClick={onDesign} className="flex flex-col items-center gap-2 group/btn">
                                <GridFillIcon className="w-8 h-8 text-gray-700 group-hover/btn:text-blue-500 transition-colors" />
                                <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter group-hover/btn:text-gray-300">Design Slot</span>
                            </button>
                        ) : <span className={`text-xs font-black uppercase tracking-widest ${cell.forceState === 'up' ? 'text-white' : 'text-gray-700'}`}>Forced {cell.forceState}</span>}
                    </div>
                )}
            </div>

            {cell.weave && (
                <div className="p-2 bg-black/40 border-t border-gray-800 flex justify-between items-center">
                    <button onClick={() => onUpdate({ faceMode: cell.faceMode === 'face' ? 'back' : 'face' })} className={`p-1.5 rounded border ${cell.faceMode === 'back' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}><FlipIcon className="w-3.5 h-3.5" /></button>
                    <div className="flex gap-1 items-center bg-gray-800 rounded p-1">
                        <button onClick={() => onUpdate({ offsetX: cell.offsetX - 1 })} className="p-1 text-gray-500 hover:text-white"><ShiftLeftIcon className="w-3 h-3"/></button>
                        <button onClick={() => onUpdate({ offsetY: cell.offsetY - 1 })} className="p-1 text-gray-500 hover:text-white"><ShiftUpIcon className="w-3 h-3"/></button>
                        <div className="text-[8px] font-mono text-blue-400 w-8 text-center">{cell.offsetX},{cell.offsetY}</div>
                        <button onClick={() => onUpdate({ offsetY: cell.offsetY + 1 })} className="p-1 text-gray-500 hover:text-white"><ShiftDownIcon className="w-3 h-3"/></button>
                        <button onClick={() => onUpdate({ offsetX: cell.offsetX + 1 })} className="p-1 text-gray-500 hover:text-white"><ShiftRightIcon className="w-3 h-3"/></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const WeaveStudio: React.FC<WeaveStudioProps> = ({ onSaveToLibrary }) => {
    const [state, setState] = useState<WeaveStudioState>({
        warpSystems: 2, weftSystems: 2,
        cells: [[DEFAULT_CELL(0), DEFAULT_CELL(1)], [DEFAULT_CELL(2), DEFAULT_CELL(3)]],
        warpArrangement: [0, 1], weftArrangement: [0, 1]
    });

    const [complexName, setComplexName] = useState('Compound Structure');
    const [isTiled, setIsTiled] = useState(false);
    const [isColorPreview, setIsColorPreview] = useState(false);
    const [pixelEditor, setPixelEditor] = useState<{r: number, c: number, weave: LibraryWeave | null} | null>(null);

    const updateGridSize = (warps: number, wefts: number) => {
        const next = Array.from({ length: wefts }, (_, r) => Array.from({ length: warps }, (_, c) => state.cells[r]?.[c] || DEFAULT_CELL(r * warps + c)));
        setState(prev => ({ ...prev, warpSystems: warps, weftSystems: wefts, cells: next, warpArrangement: Array.from({length: warps}, (_, i) => i), weftArrangement: Array.from({length: wefts}, (_, i) => i) }));
    };

    const updateCell = (r: number, c: number, updates: Partial<WeaveStudioCell>) => {
        const next = state.cells.map(row => [...row]);
        next[r][c] = { ...next[r][c], ...updates };
        setState(prev => ({ ...prev, cells: next }));
    };

    const composition = useMemo(() => {
        let finalW = state.warpArrangement.length, finalH = state.weftArrangement.length;
        for(let s = 0; s < state.warpSystems; s++) {
            let sysW = 1; for(let r = 0; r < state.weftSystems; r++) sysW = lcm(sysW, state.cells[r][s].weave?.draft[0].length || 1);
            const count = state.warpArrangement.filter(i => i === s).length;
            if (count > 0) finalW = lcm(finalW, (lcm(sysW, count)/count) * state.warpArrangement.length);
        }
        for(let s = 0; s < state.weftSystems; s++) {
            let sysH = 1; for(let c = 0; c < state.warpSystems; c++) sysH = lcm(sysH, state.cells[s][c].weave?.pegPlan.length || 1);
            const count = state.weftArrangement.filter(i => i === s).length;
            if (count > 0) finalH = lcm(finalH, (lcm(sysH, count)/count) * state.weftArrangement.length);
        }
        finalW = Math.min(finalW, 256); finalH = Math.min(finalH, 256);

        const grid = Array.from({ length: finalH }, () => new Array(finalW).fill(0));
        const colorMatrix = Array.from({ length: finalH }, () => new Array(finalW).fill('#000'));
        
        for (let y = 0; y < finalH; y++) {
            const wIdx = state.weftArrangement[y % state.weftArrangement.length];
            const fullY = Math.floor(y / state.weftArrangement.length);
            let lyb = fullY * state.weftArrangement.filter(i => i === wIdx).length;
            for(let k=0; k<(y % state.weftArrangement.length); k++) if(state.weftArrangement[k] === wIdx) lyb++;

            for (let x = 0; x < finalW; x++) {
                const waIdx = state.warpArrangement[x % state.warpArrangement.length];
                const fullX = Math.floor(x / state.warpArrangement.length);
                let lxb = fullX * state.warpArrangement.filter(i => i === waIdx).length;
                for(let k=0; k<(x % state.warpArrangement.length); k++) if(state.warpArrangement[k] === waIdx) lxb++;

                const cell = state.cells[wIdx][waIdx];
                let up = false;
                if (cell.forceState === 'up') up = true;
                else if (cell.forceState === 'down') up = false;
                else if (cell.weave) {
                    const w = cell.weave.draft[0].length, h = cell.weave.pegPlan.length;
                    const lx = ((lxb + cell.offsetX)%w+w)%w, ly = ((lyb + cell.offsetY)%h+h)%h;
                    const wToH = new Array(w).fill(-1);
                    for(let i=0; i<w; i++) for(let j=0; j<cell.weave.harnesses; j++) if(cell.weave.draft[j][i] === 1) { wToH[i] = j; break; }
                    up = (wToH[lx] !== -1 && cell.weave.pegPlan[ly][wToH[lx]] === 1);
                    if (cell.faceMode === 'back') up = !up;
                } else up = (x + y) % 2 === 0;

                grid[y][x] = up ? 1 : 0;
                colorMatrix[y][x] = up ? cell.color : '#111827';
            }
        }
        const h = Math.min(finalW, 64);
        return { 
            weave: { id: `comp-${Date.now()}`, name: complexName, harnesses: h, draft: Array.from({length: h}, (_, i) => Array.from({length: finalW}, (_, j) => j%h===i?1:0)), pegPlan: Array.from({length: finalH}, (_, i) => Array.from({length: h}, (_, j) => grid[i][j%finalW]===1?1:0)) } as LibraryWeave,
            w: finalW, h: finalH, colors: colorMatrix
        };
    }, [state, complexName]);

    return (
        <div className="flex h-full w-full bg-gray-950 text-white overflow-hidden font-sans">
            <div className="w-72 border-r border-gray-800 flex flex-col bg-gray-900 shrink-0">
                <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-4">Structure Bank</h2><input type="text" placeholder="Search..." className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-xs focus:border-blue-500 outline-none" /></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {WEAVE_LIBRARY.map(w => (
                        <div key={w.id} draggable onDragStart={e => e.dataTransfer.setData('weave-obj', JSON.stringify(w))} className="group flex flex-col bg-gray-800/40 border border-gray-700 rounded-lg p-3 hover:border-blue-500 cursor-grab transition-all">
                            <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-gray-400 uppercase truncate">{w.name}</span><span className="text-[8px] bg-blue-900/50 text-blue-400 px-1.5 rounded font-bold">{w.harnesses}H</span></div>
                            <WeaveThumbnail weave={w} className="w-full aspect-video border-none shadow-lg opacity-80 group-hover:opacity-100" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
                <div className="h-16 border-b border-gray-800 bg-gray-900/50 flex items-center px-6 justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-gray-800"><label className="text-[10px] font-bold text-gray-500 uppercase px-2">Grid</label><input type="number" min="1" max="4" value={state.warpSystems} onChange={e => updateGridSize(parseInt(e.target.value)||1, state.weftSystems)} className="w-10 bg-gray-800 border-none rounded text-center text-xs font-bold text-blue-400 py-1" /><span className="text-gray-600">×</span><input type="number" min="1" max="4" value={state.weftSystems} onChange={e => updateGridSize(state.warpSystems, parseInt(e.target.value)||1)} className="w-10 bg-gray-800 border-none rounded text-center text-xs font-bold text-blue-400 py-1" /></div>
                        <input type="text" value={complexName} onChange={e => setComplexName(e.target.value)} className="bg-transparent border-b border-gray-800 focus:border-blue-500 outline-none text-sm font-bold text-white w-48 py-1" />
                    </div>
                    <button onClick={() => onSaveToLibrary(composition.weave)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-2 transition-all"><PlusIcon className="w-4 h-4" /> Save Structure</button>
                </div>
                <div className="flex-1 overflow-auto p-12 custom-scrollbar flex items-start justify-center">
                    <div className="grid gap-6 p-6 bg-white/5 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md" style={{ gridTemplateColumns: `repeat(${state.warpSystems}, 240px)`, gridTemplateRows: `repeat(${state.weftSystems}, 240px)` }}>
                        {state.cells.map((row, r) => row.map((cell, c) => <WeaveBox key={`${r}-${c}`} cell={cell} onUpdate={(u) => updateCell(r, c, u)} warpLabel={`Warp ${c+1}`} weftLabel={`Weft ${r+1}`} onDesign={() => setPixelEditor({ r, c, weave: cell.weave })} />))}
                    </div>
                </div>
            </div>

            <div className="w-96 border-l border-gray-800 bg-gray-900 flex flex-col shrink-0 shadow-2xl">
                <div className="p-6 border-b border-gray-800 bg-black/20">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Composite Result</h3>
                        <div className="flex bg-gray-800 rounded p-1 border border-gray-700">
                             <button onClick={() => setIsColorPreview(!isColorPreview)} className={`px-2 py-1 text-[9px] font-bold rounded uppercase transition-all flex items-center gap-1 ${isColorPreview ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}><PaletteIcon className="w-3 h-3" /> {isColorPreview ? 'Colored' : 'Structure'}</button>
                             <div className="w-px h-3 bg-gray-600 mx-1 self-center"></div>
                             <button onClick={() => setIsTiled(false)} className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${!isTiled ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Unit</button>
                             <button onClick={() => setIsTiled(true)} className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${isTiled ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Fabric</button>
                        </div>
                    </div>
                    <div className="aspect-square relative p-4 bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden shadow-inner flex items-center justify-center">
                        {isColorPreview ? (
                            <div className="w-full h-full relative overflow-hidden" style={{ transform: `scale(${isTiled ? 0.25 : 1})`, transformOrigin: 'top left', width: isTiled ? '400%' : '100%', height: isTiled ? '400%' : '100%' }}>
                                <InteractiveGrid data={composition.colors} isColorGrid showGrid={false} renderRows={composition.h} renderCols={composition.w} width={isTiled ? 1200 : 320} height={isTiled ? 1200 : 320} className="w-full h-full" />
                            </div>
                        ) : <WeaveThumbnail weave={composition.weave} faceMode="face" tile={isTiled} forceScale={isTiled ? 4 : 6} className="w-full h-full border-none bg-transparent" />}
                        {!isTiled && (
                            <>
                                <div className="absolute top-1 left-8 right-8 flex justify-between px-2 text-[8px] font-mono text-gray-700 uppercase tracking-tighter pointer-events-none"><span>1</span><span>{composition.w} Ends</span><span>{composition.w}</span></div>
                                <div className="absolute top-8 bottom-8 left-1 flex flex-col justify-between py-2 text-[8px] font-mono text-gray-700 uppercase pointer-events-none text-right w-6"><span>1</span><div className="transform -rotate-90 origin-center whitespace-nowrap">{composition.h} Picks</div><span>{composition.h}</span></div>
                            </>
                        )}
                    </div>
                    <div className="mt-6 flex justify-between items-center bg-black/40 rounded-xl p-3 border border-gray-800 text-center">
                        <div className="flex-1"><div className="text-[8px] font-black text-blue-500 uppercase mb-1">Total Ends</div><div className="text-lg font-black text-white font-mono">{composition.w}</div></div>
                        <div className="w-px h-8 bg-gray-800"></div>
                        <div className="flex-1"><div className="text-[8px] font-black text-emerald-500 uppercase mb-1">Total Picks</div><div className="text-lg font-black text-white font-mono">{composition.h}</div></div>
                    </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                    <div className="bg-black/40 rounded-xl p-4 border border-gray-800 space-y-5 shadow-inner">
                        <div><div className="flex justify-between items-center mb-1"><span className="text-[10px] text-gray-500 font-bold uppercase">Warp Map</span><span className="text-[9px] font-mono text-gray-400">{state.warpArrangement.map(v => v+1).join(':')}</span></div><div className="flex h-1.5 bg-gray-800 rounded-full overflow-hidden">{state.warpArrangement.map((s, i) => <div key={i} className="h-full flex-1" style={{ backgroundColor: state.cells[0][s]?.weave ? state.cells[0][s].color : '#1f2937' }} />)}</div></div>
                        <div><div className="flex justify-between items-center mb-1"><span className="text-[10px] text-gray-500 font-bold uppercase">Weft Map</span><span className="text-[9px] font-mono text-gray-400">{state.weftArrangement.map(v => v+1).join(':')}</span></div><div className="flex h-1.5 bg-gray-800 rounded-full overflow-hidden">{state.weftArrangement.map((s, i) => <div key={i} className="h-full flex-1" style={{ backgroundColor: state.cells[s][0]?.weave ? state.cells[s][0].color : '#1f2937' }} />)}</div></div>
                    </div>
                    <button onClick={() => { if (state.warpSystems >= 2 && state.weftSystems >= 2) { updateCell(0, 1, { forceState: 'up' }); updateCell(1, 0, { forceState: 'down' }); } }} className="w-full py-3 px-4 bg-gray-800 border border-gray-700 hover:border-emerald-500 rounded-xl text-left transition-all group">
                        <div className="text-xs font-bold text-gray-200 group-hover:text-emerald-400">Separation Preset</div>
                        <div className="text-[9px] text-gray-500 font-medium">Standard 2-layer structural offset</div>
                    </button>
                </div>
            </div>

            {pixelEditor && <CustomWeaveModal isOpen={!!pixelEditor} onClose={() => setPixelEditor(null)} onSave={(w) => { updateCell(pixelEditor.r, pixelEditor.c, { weave: w, forceState: 'none' }); setPixelEditor(null); }} initialWeave={pixelEditor.weave || undefined} />}
        </div>
    );
};
