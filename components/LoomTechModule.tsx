
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { JacquardData, LoomTechState, LoomConfiguration, LoomHookZone, WeaveSettings, YarnDefinition, LibraryWeave } from '../types';
import { TerminalIcon, ZoomInIcon, ZoomOutIcon, WeaveIcon, EyeIcon, EyeOffIcon, GridIcon, SettingsIcon, PencilIcon, CheckIcon, RulerIcon } from './icons';
import { WEAVE_LIBRARY } from '../services/weaveLibrary';
import { WeaveThumbnail } from './WeaveThumbnail';

interface LoomTechModuleProps {
    data: JacquardData;
    settings: WeaveSettings;
    weftYarns: { [key: string]: YarnDefinition };
    weftPatternString: string;
    warpYarns: { [key: string]: YarnDefinition };
    warpPatternString: string;
    techState: LoomTechState;
    onTechStateUpdate: (state: LoomTechState) => void;
    config: LoomConfiguration;
    onConfigUpdate: (config: LoomConfiguration) => void;
}

/**
 * HIGH PERFORMANCE CANVAS RENDERER
 * Supports solid "Data Map" rendering for View Mode.
 */
const OptimizedCanvas: React.FC<{
    width: number;
    height: number;
    scale: number;
    aspectRatio: number;
    renderFn: (ctx: CanvasRenderingContext2D, cellW: number, cellH: number) => void;
    onInteract?: (row: number, col: number) => void;
    className?: string;
}> = ({ width, height, scale, aspectRatio, renderFn, onInteract, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cellW = 5 * scale;
    const cellH = (5 * scale) * aspectRatio;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        canvas.width = width * cellW;
        canvas.height = height * cellH;
        
        ctx.fillStyle = '#ffffff'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        renderFn(ctx, cellW, cellH);
    }, [width, height, scale, aspectRatio, renderFn]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!onInteract || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / (rect.width / width));
        const row = Math.floor(y / (rect.height / height));
        onInteract(row, col);
    };

    return (
        <canvas 
            ref={canvasRef} 
            onMouseDown={handleMouseDown}
            className={className} 
            style={{ width: width * cellW, height: height * cellH }}
        />
    );
};

