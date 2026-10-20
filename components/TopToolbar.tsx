
import React from 'react';
import { 
    PencilIcon, LineIcon, GridFillIcon, UndoIcon, RedoIcon, 
    EyeIcon, EyeOffIcon, FlipIcon, WeaveIcon, ChevronDownIcon, HandIcon,
    DownloadIcon, UploadIcon, WarpApplyIcon, WeftApplyIcon, PdfIcon, BrushIcon, HomeIcon, GridIcon
} from './icons';
import { ToolType, ViewMode, FaceMode } from '../types';
import { WEAVE_FILL_PATTERNS } from '../services/weaveLibrary';

interface TopToolbarProps {
    currentTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    faceMode: FaceMode;
    onFaceModeChange: (mode: FaceMode) => void;
    currentFillPatternId: string;
    onFillPatternChange: (id: string) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onSave: () => void;
    onLoad: () => void; // Opens Project Manager
    onImport: () => void; // Opens File Browser Directly
    onApplyToWarp?: () => void;
    onApplyToWeft?: () => void;
    onDownloadPdf?: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
    currentTool, onToolChange,
    viewMode, onViewModeChange,
    faceMode, onFaceModeChange,
    currentFillPatternId, onFillPatternChange,
    canUndo, canRedo, onUndo, onRedo,
    onSave, onLoad, onImport,
    onApplyToWarp, onApplyToWeft,
    onDownloadPdf
}) => {
    const [isPatternMenuOpen, setIsPatternMenuOpen] = React.useState(false);
    const currentPatternName = WEAVE_FILL_PATTERNS.find(p => p.id === currentFillPatternId)?.name || 'Structure';

    const ToolBtn: React.FC<{ type: ToolType, icon: React.ReactNode, title: string }> = ({ type, icon, title }) => (
        <button
            onClick={() => onToolChange(type)}
            title={title}
            className={`p-2 rounded-md flex items-center justify-center transition-colors ${currentTool === type ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
        >
            {icon}
        </button>
    );

    return (
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0 z-30 shadow-sm relative">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 pr-4 border-r border-gray-200">
                    <WeaveIcon className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-gray-800 tracking-tight">WeaveCAD</span>
                </div>

                {/* File Operations */}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                     <button onClick={onLoad} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors" title="Project Manager (Local Database)">
                        <HomeIcon className="w-4 h-4" />
                     </button>
                     <button onClick={onImport} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors" title="Import Local Design (.weave)">
                        <UploadIcon className="w-4 h-4" />
                     </button>
                     <button onClick={onSave} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors" title="Export Design (.weave)">
                        <DownloadIcon className="w-4 h-4" />
                     </button>
                     <div className="w-px h-4 bg-gray-300 mx-1"></div>
                     <button onClick={onDownloadPdf} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors" title="Download PDF Spec Sheet">
                        <PdfIcon className="w-4 h-4" />
                     </button>
                </div>

                <div className="w-px h-8 bg-gray-200"></div>

                {/* Drawing Tools */}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                    <ToolBtn type="pan" icon={<HandIcon className="w-4 h-4" />} title="Pan Tool" />
                    <ToolBtn type="pencil" icon={<PencilIcon className="w-4 h-4" />} title="Pencil Tool (Structure)" />
                    <ToolBtn type="brush" icon={<BrushIcon className="w-4 h-4" />} title="Paint Brush (Colors)" />
                    <ToolBtn type="line" icon={<LineIcon className="w-4 h-4" />} title="Line Tool (Vector)" />
                    <ToolBtn type="fill" icon={<GridFillIcon className="w-4 h-4" />} title="Fill Tool (Pattern)" />
                    
                    {currentTool === 'fill' && (
                         <div className="flex items-center gap-1 border-l border-gray-300 pl-1 ml-1">
                             <div className="relative">
                                 <button 
                                    onClick={() => setIsPatternMenuOpen(!isPatternMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-white rounded-md transition-colors"
                                    title="Select Weave Structure"
                                 >
                                     <span className="max-w-[100px] truncate">{currentPatternName}</span>
                                     <ChevronDownIcon className="w-3 h-3" />
                                 </button>
                                 
                                 {isPatternMenuOpen && (
                                     <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden py-1 z-50">
                                         <div className="px-3 py-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50 border-b border-gray-100">Structure</div>
                                         {WEAVE_FILL_PATTERNS.map(p => (
                                             <button
                                                key={p.id}
                                                onClick={() => { onFillPatternChange(p.id); setIsPatternMenuOpen(false); }}
                                                className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 ${currentFillPatternId === p.id ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                                             >
                                                 {p.name}
                                             </button>
                                         ))}
                                     </div>
                                 )}
                             </div>
                             
                             {/* New Apply Actions */}
                             <div className="w-px h-4 bg-gray-300 mx-1"></div>
                             
                             <button 
                                onClick={onApplyToWarp}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title={`Apply ${currentPatternName} to specific Warp threads`}
                             >
                                 <WarpApplyIcon className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={onApplyToWeft}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title={`Apply ${currentPatternName} to specific Weft threads`}
                             >
                                 <WeftApplyIcon className="w-4 h-4" />
                             </button>
                         </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                 {/* View Controls */}
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => onViewModeChange('interlace')}
                            title="Realistic Interlace View"
                            className={`p-2 rounded-md ${viewMode === 'interlace' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                             onClick={() => onViewModeChange('structure')}
                             title="Structure (Artwork Mode)"
                             className={`p-2 rounded-md ${viewMode === 'structure' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <EyeOffIcon className="w-4 h-4" />
                        </button>
                        <button
                             onClick={() => onViewModeChange('graph')}
                             title="Technical Graph (Point Paper)"
                             className={`p-2 rounded-md ${viewMode === 'graph' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <GridIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => onFaceModeChange(faceMode === 'face' ? 'reverse' : 'face')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${faceMode === 'reverse' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <FlipIcon className="w-4 h-4" />
                        <span>{faceMode === 'face' ? 'Face' : 'Reverse'}</span>
                    </button>
                </div>

                <div className="w-px h-8 bg-gray-200 mx-2"></div>

                {/* History */}
                <div className="flex items-center gap-1">
                    <button onClick={onUndo} disabled={!canUndo} className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-full hover:bg-gray-100">
                        <UndoIcon className="w-5 h-5" />
                    </button>
                    <button onClick={onRedo} disabled={!canRedo} className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-full hover:bg-gray-100">
                        <RedoIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}