import React, { useMemo } from 'react';
import { OcrItem, FilterState, SortOption } from '../types';
import { Search, CheckCircle2, Circle, AlertCircle, ArrowDownAZ, ArrowUpAZ, Filter } from 'lucide-react';

interface SidebarProps {
  items: OcrItem[];
  selectedIndex: number;
  onSelectItem: (index: number) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filteredIndices: number[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  selectedIndex,
  onSelectItem,
  filters,
  setFilters,
  filteredIndices
}) => {

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, sort: e.target.value as SortOption }));
  };

  return (
    <div className="w-80 md:w-96 flex flex-col border-r border-slate-200 bg-white h-full">
      {/* Header / Search Area */}
      <div className="p-4 border-b border-slate-200 space-y-3 bg-white z-10">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search filenames or text..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 transition-all"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
             <select
              value={filters.sort}
              onChange={handleSortChange}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="filename_asc">File Name (A-Z)</option>
              <option value="filename_desc">File Name (Z-A)</option>
              <option value="filetext_asc">File Text (A-Z)</option>
              <option value="filetext_desc">File Text (Z-A)</option>
              <option value="status_verified">Verified First</option>
              <option value="status_unverified">Unverified First</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
               <ArrowDownAZ className="h-3 w-3" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>{filteredIndices.length} items found</span>
          <span>{items.filter(i => i.isVerified).length} verified</span>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto">
        {filteredIndices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
            <Filter className="h-8 w-8 opacity-50" />
            <span className="text-sm">No items match your filter</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredIndices.map((originalIndex) => {
              const item = items[originalIndex];
              const isSelected = selectedIndex === originalIndex;
              
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(originalIndex)}
                  className={`
                    group flex items-start gap-3 p-3 cursor-pointer transition-colors duration-150 relative
                    ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                    ${item.isVerified ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent pl-[15px]'}
                  `}
                >
                  {/* Status Icon */}
                  <div className="mt-1 flex-shrink-0">
                    {item.isVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 group-hover:text-slate-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate mb-0.5 ${item.isVerified ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {item.text || <span className="italic text-slate-400">Empty Label</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">
                      {item.filename}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};