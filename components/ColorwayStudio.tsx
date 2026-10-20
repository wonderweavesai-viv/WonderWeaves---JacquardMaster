
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Colorway, YarnDefinition, WeavePattern } from '../types';
import { renderFabricToCanvas } from '../services/fabricRenderer';
import { PlusIcon, TrashIcon, CheckIcon, CopyIcon, ShuffleIcon } from './icons';
import { PANTONE_PALETTE } from '../services/pantoneColors';
import { ColorPickerModal } from './ColorPickerModal';

interface ColorwayStudioProps {
    initialWarpYarns: { [key: string]: YarnDefinition };
    initialWeftYarns: { [key: string]: YarnDefinition };
    warpPatternString: string;
    weftPatternString: string;
    dentingPlan: number[];
    epi: number;
    ppi: number;
    weavePattern: WeavePattern;
    colorways: Colorway[];
    onColorwaysChange: (colorways: Colorway[]) => void;
    onApplyColorway: (warp: { [key: string]: YarnDefinition }, weft: { [key: string]: YarnDefinition }) => void;
    expandPatternString: (s: string) => string[];
}

export const ColorwayStudio: React.FC<ColorwayStudioProps> = ({
    initialWarpYarns, initialWeftYarns,
    warpPatternString, weftPatternString, dentingPlan,
    epi, ppi, weavePattern,
    colorways, onColorwaysChange, onApplyColorway,
    expandPatternString
}) => {
    // Current working state (detached from main app until applied)
    const [currentWarp, setCurrentWarp] = useState(initialWarpYarns);
    const [currentWeft, setCurrentWeft] = useState(initialWeftYarns);
    const [activeColorwayId, setActiveColorwayId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Color Picker State
    const [pickerState, setPickerState] = useState<{type: 'warp'|'weft', id: string, color: string} | null>(null);

    // Initial Load: If no colorways, create "Original" from initial props
    useEffect(() => {
        if (colorways.length === 0) {
            const original: Colorway = {
                id: 'original',
                name: 'Original',
                warpYarns: initialWarpYarns,
                weftYarns: initialWeftYarns
            };
            onColorwaysChange([original]);
            setActiveColorwayId('original');
        }
    }, []);

    // Render Preview when yarns change
    useEffect(() => {
        const render = () => {
            const canvas = renderFabricToCanvas({
                weavePattern: weavePattern.pattern,
                structure: weavePattern.structure,
                epi, ppi, dentingPlan,
                warpYarns: currentWarp,
                weftYarns: currentWeft,
                warpYarnSequence: expandPatternString(warpPatternString),
                weftYarnSequence: expandPatternString(weftPatternString),
                viewSide: 'face',
                dpi: 72, // Fast render
                width: 800,
                height: 500
            });
            setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));
        };
        const t = setTimeout(render, 50);
        return () => clearTimeout(t);
    }, [currentWarp, currentWeft, weavePattern, epi, ppi, dentingPlan, warpPatternString, weftPatternString]);

    const handleColorChange = (type: 'warp' | 'weft', id: string, color: string) => {
        if (type === 'warp') {
            setCurrentWarp(prev => ({ ...prev, [id]: { ...prev[id], color } }));
        } else {
            setCurrentWeft(prev => ({ ...prev, [id]: { ...prev[id], color } }));
        }
        // If we are editing a saved colorway, we technically drift from it. 
        // We could auto-update or show "Unsaved Changes". For simplicity, we auto-update active if it exists.
        if (activeColorwayId) {
            updateColorway(activeColorwayId, {
                warpYarns: type === 'warp' ? { ...currentWarp, [id]: { ...currentWarp[id], color } } : currentWarp,
                weftYarns: type === 'weft' ? { ...currentWeft, [id]: { ...currentWeft[id], color } } : currentWeft,
            });
        }
    };

    const updateColorway = (id: string, updates: Partial<Colorway>) => {
        const newColorways = colorways.map(cw => {
            if (cw.id === id) {
                // If yarns updated, should we regenerate thumbnail? Yes, ideally.
                // For performance, we might skip thumb update here and do it on save or interval.
                return { ...cw, ...updates };
            }
            return cw;
        });
        onColorwaysChange(newColorways);
    };

    const handleSaveAsNew = () => {
        const id = `cw-${Date.now()}`;
        const newWay: Colorway = {
            id,
            name: `Variant ${colorways.length + 1}`,
            warpYarns: currentWarp,
            weftYarns: currentWeft,
            thumbnail: previewUrl
        };
        onColorwaysChange([...colorways, newWay]);
        setActiveColorwayId(id);
    };

    const handleLoadColorway = (cw: Colorway) => {
        setCurrentWarp(cw.warpYarns);
        setCurrentWeft(cw.weftYarns);
        setActiveColorwayId(cw.id);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (colorways.length <= 1) return; // Keep at least one
        const newWays = colorways.filter(c => c.id !== id);
        onColorwaysChange(newWays);
        if (activeColorwayId === id) {
            handleLoadColorway(newWays[0]);
        }
    };

    const handleShuffle = () => {
        const shuffleYarns = (yarns: { [key: string]: YarnDefinition }) => {
            const newYarns = { ...yarns };
            Object.keys(newYarns).forEach(k => {
                newYarns[k] = { 
                    ...newYarns[k], 
                    color: PANTONE_PALETTE[Math.floor(Math.random() * PANTONE_PALETTE.length)] 
                };
            });
            return newYarns;
        };
        const sWarp = shuffleYarns(currentWarp);
        const sWeft = shuffleYarns(currentWeft);
        setCurrentWarp(sWarp);
        setCurrentWeft(sWeft);
        setActiveColorwayId(null); // Detach from saved as we modified it drastically
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white overflow-hidden">
            {/* MAIN STAGE */}
            <div className="flex-1 relative flex items-center justify-center bg-gray-950 overflow-hidden group">
                {previewUrl ? (
                    <img src={previewUrl} className="max-w-[90%] max-h-[90%] shadow-2xl rounded-lg transform group-hover:scale-[1.01] transition-transform duration-500" />
                ) : (
                    <div className="flex items-center gap-2 text-gray-500"><div className="w-4 h-4 border-2 border-t-transparent border-gray-500 rounded-full animate-spin"></div> Rendering...</div>
                )}
                
                {/* Floating Controls */}
                <div className="absolute top-6 right-6 flex flex-col gap-3">
                    <button 
                        onClick={() => onApplyColorway(currentWarp, currentWeft)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:translate-y-[-2px]"
                    >
                        <CheckIcon className="w-5 h-5" /> Apply to Design
                    </button>
                    <button 
                        onClick={handleShuffle}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded-full shadow-md flex items-center gap-2 text-sm backdrop-blur-md border border-gray-700"
                    >
                        <ShuffleIcon className="w-4 h-4" /> Shuffle Colors
                    </button>
                </div>
            </div>

            {/* PALETTE CONTROL DECK */}
            <div className="h-48 bg-gray-800 border-t border-gray-700 flex flex-col shrink-0">
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                    <div className="flex gap-12 justify-center">
                        {/* WARP */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Warp Palette</span>
                            <div className="flex gap-3">
                                {Object.keys(currentWarp).sort().map(id => (
                                    <div key={id} className="flex flex-col items-center gap-1 group relative">
                                        <button
                                            onClick={() => setPickerState({ type: 'warp', id, color: currentWarp[id].color })}
                                            className="w-10 h-10 rounded-full p-0 border-2 border-gray-600 cursor-pointer hover:border-blue-500 transition-colors shadow-sm relative overflow-hidden"
                                            style={{ backgroundColor: currentWarp[id].color }}
                                            title={`Edit Warp Color ${id}`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
                                        </button>
                                        <span className="text-[10px] font-mono text-gray-400">{id}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="w-px bg-gray-700 h-full"></div>

                        {/* WEFT */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Weft Palette</span>
                            <div className="flex gap-3">
                                {Object.keys(currentWeft).sort().map(id => (
                                    <div key={id} className="flex flex-col items-center gap-1 group relative">
                                        <button
                                            onClick={() => setPickerState({ type: 'weft', id, color: currentWeft[id].color })}
                                            className="w-10 h-10 rounded-full p-0 border-2 border-gray-600 cursor-pointer hover:border-orange-500 transition-colors shadow-sm relative overflow-hidden"
                                            style={{ backgroundColor: currentWeft[id].color }}
                                            title={`Edit Weft Color ${id}`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
                                        </button>
                                        <span className="text-[10px] font-mono text-gray-400">{id}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* VARIANT STRIP */}
                <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-4 overflow-x-auto custom-scrollbar">
                    <button 
                        onClick={handleSaveAsNew}
                        className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all shrink-0"
                        title="Save as New Variant"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                    
                    {colorways.map(cw => (
                        <div 
                            key={cw.id} 
                            onClick={() => handleLoadColorway(cw)}
                            className={`
                                relative w-32 h-14 rounded-md border cursor-pointer overflow-hidden group shrink-0 transition-all
                                ${activeColorwayId === cw.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700 hover:border-gray-500'}
                            `}
                        >
                            {cw.thumbnail ? (
                                <img src={cw.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-[9px] text-gray-500">No Preview</div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-0.5 flex justify-between items-center">
                                <span className="text-[9px] font-bold truncate max-w-[80px]">{cw.name}</span>
                                {colorways.length > 1 && (
                                    <button onClick={(e) => handleDelete(e, cw.id)} className="text-gray-400 hover:text-red-400">
                                        <TrashIcon className="w-2.5 h-2.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ColorPickerModal 
                isOpen={!!pickerState}
                onClose={() => setPickerState(null)}
                currentColor={pickerState?.color || '#000000'}
                onSelect={(color) => {
                    if (pickerState) handleColorChange(pickerState.type, pickerState.id, color);
                }}
                title={`Select ${pickerState?.type === 'warp' ? 'Warp' : 'Weft'} Color (${pickerState?.id})`}
            />
        </div>
    );
};
