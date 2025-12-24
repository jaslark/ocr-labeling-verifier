import React, { useEffect, useRef } from 'react';
import { OcrItem } from '../types';
import { Check, ChevronLeft, ChevronRight, X, ZoomIn, AlertCircle, Eraser } from 'lucide-react';

interface EditorProps {
  item: OcrItem | null;
  onUpdate: (id: string, text: string, isVerified: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
  total: number;
  currentIndex: number;
}

export const Editor: React.FC<EditorProps> = ({
  item,
  onUpdate,
  onNext,
  onPrev,
  total,
  currentIndex,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Update local state or focus when item changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = item?.text || '';
      inputRef.current.focus();
    }
  }, [item?.id]);

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <p>Select an item from the list to start verification.</p>
      </div>
    );
  }

  const handleVerify = () => {
    if (inputRef.current) {
      onUpdate(item.id, inputRef.current.value, true);
      onNext();
    }
  };

  const handleUnverify = () => {
    if (inputRef.current) {
      onUpdate(item.id, inputRef.current.value, false);
    }
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
      if (item.isVerified) {
        handleUnverify();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter to Verify and Next
    if (e.ctrlKey && e.key === 'Enter') {
      handleVerify();
    }
    // Ctrl+Arrow to navigate
    if (e.ctrlKey && e.key === 'ArrowRight') {
        onNext();
    }
    if (e.ctrlKey && e.key === 'ArrowLeft') {
        onPrev();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      {/* Top Bar: Navigation & Info */}
      <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white">
        <div className="flex items-center gap-4">
          <span className="text-slate-500 text-sm font-mono">
             {currentIndex + 1} / {total}
          </span>
          <span className="text-slate-600 text-xs px-2 py-1 bg-slate-100 rounded border border-slate-200 truncate max-w-md select-all">
            {item.filename}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Previous (Ctrl+Left)">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={onNext} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Next (Ctrl+Right)">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden gap-6">
        
        {/* Image Display Area */}
        <div className="flex-1 min-h-0 bg-slate-100/50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center relative group overflow-hidden">
          {item.objectUrl ? (
            <img 
              src={item.objectUrl} 
              alt="OCR Crop" 
              className="max-w-full max-h-full object-contain shadow-sm"
            />
          ) : (
            <div className="text-center p-8">
              <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <p className="text-slate-500">Image file not found</p>
              <p className="text-xs text-slate-400 mt-1">Expected: {item.filename}</p>
            </div>
          )}
          
          {/* Status Overlay */}
          {item.isVerified && (
            <div className="absolute top-4 right-4 bg-emerald-500/90 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
              <Check className="h-4 w-4" /> VERIFIED
            </div>
          )}
        </div>

        {/* Editing Area */}
        <div className="h-1/2 flex flex-col gap-3 min-h-[200px]">
          
          {/* Diff Comparison */}
          {item.comparisonText && item.comparisonText !== item.originalText && (
             <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex flex-col gap-2">
                <div className="text-xs font-bold text-orange-800 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  CONFLICT DETECTED
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <button
                      onClick={() => {
                        if (inputRef.current) {
                            inputRef.current.value = item.originalText;
                            onUpdate(item.id, item.originalText, false);
                        }
                      }}
                      className={`text-left p-2 rounded border text-xs font-mono break-all transition-all
                        ${item.text === item.originalText 
                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-900' 
                            : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-600'}
                      `}
                   >
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">New Train</span>
                      {item.originalText}
                   </button>

                   <button
                      onClick={() => {
                        if (inputRef.current) {
                            inputRef.current.value = item.comparisonText || '';
                            onUpdate(item.id, item.comparisonText || '', false);
                        }
                      }}
                      className={`text-left p-2 rounded border text-xs font-mono break-all transition-all
                        ${item.text === item.comparisonText 
                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-900' 
                            : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-600'}
                      `}
                   >
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Original New Train</span>
                      {item.comparisonText}
                   </button>
                </div>
             </div>
          )}

          <label className="text-sm font-medium text-slate-600 flex items-center justify-between">
            Label Content
            <span className="text-xs text-slate-500 font-normal">Press <kbd className="bg-slate-100 px-1 rounded border border-slate-300 text-slate-600">Ctrl+Enter</kbd> to Verify & Next</span>
          </label>
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              className={`
                w-full h-full bg-white border-2 rounded-xl p-4 text-lg font-medium text-slate-900 resize-none
                focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm
                ${item.isVerified 
                  ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20' 
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20'}
              `}
              placeholder="Enter text label..."
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                 // Auto-unverify if changed? Maybe better to keep manual control
                 // But usually editing invalidates verification.
                 if(item.isVerified && e.target.value !== item.text) {
                     handleUnverify();
                 }
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleVerify}
              className={`
                flex-1 py-3 rounded-lg font-bold text-sm tracking-wide shadow-lg transition-all
                flex items-center justify-center gap-2
                ${item.isVerified 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
              `}
            >
              {item.isVerified ? (
                <> <Check className="h-5 w-5" /> VERIFIED </>
              ) : (
                <> MARK AS VERIFIED </>
              )}
            </button>
            
            <button 
              onClick={handleClear}
              className="px-4 py-3 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-orange-500 border border-slate-300 transition-colors shadow-sm"
              title="Clear text"
            >
              <Eraser className="h-5 w-5" />
            </button>
            
            {item.isVerified && (
               <button 
                onClick={handleUnverify}
                className="px-4 py-3 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-red-500 border border-slate-300 transition-colors shadow-sm"
                title="Un-verify"
               >
                 <X className="h-5 w-5" />
               </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};