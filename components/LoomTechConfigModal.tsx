
import React from 'react';
import { LoomTechState, LoomTechColumn } from '../types';
import { PlusIcon, TrashIcon, CheckIcon } from './icons';

interface LoomTechConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    state: LoomTechState;
    onUpdate: (state: LoomTechState) => void;
}

const TYPE_DEFS = [
    { type: 'weft-selector', label: 'Weft Selector', color: '#3b82f6' },
    { type: 'cramming', label: 'Cramming', color: '#f59e0b' },
    { type: 'pile', label: 'Pile Hook', color: '#10b981' },
    { type: 'regulator', label: 'Regulator', color: '#8b5cf6' },
    { type: 'custom', label: 'Custom', color: '#64748b' }
] as const;

export const LoomTechConfigModal: React.FC<LoomTechConfigModalProps> = ({
    isOpen, onClose, state, onUpdate
}) => {
    if (!isOpen) return null;

    const addColumn = () => {
        const nextHook = state.columns.length > 0 ? Math.max(...state.columns.map(c => c.hookNumber)) + 1 : 1;
        const newCol: LoomTechColumn = {
            id: `hook-${Date.now()}`,
            hookNumber: nextHook,
            label: `Hook ${nextHook}`,
            type: 'custom',
            color: '#64748b'
        };
        const newGrid = state.grid.map(row => [...row, false]);
        onUpdate({ columns: [...state.columns, newCol], grid: newGrid });
    };

    const removeColumn = (idx: number) => {
        if (state.columns.length <= 1) return;
        const newCols = state.columns.filter((_, i) => i !== idx);
        const newGrid = state.grid.map(row => row.filter((_, i) => i !== idx));
        onUpdate({ columns: newCols, grid: newGrid });
    };

    const updateColumn = (idx: number, updates: Partial<LoomTechColumn>) => {
        const newCols = [...state.columns];
        newCols[idx] = { ...newCols[idx], ...updates };
        if (updates.type) {
            const def = TYPE_DEFS.find(d => d.type === updates.type);
            if (def) newCols[idx].color = def.color;
        }
        onUpdate({ ...state, columns: newCols });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh] ring-1 ring-white/10">
                
                {/* Header Section */}
                <div className="p-5 border-b border-gray-800 bg-gray-900 flex justify-between items-start shrink-0">
                    <div className="space-y-1">
                        <h2 className="text-lg font-black text-white tracking-tight uppercase">Hardware Architecture</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Selector Mapping & Logic</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors bg-gray-800 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                {/* Legend Section */}
                <div className="px-5 py-3 bg-black/40 border-b border-gray-800 shrink-0">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {TYPE_DEFS.map(def => (
                            <div key={def.type} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: def.color }} />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{def.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-2 bg-gray-950 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-gray-950 text-[9px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-800">
                            <tr>
                                <th className="px-4 py-3 w-16">Hook</th>
                                <th className="px-4 py-3">Identifier / Label</th>
                                <th className="px-4 py-3 w-48">Functional Logic</th>
                                <th className="px-4 py-3 w-12">Color</th>
                                <th className="px-4 py-3 w-12 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {state.columns.map((col, idx) => (
                                <tr key={col.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-1.5">
                                        <input 
                                            type="number" 
                                            value={col.hookNumber} 
                                            onChange={e => updateColumn(idx, { hookNumber: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/50 border border-gray-800 rounded py-1 text-center text-blue-400 font-mono text-xs font-bold focus:border-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="px-4 py-1.5">
                                        <input 
                                            value={col.label} 
                                            onChange={e => updateColumn(idx, { label: e.target.value })}
                                            className="bg-transparent border-b border-transparent focus:border-blue-500/50 outline-none text-xs font-bold text-gray-300 w-full py-1"
                                            placeholder="Label..."
                                        />
                                    </td>
                                    <td className="px-4 py-1.5">
                                        <select 
                                            value={col.type} 
                                            onChange={e => updateColumn(idx, { type: e.target.value as any })}
                                            className="w-full bg-transparent border border-gray-800 rounded py-1 px-2 text-[10px] font-bold text-gray-400 focus:border-blue-500 outline-none cursor-pointer"
                                        >
                                            {TYPE_DEFS.map(d => <option key={d.type} value={d.type}>{d.label}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-1.5">
                                        <div className="w-4 h-4 rounded-full border border-white/5 shadow-inner" style={{ backgroundColor: col.color }} />
                                    </td>
                                    <td className="px-4 py-1.5 text-center">
                                        <button 
                                            onClick={() => removeColumn(idx)}
                                            className="p-1.5 text-gray-600 hover:text-red-500 transition-colors rounded hover:bg-red-500/10"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="p-4">
                        <button 
                            onClick={addColumn}
                            className="w-full py-3 border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center gap-3 text-gray-500 hover:text-blue-400 hover:border-blue-500/30 transition-all hover:bg-blue-500/5"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Technical Entry</span>
                        </button>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-800 bg-gray-900 flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" />
                        Synchronize Hardware
                    </button>
                </div>
            </div>
        </div>
    );
};
