
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { YarnDefinition } from '../types';
import { expandPatternString, compressPatternString } from '../utils/patternParser';
import { generateYarnTexture } from '../services/yarnRenderer';
import { ZoomInIcon, ZoomOutIcon, ResetZoomIcon } from './icons';

interface VisualPatternStudioProps {
    warpPatternString: string;
    weftPatternString: string;
    onUpdateWarpPattern: (str: string) => void;
    onUpdateWeftPattern: (str: string) => void;
    warpYarns: { [key: string]: YarnDefinition };
    weftYarns: { [key: string]: YarnDefinition };
    structure?: boolean[][]; // The weave interlacement
    epi: number;
    ppi: number;
}

export const VisualPatternStudio: React.FC<VisualPatternStudioProps> = ({
    warpPatternString, weftPatternString, onUpdateWarpPattern, onUpdateWeftPattern,
    warpYarns, weftYarns, structure, epi, ppi
}) => {
    const [activeBank, setActiveBank] = useState<'warp' | 'weft'>('warp');
    const [selectedYarnId, setSelectedYarnId] = useState<string>('A');
    const [scale, setScale] = useState(1.5); 
    
    const [localWarp, setLocalWarp] = useState<string[]>([]);
    const [localWeft, setLocalWeft] = useState<string[]>([]);
    
    const [isDragging, setIsDragging] = useState(false);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textureCache = useRef(new Map<string, HTMLCanvasElement>());

    useEffect(() => {
        setLocalWarp(expandPatternString(warpPatternString));
        setLocalWeft(expandPatternString(weftPatternString));
    }, [warpPatternString, weftPatternString]);

    // Pre-render Yarn Textures
    useEffect(() => {
        ['A','B','C','D','E','F','G','H'].forEach(char => {
            if (warpYarns[char] && !textureCache.current.has(`warp-${char}`)) {
                textureCache.current.set(`warp-${char}`, generateYarnTexture(warpYarns[char], 96)); 
            }
            if (weftYarns[char] && !textureCache.current.has(`weft-${char}`)) {
                textureCache.current.set(`weft-${char}`, generateYarnTexture(weftYarns[char], 96));
            }
        });
    }, [warpYarns, weftYarns]);

    const paint = (x: number, y: number) => {
        if (activeBank === 'warp') {
            const index = Math.floor(x / (20 * scale));
            if (index >= 0) {
                setLocalWarp(prev => {
                    const next = [...prev];
                    while(next.length <= index) next.push(prev[prev.length-1] || 'A');
                    next[index] = selectedYarnId;
                    return next;
                });
            }
        } else {
            const index = Math.floor(y / (20 * scale));
            if (index >= 0) {
                setLocalWeft(prev => {
                    const next = [...prev];
                    while(next.length <= index) next.push(prev[prev.length-1] || 'A');
                    next[index] = selectedYarnId;
                    return next;
                });
            }
        }
    };

    const handleSave = () => {
        onUpdateWarpPattern(compressPatternString(localWarp));
        onUpdateWeftPattern(compressPatternString(localWeft));
    };

    // --- MAIN RENDERER ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !containerRef.current) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const cellW = 20 * scale; 
        const cellH = 20 * scale; 
        
        const rows = Math.max(20, localWeft.length + 10);
        const cols = Math.max(20, localWarp.length + 10);
        
        canvas.width = Math.max(containerRef.current.clientWidth, cols * cellW);
        canvas.height = Math.max(containerRef.current.clientHeight, rows * cellH);
        
        ctx.fillStyle = '#111827';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        
        const structRows = structure ? structure.length : 0;
        const structCols = (structure && structure[0]) ? structure[0].length : 0;

        const TEX_SCALE = 4.0;

        const drawThread = (tex: HTMLCanvasElement, x: number, y: number, w: number, h: number, isVertical: boolean, index: number) => {
            if (!tex) return;
            ctx.save();
            ctx.translate(x + w/2, y + h/2);
            if (isVertical) {
                ctx.rotate(Math.PI/2);
                const dw = w * TEX_SCALE * 0.8; 
                const dh = h * 1.1; 
                const noise = (Math.sin(index * 12.9898) * 43758.5453) % 1;
                const offset = Math.floor(Math.abs(noise) * tex.width);
                ctx.drawImage(tex, offset % (tex.width-h), 0, h, tex.height, -dh/2, -dw/2, dh, dw);
            } else {
                const dh = h * TEX_SCALE * 0.8;
                const dw = w * 1.1;
                const noise = (Math.sin(index * 12.9898) * 43758.5453) % 1;
                const offset = Math.floor(Math.abs(noise) * tex.width);
                ctx.drawImage(tex, offset % (tex.width-w), 0, w, tex.height, -dw/2, -dh/2, dw, dh);
            }
            ctx.restore();
        };

        // Render Loop
        for (let r = 0; r < rows; r++) {
            const weftChar = localWeft[r % localWeft.length] || 'A';
            const weftTex = textureCache.current.get(`weft-${weftChar}`);
            
            for (let c = 0; c < cols; c++) {
                const warpChar = localWarp[c % localWarp.length] || 'A';
                const warpTex = textureCache.current.get(`warp-${warpChar}`);
                
                // Determine Over/Under
                let isWarpUp = false;
                if (structRows > 0 && structCols > 0) {
                    isWarpUp = structure![r % structRows][c % structCols];
                } else {
                    isWarpUp = (r + c) % 2 === 0;
                }
                
                const x = c * cellW;
                const y = r * cellH;
                
                // Draw Base
                if (isWarpUp) {
                    if (weftTex) drawThread(weftTex, x, y, cellW, cellH, false, r);
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(x,y,cellW,cellH);
                    if (warpTex) drawThread(warpTex, x, y, cellW, cellH, true, c);
                } else {
                    if (warpTex) drawThread(warpTex, x, y, cellW, cellH, true, c);
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(x,y,cellW,cellH);
                    if (weftTex) drawThread(weftTex, x, y, cellW, cellH, false, r);
                }
            }
        }
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'; 
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        
        if (activeBank === 'warp') {
            const len = localWarp.length;
            ctx.strokeRect(0, 0, len * cellW, canvas.height);
            ctx.fillText("Active Warp Area", 5, 15);
        } else {
            const len = localWeft.length;
            ctx.strokeRect(0, 0, canvas.width, len * cellH);
            ctx.fillText("Active Weft Area", 5, 15);
        }

    }, [localWarp, localWeft, structure, scale, activeBank, warpYarns, weftYarns]);

    const handleInteract = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        paint(x, y);
    };

    return (
        <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
            {/* TOOLBAR */}
            <div className="h-14 border-b border-gray-200 flex items-center px-4 justify-between bg-white shrink-0">
                <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                    <button 
                        onClick={() => setActiveBank('warp')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeBank === 'warp' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Warp Mode
                    </button>
                    <button 
                        onClick={() => setActiveBank('weft')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeBank === 'weft' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Weft Mode
                    </button>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase mr-2">Paint Yarn</span>
                    {Object.keys(activeBank === 'warp' ? warpYarns : weftYarns).sort().map(char => (
                        <button
                            key={char}
                            onClick={() => setSelectedYarnId(char)}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-[10px] transition-all relative ${selectedYarnId === char ? 'border-blue-600 scale-110 shadow-md' : 'border-transparent hover:border-gray-300'}`}
                            style={{ backgroundColor: (activeBank === 'warp' ? warpYarns : weftYarns)[char].color }}
                        >
                            <span className="bg-black/20 text-white px-1 rounded backdrop-blur-[1px]">{char}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 text-gray-500 hover:text-blue-600 rounded"><ZoomOutIcon className="w-4 h-4"/></button>
                    <button onClick={() => setScale(1.5)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded"><ResetZoomIcon className="w-4 h-4"/></button>
                    <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="p-1.5 text-gray-500 hover:text-blue-600 rounded"><ZoomInIcon className="w-4 h-4"/></button>
                </div>
            </div>

            {/* CANVAS AREA */}
            <div className="flex-1 bg-gray-900 overflow-auto custom-scrollbar relative flex flex-col" ref={containerRef}>
                <canvas 
                    ref={canvasRef}
                    onMouseDown={(e) => { setIsDragging(true); handleInteract(e); }}
                    onMouseMove={(e) => isDragging && handleInteract(e)}
                    onMouseUp={() => { setIsDragging(false); handleSave(); }}
                    onMouseLeave={() => { setIsDragging(false); handleSave(); }}
                    className="cursor-crosshair block"
                />
            </div>
            
            <div className="bg-gray-800 text-gray-400 text-[10px] p-1 px-4 flex justify-between">
                <span>Visualizing {localWarp.length} threads x {localWeft.length} picks</span>
                <span>Drag to paint {activeBank} threads</span>
            </div>
        </div>
    );
};
