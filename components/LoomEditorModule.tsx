
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LoomConfiguration, LoomHookZone, LoomTechState } from '../types';
import { ProcessorIcon, PlusIcon, TrashIcon, CheckIcon, PencilIcon, ZoomInIcon, ZoomOutIcon, ResetZoomIcon } from './icons';
import { LoomTechConfigModal } from './LoomTechConfigModal';

interface LoomEditorModuleProps {
    config: LoomConfiguration;
    onUpdate: (config: LoomConfiguration) => void;
    techState: LoomTechState;
    onTechStateUpdate: (state: LoomTechState) => void;
}

/**
 * Performant Canvas-based Hook Board
 * Replaces thousands of DIVs to eliminate rendering lag
 */
const HookBoardCanvas: React.FC<{
    config: LoomConfiguration;
    techState: LoomTechState;
    scale: number;
}> = ({ config, techState, scale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const totalPhysical = config.totalHooks + config.selectorHooks;
    const rows = config.gridWidth;
    const cols = Math.ceil(totalPhysical / rows);

    const CELL_SIZE = 16;
    const GAP = 4;
    const HEADER_OFF = 20;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = (cols * (CELL_SIZE + GAP) + 40);
        const height = (rows * (CELL_SIZE + GAP) + 40);

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);

        // Helper to determine if a hook is cast out
        const isCastOut = (idx: number) => {
            if (!config.castOut?.active || idx > config.totalHooks) return false;
            
            // Filter by "Only Design Hooks" if enabled
            if (config.castOut.onlyDesignHooks) {
                const zone = config.zones.find(z => idx >= z.startHook && idx <= z.endHook);
                if (!zone || zone.type !== 'design') return false;
            }

            const cycle = config.castOut.on + config.castOut.off;
            if (cycle === 0) return false;
            const posInCycle = (idx - 1) % cycle;
            return posInCycle >= config.castOut.on;
        };

        const getHookColor = (idx: number) => {
            if (isCastOut(idx)) return '#334155';
            if (idx > config.totalHooks) {
                const techHook = techState.columns.find(c => c.hookNumber === idx);
                return techHook ? techHook.color : '#60a5fa';
            }
            const zone = config.zones.find(z => idx >= z.startHook && idx <= z.endHook);
            return zone ? zone.color : '#1e293b';
        };

        // Draw Row Numbers
        ctx.font = '8px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        for (let r = 0; r < rows; r++) {
            ctx.fillText((r + 1).toString(), 25, HEADER_OFF + r * (CELL_SIZE + GAP) + CELL_SIZE / 2 + 4);
        }

        // Draw Hooks
        for (let c = 0; c < cols; c++) {
            const isStripStart = c % 4 === 0;

            for (let r = 0; r < rows; r++) {
                const hookIdx = c * rows + r + 1;
                if (hookIdx > totalPhysical) continue;

                const x = 30 + c * (CELL_SIZE + GAP);
                const y = HEADER_OFF + r * (CELL_SIZE + GAP);

                const isSelector = hookIdx > config.totalHooks;
                const castOut = isCastOut(hookIdx);

                // Column Hook Numbers
                if (r === 0 && (isStripStart || isSelector)) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = isSelector ? '#60a5fa' : (castOut ? '#475569' : '#475569');
                    ctx.font = '7px monospace';
                    if (isSelector) ctx.font = 'bold 7px monospace';
                    ctx.fillText(hookIdx.toString(), x + CELL_SIZE / 2, y - 6);
                    ctx.restore();
                }

                // Hook Circle
                ctx.beginPath();
                ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2, 0, Math.PI * 2);
                ctx.fillStyle = getHookColor(hookIdx);
                ctx.fill();

                if (castOut) {
                    ctx.strokeStyle = 'rgba(153, 27, 27, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x + 4, y + 4);
                    ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE - 4);
                    ctx.stroke();
                    ctx.globalAlpha = 0.3;
                }

                // Selection/Channel indicator for selectors
                if (isSelector) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(x + CELL_SIZE / 2 - 2, y + CELL_SIZE / 2 - 2, 4, 4);
                }

                ctx.globalAlpha = 1.0;
            }
        }
    }, [config, techState, rows, cols]);

    return (
        <div 
            className="bg-gray-900 p-8 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-gray-800 inline-block h-fit min-w-max transition-transform origin-top-left"
            style={{ transform: `scale(${scale})` }}
        >
            <canvas ref={canvasRef} className="block" />
        </div>
    );
};

