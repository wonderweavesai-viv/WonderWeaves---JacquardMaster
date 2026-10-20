
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { WeaveSettings, WeaveInput, YarnDefinition, LibraryWeave, JacquardData } from '../types';
import { 
    LayersIcon, ListIcon, PaletteIcon, GridFillIcon, GridIcon, 
    PencilIcon, TrashIcon, PlusIcon, FlipIcon, CopyIcon,
    ShiftUpIcon, ShiftDownIcon, ShiftLeftIcon, ShiftRightIcon,
    CameraIcon, TableIcon, MagicWandIcon
} from './icons';
import { WEAVE_LIBRARY } from '../services/weaveLibrary';
import { TextPatternEditor } from './TextPatternEditor';
import { WeaveThumbnail } from './WeaveThumbnail';
import { YarnDesignerModal } from './YarnDesignerModal';
import { ColorPalette } from './ColorPalette';
import { expandPatternString } from '../utils/patternParser';

interface RightPanelProps {
    settings: WeaveSettings;
    onSettingsChange: (newSettings: WeaveSettings) => void;
    dentingPattern: string;
    onDentingChange: (val: string) => void;
    onSnapshot: () => void;
    onLoadWeave: (weave: LibraryWeave) => void;
    customWeaves: LibraryWeave[];
    onAddWeave: (weave: LibraryWeave) => void;
    onUpdateWeave: (weave: LibraryWeave) => void;
    onDeleteWeave: (id: string) => void;
    warpYarns: { [key: string]: YarnDefinition };
    weftYarns: { [key: string]: YarnDefinition };
    onUpdateWarpYarn: (char: string, def: YarnDefinition) => void;
    onUpdateWeftYarn: (char: string, def: YarnDefinition) => void;
    onUpdateAllYarns?: (type: 'warp' | 'weft', yarns: { [key: string]: YarnDefinition }) => void;
    paletteColors: string[];
    warpPatternString: string;
    setWarpPatternString: (val: string) => void;
    weftPatternString: string;
    setWeftPatternString: (val: string) => void;
    onOpenGridEditor: (type: 'warp' | 'weft') => void;
    onOpenPatternGenerator: (type: 'warp' | 'weft') => void;
    currentInput: WeaveInput;
    onApplyGenerated: (data: any) => void;
    onSimulate: () => void;
    selectedColorIndex?: number;
    onSelectColor?: (index: number) => void;
    onGridOperation: (gridType: 'draft' | 'peg', action: 'clear' | 'invert' | 'shiftUp' | 'shiftDown' | 'shiftLeft' | 'shiftRight' | 'double') => void;
    activeYarnId?: string;
    selectedYarnType?: 'warp' | 'weft'; 
    onSelectYarn?: (id: string, type: 'warp' | 'weft') => void; 
    onActiveYarnChange?: (char: string) => void; 
    forcedTab?: TabType; 
    onSyncGridDimensions?: (warpLen: number, weftLen: number) => void; 
    onOpenPixelEditor?: () => void;
    jacquardData?: JacquardData;
    canvasView?: { x: number, y: number, zoom: number };
}

type TabType = 'construction' | 'pattern' | 'weave' | 'yarns' | 'colors';

const TabButton: React.FC<{ id: TabType, activeTab: TabType, icon: React.ReactNode, label: string, onClick: (id: TabType) => void }> = ({ id, activeTab, icon, label, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 border-b-2 transition-colors ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
    >
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
);

const SliderInput: React.FC<{
    label: string; value: number; onChange?: (value: number) => void; min?: number; max?: number; step?: number; subLabel?: string; disabled?: boolean; onPointerDown?: () => void;
}> = ({ label, value, onChange, min, max, step, subLabel, disabled, onPointerDown }) => (
    <div className="mb-5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex justify-between">
            <span>{label} {subLabel && <span className="text-gray-400 normal-case ml-1">({subLabel})</span>}</span>
            <span className={`${disabled ? 'text-gray-500' : 'text-blue-600'} font-mono`}>{value}</span>
        </label>
        {!disabled && (
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange && onChange(parseInt(e.target.value, 10))}
                onPointerDown={onPointerDown}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500"
            />
        )}
    </div>
);

