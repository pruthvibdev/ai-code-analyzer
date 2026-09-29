import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  History, 
  Clock, 
  Search, 
  ChevronRight, 
  Cpu
} from 'lucide-react';
import type { AnalysisHistoryItem } from '../types/analysis';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: AnalysisHistoryItem[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  isLoading: boolean;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelect,
  onDelete,
  onClearAll,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<string>('all');

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    const matchesSearch = 
      item.preview_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.time_complexity.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLang = selectedLang === 'all' || item.language.toLowerCase() === selectedLang.toLowerCase();
    return matchesSearch && matchesLang;
  });

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'javascript':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'java':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'cpp':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-700';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 70) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
        ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-out panel */}
      <div className="w-full max-w-md bg-[#0c101d] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1424]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Analysis History
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                  {history.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Past code analyses and complexity reviews</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 border-b border-slate-800/80 bg-[#090d16] space-y-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search history by code, complexity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px]">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {['all', 'python', 'javascript', 'java', 'cpp'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-2 py-0.5 rounded-md font-medium capitalize transition ${
                    selectedLang === lang
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800/80'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear entire analysis history? This action cannot be undone.')) {
                    onClearAll();
                  }
                }}
                className="text-rose-400/80 hover:text-rose-300 text-[11px] flex items-center gap-1 hover:underline shrink-0 ml-2"
                title="Clear all history records"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading history entries...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4 text-slate-500">
              <History className="h-8 w-8 text-slate-600 mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium text-slate-300">No analyses found</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                {history.length === 0
                  ? 'Analyze some code in the workspace and past sessions will be saved here automatically.'
                  : 'No records match your search filter.'}
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="group relative p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 transition cursor-pointer flex flex-col gap-2 shadow-sm"
                onClick={() => onSelect(item.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getLanguageColor(
                        item.language
                      )}`}
                    >
                      {item.language.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 tracking-tight">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${getScoreColor(
                        item.quality_score
                      )}`}
                    >
                      {item.quality_score}/100
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                      title="Delete record"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Code Preview */}
                <div className="bg-[#070b14] p-2 rounded-lg border border-slate-800/60 font-mono text-[11px] text-slate-300 truncate">
                  <code>{item.preview_code || '# Code snippet'}</code>
                </div>

                {/* Footer Metadata */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-cyan-400 font-mono font-medium">
                      <Cpu className="h-3 w-3" />
                      {item.time_complexity}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-indigo-300">
                      {item.space_complexity}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{formatDate(item.created_at)}</span>
                    <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#0e1424] flex items-center justify-between text-[11px] text-slate-500">
          <span>Click any session to reload code & analysis</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
