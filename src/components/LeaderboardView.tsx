import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  TrendingUp,
  Search,
  RotateCcw,
  Sparkles,
  Info,
  ExternalLink,
  ShieldCheck,
  Zap,
  Swords,
  ChevronUp,
  ChevronDown,
  Scale,
  Percent,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { fetchLeaderboard, recalculateElo, resetLeaderboard, LeaderboardResponse } from '../services/api';

interface LeaderboardViewProps {
  onStartBattle: () => void;
  onChatWithModel?: (modelId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  onStartBattle,
  onChatWithModel,
}) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'general' | 'coding' | 'reasoning'>('all');
  const [sortField, setSortField] = useState<'elo' | 'winRate' | 'votes'>('elo');
  const [sortAsc, setSortAsc] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchLeaderboard();
      setData(res);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      setActionMessage('Replaying all verified battles to recalculate Elo...');
      const res = await recalculateElo();
      setActionMessage(`Recalculation complete. ${res.battlesReplayed || 0} battle records replayed.`);
      await loadData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Recalculation error: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all recorded battle votes to default baseline ratings?')) {
      return;
    }
    try {
      setLoading(true);
      await resetLeaderboard();
      await loadData();
      setActionMessage('Leaderboard reset to baseline ratings.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage(`Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const entries = data?.leaderboard || [];

  const filteredEntries = entries
    .filter((e) => {
      const matchesSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.provider.toLowerCase().includes(search.toLowerCase()) ||
        e.modelId.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const multiplier = sortAsc ? 1 : -1;
      if (sortField === 'elo') return (a.elo - b.elo) * multiplier;
      if (sortField === 'winRate') return (a.winRate - b.winRate) * multiplier;
      if (sortField === 'votes') return (a.votes - b.votes) * multiplier;
      return 0;
    });

  const topModel = entries.length > 0 ? entries[0] : null;
  const totalBattles = data?.totalBattles ?? 0;
  const totalVotesCount = entries.reduce((acc, curr) => acc + (curr.votes || 0), 0) / 2;

  const toggleSort = (field: 'elo' | 'winRate' | 'votes') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-[#1a1a20] via-[#16161a] to-[#121215] border border-[#27272a] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 font-mono">
              Global Evaluation Index
            </span>
          </div>
          <h1 className="font-serif-headline text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Arena X Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Live Elo ratings computed dynamically from blind human preference battles in the Arena.
            Rankings use the standard Bradley-Terry logistic model (K-factor 32) with zero synthetic bias.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStartBattle}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>Join Next Battle</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#222228] hover:bg-[#2a2a32] text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors cursor-pointer"
            title="Refresh ratings from database"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#161619] border border-[#27272a] shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span className="font-medium">Total Battles</span>
            <Swords className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {totalBattles.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Persistent SQLite records</div>
        </div>

        <div className="p-4 rounded-xl bg-[#161619] border border-[#27272a] shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span className="font-medium">Active Free Models</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {entries.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Verified zero-cost tier</div>
        </div>

        <div className="p-4 rounded-xl bg-[#161619] border border-[#27272a] shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span className="font-medium">Top Ranked</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-emerald-300 truncate tracking-tight">
            {topModel ? topModel.name : '—'}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
            {topModel ? `${topModel.elo} Elo • ${topModel.provider}` : '—'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161619] border border-[#27272a] shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
            <span className="font-medium">Storage Engine</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>SQLite WAL</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
              ACID
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">data/arena.sqlite</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#161619] border border-[#27272a]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter models or providers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1e1e24] text-xs text-zinc-200 pl-9 pr-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-emerald-500/50 placeholder:text-zinc-500 transition-colors"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'general', 'coding', 'reasoning'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl bg-[#161619] border border-[#27272a] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#1a1a1f] text-zinc-400 uppercase tracking-wider text-[11px] select-none">
                <th className="py-3 px-4 font-semibold text-center w-16">Rank</th>
                <th className="py-3 px-4 font-semibold">Model</th>
                <th className="py-3 px-4 font-semibold">Provider</th>
                <th
                  onClick={() => toggleSort('elo')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Elo Rating</span>
                    {sortField === 'elo' && (
                      sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('votes')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Battles</span>
                    {sortField === 'votes' && (
                      sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">Record (W-L-T)</th>
                <th
                  onClick={() => toggleSort('winRate')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Win Rate</span>
                    {sortField === 'winRate' && (
                      sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232328]">
              {loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-2">
                      <RotateCcw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="text-xs">Querying persistent model ratings from SQLite...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-500 text-xs">
                    No models found matching your current search query.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((model, idx) => {
                  const rank = idx + 1;
                  const isTopThree = rank <= 3;
                  return (
                    <tr
                      key={model.modelId}
                      className="hover:bg-[#1c1c22] transition-colors group"
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            🥇
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-300/20 text-zinc-300 border border-zinc-400/30">
                            🥈
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40">
                            🥉
                          </span>
                        ) : (
                          <span className="text-zinc-500">{rank}</span>
                        )}
                      </td>

                      {/* Model Name */}
                      <td className="py-3.5 px-4 font-medium text-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[220px] font-semibold group-hover:text-emerald-400 transition-colors">
                            {model.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono capitalize">
                            {model.category}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 truncate max-w-[260px]">
                          {model.modelId}
                        </div>
                      </td>

                      {/* Provider */}
                      <td className="py-3.5 px-4 text-zinc-300 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 font-mono text-[11px]">
                          {model.provider}
                        </span>
                      </td>

                      {/* Elo Rating */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-emerald-400">
                            {model.elo}
                          </span>
                          {isTopThree && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                              Tier 1
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Battles */}
                      <td className="py-3.5 px-4 font-mono text-zinc-300">
                        {model.votes || 0}
                      </td>

                      {/* Record */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                        <span className="text-emerald-400">{model.wins || 0}W</span>
                        <span className="text-zinc-600 mx-1">/</span>
                        <span className="text-red-400">{model.losses || 0}L</span>
                        <span className="text-zinc-600 mx-1">/</span>
                        <span className="text-amber-400">{model.ties || 0}T</span>
                      </td>

                      {/* Win Rate */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, model.winRate || 0))}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-zinc-200">
                            {(model.winRate || 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {onChatWithModel && (
                          <button
                            type="button"
                            onClick={() => onChatWithModel(model.modelId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-300 text-[11px] transition-colors cursor-pointer"
                            title={`Open direct chat with ${model.name}`}
                          >
                            <span>Chat</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bradley-Terry Elo Methodology Explanation Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#161619] border border-[#27272a] space-y-4">
        <div className="flex items-center gap-2.5 text-zinc-200">
          <Info className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-sm sm:text-base text-white">
            Elo Rating Methodology & Bradley-Terry Model
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[#1a1a20] border border-zinc-800/80 space-y-1.5">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              1. Expected Outcome Formula
            </span>
            <p>
              Expected win probability of Model A against Model B is computed via the logistic curve:
            </p>
            <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-emerald-300">
              E_A = 1 / (1 + 10^((R_B - R_A) / 400))
            </div>
            <p className="text-[11px] text-zinc-500">
              A 400-point difference corresponds to a 91% expected probability of winning.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1a1a20] border border-zinc-800/80 space-y-1.5">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              2. K-Factor Update Rule
            </span>
            <p>
              Each battle applies an immediate ACID update with a fixed standard sensitivity factor:
            </p>
            <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-emerald-300">
              R&apos; = R + 32 × (S - E)
            </div>
            <p className="text-[11px] text-zinc-500">
              Win: S=1.0 • Loss: S=0.0 • Tie: S=0.5 • Both Bad: S=0.25 (both penalized).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1a1a20] border border-zinc-800/80 space-y-1.5">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              3. Integrity & Anti-Gaming
            </span>
            <p>
              Every blind session generates a unique cryptographic battle ID locked with a primary key in SQLite.
            </p>
            <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-emerald-300">
              vote_locks (battle_id PRIMARY KEY)
            </div>
            <p className="text-[11px] text-zinc-500">
              Prevents duplicate vote replay attacks and protects genuine evaluation distributions.
            </p>
          </div>
        </div>

        {/* Admin / Utility actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-zinc-800">
          <div className="text-zinc-500 text-[11px]">
            Database file: <span className="font-mono text-zinc-400">/data/arena.sqlite</span> (SQLite 3 WAL)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-mono transition-colors cursor-pointer"
              title="Replay all recorded battles to verify rating calculations"
            >
              {isRecalculating ? 'Replaying...' : 'Replay & Verify Elo'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/40 text-[11px] font-mono transition-colors cursor-pointer"
            >
              Reset to Baseline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
