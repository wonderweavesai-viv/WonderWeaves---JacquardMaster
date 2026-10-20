
import React, { useState, useEffect } from 'react';
import { LibraryWeave } from '../types';
import { InteractiveGrid } from './InteractiveGrid';

interface WeaveEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeave?: LibraryWeave; 
  onSave: (weave: LibraryWeave) => void;
}

export const WeaveEditorModal: React.FC<WeaveEditorModalProps> = ({ isOpen, onClose, initialWeave, onSave }) => {
  const [name, setName] = useState('New Weave');
  const [category, setCategory] = useState<string>('Basic');
  
  // Dimensions
  const [harnesses, setHarnesses] = useState(4);
  const [draftWidth, setDraftWidth] = useState(4); // Threads in repeat
  const [pegHeight, setPegHeight] = useState(4); // Picks in repeat

  // Grids
  const [draft, setDraft] = useState<number[][]>([]);
  const [pegPlan, setPegPlan] = useState<number[][]>([]);

  // Initialize
  useEffect(() => {
    if (isOpen) {
        if (initialWeave) {
            setName(initialWeave.name);
            setCategory(initialWeave.category);
            setHarnesses(initialWeave.harnesses);
            setDraftWidth(initialWeave.draft[0]?.length || 4);
            setPegHeight(initialWeave.pegPlan.length || 4);
            setDraft(initialWeave.draft);
            setPegPlan(initialWeave.pegPlan);
        } else {
            setName('My Custom Weave');
            setCategory('Basic');
            setHarnesses(4);
            setDraftWidth(4);
            setPegHeight(4);
            initGrids(4, 4, 4);
        }
    }
  }, [isOpen, initialWeave]);

  const initGrids = (h: number, w: number, p: number) => {
      const newDraft = Array.from({ length: h }, (_, r) => 
        Array.from({ length: w }, (_, c) => r === c % h ? 1 : 0)
      );
      const newPeg = Array.from({ length: p }, (_, r) => 
        Array.from({ length: h }, (_, c) => r === c % p ? 1 : 0)
      );
      setDraft(newDraft);
      setPegPlan(newPeg);
  };

  // Handle Dimension Changes
  const updateDimensions = (newH: number, newW: number, newP: number) => {
      const oldDraft = draft;
      const newDraft = Array.from({ length: newH }, (_, r) => 
        Array.from({ length: newW }, (_, c) => {
            if (r < oldDraft.length && c < (oldDraft[0]?.length || 0)) return oldDraft[r][c];
            return 0;
        })
      );

      const oldPeg = pegPlan;
      const newPeg = Array.from({ length: newP }, (_, r) => 
        Array.from({ length: newH }, (_, c) => {
            if (r < oldPeg.length && c < (oldPeg[0]?.length || 0)) return oldPeg[r][c];
            return 0;
        })
      );

      setHarnesses(newH);
      setDraftWidth(newW);
      setPegHeight(newP);
      setDraft(newDraft);
      setPegPlan(newPeg);
  };

  const handleDraftClick = (r: number, c: number) => {
      setDraft(prev => {
          const next = prev.map(row => [...row]);
          next[r][c] = next[r][c] === 1 ? 0 : 1;
          return next;
      });
  };

  const handlePegClick = (r: number, c: number) => {
      setPegPlan(prev => {
          const next = prev.map(row => [...row]);
          next[r][c] = next[r][c] === 1 ? 0 : 1;
          return next;
      });
  };

  const handleSave = () => {
      const weave: LibraryWeave = {
          id: initialWeave?.id || `custom-${Date.now()}`,
          name,
          category,
          description: 'User created weave',
          harnesses,
          draft,
          pegPlan
      };
      onSave(weave);
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
          <h2 className="text-xl font-bold text-white">{initialWeave ? 'Edit Weave' : 'Add Custom Weave'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-950">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Weave Name</label>
                        <input 
                            type="text" value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Category</label>
                        <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                        >
                            <option value="Basic">Basic</option>
                            <option value="Twill">Twill</option>
                            <option value="Satin">Satin</option>
                            <option value="Rib">Rib</option>
                            <option value="Crepe">Crepe</option>
                            <option value="Structure">Structure</option>
                        </select>
                    </div>

                    <div className="h-px bg-gray-800" />
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Harnesses (X)</label>
                             <input 
                                type="number" min="2" max="120"
                                value={harnesses} onChange={e => updateDimensions(parseInt(e.target.value)||2, draftWidth, pegHeight)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                             />
                        </div>
                         <div>
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Draft Width (Threads)</label>
                             <input 
                                type="number" min="2" max="64"
                                value={draftWidth} onChange={e => updateDimensions(harnesses, parseInt(e.target.value)||2, pegHeight)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                             />
                        </div>
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Peg Height (Picks)</label>
                             <input 
                                type="number" min="2" max="64"
                                value={pegHeight} onChange={e => updateDimensions(harnesses, draftWidth, parseInt(e.target.value)||2)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                             />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div>
                        <div className="flex justify-between mb-2">
                             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Draft (Threading)</label>
                             <span className="text-xs text-gray-600">{harnesses}H x {draftWidth}W</span>
                        </div>
                        <div className="border border-gray-700 rounded overflow-hidden">
                            <InteractiveGrid 
                                data={draft.map(r => r.map(c => c===1))} 
                                isColorGrid={false}
                                activeColor="#3B82F6"
                                renderRows={harnesses} renderCols={draftWidth}
                                width={undefined} height={harnesses * 20}
                                onCellClick={handleDraftClick}
                                gridDivision={4}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Peg Plan (Tie-up/Lift)</label>
                             <span className="text-xs text-gray-600">{pegHeight}H x {harnesses}W</span>
                        </div>
                        <div className="border border-gray-700 rounded overflow-hidden">
                             <InteractiveGrid 
                                data={pegPlan.map(r => r.map(c => c===1))} 
                                isColorGrid={false}
                                activeColor="#EC4899"
                                renderRows={pegHeight} renderCols={harnesses}
                                width={undefined} height={pegHeight * 20}
                                onCellClick={handlePegClick}
                                gridDivision={4}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors">
                Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-md shadow-lg transition-colors">
                Save Weave
            </button>
        </div>

      </div>
    </div>
  );
};
