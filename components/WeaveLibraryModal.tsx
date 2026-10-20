
import React, { useState } from 'react';
import { WEAVE_LIBRARY } from '../services/weaveLibrary';
import { LibraryWeave } from '../types';
import { WeaveThumbnail } from './WeaveThumbnail';
import { FlipIcon } from './icons';

interface WeaveLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWeave: (weave: LibraryWeave) => void;
}

interface WeaveItemProps {
  weave: LibraryWeave;
  onSelect: (weave: LibraryWeave) => void;
}

const WeaveItem: React.FC<WeaveItemProps> = ({ weave, onSelect }) => {
  const [faceMode, setFaceMode] = useState<'face' | 'back'>('face');

  const handleApply = () => {
    if (faceMode === 'back') {
      const invertedWeave = {
        ...weave,
        name: `${weave.name} (Back)`,
        pegPlan: weave.pegPlan.map(row => row.map(cell => cell === 1 ? 0 : 1))
      };
      onSelect(invertedWeave);
    } else {
      onSelect(weave);
    }
  };

  return (
    <div className="group flex flex-col bg-gray-900/50 border border-gray-800 rounded-xl p-4 transition-all text-left relative overflow-hidden hover:border-gray-700">
      <div className="relative cursor-pointer" onClick={handleApply}>
        <WeaveThumbnail 
          weave={weave} 
          faceMode={faceMode} 
          className="w-full aspect-square shadow-xl ring-1 ring-white/5" 
        />
        {faceMode === 'back' && (
          <div className="absolute top-2 right-2 bg-orange-600 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter text-white z-10 shadow-lg">
            Back
          </div>
        )}
      </div>
      
      <div className="mt-4 flex-1 flex flex-col">
        <h3 className="font-bold text-sm text-gray-200 group-hover:text-blue-400 transition-colors">
          {weave.name}
        </h3>
        <div className="flex justify-between items-center mt-1 mb-2">
          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">{weave.category}</span>
          <span className="text-[9px] text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded font-mono font-bold">{weave.harnesses}H</span>
        </div>
        
        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed italic mb-4">{weave.description}</p>
        
        <div className="mt-auto pt-3 border-t border-gray-800 flex items-center justify-between">
          <button 
            onClick={() => setFaceMode(faceMode === 'face' ? 'back' : 'face')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-all ${
              faceMode === 'back' 
              ? 'bg-orange-900/30 text-orange-400 border border-orange-800' 
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
            }`}
          >
            <FlipIcon className="w-3 h-3" />
            {faceMode === 'face' ? 'FACE' : 'BACK'}
          </button>
          
          <button 
            onClick={handleApply}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded shadow-sm transition-all"
          >
            APPLY
          </button>
        </div>
      </div>
    </div>
  );
};

export const WeaveLibraryModal: React.FC<WeaveLibraryModalProps> = ({ isOpen, onClose, onSelectWeave }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', ...Array.from(new Set(WEAVE_LIBRARY.map(w => w.category)))].sort();

  const filteredWeaves = activeCategory === 'All' 
    ? WEAVE_LIBRARY 
    : WEAVE_LIBRARY.filter(w => w.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
        
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Technical Weave Library</h2>
            <p className="text-sm text-gray-400">Apply standard structures to your design.</p>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pt-4 bg-gray-900 border-b border-gray-800 shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 snap-x">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all snap-start whitespace-nowrap ${
                  activeCategory === cat 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-white border border-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-gray-950 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredWeaves.map(weave => (
              <WeaveItem key={weave.id} weave={weave} onSelect={onSelectWeave} />
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-gray-900 border-t border-gray-800 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold italic">
            You can toggle individual weaves to Face or Back before applying.
          </p>
        </div>

      </div>
    </div>
  );
};
