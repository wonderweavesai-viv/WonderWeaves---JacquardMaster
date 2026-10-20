
import React, { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback, MouseEvent } from 'react';
import { InteractiveGrid } from './InteractiveGrid';
import { RulerUnit, ViewMode, FaceMode, ToolType, DensityZone, YarnDefinition } from '../types';
import { CrossSection } from './CrossSection';
import { ZoomInIcon, ZoomOutIcon, ResetZoomIcon } from './icons';

interface WeaveAreaProps {
  draft: boolean[][];
  pegPlan: boolean[][];
  warpPattern: string[]; // Colors
  weftPattern: string[]; // Colors
  weavePattern: string[][];
  structure: boolean[][]; 
  dentingGrid?: string[][];
  handleDraftInteraction: (row: number, col: number, type: 'down' | 'enter' | 'up') => void;
  handlePegPlanInteraction: (row: number, col: number, type: 'down' | 'enter' | 'up') => void;
  handleDrawdownInteraction: (row: number, col: number, type: 'down' | 'enter' | 'up') => void;
  handleWarpColorInteraction?: (row: number, col: number, type: 'down' | 'enter' | 'up') => void;
  handleWeftColorInteraction?: (row: number, col: number, type: 'down' | 'enter' | 'up') => void;
  handleDentingInteraction?: (row: number, col: number, type: 'down' | 'enter' | 'up') => void;
  pegPlanActiveColor: string;
  draftActiveColor: string;
  currentTool: ToolType;
  gridDivision: number;
  viewMode: ViewMode;
  faceMode: FaceMode;
  epi: number;
  ppi: number;
  warpRepeat: number;
  weftRepeat: number;
  showHeaders?: boolean;
  showGrid?: boolean;
  weftZones?: DensityZone[]; 
  initialScale?: number;
  // NEW: Props for identifying extra yarns
  warpYarns?: { [key: string]: YarnDefinition };
  weftYarns?: { [key: string]: YarnDefinition };
  warpYarnSequence?: string[];
  weftYarnSequence?: string[];
}

