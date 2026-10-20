
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { TopToolbar } from './TopToolbar';
import { RightPanel } from './RightPanel';
import { ProgressiveToolbar } from './ProgressiveToolbar';
import { FabricSimulationModal } from './FabricSimulationModal';
import { JacquardCanvas } from './JacquardCanvas';
import { YarnStudio } from './YarnStudio';
import { ProductionCalculator } from './ProductionCalculator';
import { WeaveThumbnail } from './WeaveThumbnail';
import { WeaveStudio } from './WeaveStudio';
import { CustomWeaveModal } from './CustomWeaveModal';
import { LoomTechModule } from './LoomTechModule';
import { LoomEditorModule } from './LoomEditorModule';
import { WeaveSettings, ToolType, ViewMode, FaceMode, YarnDefinition, AppMode, JacquardData, LibraryWeave, LoomConfiguration, LoomTechState } from '../types';
import { expandPatternString } from '../utils/patternParser';
import { PANTONE_PALETTE } from '../services/pantoneColors';
import { loadImage, processImage } from '../services/imageProcessor';
import { WEAVE_LIBRARY } from '../services/weaveLibrary';

const DEFAULT_PHYSICS = {
  floatTaper: 0.20,
  bindingDepth: 0.05,
  shadowAngle: 135,
  shadowThrow: 0.1
};

interface HistoryState {
    structure: Uint8Array;
    appliedWeaves: { [key: number]: LibraryWeave };
    artwork: {
        data: Uint8Array;
        palette: string[];
        width: number;
        height: number;
    } | null;
    warpYarns: { [key: string]: YarnDefinition };
    weftYarns: { [key: string]: YarnDefinition };
    warpPatternString: string;
    weftPatternString: string;
    settings: WeaveSettings;
}