export const LoomTechModule: React.FC<LoomTechModuleProps> = ({
    data, settings, weftYarns, weftPatternString, warpYarns, warpPatternString,
    techState, onTechStateUpdate, config, onConfigUpdate
}) => {
    const [workflow, setWorkflow] = useState<'view' | 'edit'>('view');
    const [scale, setScale] = useState(workflow === 'edit' ? 2.5 : 1.0);
    const [showSelvedge, setShowSelvedge] = useState(true);
    const [viewMode, setViewMode] = useState<'graph' | 'interlace'>('graph');
    const [useEpiPpiRatio, setUseEpiPpiRatio] = useState(false);
    const [autoMapWeft, setAutoMapWeft] = useState(true);
    const [activeSelvedgeZone, setActiveSelvedgeZone] = useState<string | null>(null);

    const scrollRefControl = useRef<HTMLDivElement>(null);
    const scrollRefDesign = useRef<HTMLDivElement>(null);

    const currentAspectRatio = useEpiPpiRatio ? (settings.epi / settings.ppi) : 1.0;

    // View mode is a solid "Map", Edit mode shows the grid "Pixels"
    const isEditing = workflow === 'edit';
    const maxZoom = isEditing ? 8.0 : 1.5;
    const minZoom = 0.1;

    useEffect(() => {
        if (workflow === 'edit') setScale(3.0);
        else setScale(1.0);
    }, [workflow]);

    const handleVerticalScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const top = e.currentTarget.scrollTop;
        if (scrollRefControl.current) scrollRefControl.current.scrollTop = top;
        if (scrollRefDesign.current) scrollRefDesign.current.scrollTop = top;
    };

    const handleAssignWeave = (zoneId: string, weaveId: string) => {
        const nextZones = config.zones.map(z => z.id === zoneId ? { ...z, weaveId } : z);
        onConfigUpdate({ ...config, zones: nextZones });
    };

    const selvedgeZones = config.zones.filter(z => z.type === 'selvedge');
    const designZones = config.zones.filter(z => z.type === 'design');
    
    const visibleDesignHooks = useMemo(() => {
        if (isEditing) return data.width; 
        if (showSelvedge) return config.totalHooks;
        return designZones.reduce((acc, z) => acc + (z.endHook - z.startHook + 1), 0);
    }, [workflow, showSelvedge, config.totalHooks, designZones, data.width]);

    const weftSequence = useMemo(() => {
        const regex = /(\d+)([A-Z])/gi;
        let match;
        const seq: string[] = [];
        const pattern = weftPatternString || "1A";
        while ((match = (regex.exec(pattern) as any)) !== null) {
            const count = parseInt(match[1]);
            const char = match[2].toUpperCase();
            for(let i=0; i<count; i++) seq.push(char);
        }
        return seq.length > 0 ? seq : ['A'];
    }, [weftPatternString]);

    const warpColorsArray = useMemo(() => {
        const seq = (warpPatternString.match(/(\d+)([A-Z])/gi) || []) as string[];
        const flat: string[] = [];
        seq.forEach(s => {
            const count = parseInt(s);
            const char = s.slice(-1).toUpperCase();
            const color = warpYarns[char]?.color || '#888';
            for (let i = 0; i < count; i++) flat.push(color);
        });
        return flat;
    }, [warpPatternString, warpYarns]);

    const weftColorsArray = useMemo(() => {
        const seq = (weftPatternString.match(/(\d+)([A-Z])/gi) || []) as string[];
        const flat: string[] = [];
        seq.forEach(s => {
            const count = parseInt(s);
            const char = s.slice(-1).toUpperCase();
            const color = weftYarns[char]?.color || '#888';
            for (let i = 0; i < count; i++) flat.push(color);
        });
        return flat;
    }, [weftPatternString, weftYarns]);

    const hookMap = useMemo(() => {
        const map = new Array(config.totalHooks + 1);
        for (let h = 1; h <= config.totalHooks; h++) {
            const zone = config.zones.find(z => h >= z.startHook && h <= z.endHook);
            if (zone) {
                let weaveBits = null;
                let weaveWidth = 1, weaveHeight = 1;
                if (zone.type === 'selvedge' && zone.weaveId) {
                    const weave = WEAVE_LIBRARY.find(w => w.id === zone.weaveId);
                    if (weave) {
                        const { draft, pegPlan, harnesses } = weave;
                        weaveWidth = draft[0].length; weaveHeight = pegPlan.length;
                        weaveBits = new Uint8Array(weaveWidth * weaveHeight);
                        const warpToH = new Int16Array(weaveWidth).fill(-1);
                        for(let x=0; x<weaveWidth; x++) for(let ha=0; ha<harnesses; ha++) if(draft[ha][x] === 1) { warpToH[x] = ha; break; }
                        for(let y=0; y<weaveHeight; y++) for(let x=0; x<weaveWidth; x++) if(warpToH[x] !== -1 && pegPlan[y][warpToH[x]] === 1) weaveBits[y * weaveWidth + x] = 1;
                    }
                }
                map[h] = { type: zone.type, color: zone.color, startHook: zone.startHook, weaveBits, weaveWidth, weaveHeight };
            } else {
                map[h] = { type: 'empty', color: '#f8fafc' };
            }
        }
        return map;
    }, [config.zones, config.totalHooks]);

    const renderDesign = useCallback((ctx: CanvasRenderingContext2D, cellW: number, cellH: number) => {
        const designW = data.width, designS = data.structure;
        const isInterlace = viewMode === 'interlace';
        const gap = isEditing ? 0.5 : 0; // Remove grid gap in View mode for "Tape" look
        let renderX = 0;

        if (isEditing) {
            for (let x = 0; x < designW; x++) {
                const rx = x * cellW;
                for (let y = 0; y < data.height; y++) {
                    const ry = y * cellH;
                    const bit = designS[y * designW + x] === 1;
                    if (bit) ctx.fillStyle = isInterlace ? (warpColorsArray[x % warpColorsArray.length] || '#000') : '#1e293b';
                    else ctx.fillStyle = isInterlace ? (weftColorsArray[y % weftColorsArray.length] || '#ccc') : '#f1f5f9';
                    ctx.fillRect(rx, ry, cellW - gap, cellH - gap);
                }
            }
            return;
        }

        // View Mode
        for (let h = 1; h <= config.totalHooks; h++) {
            const hDef = hookMap[h];
            if (!hDef) continue;
            if (!showSelvedge && hDef.type === 'selvedge') continue;

            const x = renderX * cellW;
            for (let p = 0; p < data.height; p++) {
                const y = p * cellH;
                let bit = false;
                if (hDef.type === 'design') {
                    bit = designS[p * designW + ((h - hDef.startHook) % designW)] === 1;
                } else if (hDef.type === 'selvedge' && hDef.weaveBits) {
                    bit = hDef.weaveBits[(p % hDef.weaveHeight) * hDef.weaveWidth + ((h - hDef.startHook) % hDef.weaveWidth)] === 1;
                }

                if (bit) {
                    ctx.fillStyle = isInterlace ? (warpColorsArray[(h-1)%warpColorsArray.length] || '#000') : '#1e293b';
                } else {
                    ctx.fillStyle = isInterlace ? (weftColorsArray[p%weftColorsArray.length] || '#ccc') : '#f1f5f9';
                }
                ctx.fillRect(x, y, cellW, cellH); // No gap in View mode
            }
            renderX++;
        }
    }, [workflow, hookMap, data.structure, data.width, data.height, viewMode, showSelvedge, config.totalHooks, warpColorsArray, weftColorsArray]);

    const renderSelectors = useCallback((ctx: CanvasRenderingContext2D, cellW: number, cellH: number) => {
        const gap = isEditing ? 0.5 : 0;
        const weftSelectorIndices = techState.columns
            .map((c, i) => c?.type === 'weft-selector' ? i : -1)
            .filter(i => i !== -1);

        for (let p = 0; p < data.height; p++) {
            const y = p * cellH;
            const currentYarnChar = weftSequence[p % weftSequence.length];
            const yarnIdx = currentYarnChar.charCodeAt(0) - 65; 

            for (let s = 0; s < config.selectorHooks; s++) {
                const col = techState.columns[s];
                let bit = techState.grid[p]?.[s] || false;
                
                if (col && autoMapWeft && col.type === 'weft-selector') {
                    const selectorOrder = weftSelectorIndices.indexOf(s);
                    bit = selectorOrder === yarnIdx;
                }

                ctx.fillStyle = bit ? (col?.color || '#3b82f6') : '#f1f5f9';
                ctx.fillRect(s * cellW, y, cellW - gap, cellH - gap);
            }
        }
    }, [workflow, techState.grid, techState.columns, config.selectorHooks, data.height, weftSequence, autoMapWeft]);

    const handleSelectorEdit = (row: number, col: number) => {
        if (!isEditing) return;
        const nextGrid = [...techState.grid.map(r => [...r])];
        if (nextGrid[row]) {
            nextGrid[row][col] = !nextGrid[row][col];
            onTechStateUpdate({ ...techState, grid: nextGrid });
        }
    };

    return (
        <div className="flex h-full bg-white text-gray-900 overflow-hidden font-sans">
            {/* SIDEBAR */}
            <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50 shrink-0 z-10 shadow-lg overflow-y-auto custom-scrollbar">
                <div className="p-5 border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-3 mb-6">
                        <TerminalIcon className="w-6 h-6 text-blue-600" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">Tech Module</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Workflow Toggle */}
                        <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-inner">
                            <button 
                                onClick={() => setWorkflow('view')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${workflow === 'view' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <EyeIcon className="w-3.5 h-3.5" /> View
                            </button>
                            <button 
                                onClick={() => setWorkflow('edit')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${workflow === 'edit' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <PencilIcon className="w-3.5 h-3.5" /> Edit
                            </button>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                            <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Display Controls</h3>
                            <div className="flex bg-white rounded p-1 border border-gray-200 shadow-sm">
                                <button onClick={() => setViewMode('graph')} className={`flex-1 py-1.5 text-[9px] font-bold rounded transition-all flex items-center justify-center gap-1.5 ${viewMode === 'graph' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><GridIcon className="w-3 h-3" /> Graph</button>
                                <button onClick={() => setViewMode('interlace')} className={`flex-1 py-1.5 text-[9px] font-bold rounded transition-all flex items-center justify-center gap-1.5 ${viewMode === 'interlace' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><WeaveIcon className="w-3 h-3" /> Interlace</button>
                            </div>
                            
                            <div className="space-y-3 pt-1">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">Aspect Correction</span>
                                        <span className="text-[8px] text-gray-400 font-medium">Render in EPI:PPI Ratio</span>
                                    </div>
                                    <input type="checkbox" checked={useEpiPpiRatio} onChange={e => setUseEpiPpiRatio(e.target.checked)} className="rounded border-gray-300 text-blue-600 w-4 h-4 focus:ring-0 focus:ring-offset-0" />
                                </label>
                                
                                {!isEditing && (
                                    <label className="flex items-center justify-between cursor-pointer group border-t border-blue-100 pt-3">
                                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">Show Selvedges</span>
                                        <input type="checkbox" checked={showSelvedge} onChange={e => setShowSelvedge(e.target.checked)} className="rounded border-gray-300 text-blue-600 w-4 h-4 focus:ring-0 focus:ring-offset-0" />
                                    </label>
                                )}

                                <label className="flex items-center justify-between cursor-pointer group border-t border-blue-100 pt-3">
                                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">Auto-Map Weft</span>
                                    <input type="checkbox" checked={autoMapWeft} onChange={e => setAutoMapWeft(e.target.checked)} className="rounded border-gray-300 text-emerald-600 w-4 h-4 focus:ring-0 focus:ring-offset-0" />
                                </label>
                            </div>
                        </div>

                        {!isEditing && (
                            <div>
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Selvedge Definitions</h3>
                                <div className="space-y-3">
                                    {selvedgeZones.map(zone => (
                                        <div key={zone.id} className={`bg-white border border-gray-200 rounded-xl p-3 shadow-sm transition-opacity ${!showSelvedge ? 'opacity-30' : 'opacity-100'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[9px] font-black uppercase" style={{ color: zone.color }}>{zone.label}</span>
                                                <button disabled={!showSelvedge} onClick={() => setActiveSelvedgeZone(activeSelvedgeZone === zone.id ? null : zone.id)} className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Change</button>
                                            </div>
                                            {zone.weaveId ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded border border-gray-100 overflow-hidden"><WeaveThumbnail weave={WEAVE_LIBRARY.find(w => w.id === zone.weaveId)!} className="w-full h-full border-none" /></div>
                                                    <span className="text-[9px] font-bold text-gray-500 truncate">{WEAVE_LIBRARY.find(w => w.id === zone.weaveId)?.name}</span>
                                                </div>
                                            ) : <div className="py-2 text-center border border-dashed border-gray-200 rounded text-gray-400 text-[9px] font-bold uppercase">No Assignment</div>}
                                            {activeSelvedgeZone === zone.id && showSelvedge && (
                                                <div className="mt-2 grid grid-cols-4 gap-1.5 border-t border-gray-100 pt-2">
                                                    {WEAVE_LIBRARY.slice(0, 8).map(w => (
                                                        <button key={w.id} onClick={() => { handleAssignWeave(zone.id, w.id); setActiveSelvedgeZone(null); }} className={`aspect-square rounded border transition-all ${zone.weaveId === w.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-400'}`}><WeaveThumbnail weave={w} className="w-full h-full border-none opacity-60" /></button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {isEditing && (
                             <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-4">
                                <h3 className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Hardware Editor</h3>
                                <p className="text-[10px] text-orange-700 leading-relaxed italic">The grid is restored here for precision. Click cells in the selector column to program hardware bits.</p>
                                <div className="p-3 bg-white rounded border border-orange-200 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    <span className="text-[9px] font-black uppercase text-orange-900">Direct Edit Mode</span>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT SPLIT VIEW */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
                <div className={`h-12 border-b border-gray-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-20 transition-colors ${isEditing ? 'bg-orange-50' : 'bg-white'}`}>
                    <div className="flex items-center gap-6">
                        <div className="flex items-baseline gap-3">
                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${isEditing ? 'text-orange-700' : 'text-gray-800'}`}>
                                {isEditing ? 'Electronic Selector Editor' : 'Machine Addressing Map'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                                ADDR: 0 → {isEditing ? config.selectorHooks : config.totalHooks + config.selectorHooks}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
                            <button onClick={() => setScale(s => Math.max(minZoom, s - 0.2))} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"><ZoomOutIcon className="w-4 h-4" /></button>
                            <span className="px-3 text-[10px] font-mono font-black text-blue-600 select-none min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(maxZoom, s + 0.2))} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"><ZoomInIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full shadow-sm">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Logic Live</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden bg-white">
                    {/* LEFT PANE: SELECTORS (STATIC X, EDITABLE) */}
                    <div className="flex flex-col border-r-4 border-blue-100 shrink-0 bg-white shadow-xl relative z-10" style={{ width: config.selectorHooks * 5 * scale + 48 }}>
                        {/* Selector Header */}
                        <div className="h-20 border-b border-gray-200 bg-white flex shrink-0">
                             <div className="w-12 border-r border-gray-200 flex items-center justify-center text-[9px] font-black text-gray-300 uppercase [writing-mode:vertical-lr] rotate-180">PICK #</div>
                             <div className="flex-1 flex overflow-hidden">
                                {techState.columns.map(col => (
                                    <div key={col.id} className="h-full border-r border-gray-100 flex items-center justify-center bg-blue-50/20" style={{ width: 5 * scale }}>
                                        <div className="transform -rotate-90 origin-center whitespace-nowrap text-[6px] font-black uppercase text-blue-500" style={{ fontSize: `${Math.min(7, 7 * scale)}px` }}>{col.label}</div>
                                    </div>
                                ))}
                             </div>
                        </div>
                        {/* Selector Grid */}
                        <div ref={scrollRefControl} className={`flex-1 overflow-hidden no-scrollbar bg-white ${isEditing ? 'cursor-cell' : ''}`}>
                            <div className="flex">
                                <div className="w-12 bg-white border-r border-gray-200 shrink-0">
                                    {Array.from({ length: data.height }).map((_, i) => (
                                        <div key={i} className="flex items-center justify-center border-b border-gray-100 text-[9px] font-mono font-bold text-gray-300" style={{ height: (5 * scale) * currentAspectRatio }}>{i + 1}</div>
                                    ))}
                                </div>
                                <OptimizedCanvas 
                                    width={config.selectorHooks} 
                                    height={data.height} 
                                    scale={scale} 
                                    aspectRatio={currentAspectRatio}
                                    renderFn={renderSelectors}
                                    onInteract={isEditing ? handleSelectorEdit : undefined}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANE: DESIGN & SELVEDGE (SCROLLABLE X) */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
                         {/* Design Header */}
                         <div className="h-20 border-b border-gray-200 bg-white flex overflow-hidden">
                            <div className="flex relative" style={{ width: visibleDesignHooks * 5 * scale }}>
                                {!isEditing ? (
                                    config.zones.map(z => {
                                        if (!showSelvedge && z.type === 'selvedge') return null;
                                        const zWidth = (z.endHook - z.startHook + 1);
                                        return (
                                            <div key={z.id} className="h-full border-r border-gray-100 flex items-center justify-center bg-gray-50/50" style={{ width: zWidth * 5 * scale }}>
                                                <span className="text-[8px] font-black uppercase text-gray-400 truncate px-1 tracking-tight" style={{ color: viewMode === 'interlace' ? z.color : '#94a3b8' }}>{z.label}</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-full border-r border-orange-200 flex items-center justify-center bg-orange-50/50" style={{ width: data.width * 5 * scale }}>
                                        <span className="text-[9px] font-black uppercase text-orange-400 tracking-widest px-1">Design Unit Reference</span>
                                    </div>
                                )}
                            </div>
                         </div>
                         {/* Design Grid */}
                         <div ref={scrollRefDesign} className="flex-1 overflow-auto custom-scrollbar bg-white" onScroll={handleVerticalScroll}>
                             <OptimizedCanvas 
                                width={visibleDesignHooks} 
                                height={data.height} 
                                scale={scale} 
                                aspectRatio={currentAspectRatio}
                                renderFn={renderDesign} 
                             />
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
