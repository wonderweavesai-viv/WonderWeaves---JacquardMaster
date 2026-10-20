
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { WeaveArea } from './WeaveArea';
import { TopToolbar } from './TopToolbar';
import { RightPanel } from './RightPanel';
import { ProgressiveToolbar } from './ProgressiveToolbar';
import { FabricSimulationModal } from './FabricSimulationModal';
import { PatternManagerModal } from './PatternManagerModal';
import { PatternManager } from './PatternManager'; 
import { YarnSelectorModal } from './YarnSelectorModal';
import { generateWeave, reconstructWeaveFromGrid } from '../services/weaveGenerator';
import { WeaveSettings, WeavePattern, WeaveInput, ToolType, ViewMode, FaceMode, YarnDefinition, DensityZone, Colorway, AppMode, LibraryWeave } from '../types';
import { parsePatternString, getTotalThreads, expandPatternString, compressPatternString } from '../utils/patternParser';
import { WEAVE_LIBRARY } from '../services/weaveLibrary';
import { PANTONE_PALETTE } from '../services/pantoneColors';
import { generateSpecSheet } from '../services/pdfGenerator';
import { ProductionCalculator } from './ProductionCalculator'; 
import { YarnStudio } from './YarnStudio';
import { ProjectManagerModal } from './ProjectManagerModal'; 
import { ColorwayStudio } from './ColorwayStudio';

import { WeaveProjectFile, APP_VERSION } from '../services/io/schemas';
import { downloadFile, loadFile, serializeGrid, deserializeGrid } from '../services/io/fileHandler';
import { StorageService } from '../services/io/storage'; 
import { renderFabricToCanvas } from '../services/fabricRenderer'; 

interface HistoryState {
    draft: boolean[][];
    pegPlan: boolean[][];
    warpPatternString: string;
    weftPatternString: string;
    dentingPatternString: string;
    dentingPlan: number[];
    settings: WeaveSettings;
    warpYarns: { [key: string]: YarnDefinition };
    weftYarns: { [key: string]: YarnDefinition };
    weftZones: DensityZone[];
}

