
import React, { useState, useMemo } from 'react';
import { parsePatternString } from '../utils/patternParser';
import { InteractiveGrid } from './InteractiveGrid';
import { TableIcon } from './icons';

interface TextPatternEditorProps {
  title: string;
  value: string;
  onValueChange: (newValue: string) => void;
  colorMap: { [key: string]: string };
  onOpenGridEditor?: () => void;
  onFocus?: () => void;
}

export const TextPatternEditor: React.FC<TextPatternEditorProps> = ({ 
    title, value, onValueChange, colorMap, onOpenGridEditor, onFocus 
}) => {
  const [isValid, setIsValid] = useState(true);

  const previewPattern = useMemo(() => {
    const parsed = parsePatternString(value, colorMap);
    const currentValidity = parsed.length > 0 || value.trim() === '';
    setIsValid(currentValidity);
    return parsed;
  }, [value, colorMap]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(e.target.value);
  };

  return (
    <div className="pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {onOpenGridEditor && (
              <button 
                onClick={onOpenGridEditor}
                className="px-2 py-1 text-gray-600 bg-white border border-gray-300 hover:text-blue-600 hover:border-blue-500 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-all shadow-sm"
                title="Open Excel-style Pattern Editor"
              >
                  <TableIcon className="h-4 w-4" />
                  <span>Grid Edit</span>
              </button>
          )}
      </div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        placeholder="e.g., 4A2B8C"
        className={`w-full p-2 rounded bg-white border ${isValid ? 'border-gray-300 focus:border-blue-500' : 'border-red-500'} focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 transition-colors font-mono tracking-wide`}
      />
      {!isValid && <p className="text-red-500 text-sm mt-1">Invalid pattern format.</p>}
      
      <div className="mt-2 h-8 w-full bg-white border border-gray-200 p-1 rounded overflow-hidden">
        {previewPattern.length > 0 && (
          // Fix: Changed cellClassName to className as cellClassName is not a prop of InteractiveGrid
          <InteractiveGrid data={[previewPattern]} isColorGrid={true} className="" />
        )}
      </div>
    </div>
  );
};