const YarnList: React.FC<{ 
    yarns: {[key: string]: YarnDefinition}, 
    type: 'warp' | 'weft',
    activeId?: string,
    isSelectedType?: boolean,
    onSelect?: (id: string, type: 'warp' | 'weft') => void,
    onEdit: (char: string, def: YarnDefinition) => void,
    label: string,
    usedChars: Set<string>
}> = ({ yarns, type, activeId, isSelectedType, onSelect, onEdit, label, usedChars }) => {
    const letters = ['A','B','C','D','E','F','G','H'];
    
    const handleAdd = (char: string) => {
        const defaultYarn: YarnDefinition = {
            color: '#888888', model: 'simple', construction: 'standard', fiberType: 'Cotton', countSystem: 'Nm', count: 28, ply: 1, thickness: 1.0, twist: 'Z', tpi: 15, sheen: 0.2, roughness: 0.5
        };
        onEdit(char, defaultYarn);
    };

    return (
        <div className="mb-6">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 border-b border-gray-100 pb-1">{label}</h2>
            <div className="flex flex-col gap-2">
                {letters.map((char) => {
                    const yarn = yarns[char];
                    const isSelected = isSelectedType && activeId === char;
                    const isUsed = usedChars.has(char);
                    
                    if (!yarn) {
                        return (
                            <button key={char} onClick={() => handleAdd(char)} className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                                <div className="font-mono font-bold w-4 text-xs">{char}</div>
                                <div className="flex-1 text-[10px] uppercase font-bold tracking-widest text-left">Empty</div>
                                <PlusIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                            </button>
                        );
                    }

                    return (
                        <div 
                            key={char} 
                            draggable={true}
                            onDragStart={(e) => {
                                e.dataTransfer.setData('yarn-id', char);
                                e.dataTransfer.setData('yarn-type', type);
                            }}
                            onClick={() => onSelect && onSelect(char, type)}
                            className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-grab relative overflow-hidden group ${isSelected ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'border-gray-100 hover:bg-gray-50'}`}
                        >
                            {isUsed && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-bl-sm shadow-sm" />}
                            <div className="font-mono font-black w-4 text-xs text-gray-400">{char}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <div className="w-4 h-4 rounded-full shadow-inner border border-black/10" style={{ background: yarn.color }} />
                                    <div className={`text-[10px] font-black uppercase truncate ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>{yarn.code || yarn.fiberType}</div>
                                </div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase truncate flex items-center gap-1.5 ml-6">
                                    <span>{yarn.count}{yarn.countSystem}</span>
                                    <span>•</span>
                                    <span>{yarn.construction}</span>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(char, yarn); }} className={`p-1.5 rounded-md transition-colors ${isSelected ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}><PencilIcon className="w-3.5 h-3.5" /></button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const LibraryItem: React.FC<{ 
    weave: LibraryWeave; 
    onSnapshot: () => void; 
    onLoadWeave: (w: LibraryWeave) => void;
    layout: '1' | '2' | '3';
}> = ({ weave, onSnapshot, onLoadWeave, layout }) => {
    const [faceMode, setFaceMode] = useState<'face' | 'back'>('face');
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);

    const getTransformedWeave = useCallback(() => {
        let transformed = { ...weave };
        const w = weave.draft[0].length, h = weave.pegPlan.length;
        let nextPeg = weave.pegPlan.map(row => [...row]);
        const shiftY = ((offsetY % h) + h) % h;
        if (shiftY !== 0) nextPeg = [...nextPeg.slice(h - shiftY), ...nextPeg.slice(0, h - shiftY)];
        const shiftX = ((offsetX % w) + w) % w;
        if (shiftX !== 0) nextPeg = nextPeg.map(row => [...row.slice(w - shiftX), ...row.slice(0, w - shiftX)]);
        transformed.pegPlan = nextPeg;
        if (faceMode === 'back') {
            transformed.name = `${weave.name} (Back)`;
            transformed.pegPlan = transformed.pegPlan.map(row => row.map(cell => cell === 1 ? 0 : 1));
        }
        return transformed;
    }, [weave, faceMode, offsetX, offsetY]);

    const handleApply = () => { onSnapshot(); onLoadWeave(getTransformedWeave()); };
    const handleDragStart = (e: React.DragEvent) => { e.dataTransfer.setData('weave-obj', JSON.stringify(getTransformedWeave())); };

    return (
        <div className={`relative group ${layout === '3' ? 'bg-white border rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden mb-2' : ''}`}>
            {layout === '3' ? (
                <div className="flex flex-col">
                    <div className="relative aspect-video bg-gray-950 group/preview cursor-grab" draggable onDragStart={handleDragStart} onClick={handleApply}>
                        <WeaveThumbnail weave={getTransformedWeave()} faceMode="face" showGrid={true} className="w-full h-full border-none rounded-none" />
                        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover/preview:opacity-100 bg-white/90 text-gray-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-widest pointer-events-none transition-all transform translate-y-2 group-hover/preview:translate-y-0">Apply Unit</span>
                        </div>
                    </div>
                    <div className="p-3 border-t border-gray-100 bg-white">
                        <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-800 text-xs truncate uppercase tracking-tight">{weave.name}</h3>
                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mt-0.5">{weave.category}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setFaceMode(faceMode === 'face' ? 'back' : 'face'); }} className={`p-1.5 rounded-md border ${faceMode === 'back' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-gray-400 border-gray-200'}`} title="Toggle Face/Back"><FlipIcon className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-1 border border-gray-100">
                            <div className="flex gap-1 items-center">
                                <button onClick={(e) => { e.stopPropagation(); setOffsetX(prev => prev - 1); }} className="p-1 hover:bg-white rounded transition-colors text-gray-400 hover:text-blue-500"><ShiftLeftIcon className="w-3.5 h-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setOffsetY(prev => prev - 1); }} className="p-1 hover:bg-white rounded transition-colors text-gray-400 hover:text-blue-500"><ShiftUpIcon className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="text-[9px] font-mono font-black text-gray-400 uppercase">{offsetX},{offsetY}</div>
                            <div className="flex gap-1 items-center">
                                <button onClick={(e) => { e.stopPropagation(); setOffsetY(prev => prev + 1); }} className="p-1 hover:bg-white rounded transition-colors text-gray-400 hover:text-blue-500"><ShiftDownIcon className="w-3.5 h-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setOffsetX(prev => prev + 1); }} className="p-1 hover:bg-white rounded transition-colors text-gray-400 hover:text-blue-500"><ShiftRightIcon className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <button draggable onDragStart={handleDragStart} onClick={handleApply} className={`flex ${layout === '1' ? 'flex-row items-center' : 'flex-col items-start'} p-2 bg-gray-50 border hover:border-blue-500 rounded-lg transition-all text-left w-full cursor-grab overflow-hidden gap-3`}>
                    <div className={`relative shrink-0 ${layout === '1' ? 'w-12 h-12' : 'w-full aspect-square'} pointer-events-none`}><WeaveThumbnail weave={weave} faceMode={faceMode} tile={layout === '2'} className="w-full h-full" /></div>
                    <span className="text-[10px] font-bold text-gray-700 truncate w-full uppercase leading-tight block">{weave.name}</span>
                </button>
            )}
        </div>
    );
};

export const RightPanel: React.FC<RightPanelProps> = ({
    settings, onSettingsChange, dentingPattern, onDentingChange, onSnapshot, onLoadWeave,
    customWeaves, warpYarns, weftYarns, onUpdateWarpYarn, onUpdateWeftYarn, warpPatternString, setWarpPatternString, weftPatternString, setWeftPatternString, onOpenGridEditor,
    selectedColorIndex, onSelectColor, activeYarnId = 'A', selectedYarnType, onSelectYarn, forcedTab, onOpenPixelEditor,
    jacquardData, canvasView
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('construction');
    const [editingYarn, setEditingYarn] = useState<{ id: string, type: 'warp' | 'weft', def: YarnDefinition } | null>(null);
    const [weaveLayout, setWeaveLayout] = useState<'1' | '2' | '3'>('2');

    useEffect(() => { if (forcedTab) setActiveTab(forcedTab); }, [forcedTab]);

    const allWeaves = useMemo(() => [...WEAVE_LIBRARY, ...customWeaves], [customWeaves]);
    const usedWarpChars = useMemo(() => new Set(expandPatternString(warpPatternString)), [warpPatternString]);
    const usedWeftChars = useMemo(() => new Set(expandPatternString(weftPatternString)), [weftPatternString]);
    const colorMap = useMemo(() => {
        const map: {[key:string]: string} = {};
        // Fix: Explicitly cast entries to [string, YarnDefinition][] to resolve 'unknown' type error
        (Object.entries(warpYarns) as [string, YarnDefinition][]).forEach(([k,v]) => { if (v) map[k] = v.color; });
        (Object.entries(weftYarns) as [string, YarnDefinition][]).forEach(([k,v]) => { if (v) map[k] = v.color; });
        return map;
    }, [warpYarns, weftYarns]);

    return (
        <>
            <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col z-20 shadow-xl overflow-hidden h-full">
                <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto no-scrollbar shrink-0">
                    <TabButton id="construction" activeTab={activeTab} onClick={setActiveTab} icon={<LayersIcon className="w-5 h-5" />} label="Specs" />
                    <TabButton id="weave" activeTab={activeTab} onClick={setActiveTab} icon={<GridFillIcon className="w-5 h-5" />} label="Weave" />
                    <TabButton id="pattern" activeTab={activeTab} onClick={setActiveTab} icon={<GridIcon className="w-5 h-5" />} label="Pattern" />
                    <TabButton id="yarns" activeTab={activeTab} onClick={setActiveTab} icon={<ListIcon className="w-5 h-5" />} label="Yarns" />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    {activeTab === 'construction' && (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">Global Settings</h2>
                            <SliderInput label="Grid Width" subLabel="Ends" value={settings.warpThreads} min={4} max={4096} step={4} onChange={(v) => onSettingsChange({ ...settings, warpThreads: v })} />
                            <SliderInput label="Grid Height" subLabel="Picks" value={settings.weftPicks} min={4} max={4096} step={4} onChange={(v) => onSettingsChange({ ...settings, weftPicks: v })} />
                            
                            {/* Reinstated Grid Partitioning Settings */}
                            <SliderInput label="Technical Grid X" subLabel="Partition" value={settings.gridX} min={2} max={32} step={1} onChange={(v) => onSettingsChange({ ...settings, gridX: v })} />
                            <SliderInput label="Technical Grid Y" subLabel="Partition" value={settings.gridY} min={2} max={32} step={1} onChange={(v) => onSettingsChange({ ...settings, gridY: v })} />
                            
                            <SliderInput label="Ends/Inch" value={settings.epi} min={8} max={120} step={1} onChange={(v) => onSettingsChange({ ...settings, epi: v })} />
                            <SliderInput label="Picks/Inch" value={settings.ppi} min={8} max={120} step={1} onChange={(v) => onSettingsChange({ ...settings, ppi: v })} />
                            <div className="mt-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Denting Plan</label>
                                <input type="text" value={dentingPattern} onChange={(e) => onDentingChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm font-mono focus:border-blue-500 focus:outline-none" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'weave' && (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={onOpenPixelEditor} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest border border-blue-200 px-2 py-1 rounded hover:bg-blue-50 transition-all">+ New Unit</button>
                                <div className="flex bg-gray-100 rounded p-0.5 border border-gray-200">
                                    <button onClick={() => setWeaveLayout('1')} className={`p-1 rounded transition-all ${weaveLayout === '1' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}><ListIcon className="w-3 h-3" /></button>
                                    <button onClick={() => setWeaveLayout('2')} className={`p-1 rounded transition-all ${weaveLayout === '2' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}><GridFillIcon className="w-3 h-3" /></button>
                                    <button onClick={() => setWeaveLayout('3')} className={`p-1 rounded transition-all ${weaveLayout === '3' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}><LayersIcon className="w-3 h-3" /></button>
                                </div>
                            </div>
                            <div className={`grid ${weaveLayout === '1' ? 'grid-cols-1' : (weaveLayout === '2' ? 'grid-cols-2' : 'grid-cols-1')} gap-3`}>
                                {allWeaves.map(weave => (
                                    <LibraryItem key={weave.id} weave={weave} onSnapshot={onSnapshot} onLoadWeave={onLoadWeave} layout={weaveLayout} />
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'pattern' && (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-200 space-y-6">
                            <TextPatternEditor title="Warp Sequence" value={warpPatternString} onValueChange={setWarpPatternString} colorMap={colorMap} onOpenGridEditor={() => onOpenGridEditor('warp')} />
                            <TextPatternEditor title="Weft Sequence" value={weftPatternString} onValueChange={setWeftPatternString} colorMap={colorMap} onOpenGridEditor={() => onOpenGridEditor('weft')} />
                        </div>
                    )}

                    {activeTab === 'yarns' && (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-200 space-y-8">
                            <YarnList label="Warp Yarn Registry" yarns={warpYarns} type="warp" activeId={activeYarnId} isSelectedType={selectedYarnType === 'warp'} onSelect={onSelectYarn} onEdit={(id, def) => setEditingYarn({id, type: 'warp', def})} usedChars={usedWarpChars} />
                            <YarnList label="Weft Yarn Registry" yarns={weftYarns} type="weft" activeId={activeYarnId} isSelectedType={selectedYarnType === 'weft'} onSelect={onSelectYarn} onEdit={(id, def) => setEditingYarn({id, type: 'weft', def})} usedChars={usedWeftChars} />
                        </div>
                    )}

                    {activeTab === 'colors' && (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                            <ColorPalette colorMap={colorMap} onSelectColor={onSelectColor} selectedColorIndex={selectedColorIndex} />
                        </div>
                    )}
                </div>
            </div>

            {editingYarn && (
                <YarnDesignerModal 
                    isOpen={!!editingYarn} onClose={() => setEditingYarn(null)} yarnId={editingYarn.id} yarnType={editingYarn.type} initialYarn={editingYarn.def}
                    onSave={(newYarn) => { 
                        onSnapshot(); 
                        if (editingYarn.type === 'warp') onUpdateWarpYarn(editingYarn.id, newYarn); 
                        else onUpdateWeftYarn(editingYarn.id, newYarn); 
                    }}
                />
            )}
        </>
    );
};