export const DobbyMaster: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appMode, setAppMode] = useState<AppMode>('weave');
  const [showSimModal, setShowSimModal] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false); 

  // Fix: Added missing warpFloatThreshold and weftFloatThreshold to the initial state to satisfy WeaveSettings interface
  const [settings, setSettings] = useState<WeaveSettings>({
    warpThreads: 8, 
    weftPicks: 8, 
    harnesses: 8, 
    epi: 24, 
    ppi: 24, 
    gridDivision: 4, 
    gridX: 8, 
    gridY: 8,
    warpFloatThreshold: 8,
    weftFloatThreshold: 8
  });

  const [projectName, setProjectName] = useState('Untitled Project'); 
  const [paletteColors] = useState<string[]>(PANTONE_PALETTE);
  const [customWeaves, setCustomWeaves] = useState<LibraryWeave[]>([]);

  const createDefaultYarn = (color: string | undefined): YarnDefinition => ({
      color: color || '#CCCCCC', 
      model: 'simple', construction: 'standard', fiberType: 'Cotton', countSystem: 'Nm', count: 28, ply: 1, thickness: 1.0, twist: 'Z', tpi: 15, sheen: 0.5, roughness: 0.5, price: 0,
      bindingDepth: 0.05
  });

  const defaultWarp: { [key: string]: YarnDefinition } = { 'A': createDefaultYarn(PANTONE_PALETTE[38]), 'B': createDefaultYarn(PANTONE_PALETTE[20]) };
  const defaultWeft: { [key: string]: YarnDefinition } = { 'A': createDefaultYarn(PANTONE_PALETTE[35]), 'B': createDefaultYarn(PANTONE_PALETTE[27]) };

  const [warpYarns, setWarpYarns] = useState<{ [key: string]: YarnDefinition }>(defaultWarp);
  const [weftYarns, setWeftYarns] = useState<{ [key: string]: YarnDefinition }>(defaultWeft);

  const [colorways, setColorways] = useState<Colorway[]>([]);

  const warpColors = useMemo(() => {
      const map: {[key:string]: string} = {};
      (Object.entries(warpYarns) as [string, YarnDefinition][]).forEach(([k,v]) => { if(v) map[k] = v.color; });
      return map;
  }, [warpYarns]);

  const weftColors = useMemo(() => {
      const map: {[key:string]: string} = {};
      (Object.entries(weftYarns) as [string, YarnDefinition][]).forEach(([k,v]) => { if(v) map[k] = v.color; });
      return map;
  }, [weftYarns]);

  const [selectedColorIndex, setSelectedColorIndex] = useState(0); 
  const [activeYarnId, setActiveYarnId] = useState<string>('A');
  const [selectedYarnType, setSelectedYarnType] = useState<'warp' | 'weft'>('warp');
  const [studioYarnDef, setStudioYarnDef] = useState<YarnDefinition>(defaultWarp['A']);

  useEffect(() => {
      const source = selectedYarnType === 'warp' ? warpYarns : weftYarns;
      if (source[activeYarnId]) {
          setStudioYarnDef(source[activeYarnId]);
      }
  }, [activeYarnId, selectedYarnType, warpYarns, weftYarns]); 

  const [warpPatternString, setWarpPatternString] = useState('4A4B');
  const [weftPatternString, setWeftPatternString] = useState('4A4B');
  const [weftZones, setWeftZones] = useState<DensityZone[]>([]);
  
  const [dentingPatternString, setDentingPatternString] = useState('2');
  const [dentingPlan, setDentingPlan] = useState<number[]>(() => Array(8).fill(2));

  const [draft, setDraft] = useState<boolean[][]>(() => Array.from({ length: 8 }, (_, h) => Array.from({ length: 8 }, (_, w) => (w % 8) === h)));
  const [pegPlan, setPegPlan] = useState<boolean[][]>(() => Array.from({ length: 8 }, (_, p) => Array.from({ length: 8 }, (_, h) => ((p % 8) === h))));
  
  const [history, setHistory] = useState<{ past: HistoryState[], future: HistoryState[] }>({ past: [], future: [] });

  const copyGrid = (grid: boolean[][]) => grid.map(row => [...row]);

  useEffect(() => {
      const parts = dentingPatternString.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 0);
      setDentingPlan(parts.length > 0 ? parts : [2]);
  }, [dentingPatternString]);

  const saveHistory = useCallback(() => {
    setHistory(prev => {
        const currentSnapshot: HistoryState = {
            draft: copyGrid(draft), pegPlan: copyGrid(pegPlan), warpPatternString, weftPatternString, dentingPatternString, dentingPlan: [...dentingPlan], settings: { ...settings }, warpYarns: { ...warpYarns }, weftYarns: { ...weftYarns }, weftZones: [...weftZones]
        };
        const newPast = [...prev.past, currentSnapshot];
        if (newPast.length > 50) newPast.shift(); 
        return { past: newPast, future: [] };
    });
  }, [draft, pegPlan, warpPatternString, weftPatternString, dentingPatternString, dentingPlan, settings, warpYarns, weftYarns, weftZones]);

  const undo = useCallback(() => {
      setHistory(prev => {
          if (prev.past.length === 0) return prev;
          const previous = prev.past[prev.past.length - 1];
          const newPast = prev.past.slice(0, -1);
          setDraft(previous.draft); setPegPlan(previous.pegPlan); setWarpPatternString(previous.warpPatternString); setWeftPatternString(previous.weftPatternString); setDentingPatternString(previous.dentingPatternString || '2'); setDentingPlan(previous.dentingPlan || [2]); setSettings(previous.settings); setWarpYarns(previous.warpYarns); setWeftYarns(previous.weftYarns); setWeftZones(previous.weftZones || []);
          return { past: newPast, future: [previous, ...prev.future] }; 
      });
  }, [saveHistory]);

  const handleModeChange = (newMode: AppMode) => { 
      if (newMode === 'sim') setShowSimModal(true);
      else setAppMode(newMode); 
  };

  const handleYarnSelect = (id: string, type: 'warp' | 'weft') => {
      setActiveYarnId(id);
      setSelectedYarnType(type);
      setAppMode('yarn');
  };

  const handleApplyStudioYarn = () => {
      saveHistory();
      if (selectedYarnType === 'warp') {
          setWarpYarns(prev => ({ ...prev, [activeYarnId]: studioYarnDef }));
      } else {
          setWeftYarns(prev => ({ ...prev, [activeYarnId]: studioYarnDef }));
      }
  };

  const warpPattern = useMemo(() => {
    const parsed = parsePatternString(warpPatternString, warpColors);
    if (parsed.length === 0) return Array(settings.warpThreads).fill('#888888');
    return Array.from({ length: settings.warpThreads }, (_, i) => parsed[i % parsed.length]);
  }, [warpPatternString, warpColors, settings.warpThreads]);

  const weftPattern = useMemo(() => {
    const parsed = parsePatternString(weftPatternString, weftColors);
     if (parsed.length === 0) return Array(settings.weftPicks).fill('#888888');
    return Array.from({ length: settings.weftPicks }, (_, i) => parsed[i % parsed.length]);
  }, [weftPatternString, weftColors, settings.weftPicks]);

  const weavePattern: WeavePattern = useMemo(() => {
    return generateWeave({ draft, pegPlan, warpPattern, weftPattern });
  }, [draft, pegPlan, warpPattern, weftPattern]);

  const getProjectObject = useCallback((): WeaveProjectFile => ({
      fileType: 'wonderweaves-project', version: APP_VERSION, timestamp: Date.now(), name: projectName, loom: settings,
      grids: { draft: serializeGrid(draft), pegPlan: serializeGrid(pegPlan), denting: dentingPlan },
      patterns: { warpString: warpPatternString, weftString: weftPatternString },
      resources: { warpYarns, weftYarns, weftZones, palette: paletteColors }
  }), [projectName, settings, draft, pegPlan, dentingPlan, warpPatternString, weftPatternString, warpYarns, weftYarns, weftZones, paletteColors]);

  const generateThumbnail = useCallback(() => {
      const thumbCanvas = renderFabricToCanvas({
          weavePattern: weavePattern.pattern, structure: weavePattern.structure, epi: settings.epi, ppi: settings.ppi, dentingPlan, warpYarns, weftYarns, warpYarnSequence: expandPatternString(warpPatternString), weftYarnSequence: expandPatternString(weftPatternString), viewSide: 'face', dpi: 72, width: 600, height: 300
      });
      return thumbCanvas.toDataURL('image/jpeg', 0.8);
  }, [weavePattern, settings, dentingPlan, warpYarns, weftYarns, warpPatternString, weftPatternString]);

  const handleExport = useCallback(async () => {
      try {
          const projectData = getProjectObject();
          const cleanName = (projectName || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
          const filename = `${cleanName}-${new Date().toISOString().split('T')[0]}.weave`;
          downloadFile(JSON.stringify(projectData, null, 2), filename);
      } catch (e) {
          console.error("Export failed:", e);
      }
  }, [projectName, getProjectObject]);

  const loadProjectData = (data: WeaveProjectFile) => {
      saveHistory();
      setProjectName(data.name || 'Untitled');
      setSettings(data.loom);
      setDraft(deserializeGrid(data.grids.draft));
      setPegPlan(deserializeGrid(data.grids.pegPlan));
      setDentingPlan(data.grids.denting);
      setDentingPatternString(data.grids.denting.join(', '));
      setWarpPatternString(data.patterns.warpString);
      setWeftPatternString(data.patterns.weftString);
      setWarpYarns(data.resources.warpYarns);
      setWeftYarns(data.resources.weftYarns);
      setWeftZones(data.resources.weftZones || []);
  };

  const handleLoadFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
          const content = await loadFile(file);
          if (!content.includes('wonderweaves-project')) {
              alert("Invalid project file format.");
              return;
          }
          loadProjectData(JSON.parse(content));
      } catch (e) { 
          console.error(e);
          alert("Failed to load design. Ensure the file is a valid .weave project.");
      } finally {
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  const handleLoadFromStorage = async (id: string) => {
      try {
          const data = await StorageService.loadProject(id);
          loadProjectData(data);
      } catch (e) { console.error(e); }
  };

  const handlePdfDownload = () => {
      generateSpecSheet({ settings, warpYarns, weftYarns, warpPatternString, weftPatternString, dentingPlan, dentingPatternString, draft, pegPlan, weavePattern });
  };

  const [patternManagerState, setPatternManagerState] = useState<{ isOpen: boolean; type: 'warp' | 'weft'; }>({ isOpen: false, type: 'warp' });
  const [yarnSelectorState, setYarnSelectorState] = useState<{ isOpen: boolean; type: 'warp' | 'weft'; }>({ isOpen: true, type: 'warp' });

  const [currentTool, setCurrentTool] = useState<ToolType>('pencil');
  const [viewMode, setViewMode] = useState<ViewMode>('interlace');
  const [faceMode, setFaceMode] = useState<FaceMode>('face');
  const [currentFillPatternId, setCurrentFillPatternId] = useState<string>('twill-2-2');
  
  const isDrawing = useRef(false);
  const drawVal = useRef(true);

  const dentingGrid = useMemo(() => {
      const dents = dentingPlan.length > 0 ? dentingPlan : [2];
      const row0: string[] = [];
      const row1: string[] = [];
      let dentIndex = 0, threadCount = 0, currentDentSize = dents[0];
      for(let i=0; i<settings.warpThreads; i++) {
          let loopGuard = 0;
          while(currentDentSize === 0 && loopGuard < dents.length * 2) {
              dentIndex++;
              currentDentSize = dents[dentIndex % dents.length];
              loopGuard++;
          }
          const isTop = dentIndex % 2 === 0;
          row0.push(isTop ? '#000000' : '#ffffff');
          row1.push(!isTop ? '#000000' : '#ffffff');
          threadCount++;
          if(threadCount >= currentDentSize) {
              dentIndex++;
              threadCount = 0;
              currentDentSize = dents[dentIndex % dents.length];
          }
      }
      return [row0, row1]; 
  }, [dentingPlan, settings.warpThreads]);

  const handleSettingsChange = (newSettings: WeaveSettings) => {
      saveHistory();
      setSettings(newSettings);
      if (newSettings.harnesses !== settings.harnesses || newSettings.warpThreads !== settings.warpThreads) {
          setDraft(Array.from({ length: newSettings.harnesses }, (_, h) => 
              Array.from({ length: newSettings.warpThreads }, (_, w) => draft[h] ? (draft[h][w] || false) : (w % newSettings.harnesses === h))));
      }
      if (newSettings.harnesses !== settings.harnesses || newSettings.weftPicks !== settings.weftPicks) {
          setPegPlan(Array.from({ length: newSettings.weftPicks }, (_, p) => 
              Array.from({ length: newSettings.harnesses }, (_, h) => pegPlan[p] ? (pegPlan[p][h] || false) : (p % newSettings.harnesses === h))));
      }
  };

  const handleSyncGrid = (warpLen: number, weftLen: number) => {
      saveHistory();
      const newSettings = { ...settings, warpThreads: Math.max(4, warpLen), weftPicks: Math.max(4, weftLen) };
      setSettings(newSettings);
      setDraft(Array.from({ length: newSettings.harnesses }, (_, h) => Array.from({ length: newSettings.warpThreads }, (_, w) => draft[h] ? draft[h][w % (draft[0]?.length||1)] : (w%newSettings.harnesses===h))));
      setPegPlan(Array.from({ length: newSettings.weftPicks }, (_, p) => Array.from({ length: newSettings.harnesses }, (_, h) => {
          const row = pegPlan[p % (pegPlan.length || 1)];
          return row ? row[h] : (p % newSettings.harnesses === h);
      })));
  };

  const handleDraftInteraction = (row: number, col: number, type: 'down' | 'enter' | 'up') => {
      if (type === 'down' || (type === 'enter' && isDrawing.current)) {
          if (type === 'down') { saveHistory(); isDrawing.current = true; }
          const newDraft = copyGrid(draft);
          for (let h = 0; h < newDraft.length; h++) if (newDraft[h]) newDraft[h][col] = false;
          if (newDraft[row]) newDraft[row][col] = true;
          setDraft(newDraft);
      } else if (type === 'up') isDrawing.current = false;
  };

  const handlePegPlanInteraction = (row: number, col: number, type: 'down' | 'enter' | 'up') => {
      if (type === 'down') {
          saveHistory(); isDrawing.current = true;
          drawVal.current = pegPlan[row] ? !pegPlan[row][col] : true;
          const newPeg = copyGrid(pegPlan);
          if (newPeg[row]) newPeg[row][col] = drawVal.current;
          setPegPlan(newPeg);
      } else if (type === 'enter' && isDrawing.current) {
          const newPeg = copyGrid(pegPlan);
          if (newPeg[row] && newPeg[row][col] !== drawVal.current) {
              newPeg[row][col] = drawVal.current;
              setPegPlan(newPeg);
          }
      } else if (type === 'up') isDrawing.current = false;
  };

  const handleDrawdownInteraction = (row: number, col: number, type: 'down' | 'enter' | 'up') => {
      let harnessIndex = -1;
      for(let h=0; h<draft.length; h++) if(draft[h] && draft[h][col]) { harnessIndex = h; break; }
      if (harnessIndex === -1) return;
      if (type === 'down') {
          saveHistory(); isDrawing.current = true;
          drawVal.current = (pegPlan[row] && pegPlan[row][harnessIndex]) ? !pegPlan[row][harnessIndex] : true;
          const newPeg = copyGrid(pegPlan);
          if (newPeg[row]) newPeg[row][harnessIndex] = drawVal.current;
          setPegPlan(newPeg);
      } else if (type === 'enter' && isDrawing.current) {
          const newPeg = copyGrid(pegPlan);
          if (newPeg[row] && newPeg[row][harnessIndex] !== drawVal.current) {
              newPeg[row][harnessIndex] = drawVal.current;
              setPegPlan(newPeg);
          }
      } else if (type === 'up') isDrawing.current = false;
  };

  const handleWarpColorInteraction = (row: number, col: number, type: 'down' | 'enter' | 'up') => {
      if (currentTool === 'brush') {
          if (type === 'down') { saveHistory(); isDrawing.current = true; }
          if (isDrawing.current || type === 'down') {
              const targetIdx = col % settings.warpThreads;
              const seq = expandPatternString(warpPatternString);
              while(seq.length < settings.warpThreads) {
                  const baseLen = seq.length || 1;
                  seq.push(seq[seq.length % baseLen] || 'A');
              }
              if (seq[targetIdx] !== activeYarnId) {
                  seq[targetIdx] = activeYarnId;
                  setWarpPatternString(compressPatternString(seq));
              }
          }
      } else if (type === 'down') {
          handleYarnSelect(expandPatternString(warpPatternString)[col % expandPatternString(warpPatternString).length], 'warp');
      }
      if (type === 'up') isDrawing.current = false;
  };

  const handleWeftColorInteraction = (row: number, col: number, type: 'down' | 'enter' | 'up') => {
      if (currentTool === 'brush') {
          if (type === 'down') { saveHistory(); isDrawing.current = true; }
          if (isDrawing.current || type === 'down') {
              const targetIdx = row % settings.weftPicks;
              const seq = expandPatternString(weftPatternString);
              while(seq.length < settings.weftPicks) {
                  const baseLen = seq.length || 1;
                  seq.push(seq[seq.length % baseLen] || 'A');
              }
              if (seq[targetIdx] !== activeYarnId) {
                  seq[targetIdx] = activeYarnId;
                  setWeftPatternString(compressPatternString(seq));
              }
          }
      } else if (type === 'down') {
          handleYarnSelect(expandPatternString(weftPatternString)[row % expandPatternString(weftPatternString).length], 'weft');
      }
      if (type === 'up') isDrawing.current = false;
  };

  const handleDentingInteraction = (row: number, col: number, type: 'down' | 'enter' | 'up') => {
      const currentPlan = dentingPlan.length > 0 ? dentingPlan : [2], boolMap: boolean[] = [];
      let state = true, pIdx = 0;
      while(boolMap.length < settings.warpThreads) {
          for(let k=0; k<currentPlan[pIdx % currentPlan.length]; k++) boolMap.push(state);
          state = !state; pIdx++;
      }
      let changed = false;
      const targetCol = col % settings.warpThreads;
      if (type === 'down') { saveHistory(); isDrawing.current = true; drawVal.current = row === 0; if (boolMap[targetCol] !== drawVal.current) { boolMap[targetCol] = drawVal.current; changed = true; } }
      else if (type === 'enter' && isDrawing.current) { if (boolMap[targetCol] !== drawVal.current) { boolMap[targetCol] = drawVal.current; changed = true; } }
      else if (type === 'up') { isDrawing.current = false; return; }
      if (changed) {
          const newPlan: number[] = [];
          if (boolMap.length > 0) {
              if (boolMap[0] === false) newPlan.push(0);
              let run = 1, last = boolMap[0];
              for(let i=1; i<boolMap.length; i++) { if (boolMap[i] === last) run++; else { newPlan.push(run); last = boolMap[0]; run = 1; } }
              newPlan.push(run);
          }
          setDentingPlan(newPlan); setDentingPatternString(newPlan.join(','));
      }
  };

  const handleLoadWeave = (weave: LibraryWeave) => {
      saveHistory();
      setSettings(prev => ({ ...prev, harnesses: weave.harnesses }));
      setDraft(Array.from({ length: weave.harnesses }, (_, h) => Array.from({ length: settings.warpThreads }, (_, w) => weave.draft[h][w % weave.draft[0].length] === 1)));
      setPegPlan(Array.from({ length: settings.weftPicks }, (_, p) => Array.from({ length: weave.harnesses }, (_, h) => weave.pegPlan[p % weave.pegPlan.length][h] === 1)));
  };

  const handlePatternApply = (newPattern: string, zones?: DensityZone[]) => {
      saveHistory();
      const len = getTotalThreads(newPattern);
      if (patternManagerState.type === 'warp') {
          setWarpPatternString(newPattern);
          if (len > 0 && len !== settings.warpThreads) {
              const nS = { ...settings, warpThreads: len }; setSettings(nS);
              setDraft(Array.from({ length: nS.harnesses }, (_, h) => Array.from({ length: nS.warpThreads }, (_, w) => draft[h] ? (draft[h][w] || false) : (w % nS.harnesses === h))));
          }
      } else {
          setWeftPatternString(newPattern); if (zones) setWeftZones(zones);
          if (len > 0 && len !== settings.weftPicks) {
              const nS = { ...settings, weftPicks: len }; setSettings(nS);
              setPegPlan(Array.from({ length: nS.weftPicks }, (_, p) => Array.from({ length: nS.harnesses }, (_, h) => {
                  const existingRow = pegPlan[p % (pegPlan.length || 1)];
                  return existingRow ? existingRow[h] : (p % nS.harnesses === h);
              })));
          }
      }
  };

  const handleStructureApply = (char: string, dent?: number) => {
      saveHistory();
      
      const isWarp = yarnSelectorState.type === 'warp';
      const totalWarpEnds = settings.warpThreads;
      
      const baseSeq = expandPatternString(warpPatternString);
      const fullWarpSeq: string[] = [];
      while(fullWarpSeq.length < totalWarpEnds) { fullWarpSeq.push(...baseSeq); }
      fullWarpSeq.length = totalWarpEnds;

      const seq = isWarp ? fullWarpSeq : expandPatternString(weftPatternString);
      const indices = seq.map((c, i) => c === char ? i : -1).filter(i => i !== -1);
      const targetW = WEAVE_LIBRARY.find(w => w.id === currentFillPatternId) || customWeaves.find(w => w.id === currentFillPatternId);
      
      if (indices.length && targetW) {
        const { structure: libS } = generateWeave({ draft: targetW.draft.map(r=>r.map(c=>c===1)), pegPlan: targetW.pegPlan.map(r=>r.map(c=>c===1)), warpPattern: Array(targetW.draft[0].length).fill('A'), weftPattern: Array(targetW.pegPlan.length).fill('A') });
        const { structure: currentS } = generateWeave({ draft, pegPlan, warpPattern, weftPattern });
        const nG = currentS.map(row => [...row]);
        indices.forEach(idx => {
            if (isWarp) for(let r=0; r<settings.weftPicks; r++) nG[r][idx] = libS[r % libS.length][idx % libS[0].length];
            else for(let c=0; c<settings.warpThreads; c++) nG[idx][c] = libS[idx % libS.length][c % libS[0].length];
        });
        const { draft: nD, pegPlan: nP, harnesses: nH } = reconstructWeaveFromGrid(nG, settings.warpThreads, settings.weftPicks);
        setSettings(prev => ({ ...prev, harnesses: nH })); setDraft(nD); setPegPlan(nP);
      }

      if (isWarp && dent !== undefined && dent > 0) {
          const currentPlan = dentingPlan.length > 0 ? dentingPlan : [2];
          const threadDents: number[] = [];
          let pIdx = 0, tIdx = 0;
          while(tIdx < totalWarpEnds) {
              const size = currentPlan[pIdx % currentPlan.length];
              for(let k=0; k<size && tIdx < totalWarpEnds; k++) {
                  threadDents[tIdx++] = size;
              }
              pIdx++;
          }

          let i = 0;
          while (i < totalWarpEnds) {
              if (fullWarpSeq[i] === char) {
                  let run = 0;
                  while (i + run < totalWarpEnds && fullWarpSeq[i + run] === char && run < dent) {
                      run++;
                  }
                  for (let k = 0; k < run; k++) { threadDents[i + k] = run; }
                  i += run;
              } else {
                  i++;
              }
          }

          const newPlan: number[] = [];
          let cursor = 0;
          while (cursor < totalWarpEnds) {
              const groupSize = threadDents[cursor] || 2;
              newPlan.push(groupSize);
              cursor += groupSize;
          }
          setDentingPlan(newPlan);
          setDentingPatternString(newPlan.join(', '));
      }
  };

  const isYarnMode = appMode === 'yarn', isSpecsMode = appMode === 'specs', isWeaveMode = appMode === 'weave', isPatternMode = appMode === 'pattern', isColorwayMode = appMode === 'colorways';
  const rightPanelTab = isSpecsMode ? 'construction' : (isYarnMode ? 'yarns' : (isPatternMode ? 'pattern' : 'weave'));

  return (
    <div className="flex flex-col flex-1 h-full min-w-0">
         <input type="file" ref={fileInputRef} onChange={handleLoadFromFile} accept=".weave" style={{ display: 'none' }} />
         <TopToolbar 
            currentTool={currentTool} onToolChange={setCurrentTool} viewMode={viewMode} onViewModeChange={setViewMode}
            faceMode={faceMode} onFaceModeChange={setFaceMode} currentFillPatternId={currentFillPatternId}
            onFillPatternChange={setCurrentFillPatternId} canUndo={history.past.length > 0} canRedo={false}
            onUndo={undo} onRedo={()=>{}} onSave={handleExport} onLoad={() => setShowProjectManager(true)}
            onImport={() => fileInputRef.current?.click()}
            onDownloadPdf={handlePdfDownload} onApplyToWarp={() => { setYarnSelectorState({ isOpen: true, type: 'warp' }); }}
            onApplyToWeft={() => { setYarnSelectorState({ isOpen: true, type: 'weft' }); }}
        />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur px-4 py-1 rounded-full shadow-sm border border-gray-200 hidden md:block">
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-transparent text-center font-bold text-gray-700 text-xs focus:outline-none focus:text-blue-600 w-48" placeholder="Untitled Project" />
        </div>
        <div className="absolute left-0 top-14 bottom-0 z-40"><ProgressiveToolbar mode={appMode} onModeChange={handleModeChange} /></div>
        <div className="flex-1 relative overflow-hidden flex flex-row min-w-0 pl-20">
             {isYarnMode && <YarnStudio yarn={studioYarnDef} onChange={setStudioYarnDef} onApply={handleApplyStudioYarn} />}
             {isColorwayMode && <ColorwayStudio initialWarpYarns={warpYarns} initialWeftYarns={weftYarns} warpPatternString={warpPatternString} weftPatternString={weftPatternString} dentingPlan={dentingPlan} epi={settings.epi} ppi={settings.ppi} weavePattern={weavePattern} colorways={colorways} onColorwaysChange={setColorways} onApplyColorway={(w, p) => { saveHistory(); setWarpYarns(w); setWeftYarns(p); }} expandPatternString={expandPatternString} />}
             {isPatternMode && (
                 <div className="flex-1 flex h-full bg-gray-50 min-w-0">
                     <div className="w-2/5 h-full border-r border-gray-200 bg-white relative flex-shrink-0">
                         <WeaveArea draft={draft} pegPlan={pegPlan} warpPattern={warpPattern} weftPattern={weftPattern} weavePattern={weavePattern.pattern} structure={weavePattern.structure} handleDraftInteraction={()=>{}} handlePegPlanInteraction={()=>{}} handleDrawdownInteraction={()=>{}} handleWarpColorInteraction={handleWarpColorInteraction} handleWeftColorInteraction={handleWeftColorInteraction} pegPlanActiveColor="#000" draftActiveColor="#000" currentTool={currentTool} gridDivision={settings.gridDivision} viewMode="interlace" faceMode="face" epi={settings.epi} ppi={settings.ppi} warpRepeat={settings.warpThreads} weftRepeat={settings.weftPicks} showHeaders={false} showGrid={false} weftZones={weftZones} initialScale={0.5} warpYarns={warpYarns} weftYarns={weftYarns} warpYarnSequence={expandPatternString(warpPatternString)} weftYarnSequence={expandPatternString(weftPatternString)} />
                     </div>
                     <div className="flex-1 flex-col h-full min-w-0">
                         <div className="flex-1 border-b border-gray-200 relative min-h-0"><PatternManager target="Warp" patternString={warpPatternString} onApply={(s) => { handlePatternApply(s); }} availableChars={Object.keys(warpYarns)} colorMap={warpColors} onEditYarn={(c)=>handleYarnSelect(c,'warp')} className="h-full w-full border-none" yarns={warpYarns} onUpdateYarn={(c,d)=>setWarpYarns(p=>({...p,[c]:d}))} /></div>
                         <div className="flex-1 relative min-h-0"><PatternManager target="Weft" patternString={weftPatternString} onApply={(s, z) => { handlePatternApply(s, z); }} availableChars={Object.keys(weftYarns)} colorMap={weftColors} onEditYarn={(c)=>handleYarnSelect(c,'weft')} initialZones={weftZones} totalPicks={settings.weftPicks} className="h-full w-full border-none" yarns={weftYarns} onUpdateYarn={(c,d)=>setWeftYarns(p=>({...p,[c]:d}))} /></div>
                     </div>
                 </div>
             )}
             {(isWeaveMode || isSpecsMode) && (
                 <div className="flex-1 relative bg-gray-50 overflow-hidden">
                     <WeaveArea draft={draft} pegPlan={pegPlan} warpPattern={warpPattern} weftPattern={weftPattern} weavePattern={weavePattern.pattern} structure={weavePattern.structure} handleDraftInteraction={handleDraftInteraction} handlePegPlanInteraction={handlePegPlanInteraction} handleDrawdownInteraction={handleDrawdownInteraction} handleWarpColorInteraction={handleWarpColorInteraction} handleWeftColorInteraction={handleWeftColorInteraction} handleDentingInteraction={handleDentingInteraction} pegPlanActiveColor="#3B82F6" draftActiveColor="#3B82F6" currentTool={currentTool} gridDivision={settings.gridDivision} viewMode={viewMode} faceMode={faceMode} epi={settings.epi} ppi={settings.ppi} warpRepeat={settings.warpThreads} weftRepeat={settings.weftPicks} dentingGrid={dentingGrid} weftZones={weftZones} warpYarns={warpYarns} weftYarns={weftYarns} warpYarnSequence={expandPatternString(warpPatternString)} weftYarnSequence={expandPatternString(weftPatternString)} />
                 </div>
             )}
             {appMode === 'tech' && <ProductionCalculator settings={settings} warpYarns={warpYarns} weftYarns={weftYarns} warpPatternString={warpPatternString} weftPatternString={weftPatternString} dentingPlan={dentingPlan} draft={draft} pegPlan={pegPlan} generateThumbnail={generateThumbnail} />}
             {(isWeaveMode || isSpecsMode || isYarnMode || isPatternMode) && (
                 <RightPanel
                    settings={settings} onSettingsChange={handleSettingsChange} dentingPattern={dentingPatternString} onDentingChange={setDentingPatternString} onSnapshot={saveHistory} onLoadWeave={handleLoadWeave} customWeaves={customWeaves} onAddWeave={(w)=>setCustomWeaves(p=>[...p,w])} onUpdateWeave={(w)=>setCustomWeaves(p=>p.map(cw=>cw.id===w.id?w:cw))} onDeleteWeave={(id)=>setCustomWeaves(p=>p.filter(cw=>cw.id!==id))} warpYarns={warpYarns} weftYarns={weftYarns} onUpdateWarpYarn={(c,d)=>setWarpYarns(p=>({...p,[c]:d}))} onUpdateWeftYarn={(c,d)=>setWeftYarns(p=>({...p,[c]:d}))} onUpdateAllYarns={(t,y)=>t==='warp'?setWarpYarns(y):setWeftYarns(y)} paletteColors={paletteColors} warpPatternString={warpPatternString} setWarpPatternString={setWarpPatternString} weftPatternString={weftPatternString} setWeftPatternString={setWeftPatternString} onOpenGridEditor={(t)=>setPatternManagerState({isOpen:true,type:t})} onOpenPatternGenerator={(t)=>setPatternManagerState({isOpen:true,type:t})} currentInput={{draft,pegPlan,warpPattern,weftPattern}} onApplyGenerated={(res)=>{saveHistory();if(res.draft)setDraft(deserializeGrid(res.draft));if(res.pegPlan)setPegPlan(deserializeGrid(res.pegPlan));if(res.warpPattern)setWarpPatternString(res.warpPattern);if(res.weftPattern)setWeftPatternString(res.weftPattern);}} onSimulate={()=>setShowSimModal(true)} selectedColorIndex={selectedColorIndex} onSelectColor={setSelectedColorIndex} onGridOperation={(t,op)=>{saveHistory();const g=t==='draft'?draft:pegPlan,sG=t==='draft'?setDraft:setPegPlan;let nG=copyGrid(g);if(op==='clear')nG=Array.from({length:g.length},()=>Array(g[0].length).fill(false));else if(op==='invert')nG=g.map(r=>r.map(c=>!c));else if(op==='shiftUp')nG=[...g.slice(1),g[0]];else if(op==='shiftDown')nG=[g[g.length-1],...g.slice(0,g.length-1)];else if(op==='shiftLeft')nG=g.map(r=>[...r.slice(1),r[0]]);else if(op==='shiftRight')nG=g.map(r=>[r[r.length-1],...r.slice(0,r.length-1)]);sG(nG);}} activeYarnId={activeYarnId} selectedYarnType={selectedYarnType} onSelectYarn={(id, type) => { handleYarnSelect(id, type); setCurrentTool('brush'); }} onActiveYarnChange={(id) => { setActiveYarnId(id); setCurrentTool('brush'); }} forcedTab={rightPanelTab as any} onSyncGridDimensions={handleSyncGrid} />
             )}
        </div>
        <FabricSimulationModal isOpen={showSimModal} onClose={()=>setShowSimModal(false)} weavePattern={weavePattern.pattern} structure={weavePattern.structure} epi={settings.epi} ppi={settings.ppi} dentingPlan={dentingPlan} weftZones={weftZones} warpYarns={warpYarns} weftYarns={weftYarns} warpYarnSequence={expandPatternString(warpPatternString)} weftYarnSequence={expandPatternString(weftPatternString)} />
        <PatternManagerModal isOpen={patternManagerState.isOpen} onClose={()=>setPatternManagerState({...patternManagerState,isOpen:false})} target={patternManagerState.type==='warp'?'Warp':'Weft'} patternString={patternManagerState.type==='warp'?warpPatternString:weftPatternString} onApply={(s,z)=>handlePatternApply(s,z)} availableChars={Object.keys(patternManagerState.type==='warp'?warpYarns:weftYarns)} colorMap={patternManagerState.type==='warp'?warpColors:weftColors} onEditYarn={(c)=>handleYarnSelect(c,patternManagerState.type)} totalPicks={settings.weftPicks} initialZones={weftZones} yarns={patternManagerState.type==='warp'?warpYarns:weftYarns} onUpdateYarn={(c,d)=>{saveHistory();if(patternManagerState.type==='warp')setWarpYarns(p=>({...p,[c]:d}));else setWeftYarns(p=>({...p,[c]:d}))}} />
        <YarnSelectorModal isOpen={yarnSelectorState.isOpen} onClose={()=>setYarnSelectorState({...yarnSelectorState,isOpen:false})} title={`Select ${yarnSelectorState.type==='warp'?'Warp':'Weft'} Yarn`} yarns={yarnSelectorState.type==='warp'?warpYarns:weftYarns} onSelect={(c, d)=>handleStructureApply(c, d)} isWarp={yarnSelectorState.type==='warp'} />
        <ProjectManagerModal isOpen={showProjectManager} onClose={()=>setShowProjectManager(false)} onLoadProject={handleLoadFromStorage} onImport={()=>fileInputRef.current?.click()} />
    </div>
  );
};
