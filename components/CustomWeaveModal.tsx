
import React, { useState, useRef, useEffect } from 'react';
import { LibraryWeave } from '../types';
import { InteractiveGrid } from './InteractiveGrid';
import { CheckIcon, TrashIcon, InvertIcon } from './icons';

interface CustomWeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (weave: LibraryWeave) => void;
    initialWeave?: LibraryWeave;
}

export const CustomWeaveModal: React.FC<CustomWeaveModalProps> = ({ isOpen, onClose, onSave, initialWeave }) => {
    const [size, setSize] = useState(8);
    const [name, setName] = useState('New Unit');
    const [grid, setGrid] = useState<boolean[][]>(() => 
        Array.from({ length: 8 }, () => Array(8).fill(false))
    );
    const isDrawing = useRef(false);
    const drawMode = useRef(true);

    useEffect(() => {
        if (isOpen) {
            if (initialWeave) {
                const s = initialWeave.draft[0].length;
                setSize(s);
                setName(initialWeave.name);
                
                const w = initialWeave.draft[0].length;
                const h = initialWeave.pegPlan.length;
                const harnesses = initialWeave.harnesses;
                const newGrid = Array.from({ length: h }, () => Array(w).fill(false));
                
                // Construct grid from pegPlan and draft
                const warpToHarness = new Array(w).fill(-1);
                for(let i=0; i<w; i++) for(let j=0; j<harnesses; j++) if(initialWeave.draft[j][i] === 1) { warpToHarness[i] = j; break; }
                
                for(let y=0; y<h; y++) {
                    for(let x=0; x<w; x++) {
                        const hIdx = warpToHarness[x];
                        newGrid[y][x] = hIdx !== -1 && initialWeave.pegPlan[y][hIdx] === 1;
                    }
                }
                setGrid(newGrid);
            } else {
                setGrid(Array.from({ length: size }, () => Array(size).fill(false)));
            }
        }
    }, [isOpen, initialWeave]);

    const handleInteraction = (r: number, c: number, type: 'down' | 'enter' | 'up') => {
        if (type === 'down') {
            isDrawing.current = true;
            drawMode.current = !grid[r][c];
            const next = grid.map(row => [...row]);
            next[r][c] = drawMode.current;
            setGrid(next);
        } else if (type === 'enter' && isDrawing.current) {
            const next = grid.map(row => [...row]);
            next[r][c] = drawMode.current;
            setGrid(next);
        } else if (type === 'up') {
            isDrawing.current = false;
        }
    };

    const handleSave = () => {
        const harnesses = size;
        const draft = Array.from({ length: harnesses }, (_, h) => Array.from({ length: size }, (_, w) => (w % harnesses) === h ? 1 : 0));
        const pegPlan = Array.from({ length: size }, (_, p) => Array.from({ length: harnesses }, (_, h) => grid[p][h] ? 1 : 0));
        
        onSave({
            id: initialWeave?.id || `custom-${Date.now()}`,
            name,
            category: 'Custom',
            description: 'Created in Pixel Editor',
            harnesses,
            draft,
            pegPlan
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">PIXEL WEAVE EDITOR</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Design a structural unit</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>

                <div className="p-8 bg-gray-950 flex flex-col items-center gap-8">
                    <div className="flex gap-4 items-center bg-gray-900 p-2 rounded-2xl border border-gray-800">
                         <div className="flex flex-col items-center px-4">
                            <span className="text-[9px] font-bold text-gray-500 uppercase mb-1">Unit Size</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSize(Math.max(2, size-1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 rounded border border-gray-700 text-gray-400 hover:text-white">-</button>
                                <span className="font-mono font-black text-blue-400 w-6 text-center">{size}</span>
                                <button onClick={() => setSize(Math.min(24, size+1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 rounded border border-gray-700 text-gray-400 hover:text-white">+</button>
                            </div>
                         </div>
                         <div className="w-px h-8 bg-gray-800"></div>
                         <div className="flex-1 px-4">
                             <span className="text-[9px] font-bold text-gray-500 uppercase mb-1">Unit Name</span>
                             <input value={name} onChange={e => setName(e.target.value)} className="bg-transparent text-sm font-bold text-white outline-none border-b border-gray-700 focus:border-blue-500 transition-colors w-full" />
                         </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5 shadow-inner">
                        <InteractiveGrid 
                            data={grid} 
                            renderRows={size} 
                            renderCols={size} 
                            onCellInteraction={handleInteraction}
                            activeColor="#3b82f6"
                            width={320} 
                            height={320} 
                            gridDivision={4}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setGrid(grid.map(r => r.map(() => false)))} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-[10px] font-bold text-gray-400 uppercase transition-all"><TrashIcon className="w-3.5 h-3.5"/> Clear</button>
                        <button onClick={() => setGrid(grid.map(r => r.map(c => !c)))} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-[10px] font-bold text-gray-400 uppercase transition-all"><InvertIcon className="w-3.5 h-3.5"/> Invert</button>
                    </div>
                </div>

                <div className="p-6 bg-gray-900 border-t border-gray-800 flex justify-end">
                    <button onClick={handleSave} className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95">
                        <CheckIcon className="w-4 h-4" /> Save to Library
                    </button>
                </div>
            </div>
        </div>
    );
};