export const JacquardMaster: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('art');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [projectName, setProjectName] = useState('New Jacquard Design');
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverColorIdx, setDragOverColorIdx] = useState<number | null>(null);
  const [canvasView, setCanvasView] = useState({ x: 0, y: 0, zoom: 1.0 });
  
  const [settings, setSettings] = useState<WeaveSettings>({
    warpThreads: 512, 
    weftPicks: 512, 
    epi: 60, 
    ppi: 60, 
    gridDivision: 8,
    gridX: 8,
    gridY: 8,
    harnesses: 1,
    warpFloatThreshold: 8,
    weftFloatThreshold: 8
  });

  const [loomConfig, setLoomConfig] = useState<LoomConfiguration>({
      totalHooks: 2688,
      selectorHooks: 32,
      gridWidth: 16,
      zones: [
          { id: 'sel-l', label: 'Left Selvedge', startHook: 1, endHook: 144, color: '#f59e0b', type: 'selvedge', weaveId: 'plain' },
          { id: 'design', label: 'Main Design', startHook: 145, endHook: 2544, color: '#3b82f6', type: 'design' },
          { id: 'sel-r', label: 'Right Selvedge', startHook: 2545, endHook: 2688, color: '#f59e0b', type: 'selvedge', weaveId: 'plain' }
      ]
  });

  // Global Technical Selector State
  const [techState, setTechState] = useState<LoomTechState>(() => ({
        columns: [
            { id: 'sel1', hookNumber: 2689, label: 'W-Selector 1', type: 'weft-selector', color: '#3b82f6' },
            { id: 'sel2', hookNumber: 2690, label: 'W-Selector 2', type: 'weft-selector', color: '#3b82f6' },
            { id: 'cram', hookNumber: 2691, label: 'Cramming', type: 'cramming', color: '#f59e0b' },
            { id: 'pile', hookNumber: 2692, label: 'Pile Hook', type: 'pile', color: '#10b981' }
        ],
        grid: Array.from({ length: 512 }, () => Array(4).fill(false))
    }));

  const [dentingPattern, setDentingPattern] = useState('1');
  const [customWeaves, setCustomWeaves] = useState<LibraryWeave[]>([]);

  const [jacquardData, setJacquardData] = useState<JacquardData>(() => ({
      width: 512,
      height: 512,
      structure: new Uint8Array(512 * 512).fill(0).map((_, i) => (Math.floor(i / 512) + (i % 512)) % 2 === 0 ? 1 : 0)
  }));

  const [artwork, setArtwork] = useState<{
      data: Uint8Array;
      palette: string[];
      width: number;
      height: number;
  } | null>(null);

  const [appliedWeaves, setAppliedWeaves] = useState<{ [key: number]: LibraryWeave }>({});

  const [warpYarns, setWarpYarns] = useState<{ [key: string]: YarnDefinition }>({
      'A': { color: '#2563eb', model: 'simple', construction: 'standard', fiberType: 'Cotton', countSystem: 'Nm', count: 30, ply: 2, thickness: 1, twist: 'Z', tpi: 20, sheen: 0.2, roughness: 0.4, ...DEFAULT_PHYSICS },
      'B': { color: '#f8fafc', model: 'simple', construction: 'standard', fiberType: 'Cotton', countSystem: 'Nm', count: 30, ply: 2, thickness: 1, twist: 'Z', tpi: 20, sheen: 0.2, roughness: 0.4, ...DEFAULT_PHYSICS }
  });
  const [weftYarns, setWeftYarns] = useState<{ [key: string]: YarnDefinition }>({
      'A': { color: '#f8fafc', model: 'simple', construction: 'standard', fiberType: 'Cotton', countSystem: 'Nm', count: 30, ply: 2, thickness: 1, twist: 'Z', tpi: 20, sheen: 0.1, roughness: 0.5, ...DEFAULT_PHYSICS },
      'B': { color: '#2563eb', model: 'simple', construction: 'standard', fiberType: 'Cotton', countSystem: 'Nm', count: 30, ply: 2, thickness: 1, twist: 'Z', tpi: 20, sheen: 0.1, roughness: 0.5, ...DEFAULT_PHYSICS }
  });

  const [activeYarnId, setActiveYarnId] = useState<string>('A');
  const [selectedYarnType, setSelectedYarnType] = useState<'warp' | 'weft'>('warp');
  const [studioYarnDef, setStudioYarnDef] = useState<YarnDefinition>(warpYarns['A']);

  const [warpPatternString, setWarpPatternString] = useState('512A');
  const [weftPatternString, setWeftPatternString] = useState('512A');

  const [currentTool, setCurrentTool] = useState<ToolType>('pencil');
  const [viewMode, setViewMode] = useState<ViewMode>('interlace');
  const [faceMode, setFaceMode] = useState<FaceMode>('face');

  const [history, setHistory] = useState<{ past: HistoryState[], future: HistoryState[] }>({ past: [], future: [] });

  const saveHistory = useCallback(() => {
    setHistory(prev => {
        const snapshot: HistoryState = {
            structure: new Uint8Array(jacquardData.structure),
            appliedWeaves: { ...appliedWeaves },
            artwork: artwork ? { ...artwork, data: new Uint8Array(artwork.data) } : null,
            warpYarns: { ...warpYarns },
            weftYarns: { ...weftYarns },
            warpPatternString,
            weftPatternString,
            settings: { ...settings }
        };
        const newPast = [...prev.past, snapshot];
        if (newPast.length > 30) newPast.shift();
        return { past: newPast, future: [] };
    });
  }, [jacquardData, appliedWeaves, artwork, warpYarns, weftYarns, warpPatternString, weftPatternString, settings]);

  const undo = useCallback(() => {
    setHistory(prev => {
        if (prev.past.length === 0) return prev;
        const lastSnapshot = prev.past[prev.past.length - 1];
        const newPast = prev.past.slice(0, -1);
        const current: HistoryState = {
            structure: new Uint8Array(jacquardData.structure),
            appliedWeaves: { ...appliedWeaves },
            artwork: artwork ? { ...artwork, data: new Uint8Array(artwork.data) } : null,
            warpYarns: { ...warpYarns },
            weftYarns: { ...weftYarns },
            warpPatternString,
            weftPatternString,
            settings: { ...settings }
        };
        setJacquardData(prevData => ({ ...prevData, structure: lastSnapshot.structure, width: lastSnapshot.settings.warpThreads, height: lastSnapshot.settings.weftPicks }));
        setAppliedWeaves(lastSnapshot.appliedWeaves);
        setArtwork(lastSnapshot.artwork);
        setWarpYarns(lastSnapshot.warpYarns);
        setWeftYarns(lastSnapshot.weftYarns);
        setWarpPatternString(lastSnapshot.warpPatternString);
        setWeftPatternString(lastSnapshot.weftPatternString);
        setSettings(lastSnapshot.settings);
        return { past: newPast, future: [current, ...prev.future] };
    });
  }, [jacquardData, appliedWeaves, artwork, warpYarns, weftYarns, warpPatternString, weftPatternString, settings]);

  const redo = useCallback(() => {
    setHistory(prev => {
        if (prev.future.length === 0) return prev;
        const nextSnapshot = prev.future[0];
        const newFuture = prev.future.slice(1);
        const current: HistoryState = {
            structure: new Uint8Array(jacquardData.structure),
            appliedWeaves: { ...appliedWeaves },
            artwork: artwork ? { ...artwork, data: new Uint8Array(artwork.data) } : null,
            warpYarns: { ...warpYarns },
            weftYarns: { ...weftYarns },
            warpPatternString,
            weftPatternString,
            settings: { ...settings }
        };
        setJacquardData(prevData => ({ ...prevData, structure: nextSnapshot.structure, width: nextSnapshot.settings.warpThreads, height: nextSnapshot.settings.weftPicks }));
        setAppliedWeaves(nextSnapshot.appliedWeaves);
        setArtwork(nextSnapshot.artwork);
        setWarpYarns(nextSnapshot.warpYarns);
        setWeftYarns(nextSnapshot.weftYarns);
        setWarpPatternString(nextSnapshot.warpPatternString);
        setWeftPatternString(nextSnapshot.weftPatternString);
        setSettings(nextSnapshot.settings);
        return { past: [...prev.past, current], future: newFuture };
    });
  }, [jacquardData, appliedWeaves, artwork, warpYarns, weftYarns, warpPatternString, weftPatternString, settings]);

  useEffect(() => {
      const source = selectedYarnType === 'warp' ? warpYarns : weftYarns;
      if (source[activeYarnId]) setStudioYarnDef(source[activeYarnId]);
  }, [activeYarnId, selectedYarnType, warpYarns, weftYarns]);

  // Auto-collapse panel in wide UI modes
  useEffect(() => {
    if (['loom-tech', 'loom-editor', 'weave-studio'].includes(appMode)) {
        setIsPanelCollapsed(true);
    } else {
        setIsPanelCollapsed(false);
    }
  }, [appMode]);

  const handleResize = (size: number) => {
      saveHistory();
      const newStructure = new Uint8Array(size * size).fill(0);
      const minSize = Math.min(size, jacquardData.width);
      for(let y = 0; y < minSize; y++) newStructure.set(jacquardData.structure.subarray(y * jacquardData.width, y * jacquardData.width + minSize), y * size);
      setJacquardData({ width: size, height: size, structure: newStructure });
      setSettings(prev => ({ ...prev, warpThreads: size, weftPicks: size }));
  };

  const handleLoadBitmap = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return;
      saveHistory();
      setLoadingStatus("Processing Bitmap...");
      try {
          const img = await loadImage(file);
          const result = processImage(img, 16, 1024); 
          setArtwork({ data: new Uint8Array(result.pixels), palette: result.palette, width: result.width, height: result.height });
          setAppliedWeaves({});
          setJacquardData({ width: result.width, height: result.height, structure: new Uint8Array(result.width * result.height).fill(0) });
          setSettings(prev => ({ ...prev, warpThreads: result.width, weftPicks: result.height }));
          setWarpPatternString(`${result.width}A`); setWeftPatternString(`${result.height}A`);
          setProjectName(file.name.split('.')[0]); setViewMode('structure'); setAppMode('art'); setLoadingStatus(null);
      } catch (err: any) { alert(err.message || "Error processing."); setLoadingStatus(null); }
  };

  const handleApplyWeaveToColor = (weave: LibraryWeave, colorIdx: number) => {
    if (!artwork) return;
    saveHistory();
    setLoadingStatus(`Applying ${weave.name}...`);
    setTimeout(() => {
        const newStructure = new Uint8Array(jacquardData.structure);
        const { width, height } = jacquardData, weaveDraft = weave.draft, weavePeg = weave.pegPlan, weaveW = weaveDraft[0].length, weaveH = weavePeg.length;
        const weaveLookup = new Uint8Array(weaveW * weaveH);
        const warpToHarness = new Int16Array(weaveW).fill(-1);
        for(let w=0; w<weaveW; w++) for(let h=0; h<weave.harnesses; h++) if(weaveDraft[h][w] === 1) { warpToHarness[w] = h; break; }
        for(let y=0; y<weaveH; y++) for(let x=0; x<weaveW; x++) if(warpToHarness[x] !== -1 && weavePeg[y][warpToHarness[x]] === 1) weaveLookup[y * weaveW + x] = 1;
        for(let i=0; i<artwork.data.length; i++) if(artwork.data[i] === colorIdx) { const x = i % width, y = Math.floor(i / width); newStructure[i] = weaveLookup[(y % weaveH) * weaveW + (x % weaveW)]; }
        setAppliedWeaves(prev => ({ ...prev, [colorIdx]: weave }));
        setJacquardData(prev => ({ ...prev, structure: newStructure })); 
        setLoadingStatus(null); setViewMode('interlace');
    }, 50);
  };

  const handleMergeColors = (sourceIdx: number, targetIdx: number) => {
    if (!artwork || sourceIdx === targetIdx) return;
    saveHistory();
    setLoadingStatus("Merging Colors...");
    setTimeout(() => {
        const newData = new Uint8Array(artwork.data);
        for(let i=0; i<newData.length; i++) {
            if(newData[i] === sourceIdx) newData[i] = targetIdx;
            else if(newData[i] > sourceIdx) newData[i]--; 
        }
        const newPalette = artwork.palette.filter((_, i) => i !== sourceIdx);
        const newApplied: {[key: number]: LibraryWeave} = {};
        Object.keys(appliedWeaves).forEach(k => {
            const ki = parseInt(k);
            if (ki === sourceIdx) return;
            const nextK = ki > sourceIdx ? ki - 1 : ki;
            newApplied[nextK] = appliedWeaves[ki];
        });
        setAppliedWeaves(newApplied);
        setArtwork({ ...artwork, data: newData, palette: newPalette });
        setLoadingStatus(null);
    }, 50);
  };

  const warpColorArray = useMemo(() => {
      const seq = expandPatternString(warpPatternString);
      return Array.from({ length: jacquardData.width }, (_, i) => warpYarns[seq[i % seq.length] || 'A']?.color || '#888');
  }, [warpYarns, warpPatternString, jacquardData.width]);

  const weftColorArray = useMemo(() => {
      const seq = expandPatternString(weftPatternString);
      return Array.from({ length: jacquardData.height }, (_, i) => weftYarns[seq[i % seq.length] || 'A']?.color || '#888');
  }, [weftYarns, weftPatternString, jacquardData.height]);

  const simData = useMemo(() => {
      const { width, height, structure } = jacquardData;
      const rows: boolean[][] = []; const colors: string[][] = [];
      for (let y = 0; y < height; y++) {
          const rowB: boolean[] = []; const rowC: string[] = [];
          for (let x = 0; x < width; x++) {
              const isUp = structure[y * width + x] === 1;
              rowB.push(isUp); rowC.push(isUp ? warpColorArray[x] : weftColorArray[y]);
          }
          rows.push(rowB); colors.push(rowC);
      }
      return { structure: rows, colors };
  }, [jacquardData, warpColorArray, weftColorArray, showSimModal]);

  const handleApplyStudioYarn = () => {
    saveHistory();
    if (selectedYarnType === 'warp') setWarpYarns(prev => ({ ...prev, [activeYarnId]: studioYarnDef }));
    else setWeftYarns(prev => ({ ...prev, [activeYarnId]: studioYarnDef }));
    setAppMode('art'); 
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden font-sans">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLoadBitmap} />
        {loadingStatus && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center gap-4 shadow-2xl">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-bold text-sm text-gray-200">{loadingStatus}</span>
                </div>
            </div>
        )}

        <TopToolbar 
            currentTool={currentTool} onToolChange={setCurrentTool}
            viewMode={viewMode} onViewModeChange={setViewMode}
            faceMode={faceMode} onFaceModeChange={setFaceMode}
            currentFillPatternId="plain" onFillPatternChange={()=>{}}
            canUndo={history.past.length > 0} canRedo={history.future.length > 0} 
            onUndo={undo} onRedo={redo}
            onSave={()=>{}} onLoad={() => fileInputRef.current?.click()} onImport={()=>{}}
        />

        <div className="flex flex-1 overflow-hidden pl-20 relative">
            <div className="absolute left-0 top-0 bottom-0 z-40">
                <ProgressiveToolbar mode={appMode} onModeChange={(m) => {
                    if (m === 'sim') setShowSimModal(true);
                    else setAppMode(m);
                }} />
            </div>
            
            <div className="flex-1 relative bg-gray-950 flex flex-col overflow-hidden">
                {appMode !== 'weave-studio' && appMode !== 'loom-tech' && appMode !== 'loom-editor' && (
                    <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between shrink-0">
                        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                            <span className="text-blue-400 font-bold">{projectName}</span>
                            <span>{jacquardData.width} × {jacquardData.height}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex bg-gray-800 rounded p-0.5 border border-gray-700">
                                <button onClick={() => setViewMode('interlace')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${viewMode === 'interlace' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>INTERLACE</button>
                                <button onClick={() => setViewMode('structure')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${viewMode === 'structure' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>ARTWORK</button>
                                <button onClick={() => setViewMode('graph')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${viewMode === 'graph' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>GRAPH</button>
                            </div>
                            <div className="flex items-center gap-1 border-l border-gray-800 pl-4">
                                {[1024, 2048, 4096].map(size => (<button key={size} onClick={() => handleResize(size)} className={`px-2 py-0.5 rounded text-[10px] border ${jacquardData.width === size ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-700 text-gray-400'}`}>{size}</button>))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 relative">
                    {appMode === 'yarn' ? (
                        <div className="absolute inset-0 h-full"><YarnStudio yarn={studioYarnDef} onChange={setStudioYarnDef} onApply={handleApplyStudioYarn} /></div>
                    ) : appMode === 'tech' ? (
                        <div className="bg-white text-gray-900 h-full overflow-hidden absolute inset-0"><ProductionCalculator settings={settings} warpYarns={warpYarns} weftYarns={weftYarns} warpPatternString={warpPatternString} weftPatternString={weftPatternString} draft={[]} pegPlan={[]} generateThumbnail={() => ""} /></div>
                    ) : appMode === 'weave-studio' ? (
                        <div className="absolute inset-0 h-full"><WeaveStudio onSaveToLibrary={(w) => setCustomWeaves(prev => [...prev, w])} /></div>
                    ) : appMode === 'loom-tech' ? (
                        <div className="absolute inset-0 h-full"><LoomTechModule data={jacquardData} settings={settings} weftYarns={weftYarns} weftPatternString={weftPatternString} warpYarns={warpYarns} warpPatternString={warpPatternString} techState={techState} onTechStateUpdate={setTechState} config={loomConfig} onConfigUpdate={setLoomConfig} /></div>
                    ) : appMode === 'loom-editor' ? (
                        <div className="absolute inset-0 h-full"><LoomEditorModule config={loomConfig} onUpdate={setLoomConfig} techState={techState} onTechStateUpdate={setTechState} /></div>
                    ) : (
                        <JacquardCanvas 
                            data={jacquardData} artwork={artwork || undefined} 
                            onUpdate={(d) => { saveHistory(); setJacquardData(prev => ({ ...prev, structure: d })); }} 
                            tool={currentTool} viewMode={viewMode} faceMode={faceMode} 
                            warpColors={warpColorArray} weftColors={weftColorArray} 
                            settings={settings}
                            onViewChange={setCanvasView}
                        />
                    )}
                </div>

                {artwork && (appMode === 'art' || appMode === 'weave') && (
                    <div className="h-24 bg-gray-900 border-t border-gray-800 flex items-center px-6 gap-6 shrink-0 z-10 shadow-2xl">
                        <div className="flex flex-col"><span className="text-[9px] font-bold text-gray-500 uppercase mb-1">Palette Optimized</span><span className="text-[10px] text-gray-400 font-mono italic">Drop yarn or weave</span></div>
                        <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
                            {artwork.palette.map((color, idx) => (
                                <div 
                                    key={idx} 
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('color-idx', idx.toString()); }}
                                    onDragOver={e => { e.preventDefault(); setDragOverColorIdx(idx); }} 
                                    onDragLeave={() => setDragOverColorIdx(null)} 
                                    onDrop={e => { 
                                        e.preventDefault(); 
                                        setDragOverColorIdx(null); 
                                        const weaveD = e.dataTransfer.getData('weave-obj'); 
                                        const sourceC = e.dataTransfer.getData('color-idx');
                                        const yarnId = e.dataTransfer.getData('yarn-id');
                                        const yarnType = e.dataTransfer.getData('yarn-type');
                                        if (weaveD) handleApplyWeaveToColor(JSON.parse(weaveD), idx); 
                                        else if (sourceC !== "") handleMergeColors(parseInt(sourceC), idx);
                                        else if (yarnId) {
                                            const def = (yarnType === 'warp' ? warpYarns : weftYarns)[yarnId];
                                            if (def && artwork) {
                                                const newPalette = [...artwork.palette];
                                                newPalette[idx] = def.color;
                                                setArtwork({ ...artwork, palette: newPalette });
                                            }
                                        }
                                    }} 
                                    className={`group flex flex-col items-center gap-1 shrink-0 bg-gray-800/40 p-2 rounded-lg border transition-all ${dragOverColorIdx === idx ? 'bg-blue-900/40 border-blue-500 scale-105 shadow-lg shadow-blue-500/20' : 'border-gray-700/50 hover:bg-gray-800'}`}
                                >
                                    <div className="relative w-10 h-10">
                                        <div className="w-full h-full rounded-md border border-white/10 shadow-md" style={{ backgroundColor: color }} />
                                        {appliedWeaves[idx] && (
                                            <div className="absolute inset-0 rounded-md overflow-hidden bg-black/40 flex items-center justify-center">
                                                <WeaveThumbnail weave={appliedWeaves[idx]} className="w-full h-full opacity-70" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[8px] font-mono text-gray-500 uppercase truncate max-w-[64px]">{appliedWeaves[idx] ? appliedWeaves[idx].name : color}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-1 items-end shrink-0"><span className="text-[8px] font-bold text-blue-500 animate-pulse mb-1 uppercase">Drop unit to apply</span><button onClick={() => setArtwork(null)} className="px-3 py-1 text-[10px] bg-red-900/30 text-red-400 border border-red-900/50 rounded font-bold uppercase">Clear Art</button></div>
                    </div>
                )}
            </div>

            <div className={`transition-all duration-300 ${isPanelCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-80'}`}>
                <RightPanel 
                    settings={settings} onSettingsChange={(s) => { saveHistory(); setSettings(s); }} dentingPattern={dentingPattern} onDentingChange={setDentingPattern} onSnapshot={saveHistory} onLoadWeave={()=>{}} 
                    customWeaves={customWeaves} onAddWeave={()=>{}} onUpdateWeave={()=>{}} onDeleteWeave={()=>{}} 
                    warpYarns={warpYarns} weftYarns={weftYarns} onUpdateWarpYarn={(id, d) => { saveHistory(); setWarpYarns(p => ({...p, [id]: d})); }} onUpdateWeftYarn={(id, d) => { saveHistory(); setWeftYarns(p => ({...p, [id]: d})); }} paletteColors={PANTONE_PALETTE} warpPatternString={warpPatternString} setWarpPatternString={(s) => { saveHistory(); setWarpPatternString(s); }} weftPatternString={weftPatternString} setWeftPatternString={(s) => { saveHistory(); setWeftPatternString(s); }} onOpenGridEditor={()=>{}} onOpenPatternGenerator={()=>{}} currentInput={{} as any} onApplyGenerated={()=>{}} onSimulate={() => setShowSimModal(true)} onGridOperation={(t, a) => { saveHistory(); const newData = new Uint8Array(jacquardData.structure); if (a === 'clear') newData.fill(0); else if (a === 'invert') for(let i=0; i<newData.length; i++) newData[i] = newData[i] === 1 ? 0 : 1; setJacquardData(prev => ({ ...prev, structure: newData })); }} activeYarnId={activeYarnId} selectedYarnType={selectedYarnType} onSelectYarn={(id, type) => { setActiveYarnId(id); setSelectedYarnType(type); setAppMode('yarn'); }}
                    onOpenPixelEditor={() => setShowCustomModal(true)}
                    jacquardData={jacquardData}
                    canvasView={canvasView}
                />
            </div>
            
            {/* Toggle Panel Button on Edge */}
            <button 
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                className={`absolute top-1/2 -translate-y-1/2 z-50 bg-gray-800 border border-gray-700 p-1.5 rounded-l-md hover:bg-gray-700 transition-all ${isPanelCollapsed ? 'right-0' : 'right-80'}`}
                title={isPanelCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                <div className={`transition-transform duration-300 ${isPanelCollapsed ? 'rotate-180' : ''}`}>
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                </div>
            </button>
        </div>
        <FabricSimulationModal isOpen={showSimModal} onClose={() => setShowSimModal(false)} weavePattern={simData.colors} structure={simData.structure} epi={settings.epi} ppi={settings.ppi} dentingPlan={dentingPattern.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))} warpYarns={warpYarns} weftYarns={weftYarns} warpYarnSequence={expandPatternString(warpPatternString)} weftYarnSequence={expandPatternString(weftPatternString)} />
        <CustomWeaveModal isOpen={showCustomModal} onClose={() => setShowCustomModal(false)} onSave={(w) => setCustomWeaves(prev => [...prev, w])} />
    </div>
  );
};