const Ruler: React.FC<{
    orientation: 'horizontal' | 'vertical';
    lengthPixels: number; 
    offsetPixels: number; 
    unit: RulerUnit;
    ppi: number; 
    scale: number;
}> = ({ orientation, lengthPixels, offsetPixels, unit, ppi, scale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const size = 24; 
        
        if (orientation === 'horizontal') {
            canvas.width = lengthPixels * dpr;
            canvas.height = size * dpr;
            canvas.style.width = `${lengthPixels}px`;
            canvas.style.height = `${size}px`;
        } else {
            canvas.width = size * dpr;
            canvas.height = lengthPixels * dpr;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${lengthPixels}px`;
        }
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0,0, orientation === 'horizontal' ? lengthPixels : size, orientation === 'horizontal' ? size : lengthPixels);
        
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px monospace';
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;

        const pixelsPerThread = 20 * scale;
        let pixelsPerMajor = pixelsPerThread * 10; 
        let labelFactor = 10; 
        
        if (unit === 'inch') {
            pixelsPerMajor = pixelsPerThread * ppi; 
            labelFactor = 1;
        } else if (unit === 'cm') {
            pixelsPerMajor = (pixelsPerThread * ppi) / 2.54; 
            labelFactor = 1;
        }

        const scrollPos = -offsetPixels;
        
        const startUnit = Math.floor(scrollPos / pixelsPerMajor);
        const endUnit = Math.floor((scrollPos + lengthPixels) / pixelsPerMajor);
        
        for (let i = startUnit; i <= endUnit + 1; i++) {
            const worldPos = (i * pixelsPerMajor);
            const screenPos = worldPos - scrollPos;
            
            if (orientation === 'horizontal') {
                ctx.moveTo(screenPos, size);
                ctx.lineTo(screenPos, size - 10);
                if (i % 1 === 0) ctx.fillText(`${i*labelFactor}`, screenPos + 2, 10);
            } else {
                ctx.moveTo(size, screenPos);
                ctx.lineTo(size - 10, screenPos);
                if (i % 1 === 0) {
                     ctx.save();
                     ctx.translate(10, screenPos + 10);
                     ctx.rotate(-Math.PI/2);
                     ctx.fillText(`${i*labelFactor}`, 0, 0);
                     ctx.restore();
                }
            }
        }
        ctx.stroke();

    }, [orientation, lengthPixels, offsetPixels, unit, ppi, scale]);

    return <canvas ref={canvasRef} className="bg-gray-50 border-gray-200 pointer-events-none block" />;
}

const DensityTrack: React.FC<{
    zones: DensityZone[];
    height: number;
    rows: number;
    repeats: number;
}> = ({ zones, height, rows, repeats }) => {
    const totalRows = rows * repeats;
    if (totalRows === 0) return null;
    const rowHeight = height / totalRows;

    return (
        <div className="w-4 h-full bg-gray-100 border-r border-gray-200 relative">
            {zones.map((zone) => {
                const elements = [];
                for(let i=0; i<repeats; i++) {
                    const top = (i * rows + zone.startPick) * rowHeight;
                    const h = ((zone.endPick - zone.startPick + 1) * rowHeight);
                    elements.push(
                        <div 
                            key={`${zone.id}-${i}`}
                            className="absolute left-0 right-0 border-b border-white/20 flex items-center justify-center group"
                            style={{ top, height: h, backgroundColor: zone.color }}
                            title={`PPI: ${zone.ppi}`}
                        >
                            {h > 15 && <span className="text-[8px] font-bold text-white opacity-0 group-hover:opacity-100">{zone.ppi}</span>}
                        </div>
                    );
                }
                return elements;
            })}
        </div>
    );
};


export const WeaveArea: React.FC<WeaveAreaProps> = ({
  draft, pegPlan, warpPattern, weftPattern, weavePattern, structure, dentingGrid,
  handleDraftInteraction, handlePegPlanInteraction, handleDrawdownInteraction,
  handleWarpColorInteraction, handleWeftColorInteraction, handleDentingInteraction,
  pegPlanActiveColor, draftActiveColor, currentTool, gridDivision,
  viewMode, faceMode, epi, ppi,
  warpRepeat, weftRepeat,
  showHeaders = true,
  showGrid = true,
  weftZones = [],
  initialScale = 1,
  warpYarns, weftYarns, warpYarnSequence, weftYarnSequence
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(initialScale);
  const scaleRef = useRef(initialScale);

  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const [rulerUnit, setRulerUnit] = useState<RulerUnit>('thread');
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const zoomAnchor = useRef<{ worldX: number, worldY: number, screenX: number, screenY: number } | null>(null);
  
  const [activeCrossSectionRow, setActiveCrossSectionRow] = useState(0);
  const [activeCrossSectionCol, setActiveCrossSectionCol] = useState(0);

  useEffect(() => {
      const updateSize = () => {
          if (containerRef.current) {
              setViewportSize({ 
                  w: containerRef.current.clientWidth - 24, 
                  h: containerRef.current.clientHeight - 24 
              });
          }
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // Handle keyboard spacebar for panning
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat) {
            // Check if we are typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            setIsSpacePressed(true);
            if (e.target === document.body) e.preventDefault();
        }
    };
    const onUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            setIsSpacePressed(false);
        }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
        window.removeEventListener('keydown', onDown);
        window.removeEventListener('keyup', onUp);
    };
  }, []);

  useLayoutEffect(() => {
      if (zoomAnchor.current && scrollRef.current) {
          const { worldX, worldY, screenX, screenY } = zoomAnchor.current;
          const newScrollLeft = (worldX * scale) - screenX;
          const newScrollTop = (worldY * scale) - screenY;
          scrollRef.current.scrollLeft = newScrollLeft;
          scrollRef.current.scrollTop = newScrollTop;
          zoomAnchor.current = null;
      }
  }, [scale]);

  const handleScroll = () => {
      if (scrollRef.current) {
          setScrollPos({ x: scrollRef.current.scrollLeft, y: scrollRef.current.scrollTop });
      }
  };

  const displayWeave = useMemo(() => {
      const rows = weavePattern.length;
      if (rows === 0) return weavePattern;
      const cols = weavePattern[0] ? weavePattern[0].length : 0;
      const isStructure = viewMode === 'structure';
      const isReverse = faceMode === 'reverse';
      
      if (!isStructure && !isReverse) return weavePattern;

      const grid = new Array(rows).fill(null).map(() => new Array(cols).fill(''));
      for(let r=0; r<rows; r++) {
          const weftId = weftYarnSequence?.[r % weftYarnSequence.length] || 'A';
          const isExtraWeft = weftYarns?.[weftId]?.isExtraWeft || false;

          for(let c=0; c<cols; c++) {
              const warpId = warpYarnSequence?.[c % warpYarnSequence.length] || 'A';
              const isExtraWarp = warpYarns?.[warpId]?.isExtraWarp || false;
              const isExtra = isExtraWarp || isExtraWeft;

              let isWarpTop = (structure[r] && structure[r][c]) || false;
              if (isReverse) isWarpTop = !isWarpTop;

              if (isStructure) {
                  if (isExtra) {
                      grid[r][c] = isWarpTop ? '#6b7280' : '#e5e7eb'; // Medium gray / Light gray for extra structure
                  } else {
                      grid[r][c] = isWarpTop ? '#000000' : '#ffffff';
                  }
              } else {
                  if (isWarpTop) grid[r][c] = warpPattern[c % warpPattern.length] || '#888';
                  else grid[r][c] = weftPattern[r % weftPattern.length] || '#888';
              }
          }
      }
      return grid;
  }, [weavePattern, structure, warpPattern, weftPattern, viewMode, faceMode, warpYarns, weftYarns, warpYarnSequence, weftYarnSequence]);

  // Pre-calculate extra thread maps for grids
  const extraWarpMap = useMemo(() => {
      if (!warpYarnSequence || !warpYarns) return undefined;
      return warpYarnSequence.map(id => warpYarns[id]?.isExtraWarp || false);
  }, [warpYarnSequence, warpYarns]);

  const extraWeftMap = useMemo(() => {
      if (!weftYarnSequence || !weftYarns) return undefined;
      return weftYarnSequence.map(id => weftYarns[id]?.isExtraWeft || false);
  }, [weftYarnSequence, weftYarns]);

  const MAX_TILED_PIXELS = 12000;
  const BASE_CELL_SIZE = 20;
  const harnesses = draft.length;
  const warpThreads = warpPattern.length;
  const weftPicks = weftPattern.length;
  const repeatsX = Math.ceil(MAX_TILED_PIXELS / Math.max(1, warpThreads * BASE_CELL_SIZE));
  const repeatsY = Math.ceil(MAX_TILED_PIXELS / Math.max(1, weftPicks * BASE_CELL_SIZE));
  
  const draftHeight = harnesses * BASE_CELL_SIZE;
  const draftWidth = warpThreads * BASE_CELL_SIZE * repeatsX;
  const pegPlanHeight = weftPicks * BASE_CELL_SIZE * repeatsY;
  const pegPlanWidth = harnesses * BASE_CELL_SIZE;
  const colorBarSize = BASE_CELL_SIZE;
  const dentingHeight = dentingGrid ? (2 * BASE_CELL_SIZE) : 0;
  const crossSectionSize = 40; 
  const GAP = 20;
  const densityTrackWidth = 16; 

  const leftSidebarWidth = showHeaders ? (colorBarSize + densityTrackWidth + GAP + crossSectionSize + GAP + pegPlanWidth + GAP) : 0;
  const topHeaderHeight = showHeaders ? (colorBarSize + (dentingHeight > 0 ? GAP : 0) + dentingHeight + GAP + crossSectionSize + GAP + draftHeight + GAP) : 0;

  const scLeftW = leftSidebarWidth * scale;
  const scTopH = topHeaderHeight * scale;

  const performZoom = useCallback((factor: number, screenX: number, screenY: number) => {
      if (!scrollRef.current) return;
      const currentScale = scaleRef.current;
      const newScale = Math.min(Math.max(currentScale * factor, 0.05), 10);
      if (newScale === currentScale) return;
      
      const scrollLeft = scrollRef.current.scrollLeft;
      const scrollTop = scrollRef.current.scrollTop;
      
      // World position before scale
      const worldX = (scrollLeft + screenX) / currentScale;
      const worldY = (scrollTop + screenY) / currentScale;
      
      zoomAnchor.current = { worldX, worldY, screenX, screenY };
      scaleRef.current = newScale;
      setScale(newScale);
  }, []);

  useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      const onWheel = (e: globalThis.WheelEvent) => {
        if (isPanning.current) return;
        
        // Ctrl+Wheel is for zooming (Using ~25% steps)
        if (e.ctrlKey) {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const factor = e.deltaY > 0 ? 0.8 : 1.25;
            performZoom(factor, x, y);
            return;
        }

        // Standard Wheel scrolls natively unless we are in tool mode where we want wheel-zoom
        if (e.altKey || e.metaKey) {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const factor = e.deltaY > 0 ? 0.8 : 1.25;
            performZoom(factor, x, y);
        }
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
  }, [performZoom]);

  const handleZoomIn = () => performZoom(1.25, viewportSize.w / 2, viewportSize.h / 2);
  const handleZoomOut = () => performZoom(0.8, viewportSize.w / 2, viewportSize.h / 2);
  const handleResetZoom = () => { scaleRef.current = 1; setScale(1); };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Space or Middle Click or Pan Tool or Shift+Drag activates panning
    if (isSpacePressed || currentTool === 'pan' || e.button === 1 || e.shiftKey) { 
        e.preventDefault();
        isPanning.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isPanning.current) {
        e.preventDefault();
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        if (scrollRef.current) {
            scrollRef.current.scrollLeft -= dx;
            scrollRef.current.scrollTop -= dy;
        }
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };
  
  const handleMouseUp = () => { isPanning.current = false; };

  const xsRenderCols = warpThreads * repeatsX;
  const xsRenderRows = weftPicks * repeatsY;

  const activeRowStructure = useMemo(() => {
      if (weftPicks === 0) return [];
      const row = activeCrossSectionRow % weftPicks;
      const singleRow = structure[row];
      if (!singleRow) return [];
      const tiled = [];
      for(let i=0; i<repeatsX; i++) tiled.push(...singleRow);
      return tiled;
  }, [activeCrossSectionRow, weftPicks, structure, repeatsX]);
  
  const activeWarpColors = useMemo(() => {
      const tiled = [];
      for(let i=0; i<repeatsX; i++) tiled.push(...warpPattern);
      return tiled;
  }, [warpPattern, repeatsX]);

  const activeWeftColor = weftPattern[activeCrossSectionRow % weftPattern.length] || '#000';

  const activeColStructure = useMemo(() => {
      if (warpThreads === 0 || weftPicks === 0) return [];
      const col = activeCrossSectionCol % warpThreads;
      const tiled = [];
      for(let r=0; r<repeatsY; r++) {
         for(let i=0; i<weftPicks; i++) {
             if (structure[i]) {
                tiled.push(structure[i][col]);
             } else {
                 tiled.push(false);
             }
         }
      }
      return tiled;
  }, [activeCrossSectionCol, warpThreads, structure, weftPicks, repeatsY]);

  const activeWeftColors = useMemo(() => {
      const tiled = [];
      for(let i=0; i<repeatsY; i++) tiled.push(...weftPattern);
      return tiled;
  }, [weftPattern, repeatsY]);

  const activeWarpColor = warpPattern[activeCrossSectionCol % warpPattern.length] || '#000';

  const handleDrawdownWithCrossSection = (row: number, col: number, type: 'down' | 'enter' | 'up') => {
      if (type === 'down' || type === 'enter') {
          setActiveCrossSectionRow(row);
          setActiveCrossSectionCol(col);
      }
      handleDrawdownInteraction(row, col, type);
  }

  const cycleUnit = () => {
      const units: RulerUnit[] = ['thread', 'inch', 'cm'];
      const next = units[(units.indexOf(rulerUnit) + 1) % units.length];
      setRulerUnit(next);
  };

  const cursorStyle = (() => {
      if (isPanning.current) return 'grabbing';
      if (isSpacePressed || currentTool === 'pan' || (window.event as any)?.shiftKey) return 'grab';
      if (currentTool === 'pencil') return 'default';
      return 'crosshair';
  })();
  
  const isInteractive = currentTool !== 'pan' && !isSpacePressed;

  return (
    <div ref={containerRef} className="w-full h-full relative group bg-gray-50 flex flex-col overflow-hidden">
       <div className="flex flex-none h-6 z-40 bg-gray-100 border-b border-gray-300">
           <div style={{ width: 24 }} className="flex-none bg-gray-100 border-r border-gray-300"></div>
           <div className="flex-1 overflow-hidden relative cursor-pointer" onClick={cycleUnit}>
                <Ruler orientation="horizontal" lengthPixels={viewportSize.w} offsetPixels={-scrollPos.x} unit={rulerUnit} ppi={epi} scale={scale} />
           </div>
       </div>

       <div className="flex flex-1 overflow-hidden relative">
           <div className="w-6 flex-none z-40 bg-gray-100 border-r border-gray-300 relative cursor-pointer" onClick={cycleUnit}>
                <Ruler orientation="vertical" lengthPixels={viewportSize.h} offsetPixels={-scrollPos.y} unit={rulerUnit} ppi={ppi} scale={scale} />
           </div>

           <div 
             ref={scrollRef}
             onScroll={handleScroll}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             className="flex-1 overflow-auto bg-gray-50 relative custom-scrollbar"
             style={{ cursor: cursorStyle }}
           >
              <div 
                style={{ 
                    display: 'grid', 
                    gridTemplateColumns: showHeaders ? `${scLeftW}px max-content` : `max-content`, 
                    gridTemplateRows: showHeaders ? `${scTopH}px max-content` : `max-content`,
                    width: 'max-content',
                    height: 'max-content',
                    position: 'relative'
                }}
              >
                  {showHeaders && <div style={{ position: 'sticky', top: 0, left: 0, zIndex: 30, background: '#f3f4f6', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db' }}></div>}
                  
                  {showHeaders && (
                      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', overflow: 'hidden' }}>
                          <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>
                                <div style={{ position: 'absolute', left: 0, top: 0, width: draftWidth, height: colorBarSize }}>
                                    <InteractiveGrid data={[warpPattern]} renderRows={1} renderCols={warpThreads * repeatsX} width={draftWidth} height={colorBarSize} isColorGrid repeatCols={warpRepeat} gridDivision={gridDivision} onCellInteraction={handleWarpColorInteraction} allowInteraction={isInteractive} />
                                </div>
                                {dentingGrid && (
                                    <div style={{ position: 'absolute', left: 0, top: colorBarSize + GAP, width: draftWidth, height: dentingHeight }}>
                                        <InteractiveGrid data={dentingGrid} renderRows={2} renderCols={warpThreads * repeatsX} width={draftWidth} height={dentingHeight} isColorGrid repeatCols={warpRepeat} gridDivision={gridDivision} onCellInteraction={handleDentingInteraction} allowInteraction={isInteractive} />
                                    </div>
                                )}
                                <div style={{ position: 'absolute', left: 0, top: colorBarSize + GAP + (dentingHeight > 0 ? dentingHeight + GAP : 0), width: draftWidth, height: crossSectionSize }}>
                                    <CrossSection 
                                        orientation="horizontal" 
                                        structure={activeRowStructure} 
                                        yarnColors={activeWarpColors} 
                                        activeThreadColor={activeWeftColor} 
                                        width={draftWidth} height={crossSectionSize} 
                                        cellWidth={BASE_CELL_SIZE} cellHeight={BASE_CELL_SIZE} 
                                        renderCount={xsRenderCols}
                                    />
                                </div>
                                <div style={{ position: 'absolute', left: 0, top: colorBarSize + GAP + (dentingHeight > 0 ? dentingHeight + GAP : 0) + crossSectionSize + GAP, width: draftWidth, height: draftHeight }}>
                                    <InteractiveGrid data={draft} renderRows={harnesses} renderCols={warpThreads * repeatsX} width={draftWidth} height={draftHeight} onCellInteraction={handleDraftInteraction} activeColor={draftActiveColor} gridDivision={gridDivision} repeatCols={warpRepeat} repeatRows={harnesses} allowInteraction={isInteractive} extraCols={extraWarpMap} />
                                </div>
                          </div>
                      </div>
                  )}

                  {showHeaders && (
                      <div style={{ position: 'sticky', left: 0, zIndex: 20, background: '#f9fafb', borderRight: '1px solid #e5e7eb', overflow: 'hidden' }}>
                          <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>
                                <div style={{ position: 'absolute', left: 0, top: 0, width: colorBarSize, height: pegPlanHeight }}>
                                    <InteractiveGrid data={weftPattern.map(c => [c])} renderRows={weftPicks * repeatsY} renderCols={1} width={colorBarSize} height={pegPlanHeight} isColorGrid repeatRows={weftRepeat} repeatCols={1} gridDivision={gridDivision} onCellInteraction={handleWeftColorInteraction} allowInteraction={isInteractive} />
                                </div>
                                <div style={{ position: 'absolute', left: colorBarSize, top: 0, width: densityTrackWidth, height: pegPlanHeight }}>
                                    <DensityTrack zones={weftZones} height={pegPlanHeight} rows={weftPicks} repeats={repeatsY} />
                                </div>
                                <div style={{ position: 'absolute', left: colorBarSize + densityTrackWidth + GAP, top: 0, width: crossSectionSize, height: pegPlanHeight }}>
                                    <CrossSection 
                                        orientation="vertical" 
                                        structure={activeColStructure} 
                                        yarnColors={activeWeftColors} 
                                        activeThreadColor={activeWarpColor} 
                                        width={crossSectionSize} height={pegPlanHeight} 
                                        cellWidth={BASE_CELL_SIZE} cellHeight={BASE_CELL_SIZE} 
                                        renderCount={xsRenderRows}
                                    />
                                </div>
                                <div style={{ position: 'absolute', left: colorBarSize + densityTrackWidth + GAP + crossSectionSize + GAP, top: 0, width: pegPlanWidth, height: pegPlanHeight }}>
                                    <InteractiveGrid data={pegPlan} renderRows={weftPicks * repeatsY} renderCols={harnesses} width={pegPlanWidth} height={pegPlanHeight} onCellInteraction={handlePegPlanInteraction} activeColor={pegPlanActiveColor} gridDivision={gridDivision} repeatRows={weftRepeat} repeatCols={harnesses} allowInteraction={isInteractive} extraRows={extraWeftMap} />
                                </div>
                          </div>
                      </div>
                  )}

                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                      <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', width: draftWidth, height: pegPlanHeight }}>
                        <InteractiveGrid 
                            data={displayWeave} 
                            renderRows={weftPicks * repeatsY} renderCols={warpThreads * repeatsX}
                            width={draftWidth} height={pegPlanHeight}
                            isColorGrid 
                            onCellInteraction={handleDrawdownWithCrossSection}
                            gridDivision={gridDivision}
                            repeatRows={weftRepeat} repeatCols={warpRepeat}
                            allowInteraction={isInteractive}
                            showGrid={showGrid}
                            extraRows={extraWeftMap}
                            extraCols={extraWarpMap}
                        />
                      </div>
                  </div>
              </div>
           </div>

           <div className="absolute bottom-4 right-4 z-50 flex items-center gap-1 p-1.5 bg-white border border-gray-200 rounded-lg shadow-lg">
                <button onClick={handleZoomOut} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"><ZoomOutIcon className="w-5 h-5" /></button>
                <div className="px-2 min-w-[3rem] text-center text-xs font-mono font-bold text-gray-700 select-none">{Math.round(scale * 100)}%</div>
                <button onClick={handleZoomIn} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"><ZoomInIcon className="w-5 h-5" /></button>
                <div className="w-px h-5 bg-gray-200 mx-1"></div>
                <button onClick={handleResetZoom} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"><ResetZoomIcon className="w-5 h-5" /></button>
           </div>
           
           {isSpacePressed && (
                <div className="absolute inset-0 z-[60] pointer-events-none flex items-center justify-center">
                    <div className="bg-black/70 text-white px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest shadow-2xl border border-white/20">
                        Space + Drag to Pan | Alt + Wheel to Zoom
                    </div>
                </div>
            )}
       </div>
    </div>
  );
};
