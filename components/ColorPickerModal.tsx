
import React, { useState, useEffect } from 'react';
import { PANTONE_PALETTE } from '../services/pantoneColors';

interface ColorPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (color: string) => void;
    currentColor: string;
    title?: string;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
    isOpen, onClose, onSelect, currentColor, title = "Select Color"
}) => {
    const [customColor, setCustomColor] = useState(currentColor);
    const [tab, setTab] = useState<'chart' | 'custom'>('chart');

    // Reset internal state when modal opens with new color
    useEffect(() => {
        if (isOpen) {
            setCustomColor(currentColor);
        }
    }, [isOpen, currentColor]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 shrink-0">
                    <h3 className="font-bold text-white text-sm">{title}</h3>
                    <div className="flex bg-gray-800 rounded p-0.5 border border-gray-700">
                        <button 
                            onClick={() => setTab('chart')} 
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${tab === 'chart' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Pantone® Chart
                        </button>
                        <button 
                            onClick={() => setTab('custom')} 
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${tab === 'custom' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Custom Mixer
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-950">
                    {tab === 'chart' ? (
                        <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                            {PANTONE_PALETTE.map((color, i) => (
                                <button
                                    key={i}
                                    className={`w-full aspect-square rounded-md shadow-sm border border-transparent hover:scale-110 transition-transform relative group ${currentColor.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-white z-10' : 'hover:border-gray-500'}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => { onSelect(color); onClose(); }}
                                    title={color}
                                >
                                    {currentColor.toLowerCase() === color.toLowerCase() && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <div className="flex gap-4 items-start">
                                <div className="w-24 h-24 rounded-lg shadow-inner border border-gray-700 shrink-0" style={{backgroundColor: customColor}}></div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Hex Code</label>
                                        <input 
                                            type="text" 
                                            value={customColor} 
                                            onChange={e => setCustomColor(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded font-mono text-sm focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Color Picker</label>
                                        <div className="relative w-full h-10">
                                            <input 
                                                type="color" 
                                                value={customColor}
                                                onChange={e => setCustomColor(e.target.value)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="w-full h-full rounded border border-gray-700 flex items-center px-3 text-xs text-gray-400 bg-gray-800 pointer-events-none">
                                                Click to pick from OS...
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-800">
                                <button 
                                    onClick={() => { onSelect(customColor); onClose(); }}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg"
                                >
                                    Apply Custom Color
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-3 border-t border-gray-800 bg-gray-900 text-center">
                    <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    );
};
