
import React from 'react';
import { TerminalIcon, PlayCircleIcon, YarnIcon, GridFillIcon, PaletteIcon, LayersIcon, ProcessorIcon, TrashIcon, InvertIcon, ShiftUpIcon, ShiftDownIcon, ShiftLeftIcon, ShiftRightIcon, CopyIcon, ZoomInIcon, ZoomOutIcon, ResetZoomIcon, TableIcon, ChevronDownIcon, DownloadIcon, FlipIcon, RulerIcon, CubeIcon, EyeOffIcon, EyeIcon, PlusIcon, ArrowRightIcon, PencilIcon, LineIcon, UndoIcon, RedoIcon, WeaveIcon, HandIcon, UploadIcon, WarpApplyIcon, WeftApplyIcon, PdfIcon, BrushIcon, HomeIcon, GridIcon, ListIcon, CameraIcon, MagicWandIcon, LayoutIcon, SwatchIcon, ShuffleIcon, PrinterIcon, CalculatorIcon, CheckIcon, GradientIcon } from './icons';
import { AppMode } from '../types';

interface ProgressiveToolbarProps {
    mode: AppMode;
    onModeChange: (mode: AppMode) => void;
}

const ModeButton: React.FC<{ 
    active: boolean; 
    icon: React.ReactNode; 
    label: string; 
    onClick: () => void;
    disabled?: boolean;
}> = ({ active, icon, label, onClick, disabled }) => (
    <button
        onClick={disabled ? undefined : onClick}
        className={`w-full p-3 flex flex-col items-center gap-1 transition-all border-l-4 relative group ${
            active 
            ? 'border-blue-500 bg-gray-800 text-blue-400' 
            : disabled 
                ? 'border-transparent text-gray-600 cursor-not-allowed opacity-50' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
        }`}
        title={label + (disabled ? " (Coming Soon)" : "")}
    >
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        {disabled && (
            <div className="absolute left-full top-2 ml-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700">
                Coming Soon
            </div>
        )}
    </button>
);

export const ProgressiveToolbar: React.FC<ProgressiveToolbarProps> = ({ mode, onModeChange }) => {
    return (
        <div className="w-20 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-2 z-30 flex-shrink-0 overflow-y-auto no-scrollbar h-full">
            
            <ModeButton 
                active={mode === 'specs'} 
                icon={<LayersIcon className="w-6 h-6" />} 
                label="Specs" 
                onClick={() => onModeChange('specs')}
            />

            <ModeButton 
                active={mode === 'art'} 
                icon={<GridFillIcon className="w-6 h-6" />} 
                label="Studio" 
                onClick={() => onModeChange('art')}
            />

            <ModeButton 
                active={mode === 'weave-studio'} 
                icon={<GridIcon className="w-6 h-6" />} 
                label="Weave" 
                onClick={() => onModeChange('weave-studio')}
            />

            <div className="w-10 h-px bg-gray-800 my-2" />

            {/* NEW: Loom Hook Configurator */}
            <ModeButton 
                active={mode === 'loom-editor'} 
                icon={<ProcessorIcon className="w-6 h-6" />} 
                label="Loom" 
                onClick={() => onModeChange('loom-editor')}
            />

            <ModeButton 
                active={mode === 'loom-tech'} 
                icon={<TerminalIcon className="w-6 h-6" />} 
                label="Tech" 
                onClick={() => onModeChange('loom-tech')}
            />
            
            <div className="w-10 h-px bg-gray-800 my-2" />
            
            <ModeButton 
                active={mode === 'yarn'} 
                icon={<YarnIcon className="w-6 h-6" />} 
                label="Yarn" 
                onClick={() => onModeChange('yarn')}
            />

            <ModeButton 
                active={mode === 'pattern'} 
                icon={<TableIcon className="w-6 h-6" />} 
                label="Pattern" 
                onClick={() => onModeChange('pattern')}
            />

            <ModeButton 
                active={mode === 'colorways'} 
                icon={<PaletteIcon className="w-6 h-6" />} 
                label="Colors" 
                onClick={() => onModeChange('colorways')}
            />

            <div className="w-10 h-px bg-gray-800 my-2" />
            
            <ModeButton 
                active={mode === 'sim'} 
                icon={<PlayCircleIcon className="w-6 h-6" />} 
                label="Sim" 
                onClick={() => onModeChange('sim')}
            />

            <ModeButton 
                active={mode === 'tech'} 
                icon={<TerminalIcon className="w-6 h-6" />} 
                label="Prod" 
                onClick={() => onModeChange('tech')}
            />
        </div>
    );
};
