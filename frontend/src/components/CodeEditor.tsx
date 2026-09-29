import React, { useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as monacoType from 'monaco-editor';
import { Copy, Check, Sparkles, Layers } from 'lucide-react';
import type { Language, CodeIssue } from '../types/analysis';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: Language;
  issues?: CodeIssue[];
  readOnly?: boolean;
  highlightLine?: number | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  language,
  issues = [],
  readOnly = false,
  highlightLine = null,
}) => {
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monacoType | null>(null);
  const [cursorPos, setCursorPos] = React.useState({ line: 1, column: 1 });
  const [copied, setCopied] = React.useState(false);

  // Map app languages to Monaco language identifiers
  const monacoLanguageMap: Record<Language, string> = {
    python: 'python',
    javascript: 'javascript',
    java: 'java',
    cpp: 'cpp',
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Custom dark theme tweaks
    monaco.editor.defineTheme('arena-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'function', foreground: '38bdf8' },
      ],
      colors: {
        'editor.background': '#0b0f19',
        'editor.lineHighlightBackground': '#141c2e',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#818cf8',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#334155',
        'editor.selectionBackground': '#2e3856',
        'editorCursor.foreground': '#60a5fa',
      },
    });
    monaco.editor.setTheme('arena-dark');
  };

  // Jump to line when highlightLine changes
  useEffect(() => {
    if (editorRef.current && highlightLine && highlightLine > 0) {
      editorRef.current.revealLineInCenter(highlightLine);
      editorRef.current.setPosition({ lineNumber: highlightLine, column: 1 });
      editorRef.current.focus();
    }
  }, [highlightLine]);

  // Add issue squiggly markers in Monaco editor when issues are detected
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;

    if (!issues || issues.length === 0) {
      monaco.editor.setModelMarkers(model, 'owner-analysis', []);
      return;
    }

    const markers: monacoType.editor.IMarkerData[] = issues
      .filter((issue) => issue.line && issue.line > 0)
      .map((issue) => {
        let severity = monaco.MarkerSeverity.Warning;
        if (issue.severity === 'critical') {
          severity = monaco.MarkerSeverity.Error;
        } else if (issue.severity === 'suggestion') {
          severity = monaco.MarkerSeverity.Info;
        }

        const lineNum = Math.min(issue.line || 1, model.getLineCount());
        const maxCol = model.getLineMaxColumn(lineNum);

        return {
          startLineNumber: lineNum,
          startColumn: issue.column || 1,
          endLineNumber: lineNum,
          endColumn: maxCol,
          message: `[${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`,
          severity: severity,
        };
      });

    monaco.editor.setModelMarkers(model, 'owner-analysis', markers);
  }, [issues, code]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const lineCount = code.split('\n').length;
  const charCount = code.length;

  return (
    <div className="flex flex-col h-full w-full bg-[#0b0f19] rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl">
      {/* Editor Sub-bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1322] border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>Monaco Source Buffer</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-[11px] text-slate-400">
            {monacoLanguageMap[language].toUpperCase()}
          </span>
          {issues.length > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold">
                <Sparkles className="h-3 w-3" />
                {issues.length} {issues.length === 1 ? 'diagnostic' : 'diagnostics'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            title="Copy Code to Clipboard"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 transition text-[11px]"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 w-full min-h-[460px] relative">
        <Editor
          height="100%"
          language={monacoLanguageMap[language]}
          value={code}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            readOnly,
            fontSize: 13.5,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            tabSize: 4,
            minimap: { enabled: true, maxColumn: 80, scale: 0.75 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            bracketPairColorization: { enabled: true },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            lineNumbers: 'on',
            roundedSelection: true,
            renderLineHighlight: 'all',
            padding: { top: 12, bottom: 12 },
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-[#0b0f19] text-slate-400 gap-2">
              <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading Monaco Editor Engine...</span>
            </div>
          }
        />
      </div>

      {/* Editor Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#090d16] border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
          <span>•</span>
          <span>{lineCount} lines</span>
          <span>•</span>
          <span>{charCount} characters</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">UTF-8</span>
          <span>Spaces: 4</span>
        </div>
      </div>
    </div>
  );
};
