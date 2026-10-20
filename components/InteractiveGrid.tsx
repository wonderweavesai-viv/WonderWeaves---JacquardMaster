import React, { useRef, useEffect } from 'react';

interface InteractiveGridProps {
  data: (boolean | string)[][]; // The source Unit
  onCellClick?: (row: number, col: number) => void;
  onCellInteraction?: (row: number, col: number, type: 'down' | 'enter' | 'up') => void;
  isColorGrid?: boolean;
  activeColor?: string;
  hoverRow?: number | null;
  hoverCol?: number | null;
  gridDivision?: number;
  repeatRows?: number; 
  repeatCols?: number; 
  renderRows?: number; 
  renderCols?: number; 
  width?: number; 
  height?: number; 
  className?: string; 
  allowInteraction?: boolean; 
  showGrid?: boolean; 
  extraRows?: boolean[]; // NEW: Map of rows that are "Extra Weft"
  extraCols?: boolean[]; // NEW: Map of cols that are "Extra Warp"
}

export const InteractiveGrid: React.FC<InteractiveGridProps> = ({
  data,
  onCellClick,
  onCellInteraction,
  isColorGrid = false,
  activeColor = "#3B82F6",
  hoverRow = null,
  hoverCol = null,
  gridDivision = 8,
  repeatRows = 99999,
  repeatCols = 99999,
  renderRows,
  renderCols,
  width,
  height,
  className = "",
  allowInteraction = true,
  showGrid = true,
  extraRows,
  extraCols
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sourceRows = data ? data.length : 0;
  const sourceCols = sourceRows > 0 && data[0] ? data[0].length : 0;
  
  const targetRows = renderRows || sourceRows;
  const targetCols = renderCols || sourceCols;
  
  const canvasWidth = width || Math.max(1, targetCols * 20);
  const canvasHeight = height || Math.max(1, targetRows * 20);

  const cellW = targetCols > 0 ? canvasWidth / targetCols : 0;
  const cellH = targetRows > 0 ? canvasHeight / targetRows : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (sourceRows > 0 && sourceCols > 0 && targetRows > 0 && targetCols > 0) {
        for (let r = 0; r < targetRows; r++) {
            const srcR = r % sourceRows;
            const y = Math.floor(r * cellH);
            const h = Math.ceil(cellH);
            const isExtraRow = extraRows ? extraRows[srcR] : false;

            for (let c = 0; c < targetCols; c++) {
                const srcC = c % sourceCols;
                const isExtraCol = extraCols ? extraCols[srcC] : false;
                const isExtra = !isColorGrid && (isExtraRow || isExtraCol);

                // Draw background tint for extra threads
                if (isExtra) {
                    ctx.fillStyle = '#f9fafb'; // Subtle gray background
                    ctx.fillRect(Math.floor(c * cellW), y, Math.ceil(cellW), h);
                }

                const rowData = data[srcR];
                const val = rowData ? rowData[srcC] : undefined;

                let fill = null;
                if (isColorGrid) {
                    fill = val as string;
                } else if (val) {
                    if (isExtra) {
                        fill = '#6b7280'; // Medium gray for extra markers
                    } else {
                        fill = activeColor === '#3B82F6' ? '#111827' : activeColor;
                    }
                }

                if (fill && fill !== 'transparent') {
                    ctx.fillStyle = fill;
                    ctx.fillRect(Math.floor(c * cellW), y, Math.ceil(cellW), h);
                }
            }
        }
    }

    if ((hoverRow !== null || hoverCol !== null) && !isColorGrid) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        if (hoverRow !== null) {
            const step = sourceRows > 0 ? sourceRows : targetRows;
            for(let r = hoverRow; r < targetRows; r += step) {
                 ctx.fillRect(0, Math.floor(r * cellH), canvasWidth, Math.ceil(cellH));
            }
        }
        if (hoverCol !== null) {
            const step = sourceCols > 0 ? sourceCols : targetCols;
            for(let c = hoverCol; c < targetCols; c += step) {
                ctx.fillRect(Math.floor(c * cellW), 0, Math.ceil(cellW), canvasHeight);
            }
        }
    }

    if (showGrid && targetCols > 0 && targetRows > 0) {
        const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, width: number) => {
            ctx.beginPath();
            ctx.moveTo(x1 + (width%2 === 1 ? 0.5 : 0), y1);
            ctx.lineTo(x2 + (width%2 === 1 ? 0.5 : 0), y2);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
        };

        const baseColor = '#e2e8f0'; 
        const divColor = '#94a3b8';
        const redColor = '#f87171';
        
        for (let c = 1; c <= targetCols; c++) { 
            const isRepeat = c % repeatCols === 0;
            const isDiv = c % gridDivision === 0;
            const x = Math.floor(c * cellW);
            let color = baseColor;
            let width = 1;
            if (isRepeat) { color = redColor; width = 2; } 
            else if (isDiv) { color = divColor; width = 1.5; }
            drawLine(x, 0, x, canvasHeight, color, width);
        }

        for (let r = 1; r <= targetRows; r++) {
            const isRepeat = r % repeatRows === 0;
            const isDiv = r % gridDivision === 0;
            const y = Math.floor(r * cellH);
            let color = baseColor;
            let width = 1;
            if (isRepeat) { color = redColor; width = 2; } 
            else if (isDiv) { color = divColor; width = 1.5; }
            drawLine(0, y, canvasWidth, y, color, width);
        }
    }

  }, [data, sourceRows, sourceCols, targetRows, targetCols, cellW, cellH, canvasWidth, canvasHeight, isColorGrid, activeColor, hoverRow, hoverCol, gridDivision, repeatRows, repeatCols, showGrid, extraRows, extraCols]);

  const handleInteract = (e: React.MouseEvent, type: 'down' | 'enter' | 'up') => {
      if (!allowInteraction) return;
      if (!onCellInteraction && !onCellClick && !hoverRow) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      if (cellW <= 0 || cellH <= 0) return;
      const col = Math.floor(x / cellW);
      const row = Math.floor(y / cellH);
      if (col < 0 || col >= targetCols || row < 0 || row >= targetRows) return;
      if (type === 'down') {
          e.stopPropagation();
          onCellInteraction?.(row, col, 'down');
          onCellClick?.(row, col);
      } else if (type === 'enter') {
          onCellInteraction?.(row, col, 'enter');
      } else if (type === 'up') {
          onCellInteraction?.(row, col, 'up');
      }
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className={`${className} block bg-white`}
      style={{ width: canvasWidth, height: canvasHeight }}
      onMouseDown={(e) => handleInteract(e, 'down')}
      onMouseMove={(e) => handleInteract(e, 'enter')}
      onMouseUp={(e) => handleInteract(e, 'up')}
      onMouseLeave={() => allowInteraction && onCellInteraction?.(0,0,'up')}
    />
  );
};