import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Swords,
  Columns2,
  MessageSquare,
  Bot,
  Shuffle,
  ChevronDown,
  Sparkles,
  Search,
  Check,
  Code,
  Brain,
  SlidersHorizontal,
} from 'lucide-react';
import { ArenaMode, ModelInfo } from '../types';

interface CommandDockProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  currentMode: ArenaMode;
  onSelectMode: (mode: ArenaMode) => void;
  models: ModelInfo[];
  selectedModelDirect: string;
  onSelectModelDirect: (id: string) => void;
  selectedModelA: string;
  onSelectModelA: (id: string) => void;
  selectedModelB: string;
  onSelectModelB: (id: string) => void;
  onShuffleBattleModels: () => void;
  disabled?: boolean;
}

export const CommandDock: React.FC<CommandDockProps> = ({
  prompt,
  onPromptChange,
  onSubmit,
  onStop,
  isStreaming,
  currentMode,
  onSelectMode,
  models,
  selectedModelDirect,
  onSelectModelDirect,
  selectedModelA,
  onSelectModelA,
  selectedModelB,
  onSelectModelB,
  onShuffleBattleModels,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeDropdown, setActiveDropdown] = useState<'direct' | 'modelA' | 'modelB' | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const [selectedModality, setSelectedModality] = useState<'general' | 'coding' | 'reasoning'>('general');

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && prompt.trim().length > 0 && !disabled) {
        onSubmit();
      }
    }
  };

  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.provider.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase());
    return matchesSearch;
  });

  const getModelName = (id: string) => {
    const found = models.find((m) => m.id === id);
    return found ? found.name : id.split('/')[1] || id;
  };

  const getModelProvider = (id: string) => {
    const found = models.find((m) => m.id === id);
    return found ? found.provider : id.split('/')[0] || 'AI';
  };

  const renderModelDropdown = (
    currentId: string,
    onSelect: (id: string) => void,
    dropdownKey: 'direct' | 'modelA' | 'modelB'
  ) => {
    const isOpen = activeDropdown === dropdownKey;

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveDropdown(isOpen ? null : dropdownKey);
            setModelSearch('');
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#222228] hover:bg-[#282830] border border-zinc-700/80 text-xs text-zinc-200 transition-colors cursor-pointer max-w-[200px]"
          title="Change model"
        >
          <span className="text-[10px] px-1 rounded bg-zinc-800 text-zinc-400 font-medium uppercase truncate">
            {getModelProvider(currentId)}
          </span>
          <span className="truncate text-xs font-medium">{getModelName(currentId)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute bottom-full mb-2 left-0 w-72 sm:w-80 max-h-80 bg-[#1a1a1e] border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-zinc-800 bg-[#141416]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter models & providers..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="w-full bg-[#222228] text-xs text-white pl-8 pr-2 py-1.5 rounded-lg border border-zinc-700 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto p-1.5 space-y-1 flex-1">
              {filteredModels.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">No models found</div>
              ) : (
                filteredModels.map((m) => {
                  const isSelected = m.id === currentId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelect(m.id);
                        setActiveDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'hover:bg-zinc-800/80 text-zinc-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold truncate">{m.name}</span>
                          {m.is_free && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono font-medium">
                              Free
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                          <span>{m.provider}</span>
                          <span>•</span>
                          <span>{(m.context_length / 1024).toFixed(0)}k ctx</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 w-full px-3 pb-3 pt-2 bg-gradient-to-t from-[#121214] via-[#121214]/95 to-transparent">
      <div className="max-w-4xl mx-auto rounded-2xl bg-[#1a1a1e]/95 backdrop-blur-md border border-[#27272a] shadow-2xl p-3 flex flex-col gap-2.5">
        {/* Top Control Bar: Mode Selector & Model Config */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-zinc-800/80">
          {/* Mode Switcher Pills */}
          <div className="flex items-center gap-1 bg-[#121214] p-1 rounded-xl border border-zinc-800/80 text-xs">
            <button
              type="button"
              onClick={() => onSelectMode('battle')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentMode === 'battle'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Blind Battle Mode"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Battle</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('side-by-side')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentMode === 'side-by-side'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Side-by-Side Model Comparison"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Side-by-Side</span>
              <span className="sm:hidden">Compare</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('direct')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentMode === 'direct'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Direct Single Model Chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Direct</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('agent')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentMode === 'agent'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Agent Planner Workflow"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Agent</span>
            </button>
          </div>

          {/* Dynamic Model Controls based on Mode */}
          <div className="flex items-center gap-2">
            {currentMode === 'battle' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Hidden Models (Blind)</span>
                </div>
                <button
                  type="button"
                  onClick={onShuffleBattleModels}
                  className="p-1 rounded-lg bg-[#222228] hover:bg-[#282830] border border-zinc-700 text-zinc-300 hover:text-emerald-400 transition-colors"
                  title="Shuffle Battle Pair"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {currentMode === 'side-by-side' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-mono">A:</span>
                {renderModelDropdown(selectedModelA, onSelectModelA, 'modelA')}
                <span className="text-[10px] text-zinc-500 font-mono">vs</span>
                <span className="text-[10px] text-zinc-500 font-mono">B:</span>
                {renderModelDropdown(selectedModelB, onSelectModelB, 'modelB')}
              </div>
            )}

            {currentMode === 'direct' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-400 font-mono">Model:</span>
                {renderModelDropdown(selectedModelDirect, onSelectModelDirect, 'direct')}
              </div>
            )}

            {currentMode === 'agent' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-purple-400 font-mono">Planner:</span>
                {renderModelDropdown(selectedModelDirect, onSelectModelDirect, 'direct')}
              </div>
            )}
          </div>
        </div>

        {/* Textarea & Send Input Row */}
        <div className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentMode === 'battle'
                ? 'Send a prompt to test both anonymous models concurrently...'
                : currentMode === 'side-by-side'
                ? 'Send a prompt to benchmark both selected models...'
                : currentMode === 'agent'
                ? 'Enter a goal to decompose into execution steps...'
                : 'Message the selected model (Shift+Enter for newline)...'
            }
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none px-2 py-1 max-h-44 min-h-[38px] leading-relaxed"
            disabled={disabled}
          />

          {/* Action Button: Send or Stop */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer shadow-lg"
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || prompt.trim().length === 0}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-95"
              title="Send prompt (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Modality & Info strip */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-zinc-400">
              <SlidersHorizontal className="w-3 h-3 text-zinc-500" />
              Focus:
            </span>
            <button
              type="button"
              onClick={() => setSelectedModality('general')}
              className={`hover:text-zinc-300 transition-colors ${
                selectedModality === 'general' ? 'text-emerald-400 font-medium' : ''
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setSelectedModality('coding')}
              className={`flex items-center gap-1 hover:text-zinc-300 transition-colors ${
                selectedModality === 'coding' ? 'text-emerald-400 font-medium' : ''
              }`}
            >
              <Code className="w-2.5 h-2.5" />
              Code
            </button>
            <button
              type="button"
              onClick={() => setSelectedModality('reasoning')}
              className={`flex items-center gap-1 hover:text-zinc-300 transition-colors ${
                selectedModality === 'reasoning' ? 'text-emerald-400 font-medium' : ''
              }`}
            >
              <Brain className="w-2.5 h-2.5" />
              Reasoning
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-zinc-500">
            <span>Free Tier Frontier</span>
            <span>•</span>
            <kbd className="bg-zinc-800/80 px-1 py-0.5 rounded text-[10px] text-zinc-400 font-mono">
              Enter
            </kbd>
            <span>to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
