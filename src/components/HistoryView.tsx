import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Swords,
  Trophy,
  Scale,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ThumbsDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { BattleRecord } from '../types';
import { fetchBattleHistory } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';

interface HistoryViewProps {
  onStartBattle: () => void;
  onRematchPrompt: (prompt: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onStartBattle,
  onRematchPrompt,
}) => {
  const [battles, setBattles] = useState<BattleRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterWinner, setFilterWinner] = useState<'all' | 'modelA' | 'modelB' | 'tie' | 'both_bad'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = async (query?: string) => {
    try {
      setLoading(true);
      const res = await fetchBattleHistory(query);
      if (res?.battles) {
        setBattles(res.battles);
        setTotal(res.total || res.battles.length);
      }
    } catch (err) {
      console.error('Failed to load battle history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(search);
  }, [search]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filteredBattles = battles.filter((b) => {
    if (filterWinner === 'all') return true;
    return b.winner === filterWinner;
  });

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-[#1a1a20] via-[#16161a] to-[#121215] border border-[#27272a] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 font-mono">
              Persistent Archive
            </span>
          </div>
          <h1 className="font-serif-headline text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Battle History
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Immutable log of all blind arena duels recorded in the local SQLite database.
            Inspect user prompts, compare generated responses side-by-side, and analyze voting decisions.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={onStartBattle}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>Launch New Match</span>
          </button>

          <button
            type="button"
            onClick={() => loadHistory(search)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#222228] hover:bg-[#2a2a32] text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#161619] border border-[#27272a]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search battle prompts, models, or IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1e1e24] text-xs text-zinc-200 pl-9 pr-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-emerald-500/50 placeholder:text-zinc-500 transition-colors"
          />
        </div>

        {/* Outcome Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Outcomes' },
              { id: 'modelA', label: 'Model A Won' },
              { id: 'modelB', label: 'Model B Won' },
              { id: 'tie', label: 'Ties' },
              { id: 'both_bad', label: 'Both Bad' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterWinner(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filterWinner === tab.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Battle Cards List */}
      <div className="space-y-4">
        {loading && battles.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#161619] border border-[#27272a] text-zinc-500">
            <RotateCcw className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
            <span className="text-xs">Loading persistent battle history from SQLite...</span>
          </div>
        ) : filteredBattles.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#161619] border border-[#27272a] text-zinc-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700 mx-auto flex items-center justify-center text-zinc-400">
              <Swords className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-white">No battle records yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {search
                ? 'No past battles match your search term. Try a different query.'
                : 'Cast your first vote in Battle Mode to record anonymous dual-model showdowns to the persistent archive.'}
            </p>
            <button
              type="button"
              onClick={onStartBattle}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>Start Battle Now</span>
            </button>
          </div>
        ) : (
          filteredBattles.map((battle) => {
            const isExpanded = expandedId === battle.id;
            const aWon = battle.winner === 'modelA';
            const bWon = battle.winner === 'modelB';
            const isTie = battle.winner === 'tie';
            const isBad = battle.winner === 'both_bad';

            return (
              <div
                key={battle.id}
                className="rounded-2xl bg-[#161619] border border-[#27272a] overflow-hidden hover:border-zinc-700 transition-all shadow-md"
              >
                {/* Battle Card Summary Header */}
                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-zinc-500 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        {battle.id}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {formatDate(battle.createdAt)}
                      </span>
                    </div>

                    {/* Winner / Verdict Badge */}
                    <div className="flex items-center gap-2">
                      {aWon && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span>Winner: {battle.modelAName}</span>
                          {battle.deltaA !== undefined && (
                            <span className="font-mono text-[10px] text-emerald-400 ml-1">
                              (+{battle.deltaA} Elo)
                            </span>
                          )}
                        </span>
                      )}
                      {bWon && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span>Winner: {battle.modelBName}</span>
                          {battle.deltaB !== undefined && (
                            <span className="font-mono text-[10px] text-emerald-400 ml-1">
                              (+{battle.deltaB} Elo)
                            </span>
                          )}
                        </span>
                      )}
                      {isTie && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">
                          <Scale className="w-3 h-3 text-amber-400" />
                          <span>Declared Tie</span>
                        </span>
                      )}
                      {isBad && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-semibold">
                          <ThumbsDown className="w-3 h-3 text-red-400" />
                          <span>Both Rejected</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Prompt Text */}
                  <div className="p-3 rounded-xl bg-[#1a1a20] border border-zinc-800/80">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1 font-mono">
                      Prompt Evaluated
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-100 font-medium line-clamp-2">
                      {battle.prompt}
                    </p>
                  </div>

                  {/* Competitor Models Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-zinc-800/60">
                    <div className="flex items-center gap-4 text-xs">
                      {/* Model A */}
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center font-mono text-[10px] font-bold text-zinc-300">
                          A
                        </span>
                        <div>
                          <span className={`font-semibold ${aWon ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {battle.modelAName}
                          </span>
                          <span className="text-[10px] text-zinc-500 ml-1.5 font-mono">
                            ({battle.providerA})
                          </span>
                        </div>
                      </div>

                      <span className="text-zinc-600 font-mono">VS</span>

                      {/* Model B */}
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center font-mono text-[10px] font-bold text-zinc-300">
                          B
                        </span>
                        <div>
                          <span className={`font-semibold ${bWon ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {battle.modelBName}
                          </span>
                          <span className="text-[10px] text-zinc-500 ml-1.5 font-mono">
                            ({battle.providerB})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => onRematchPrompt(battle.prompt)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
                        title="Run this prompt again in Battle Arena"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-400" />
                        <span>Rematch</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(battle.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Responses' : 'View Responses'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Dual Response Inspection Drawer */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-[#27272a] bg-[#141417] space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Model A Response Column */}
                      <div
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          aWon
                            ? 'bg-[#181d19] border-emerald-500/50'
                            : 'bg-[#18181c] border-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center font-mono text-[10px] font-bold text-zinc-200">
                                A
                              </span>
                              <span className="font-semibold text-xs text-white">
                                {battle.modelAName}
                              </span>
                              {aWon && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono uppercase font-bold">
                                  Winner
                                </span>
                              )}
                            </div>
                            {battle.latencyA && (
                              <span className="text-[10px] font-mono text-zinc-500">
                                {(battle.latencyA / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>

                          <div className="prose prose-invert prose-emerald text-xs max-h-96 overflow-y-auto pr-1">
                            {battle.responseA ? (
                              <MarkdownRenderer content={battle.responseA} />
                            ) : (
                              <span className="text-zinc-500 italic">No response text stored.</span>
                            )}
                          </div>
                        </div>

                        {battle.eloAAfter !== undefined && (
                          <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                            <span>Elo: {battle.eloABefore} → {battle.eloAAfter}</span>
                            <span className={battle.deltaA && battle.deltaA > 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {battle.deltaA && battle.deltaA > 0 ? `+${battle.deltaA}` : battle.deltaA}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Model B Response Column */}
                      <div
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          bWon
                            ? 'bg-[#181d19] border-emerald-500/50'
                            : 'bg-[#18181c] border-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center font-mono text-[10px] font-bold text-zinc-200">
                                B
                              </span>
                              <span className="font-semibold text-xs text-white">
                                {battle.modelBName}
                              </span>
                              {bWon && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono uppercase font-bold">
                                  Winner
                                </span>
                              )}
                            </div>
                            {battle.latencyB && (
                              <span className="text-[10px] font-mono text-zinc-500">
                                {(battle.latencyB / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>

                          <div className="prose prose-invert prose-emerald text-xs max-h-96 overflow-y-auto pr-1">
                            {battle.responseB ? (
                              <MarkdownRenderer content={battle.responseB} />
                            ) : (
                              <span className="text-zinc-500 italic">No response text stored.</span>
                            )}
                          </div>
                        </div>

                        {battle.eloBAfter !== undefined && (
                          <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                            <span>Elo: {battle.eloBBefore} → {battle.eloBAfter}</span>
                            <span className={battle.deltaB && battle.deltaB > 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {battle.deltaB && battle.deltaB > 0 ? `+${battle.deltaB}` : battle.deltaB}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
