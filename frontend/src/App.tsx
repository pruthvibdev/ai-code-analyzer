import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Activity, 
  Sparkles, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  History, 
  ShieldCheck, 
  Cpu, 
  FileCode2,
  AlertTriangle,
  AlertCircle,
  Info,
  Settings,
  Copy,
  Check,
  Zap,
  BarChart3,
  Wrench
} from 'lucide-react';
import { api } from './services/api';
import { CodeEditor } from './components/CodeEditor';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SettingsModal } from './components/SettingsModal';
import { EXAMPLES } from './data/examples';
import type { 
  Language, 
  AnalyzeResponse, 
  HealthResponse, 
  AnalysisHistoryItem 
} from './types/analysis';

export const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState<string>(EXAMPLES[0].code);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'optimization' | 'metrics'>('overview');
  
  // History & Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<AnalysisHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Jump to line in Monaco editor
  const [highlightLine, setHighlightLine] = useState<number | null>(null);

  // Copied states
  const [copiedOpt, setCopiedOpt] = useState(false);
  const [appliedFix, setAppliedFix] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Selected Issue Severity Filter
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'suggestion'>('all');

  // Ping backend health & fetch initial history on mount
  useEffect(() => {
    refreshBackendHealth();
    fetchHistory();
  }, []);

  const refreshBackendHealth = async () => {
    try {
      const data = await api.getHealth();
      setBackendHealth(data);
      setBackendError(null);
    } catch (err: any) {
      setBackendError(err.message || 'Unable to connect to backend server');
    }
  };

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const data = await api.getAnalyses(50);
      setHistoryList(data);
    } catch {
      // silently fail if backend not reachable yet
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await api.analyzeCode({ code, language });
      setAnalysisResult(res);
      // Automatically refresh history to include this new run
      fetchHistory();
    } catch (err: any) {
      alert(`Analysis failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setAnalysisResult(null);
    setHighlightLine(null);
  };

  const handleSelectExample = (exampleId: string) => {
    const found = EXAMPLES.find((ex) => ex.id === exampleId);
    if (found) {
      setLanguage(found.language);
      setCode(found.code);
      setAnalysisResult(null);
      setHighlightLine(null);
    }
  };

  const handleSelectHistoryItem = async (id: string) => {
    try {
      const record = await api.getAnalysisById(id);
      if (record) {
        setAnalysisResult(record);
        if (record.code) {
          setCode(record.code);
        }
        if (record.language) {
          setLanguage(record.language.toLowerCase() as Language);
        }
        setIsHistoryOpen(false);
        setActiveTab('overview');
      }
    } catch (err: any) {
      alert(`Failed to load history record: ${err.message}`);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await api.deleteAnalysis(id);
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(`Failed to delete record: ${err.message}`);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await api.clearAnalyses();
      setHistoryList([]);
    } catch (err: any) {
      alert(`Failed to clear history: ${err.message}`);
    }
  };

  const handleApplyOptimization = () => {
    if (analysisResult?.optimized_code) {
      setCode(analysisResult.optimized_code);
      setAppliedFix(true);
      setTimeout(() => setAppliedFix(false), 2000);
    }
  };

  const handleCopyOptimization = async () => {
    if (analysisResult?.optimized_code) {
      await navigator.clipboard.writeText(analysisResult.optimized_code);
      setCopiedOpt(true);
      setTimeout(() => setCopiedOpt(false), 2000);
    }
  };

  const handleCopyReport = async () => {
    if (!analysisResult) return;
    const reportText = `# CodeLens AI Analysis Report
**Language:** ${analysisResult.language}
**Health Score:** ${analysisResult.quality_score} / 100
**Time Complexity:** ${analysisResult.time_complexity}
**Space Complexity:** ${analysisResult.space_complexity}
${analysisResult.time_complexity_optimized ? `**Optimized Time Complexity:** ${analysisResult.time_complexity_optimized}\n` : ''}
## Executive Summary
${analysisResult.summary}

## Key Metrics
- Lines of Code: ${analysisResult.metrics?.lines_of_code || 0}
- Cyclomatic Complexity: ${analysisResult.metrics?.cyclomatic_complexity || 1}
- Max Nesting Depth: ${analysisResult.metrics?.max_nesting_depth || 1}
- Loop Count: ${analysisResult.metrics?.loop_count || 0}
- Recursion: ${analysisResult.metrics?.recursion_detected ? 'Yes' : 'No'}

## Detected Issues (${analysisResult.issues.length})
${analysisResult.issues.map((i) => `- [${i.severity.toUpperCase()}] line ${i.line || '?'}: ${i.title} - ${i.description}`).join('\n')}

## Recommendations
${analysisResult.suggestions.map((s) => `- **${s.title}**: ${s.description}`).join('\n')}
`;
    await navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 70) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getComplexityBadgeColor = (comp: string) => {
    if (comp.includes('O(1)') || comp.includes('O(log n)')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (comp.includes('O(n)') && !comp.includes('O(n²)') && !comp.includes('O(n log n)')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
    if (comp.includes('O(n log n)')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    if (comp.includes('O(n²)') || comp.includes('O(n^')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  const filteredIssues = (analysisResult?.issues || []).filter((issue) => {
    if (issueSeverityFilter === 'all') return true;
    return issue.severity === issueSeverityFilter;
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CodeLens AI
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Live AST & AI Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Multi-Language Code Review, Big-O Complexity & Dynamic Refactoring
            </p>
          </div>
        </div>

        {/* Header Right Nav & Status */}
        <div className="flex items-center gap-3">
          {/* Backend Health Badge */}
          <div 
            onClick={refreshBackendHealth}
            title="Click to re-check backend connection"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-slate-900/60 border-slate-800 cursor-pointer hover:border-slate-700 transition"
          >
            {backendHealth ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">Backend Connected</span>
              </>
            ) : backendError ? (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-rose-300">Offline (Click retry)</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-slate-400">Connecting...</span>
              </>
            )}
          </div>

          {/* History Button */}
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 transition shadow-sm"
          >
            <History className="h-3.5 w-3.5 text-indigo-400" />
            <span>History</span>
            {historyList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-semibold border border-indigo-500/30">
                {historyList.length}
              </span>
            )}
          </button>

          {/* Settings / API Key Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Configure AI & Engine Settings"
            className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* LEFT PANEL: Editor & Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col border-r border-slate-800/80 bg-[#090d16]">
          {/* Editor Toolbar */}
          <div className="px-5 py-3 border-b border-slate-800 bg-[#0d1322] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-indigo-400" />
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
              </div>

              {/* Functional Preset Example Selector */}
              <select 
                aria-label="Preset Example Programs"
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelectExample(e.target.value);
                  }
                }}
                defaultValue=""
                className="bg-slate-900/80 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="" disabled>Load Example Program...</option>
                {EXAMPLES.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>

              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !code.trim()}
                className="flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 shadow-md shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing AST & Complexity...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Analyze Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Code Area */}
          <div className="flex-1 relative p-4 flex flex-col min-h-[500px]">
            <CodeEditor
              code={code}
              onChange={setCode}
              language={language}
              issues={analysisResult?.issues || []}
              highlightLine={highlightLine}
            />
          </div>
        </div>

        {/* RIGHT PANEL: Analysis Dashboard (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-[#0b101e] border-l border-slate-800/80 overflow-y-auto">
          {/* Dashboard Header & Tabs */}
          <div className="px-5 py-3 border-b border-slate-800 bg-[#0d1322] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Analysis Dashboard
              </h2>
            </div>
            {analysisResult && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {analysisResult.static_analysis_notice || 'AST Static Analysis'}
                </span>
              </div>
            )}
          </div>

          {/* Dashboard Navigation Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-[#090d16] px-5 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition ${
                activeTab === 'issues'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Issues</span>
              {analysisResult && analysisResult.issues.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  {analysisResult.issues.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('optimization')}
              className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition ${
                activeTab === 'optimization'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Optimization</span>
              {analysisResult?.optimized_code && (
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition ${
                activeTab === 'metrics'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Metrics</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="p-5 space-y-4">
              {/* Score & Complexity Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Quality Score Card */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Health Score</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className={`text-3xl font-extrabold tracking-tight ${
                      analysisResult ? getScoreColor(analysisResult.quality_score).split(' ')[0] : 'text-slate-500'
                    }`}>
                      {analysisResult ? analysisResult.quality_score : '--'}
                    </span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Based on AST complexity & rules
                  </p>
                </div>

                {/* Estimated Complexity Card */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Estimated Complexity</span>
                    <Cpu className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Time:</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded border text-[11px] ${
                        analysisResult ? getComplexityBadgeColor(analysisResult.time_complexity) : 'text-slate-500'
                      }`}>
                        {analysisResult ? analysisResult.time_complexity : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Space:</span>
                      <span className="font-mono font-semibold text-indigo-300">
                        {analysisResult ? analysisResult.space_complexity : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Summary */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                      Review Summary
                    </h3>
                  </div>
                  {analysisResult && (
                    <button
                      onClick={handleCopyReport}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 hover:underline"
                    >
                      {copiedReport ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedReport ? 'Copied' : 'Copy Report'}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {analysisResult 
                    ? analysisResult.summary 
                    : 'Click "Analyze Code" above to run multi-language AST static profiling, calculate Big-O bounds, and reveal refactoring opportunities.'}
                </p>
              </div>

              {/* Algorithmic Heuristics Snapshot */}
              {analysisResult?.metrics && (
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                    <span>Algorithmic Profile</span>
                    <span className="text-[10px] text-slate-500 font-mono">AST Heuristics</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Cyclomatic Complexity:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {analysisResult.metrics.cyclomatic_complexity}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Max Nesting Depth:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {analysisResult.metrics.max_nesting_depth}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Loop Structures:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {analysisResult.metrics.loop_count}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Recursion Detected:</span>
                      <span className={`font-mono font-bold ${
                        analysisResult.metrics.recursion_detected ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {analysisResult.metrics.recursion_detected ? 'Yes (Recursive)' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              {analysisResult?.suggestions && analysisResult.suggestions.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Key Recommendations</span>
                  </h3>
                  <div className="space-y-2">
                    {analysisResult.suggestions.map((sug, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs">
                        <div className="font-semibold text-slate-200 text-[11px]">{sug.title}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5 leading-normal">{sug.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ISSUES & DIAGNOSTICS */}
          {activeTab === 'issues' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Detected Issues ({filteredIssues.length})
                  </span>
                </div>

                {/* Severity Filter */}
                <div className="flex items-center gap-1 text-[11px]">
                  {(['all', 'critical', 'warning', 'suggestion'] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setIssueSeverityFilter(sev)}
                      className={`px-2 py-0.5 rounded font-medium capitalize transition ${
                        issueSeverityFilter === sev
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {filteredIssues.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-200">No issues found for this filter</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your code meets all inspected static rule standards.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (issue.line) {
                          setHighlightLine(issue.line);
                        }
                      }}
                      className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 transition cursor-pointer flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {issue.severity === 'critical' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase">
                              <AlertCircle className="h-3 w-3" /> Critical
                            </span>
                          )}
                          {issue.severity === 'warning' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase">
                              <AlertTriangle className="h-3 w-3" /> Warning
                            </span>
                          )}
                          {issue.severity === 'suggestion' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase">
                              <Info className="h-3 w-3" /> Suggestion
                            </span>
                          )}
                          <span className="font-semibold text-xs text-slate-200">
                            {issue.title}
                          </span>
                        </div>

                        {issue.line && (
                          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            Line {issue.line}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 leading-normal">
                        {issue.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>Rule: {issue.rule_id || 'AST_LINT'}</span>
                        <span className="text-indigo-400 hover:underline">Click to jump in editor →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OPTIMIZATION & REFACTORING */}
          {activeTab === 'optimization' && (
            <div className="p-5 space-y-4">
              {analysisResult?.optimized_code ? (
                <>
                  {/* Before vs After Complexity Comparison */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                        Complexity Comparison
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Optimized
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Current Code</span>
                        <div className="mt-1 font-mono text-amber-400 font-bold text-sm">
                          Time: {analysisResult.time_complexity}
                        </div>
                        <div className="font-mono text-slate-400 text-xs mt-0.5">
                          Space: {analysisResult.space_complexity}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950/70 border border-emerald-500/30">
                        <span className="text-emerald-400 text-[10px] uppercase font-bold">Refactored Goal</span>
                        <div className="mt-1 font-mono text-emerald-400 font-bold text-sm">
                          Time: {analysisResult.time_complexity_optimized || 'O(n)'}
                        </div>
                        <div className="font-mono text-indigo-300 text-xs mt-0.5">
                          Space: {analysisResult.space_complexity_optimized || 'O(n)'}
                        </div>
                      </div>
                    </div>

                    {analysisResult.optimization_explanation && (
                      <p className="text-xs text-slate-300 bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/20 leading-relaxed">
                        {analysisResult.optimization_explanation}
                      </p>
                    )}
                  </div>

                  {/* Refactored Code Block */}
                  <div className="rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden">
                    <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400 font-medium">Refactored Solution</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyOptimization}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px]"
                        >
                          {copiedOpt ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedOpt ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={handleApplyOptimization}
                          className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition text-[11px]"
                        >
                          {appliedFix ? <Check className="h-3 w-3 text-emerald-300" /> : <Zap className="h-3 w-3" />}
                          <span>{appliedFix ? 'Applied!' : 'Apply to Editor'}</span>
                        </button>
                      </div>
                    </div>
                    <pre className="p-4 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed max-h-[350px]">
                      <code>{analysisResult.optimized_code}</code>
                    </pre>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400">
                  <Zap className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-200">No optimization available yet</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[280px] mx-auto">
                    {analysisResult
                      ? 'The current code already appears optimal or no common quadratic anti-patterns were triggered.'
                      : 'Run an analysis on code with nested loops, recursion, or suboptimal lookups to see algorithmic refactoring.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RAW METRICS & EXPORT */}
          {activeTab === 'metrics' && (
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Static Code Measurement
                </h3>
                {analysisResult?.metrics ? (
                  <div className="divide-y divide-slate-800 text-xs">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-400">Lines of Code (Executable):</span>
                      <span className="font-mono font-bold text-slate-200">
                        {analysisResult.metrics.lines_of_code}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-400">Blank Lines:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {analysisResult.metrics.blank_lines}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-400">Comment Lines:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {analysisResult.metrics.comment_lines}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-400">Cyclomatic Complexity:</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {analysisResult.metrics.cyclomatic_complexity}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-400">Max Nesting Depth:</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {analysisResult.metrics.max_nesting_depth}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-400">Loop Constructs:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {analysisResult.metrics.loop_count}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-400">Functions / Methods:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {analysisResult.metrics.function_count}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-400">Recursion Status:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {analysisResult.metrics.recursion_detected ? 'Detected' : 'None'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Run code analysis to view comprehensive AST metrics.</p>
                )}
              </div>

              {/* Export Report Actions */}
              {analysisResult && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Export Analysis Data
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopyReport}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition"
                    >
                      {copiedReport ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedReport ? 'Copied to Clipboard' : 'Copy Full Markdown Report'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* History Slide-over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={historyList}
        onSelect={handleSelectHistoryItem}
        onDelete={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
        isLoading={isHistoryLoading}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        backendHealth={backendHealth}
        onSaveApiKey={() => {
          refreshBackendHealth();
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0a0e1a] px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span>CodeLens AI Arena</span>
          <span>•</span>
          <span>Multi-Language AST Heuristics & Neural Review</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Python • JavaScript • Java • C++</span>
          <span>•</span>
          <span>All rights reserved</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