export const LoomEditorModule: React.FC<LoomEditorModuleProps> = ({ config, onUpdate, techState, onTechStateUpdate }) => {
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [scale, setScale] = useState(1.0);

    const totalPhysical = config.totalHooks + config.selectorHooks;

    const updateZone = (id: string, updates: Partial<LoomHookZone>) => {
        const nextZones = config.zones.map(z => z.id === id ? { ...z, ...updates } : z);
        onUpdate({ ...config, zones: nextZones });
    };

    const addZone = () => {
        const lastZone = config.zones[config.zones.length - 1];
        const nextStart = lastZone ? lastZone.endHook + 1 : 1;
        const newZone: LoomHookZone = {
            id: `zone-${Date.now()}`,
            label: 'New Zone',
            startHook: nextStart,
            endHook: Math.min(config.totalHooks, nextStart + 100),
            color: '#3b82f6',
            type: 'design'
        };
        onUpdate({ ...config, zones: [...config.zones, newZone] });
    };

    const removeZone = (id: string) => {
        onUpdate({ ...config, zones: config.zones.filter(z => z.id !== id) });
    };

    const handleZoom = (dir: 'in' | 'out') => {
        setScale(prev => Math.min(Math.max(dir === 'in' ? prev + 0.1 : prev - 0.1, 0.2), 3.0));
    };

    // Calculation for active hooks used in the UI
    const activeHookCount = useMemo(() => {
        if (!config.castOut?.active) return totalPhysical;
        
        let count = 0;
        const cycle = config.castOut.on + config.castOut.off;
        if (cycle === 0) return totalPhysical;

        for (let i = 1; i <= totalPhysical; i++) {
            let casted = false;
            if (i <= config.totalHooks) {
                if (config.castOut.onlyDesignHooks) {
                    const zone = config.zones.find(z => i >= z.startHook && i <= z.endHook);
                    if (zone?.type === 'design') {
                        const posInCycle = (i - 1) % cycle;
                        if (posInCycle >= config.castOut.on) casted = true;
                    }
                } else {
                    const posInCycle = (i - 1) % cycle;
                    if (posInCycle >= config.castOut.on) casted = true;
                }
            }
            if (!casted) count++;
        }
        return count;
    }, [config, totalPhysical]);

    return (
        <div className="flex h-full bg-[#0f172a] text-white overflow-hidden">
            {/* LEFT: Parameters & Zones */}
            <div className="w-96 border-r border-gray-800 flex flex-col bg-gray-900 shadow-2xl z-10 shrink-0">
                <div className="p-6 border-b border-gray-800 bg-black/20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <ProcessorIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight">Loom Controller</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Industrial Hook Mapping</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Design Hooks</label>
                                <input 
                                    type="number" 
                                    value={config.totalHooks} 
                                    onChange={e => onUpdate({ ...config, totalHooks: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-black border border-gray-800 rounded-lg p-2 text-blue-400 font-mono font-bold focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Selector Hooks</label>
                                <input 
                                    type="number" 
                                    value={config.selectorHooks} 
                                    onChange={e => onUpdate({ ...config, selectorHooks: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-black border border-gray-800 rounded-lg p-2 text-emerald-400 font-mono font-bold focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Board Height (Rows)</label>
                            <select 
                                value={config.gridWidth}
                                onChange={e => onUpdate({ ...config, gridWidth: parseInt(e.target.value) })}
                                className="w-full bg-black border border-gray-800 rounded-lg p-2 text-gray-300 font-bold text-xs outline-none"
                            >
                                <option value={8}>8 Rows</option>
                                <option value={16}>16 Rows (Stäubli Standard)</option>
                                <option value={32}>32 Rows</option>
                            </select>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-blue-400 uppercase">Total Capacity</span>
                                <span className="text-sm font-mono font-black text-white">{totalPhysical} Hooks</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4 bg-gray-950">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Functional Zones</h3>
                        <button onClick={addZone} className="p-1.5 bg-blue-600 rounded-full hover:bg-blue-500 transition-colors shadow-lg"><PlusIcon className="w-3 h-3" /></button>
                    </div>

                    <div className="space-y-4">
                        {config.zones.map(zone => (
                            <div key={zone.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 group transition-all hover:border-gray-700">
                                <div className="flex items-center gap-3 mb-3">
                                    <input 
                                        type="color" 
                                        value={zone.color} 
                                        onChange={e => updateZone(zone.id, { color: e.target.value })}
                                        className="w-6 h-6 rounded border-none p-0 cursor-pointer bg-transparent shrink-0" 
                                    />
                                    <input 
                                        value={zone.label} 
                                        onChange={e => updateZone(zone.id, { label: e.target.value })}
                                        className="bg-transparent border-b border-transparent hover:border-gray-700 focus:border-blue-500 outline-none text-[11px] font-bold text-gray-300 w-full"
                                    />
                                    <button onClick={() => removeZone(zone.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-3.5 h-3.5" /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-gray-600 uppercase">Start</span>
                                        <input type="number" value={zone.startHook} onChange={e => updateZone(zone.id, { startHook: parseInt(e.target.value) || 1 })} className="w-full bg-black border border-gray-800 rounded p-1.5 text-[10px] font-mono font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-gray-600 uppercase">End</span>
                                        <input type="number" value={zone.endHook} onChange={e => updateZone(zone.id, { endHook: parseInt(e.target.value) || 1 })} className="w-full bg-black border border-gray-800 rounded p-1.5 text-[10px] font-mono font-bold" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 opacity-90 ring-1 ring-emerald-500/10 group/sel relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Control Selectors</span>
                            </div>
                            <button 
                                onClick={() => setIsConfigOpen(true)}
                                className="p-1.5 bg-emerald-600 rounded-md hover:bg-emerald-500 text-white shadow-lg transition-all transform hover:scale-110"
                                title="Configure Selector Hardware Mapping"
                            >
                                <PencilIcon className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-emerald-500/70">
                            <span>H-{config.totalHooks + 1}</span>
                            <span>➜</span>
                            <span>H-{totalPhysical}</span>
                        </div>
                        <div className="mt-3 flex gap-1 items-center">
                            {techState.columns.slice(0, 8).map(c => (
                                <div key={c.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                            ))}
                            {techState.columns.length > 8 && <span className="text-[7px] text-gray-600">+{techState.columns.length - 8}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Visual Board Map (Landscape) */}
            <div className="flex-1 flex flex-col overflow-hidden bg-black relative">
                <div className="h-10 border-b border-gray-800 bg-gray-900 flex items-center px-6 justify-between shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Electronic Hook Array ({config.gridWidth} Rows Vertical)</span>
                        <div className="h-4 w-px bg-gray-800" />
                        <span className="text-[9px] text-gray-500 italic">Landscape View - Rendered with optimized canvas engine</span>
                    </div>
                    
                    {/* ZOOM CONTROLS */}
                    <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-lg border border-gray-700">
                        <button onClick={() => handleZoom('out')} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Zoom Out"><ZoomOutIcon className="w-4 h-4" /></button>
                        <button onClick={() => setScale(1.0)} className="px-2 text-[10px] font-mono font-bold text-blue-400 hover:text-blue-300 transition-colors" title="Reset Zoom">{Math.round(scale * 100)}%</button>
                        <button onClick={() => handleZoom('in')} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Zoom In"><ZoomInIcon className="w-4 h-4" /></button>
                    </div>

                    <div className="flex gap-4">
                        {config.zones.map(z => (
                            <div key={z.id} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">{z.label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_5px_#60a5fa]" />
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Selectors</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-12 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] relative">
                    <HookBoardCanvas config={config} techState={techState} scale={scale} />
                </div>

                {/* BOTTOM ACTION BAR - CAST OUT FEATURE */}
                <div className="h-16 border-t border-gray-800 bg-gray-900/90 backdrop-blur px-8 flex items-center justify-between shrink-0 z-20">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                             <div className={`w-3 h-3 rounded-full ${config.castOut?.active ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-gray-700'}`} />
                             <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Electronic Cast-Out</span>
                        </div>
                        <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-gray-800">
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={config.castOut?.active || false}
                                    onChange={e => onUpdate({ ...config, castOut: { ...config.castOut, active: e.target.checked, on: config.castOut?.on || 1, off: config.castOut?.off || 1 } } as any)}
                                    className="rounded border-gray-700 text-blue-600 focus:ring-blue-500 bg-gray-900"
                                 />
                                 <span className="text-[10px] font-bold text-gray-500 uppercase">Enable</span>
                             </label>
                             <div className="w-px h-4 bg-gray-800" />
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-gray-600 uppercase">Active</span>
                                <input 
                                    type="number" min="1" max="64"
                                    value={config.castOut?.on || 1}
                                    onChange={e => onUpdate({ ...config, castOut: { ...config.castOut, on: parseInt(e.target.value) || 1 } } as any)}
                                    className="w-10 bg-black border border-gray-700 rounded text-center text-xs font-mono py-1"
                                />
                                <span className="text-[9px] font-bold text-gray-600 uppercase">Skip</span>
                                <input 
                                    type="number" min="1" max="64"
                                    value={config.castOut?.off || 1}
                                    onChange={e => onUpdate({ ...config, castOut: { ...config.castOut, off: parseInt(e.target.value) || 1 } } as any)}
                                    className="w-10 bg-black border border-gray-700 rounded text-center text-xs font-mono py-1"
                                />
                             </div>
                             <div className="w-px h-4 bg-gray-800" />
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={config.castOut?.onlyDesignHooks || false}
                                    onChange={e => onUpdate({ ...config, castOut: { ...config.castOut, onlyDesignHooks: e.target.checked } } as any)}
                                    className="rounded border-gray-700 text-emerald-600 focus:ring-emerald-500 bg-gray-900"
                                 />
                                 <span className="text-[10px] font-bold text-gray-500 uppercase">Design Hooks Only</span>
                             </label>
                        </div>
                        <p className="text-[9px] text-gray-600 italic">Load balancing pattern applied across addressing space.</p>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex items-center gap-3 bg-black/30 px-4 py-2 rounded-full border border-gray-800 shadow-lg">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Hooks</div>
                            <div className="text-sm font-mono font-black text-blue-500">
                                {activeHookCount}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <LoomTechConfigModal 
                isOpen={isConfigOpen} 
                onClose={() => setIsConfigOpen(false)} 
                state={techState} 
                onUpdate={onTechStateUpdate} 
            />
        </div>
    );
};
