import React, { useState } from 'react';
import {
  Trophy,
  Search,
  RotateCcw,
  X,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Award,
  Zap,
} from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  totalVotes: number;
  onReset: () => void;
  isLoading?: boolean;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  totalVotes,
  onReset,
  isLoading = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'coding' | 'reasoning'>('all');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const filteredEntries = entries
    .filter((entry) => {
      const matchesSearch =
        entry.name.toLowerCase().includes(search.toLowerCase()) ||
        entry.provider.toLowerCase().includes(search.toLowerCase()) ||
        entry.modelId.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || entry.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => b.elo - a.elo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#161619] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#27272a] bg-[#1a1a1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-headline text-2xl font-bold text-white">
                  Model Arena Leaderboard
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  Bradley-Terry Elo
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Evaluator preferences & head-to-head win-rates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Local Disclaimer Tag */}
        <div className="px-6 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Local Arena Statistics:</strong> Rankings are calculated from evaluations in
              this deployment. (Baseline community seed data provided).
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-zinc-400 font-mono">
            <span>Total Battles:</span>
            <span className="text-emerald-400 font-bold">{totalVotes || entries.reduce((acc, e) => acc + e.votes, 0)}</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-[#27272a] bg-[#141416] flex flex-wrap items-center justify-between gap-3">
          {/* Category tabs */}
          <div className="flex items-center gap-1 bg-[#1e1e24] p-1 rounded-xl border border-zinc-800 text-xs">
            {(['all', 'general', 'coding', 'reasoning'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search model or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1e1e24] text-xs text-zinc-200 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {/* Reset button */}
          {showResetConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Reset stats?</span>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setShowResetConfirm(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
              title="Reset to default seed rankings"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Standings</span>
            </button>
          )}
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#1a1a1e] sticky top-0 z-10 border-b border-[#27272a] text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Model & Provider</th>
                <th className="py-3 px-4 text-center">Arena Elo</th>
                <th className="py-3 px-4">Win Rate</th>
                <th className="py-3 px-4 text-right">W / L / T</th>
                <th className="py-3 px-4 text-right">Total Battles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredEntries.map((entry, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                return (
                  <tr
                    key={entry.modelId}
                    className="hover:bg-[#1a1a1e]/60 transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      {rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          1
                        </span>
                      ) : rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-400/20 text-zinc-200 border border-zinc-400/40">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40">
                          3
                        </span>
                      ) : (
                        <span className="text-zinc-500">{rank}</span>
                      )}
                    </td>

                    {/* Model */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                              {entry.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                              {entry.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {entry.provider} • {entry.modelId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Elo */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-sm text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {entry.elo}
                      </span>
                    </td>

                    {/* Win Rate */}
                    <td className="py-3.5 px-4">
                      <div className="w-36">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                          <span className="text-zinc-300 font-semibold">{entry.winRate}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                            style={{ width: `${Math.min(entry.winRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* W / L / T */}
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-400 text-xs">
                      <span className="text-emerald-400 font-medium">{entry.wins}</span> /{' '}
                      <span className="text-red-400 font-medium">{entry.losses}</span> /{' '}
                      <span className="text-zinc-400">{entry.ties}</span>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-200">
                      {entry.votes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
