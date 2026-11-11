import React from 'react';
import {
  Swords,
  Columns2,
  MessageSquare,
  Bot,
  Trophy,
  Settings,
  HelpCircle,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  ShieldCheck,
  Zap,
  X,
  History,
} from 'lucide-react';
import { ArenaMode, ModelInfo } from '../types';

interface SidebarProps {
  currentMode: ArenaMode;
  onSelectMode: (mode: ArenaMode) => void;
  onNewChat: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  modelsCount: number;
  models?: ModelInfo[];
  onSelectModelDirect?: (modelId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  onSelectMode,
  onNewChat,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenHelp,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  searchQuery,
  onSearchChange,
  modelsCount,
  models = [],
  onSelectModelDirect,
}) => {
  const matchingModels = searchQuery.trim().length > 0
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.id.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];
  const modes = [
    {
      id: 'battle' as ArenaMode,
      name: 'Battle Arena',
      icon: Swords,
      desc: 'Blind dual-model voting',
      badge: 'Popular',
    },
    {
      id: 'side-by-side' as ArenaMode,
      name: 'Side-by-Side',
      icon: Columns2,
      desc: 'Manual model comparison',
    },
    {
      id: 'direct' as ArenaMode,
      name: 'Direct Chat',
      icon: MessageSquare,
      desc: 'Single model conversation',
    },
    {
      id: 'agent' as ArenaMode,
      name: 'Agent Mode',
      icon: Bot,
      desc: 'Task decomposition & planner',
      badge: 'Preview',
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#161619] border-r border-[#27272a] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#27272a]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-black font-black text-lg flex-shrink-0 tracking-tighter">
            <span>⚔</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-serif-headline text-xl font-bold tracking-tight text-white">
                  Arena X
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-medium">
                  v2.4
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium -mt-0.5">
                AI Frontier Evaluation
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse Desktop / Close Mobile */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* New Session Action */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            if (isMobileOpen) onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium text-sm shadow-md shadow-emerald-950/30 transition-all active:scale-[0.98] ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="New Chat (Ctrl+K)"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1">
              <span>New Battle</span>
              <kbd className="hidden lg:inline-block text-[10px] bg-emerald-800/60 px-1.5 py-0.5 rounded font-mono text-emerald-200">
                ⌘K
              </kbd>
            </div>
          )}
        </button>
      </div>

      {/* Search Bar */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search catalog & prompts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#1e1e24] text-xs text-zinc-200 pl-8 pr-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-500"
            />
          </div>

          {matchingModels.length > 0 && (
            <div className="mt-2 bg-[#1a1a1e] border border-zinc-800 rounded-xl p-1.5 space-y-1 max-h-48 overflow-y-auto shadow-xl">
              <div className="text-[10px] text-zinc-400 font-semibold px-2 py-0.5 uppercase tracking-wider">
                Matching Free Models ({matchingModels.length})
              </div>
              {matchingModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (onSelectModelDirect) onSelectModelDirect(m.id);
                    onSelectMode('direct');
                    onSearchChange('');
                    if (isMobileOpen) onCloseMobile();
                  }}
                  className="w-full text-left p-1.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-between text-xs group"
                >
                  <div className="min-w-0 flex-1 mr-1">
                    <div className="text-zinc-200 font-medium truncate group-hover:text-emerald-400">
                      {m.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {m.provider} • {(m.context_length / 1024).toFixed(0)}k ctx
                    </div>
                  </div>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    Chat
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation Modes */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        {!isCollapsed && (
          <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
            Arenas & Modes
          </div>
        )}

        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                onSelectMode(mode.id);
                if (isMobileOpen) onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-[#222228] text-white border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e24]'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={mode.name}
            >
              <div
                className={`p-1.5 rounded-lg flex-shrink-0 ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-800/80 text-zinc-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {mode.name}
                    </span>
                    {mode.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                          mode.badge === 'Popular'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {mode.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate -mt-0.5">{mode.desc}</p>
                </div>
              )}
            </button>
          );
        })}

        {/* Benchmark & Archive */}
        <div className="pt-2 space-y-1">
          {!isCollapsed && (
            <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
              Benchmark & Archive
            </div>
          )}

          {/* Leaderboard */}
          <button
            type="button"
            onClick={() => {
              onSelectMode('leaderboard');
              if (isMobileOpen) onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
              currentMode === 'leaderboard'
                ? 'bg-[#222228] text-white border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e24]'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Leaderboard Rankings"
          >
            <div
              className={`p-1.5 rounded-lg flex-shrink-0 ${
                currentMode === 'leaderboard'
                  ? 'bg-amber-500/25 text-amber-300 ring-1 ring-amber-500/40'
                  : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              <Trophy className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">Leaderboard</span>
                  <span className="text-[10px] text-amber-400 font-mono">Elo Rank</span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">Global model standings</p>
              </div>
            )}
          </button>

          {/* Battle History */}
          <button
            type="button"
            onClick={() => {
              onSelectMode('history');
              if (isMobileOpen) onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
              currentMode === 'history'
                ? 'bg-[#222228] text-white border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e24]'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Battle History Archive"
          >
            <div
              className={`p-1.5 rounded-lg flex-shrink-0 ${
                currentMode === 'history'
                  ? 'bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              <History className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">Battle History</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Archive</span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">Past battles & responses</p>
              </div>
            )}
          </button>
        </div>

        {/* Catalog stats banner */}
        {!isCollapsed && (
          <div className="mt-4 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Active Free Models
              </span>
              <span className="font-mono text-emerald-400 font-semibold">{modelsCount}</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">
              Synced dynamically via OpenRouter API with zero-cost tier verification.
            </p>
          </div>
        )}
      </div>

      {/* Footer / Account / Settings / Help */}
      <div className="p-3 border-t border-[#27272a] space-y-1">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            if (isMobileOpen) onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e24] transition-colors ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenHelp();
            if (isMobileOpen) onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e24] transition-colors ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Help Center & Docs"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Help Center</span>}
        </button>

        {/* User Account / Identity Bar */}
        <div
          className={`pt-2 mt-1 border-t border-zinc-800/60 flex items-center gap-2.5 ${
            isCollapsed ? 'justify-center' : 'px-1'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs font-semibold flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-zinc-200 truncate">
                  Evaluator Contributor
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">Anonymous Voter</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 z-30 h-screen sticky top-0 flex-shrink-0 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Slide-out Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
