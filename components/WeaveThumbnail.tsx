
import React, { useEffect, useRef } from 'react';
import { LibraryWeave } from '../types';

interface WeaveThumbnailProps {
  weave: LibraryWeave;
  className?: string;
  faceMode?: 'face' | 'back';
  showGrid?: boolean;
  tile?: boolean;
  forceScale?: number;
}

export const WeaveThumbnail: React.FC<WeaveThumbnailProps> = ({ 
    weave, 
    className, 
    faceMode = 'face', 
    showGrid = false,
    tile = false,
    forceScale
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { draft, pegPlan } = weave;
    const harnesses = draft.length;
    const unitWidth = draft[0].length;
    const unitHeight = pegPlan.length;

    // Determine scale and dimensions
    const scale = forceScale || Math.min(16, Math.floor(160 / Math.max(unitWidth, unitHeight)));
    
    // In tiling mode, we fill a standard container size
    const drawWidth = tile ? 160 : unitWidth * scale;
    const drawHeight = tile ? 160 : unitHeight * scale;

    canvas.width = drawWidth;
    canvas.height = drawHeight;

    ctx.imageSmoothingEnabled = false;

    // Background
    ctx.fillStyle = '#0a0a0a'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const warpToHarness = new Array(unitWidth).fill(-1);
    for(let w=0; w<unitWidth; w++) {
        for(let h=0; h<harnesses; h++) {
            if(draft[h][w] === 1) {
                warpToHarness[w] = h;
                break;
            }
        }
    }

    // Render cells
    const colsToDraw = Math.ceil(canvas.width / scale);
    const rowsToDraw = Math.ceil(canvas.height / scale);

    for(let y=0; y<rowsToDraw; y++) {
        for(let x=0; x<colsToDraw; x++) {
            const unitX = x % unitWidth;
            const unitY = y % unitHeight;
            const harness = warpToHarness[unitX];
            
            let isWarpUp = false;
            if(harness !== -1 && pegPlan[unitY] && pegPlan[unitY][harness] === 1) {
                isWarpUp = true;
            }

            if (faceMode === 'back') isWarpUp = !isWarpUp;

            if (isWarpUp) {
                ctx.fillStyle = '#ffffff'; // Pure white for warp
                ctx.fillRect(x*scale, y*scale, scale, scale);
            }
        }
    }

    // Grid overlay (Specific to Layout 3)
    if (showGrid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        
        const drawGridLines = (color: string, weight: number) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = weight;
            for(let i=0; i<=colsToDraw; i++) {
                ctx.beginPath();
                ctx.moveTo(i*scale, 0); ctx.lineTo(i*scale, canvas.height);
                ctx.stroke();
            }
            for(let i=0; i<=rowsToDraw; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i*scale); ctx.lineTo(canvas.width, i*scale);
                ctx.stroke();
            }
        };

        drawGridLines('rgba(255,255,255,0.4)', 1);
    }

  }, [weave, faceMode, showGrid, tile, forceScale]);

  return (
    <div className={`bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden transition-all duration-300 ${className}`}>
        <canvas ref={canvasRef} className="max-w-full max-h-full block shadow-inner" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
};
