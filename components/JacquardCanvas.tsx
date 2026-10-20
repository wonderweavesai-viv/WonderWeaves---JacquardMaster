
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { JacquardData, ToolType, ViewMode, FaceMode, WeaveSettings } from '../types';

interface JacquardCanvasProps {
    data: JacquardData;
    artwork?: {
        data: Uint8Array;
        palette: string[];
        width: number;
        height: number;
    };
    onUpdate: (newData: Uint8Array) => void;
    tool: ToolType;
    viewMode: ViewMode;
    faceMode: FaceMode;
    warpColors: string[];
    weftColors: string[];
    settings: WeaveSettings;
    onViewChange?: (view: { x: number, y: number, zoom: number }) => void;
}

export const JacquardCanvas: React.FC<JacquardCanvasProps> = ({
    data, artwork, onUpdate, tool, viewMode, faceMode, warpColors, weftColors, settings, onViewChange
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Internal state for view transforms
    const [view, setView] = useState({ x: 0, y: 0, zoom: 1.0 }); 
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    
    const isInteracting = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const lastGridPos = useRef({ x: -1, y: -1 });
    const localBuffer = useRef<Uint8Array>(data.structure);

    const HEADER_SIZE = 28;

    // Current aspect ratio based on view mode and loom settings
    const currentAspect = useMemo(() => {
        return viewMode === 'graph' ? 1.0 : (settings.epi / settings.ppi);
    }, [viewMode, settings.epi, settings.ppi]);

    // Resets view to 100% and centers the grid
    const resetToCenter = useCallback(() => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        
        const zoom = 1.0;
        const contentW = data.width * zoom;
        const contentH = data.height * zoom * currentAspect;

        const x = (w - HEADER_SIZE) / 2 - contentW / 2 + HEADER_SIZE;
        const y = (h - HEADER_SIZE) / 2 - contentH / 2 + HEADER_SIZE;
        
        setView({ x, y, zoom });
    }, [data.width, data.height, currentAspect]);

    // Detect fabric dimension changes to trigger a reset
    const lastDataDim = useRef({ w: data.width, h: data.height });
    useEffect(() => {
        if (data.width !== lastDataDim.current.w || data.height !== lastDataDim.current.h) {
            resetToCenter();
            lastDataDim.current = { w: data.width, h: data.height };
        }
    }, [data.width, data.height, resetToCenter]);

    // Handle initial mount centering
    const initialCentered = useRef(false);
    useEffect(() => {
        if (!initialCentered.current && containerRef.current?.clientWidth) {
            resetToCenter();
            initialCentered.current = true;
        }
    }, [resetToCenter]);

    // Handle container resize without resetting zoom
    useEffect(() => {
        if (!containerRef.current) return;
        
        let lastSize = { w: containerRef.current.clientWidth, h: containerRef.current.clientHeight };

        const obs = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const newW = entry.contentRect.width;
            const newH = entry.contentRect.height;

            // Shift x/y slightly to maintain relative position if the window grows/shrinks
            setView(prev => {
                const dx = (newW - lastSize.w) / 2;
                const dy = (newH - lastSize.h) / 2;
                return { ...prev, x: prev.x + dx, y: prev.y + dy };
            });

            lastSize = { w: newW, h: newH };
        });
        
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []); // Observer setup only on mount

    useEffect(() => {
        localBuffer.current = data.structure;
        render();
    }, [data.structure]);

    useEffect(() => {
        onViewChange?.(view);
    }, [view, onViewChange]);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !containerRef.current) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
        }

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        const zoom = view.zoom;
        const aspect = currentAspect;
        const cellW = zoom;
        const cellH = zoom * aspect;

        const startX = Math.floor((HEADER_SIZE - view.x) / cellW);
        const startY = Math.floor((HEADER_SIZE - view.y) / cellH);
        const endX = Math.min(data.width, startX + Math.ceil((w - HEADER_SIZE) / cellW) + 1);
        const endY = Math.min(data.height, startY + Math.ceil((h - HEADER_SIZE) / cellH) + 1);

        const isArtworkView = viewMode === 'structure';
        const isGraphView = viewMode === 'graph';
        const isReverse = faceMode === 'reverse';
        const buffer = localBuffer.current;

        // 1. Render Design Grid
        for (let y = Math.max(0, startY); y < endY; y++) {
            for (let x = Math.max(0, startX); x < endX; x++) {
                const idx = y * data.width + x;
                
                if (isGraphView) {
                    ctx.fillStyle = buffer[idx] === 1 ? '#000000' : '#ffffff';
                } else if (isArtworkView && artwork) {
                    ctx.fillStyle = artwork.palette[artwork.data[idx]] || '#000';
                } else {
                    let val = buffer[idx] === 1;
                    if (isReverse) val = !val;
                    ctx.fillStyle = val ? warpColors[x % warpColors.length] : weftColors[y % weftColors.length];
                }

                ctx.fillRect(
                    Math.floor(view.x + x * cellW), 
                    Math.floor(view.y + y * cellH), 
                    Math.ceil(cellW), 
                    Math.ceil(cellH)
                );
            }
        }

        // 2. Render Headers
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, HEADER_SIZE); 
        ctx.fillRect(0, 0, HEADER_SIZE, h); 

        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textBaseline = 'top';
        const step = zoom < 2 ? 50 : (zoom < 8 ? 20 : 8);

        for (let x = Math.max(0, startX); x < endX; x++) {
            const px = Math.floor(view.x + x * cellW);
            ctx.fillStyle = warpColors[x % warpColors.length] || '#888';
            ctx.fillRect(px, 0, Math.ceil(cellW), 14);

            if (x % step === 0 || x === 0) {
                ctx.fillStyle = '#94a3b8';
                ctx.fillText((x + 1).toString(), px + 2, 16);
                ctx.beginPath();
                ctx.moveTo(px, 14);
                ctx.lineTo(px, HEADER_SIZE);
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
                ctx.stroke();
            }
        }

        ctx.textAlign = 'right';
        for (let y = Math.max(0, startY); y < endY; y++) {
            const py = Math.floor(view.y + y * cellH);
            ctx.fillStyle = weftColors[y % weftColors.length] || '#888';
            ctx.fillRect(0, py, 14, Math.ceil(cellH));

            if (y % step === 0 || y === 0) {
                ctx.fillStyle = '#94a3b8';
                ctx.fillText((y + 1).toString(), HEADER_SIZE - 2, py + 2);
                ctx.beginPath();
                ctx.moveTo(14, py);
                ctx.lineTo(HEADER_SIZE, py);
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
                ctx.stroke();
            }
        }
        ctx.textAlign = 'left';

        // 3. Technical Grid
        if (zoom >= 2.5) {
            ctx.beginPath();
            for (let x = Math.max(0, startX); x <= endX; x++) {
                const px = view.x + x * cellW;
                const isMajor = x % settings.gridX === 0;
                ctx.strokeStyle = isMajor ? 'rgba(45, 90, 80, 0.8)' : 'rgba(60, 100, 90, 0.2)';
                ctx.lineWidth = isMajor ? 2 : 0.5;
                ctx.moveTo(px, HEADER_SIZE);
                ctx.lineTo(px, h);
                ctx.stroke();
                ctx.beginPath();
            }
            for (let y = Math.max(0, startY); y <= endY; y++) {
                const py = view.y + y * cellH;
                const isMajor = y % settings.gridY === 0;
                ctx.strokeStyle = isMajor ? 'rgba(45, 90, 80, 0.8)' : 'rgba(60, 100, 90, 0.2)';
                ctx.lineWidth = isMajor ? 2 : 0.5;
                ctx.moveTo(HEADER_SIZE, py);
                ctx.lineTo(w, py);
                ctx.stroke();
                ctx.beginPath();
            }
        }
    }, [view, viewMode, faceMode, warpColors, weftColors, artwork, data.width, data.height, settings, currentAspect]);

    useEffect(() => { render(); }, [render]);

    useEffect(() => {
        const onDown = (e: KeyboardEvent) => { if (e.code === 'Space') { setIsSpacePressed(true); if (e.target === document.body) e.preventDefault(); } };
        const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
    }, []);

    const handleInteraction = (e: React.MouseEvent | React.WheelEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = ('clientX' in e ? e.clientX : 0) - rect.left;
        const mouseY = ('clientY' in e ? e.clientY : 0) - rect.top;

        const aspect = currentAspect;

        if (e.type === 'wheel') {
            const wheelEv = e as React.WheelEvent;
            const direction = wheelEv.deltaY > 0 ? -1 : 1;
            const zoomStep = view.zoom * 0.1;
            const newZoom = Math.min(128, Math.max(0.1, view.zoom + direction * zoomStep));
            
            if (newZoom !== view.zoom) {
                const worldX = (mouseX - view.x) / view.zoom;
                const worldY = (mouseY - view.y) / (view.zoom * aspect);
                setView({ x: mouseX - worldX * newZoom, y: mouseY - worldY * (newZoom * aspect), zoom: newZoom });
            }
            return;
        }

        const gridXPos = Math.floor((mouseX - view.x) / view.zoom);
        const gridYPos = Math.floor((mouseY - view.y) / (view.zoom * aspect));

        if (e.type === 'mousemove') {
            setHoverPos({ x: Math.max(0, Math.min(data.width - 1, gridXPos)), y: Math.max(0, Math.min(data.height - 1, gridYPos)) });
        }

        const isPanActive = isSpacePressed || tool === 'pan';

        if (isPanActive) {
            if (e.type === 'mousedown') {
                isInteracting.current = true;
                lastMousePos.current = { x: mouseX, y: mouseY };
            } else if (e.type === 'mousemove' && isInteracting.current) {
                const dx = mouseX - lastMousePos.current.x;
                const dy = mouseY - lastMousePos.current.y;
                setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
                lastMousePos.current = { x: mouseX, y: mouseY };
            } else {
                isInteracting.current = false;
            }
            return;
        }

        if (e.type === 'mousedown') {
            isInteracting.current = true;
            if (gridXPos >= 0 && gridXPos < data.width && gridYPos >= 0 && gridYPos < data.height) {
                localBuffer.current[gridYPos * data.width + gridXPos] = localBuffer.current[gridYPos * data.width + gridXPos] === 1 ? 0 : 1;
                lastGridPos.current = { x: gridXPos, y: gridYPos }; 
                render();
            }
        } else if (e.type === 'mousemove' && isInteracting.current) {
            if (gridXPos >= 0 && gridXPos < data.width && gridYPos >= 0 && gridYPos < data.height && (gridXPos !== lastGridPos.current.x || gridYPos !== lastGridPos.current.y)) {
                localBuffer.current[gridYPos * data.width + gridXPos] = 1; 
                lastGridPos.current = { x: gridXPos, y: gridYPos }; 
                render();
            }
        } else if (e.type === 'mouseup' || e.type === 'mouseleave') {
            if (isInteracting.current && !isPanActive) {
                isInteracting.current = false;
                onUpdate(new Uint8Array(localBuffer.current));
            } else {
                isInteracting.current = false;
            }
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full cursor-crosshair overflow-hidden select-none relative">
            <canvas 
                ref={canvasRef} 
                onMouseDown={handleInteraction} 
                onMouseMove={handleInteraction} 
                onMouseUp={handleInteraction} 
                onMouseLeave={handleInteraction} 
                onWheel={handleInteraction} 
                className={`block ${isSpacePressed ? 'cursor-grabbing' : ''}`} 
            />
            <div className="absolute bottom-4 left-4 flex gap-2 pointer-events-none">
                <div className="bg-black/80 px-3 py-1 rounded text-[10px] font-mono text-blue-400 border border-blue-900/50 uppercase tracking-tighter flex items-center gap-4 shadow-xl">
                    <span>MODE: {isSpacePressed ? 'PAN' : tool.toUpperCase()} | VIEW: {viewMode.toUpperCase()} | ZOOM: {Math.round(view.zoom * 100)}%</span>
                    <span className="text-gray-400 border-l border-gray-800 pl-4">H: <span className="text-white font-bold">{hoverPos.x + 1}</span> | P: <span className="text-white font-bold">{hoverPos.y + 1}</span></span>
                </div>
            </div>
        </div>
    );
};
