import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Swords,
  ThumbsUp,
  Scale,
  ThumbsDown,
  Sparkles,
  Trophy,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Flame,
} from 'lucide-react';
import { BattleSession } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface BattleViewProps {
  session: BattleSession;
  onVote: (winner: 'modelA' | 'modelB' | 'tie' | 'both_bad') => void;
  onNextBattle: () => void;
  onRetryPrompt: (prompt: string) => void;
  onRetrySlot?: (slot: 'A' | 'B') => void;
  onOpenLeaderboard?: () => void;
  isStreaming: boolean;
}

export const BattleView: React.FC<BattleViewProps> = ({
  session,
  onVote,
  onNextBattle,
  onRetryPrompt,
  onRetrySlot,
  onOpenLeaderboard,
  isStreaming,
}) => {
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check completion states
  const hasBothResponses =
    Boolean(session.responseA && session.responseA.trim().length > 0) &&
    Boolean(session.responseB && session.responseB.trim().length > 0);
  const hasErrors = Boolean(session.errorA) || Boolean(session.errorB);
  const canVote =
    !session.voted &&
    !isStreaming &&
    !isSubmitting &&
    hasBothResponses &&
    !hasErrors;

  // Single-submission vote handler
  const handleVote = (winner: 'modelA' | 'modelB' | 'tie' | 'both_bad') => {
    if (session.voted || isStreaming || isSubmitting || !canVote) return;

    setIsSubmitting(true);

    // Trigger celebratory confetti burst
    try {
      confetti({
        particleCount: 110,
        spread: 90,
        origin: { y: 0.65 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#38bdf8', '#fbbf24'],
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }

    onVote(winner);
  };

  // Keyboard shortcut listener for voting & match progression
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (canVote && !session.voted && !isSubmitting) {
        if (e.key === '1') {
          e.preventDefault();
          handleVote('modelA');
        } else if (e.key === '2') {
          e.preventDefault();
          handleVote('modelB');
        } else if (e.key === '3') {
          e.preventDefault();
          handleVote('tie');
        } else if (e.key === '4') {
          e.preventDefault();
          handleVote('both_bad');
        }
      } else if (session.voted) {
        if (e.key === 'Enter' || e.key.toLowerCase() === 'n') {
          e.preventDefault();
          onNextBattle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canVote, session.voted, isSubmitting, onNextBattle]);

  const copyResponse = (text: string, which: 'A' | 'B') => {
    navigator.clipboard.writeText(text);
    if (which === 'A') {
      setCopiedA(true);
      setTimeout(() => setCopiedA(false), 2000);
    } else {
      setCopiedB(true);
      setTimeout(() => setCopiedB(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-3 flex flex-col gap-5">
      {/* Session Prompt Banner */}
      <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-zinc-800 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Swords className="w-4 h-4" />
            <span>Blind Arena Battle</span>
            {!session.revealed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Identities Concealed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRetryPrompt(session.prompt)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
              title="Resend this prompt to new models"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={onNextBattle}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Next Match</span>
            </button>
          </div>
        </div>
        <p className="text-sm font-medium text-zinc-100 leading-relaxed font-sans">
          {session.prompt}
        </p>
      </div>

      {/* Dual Arena Response Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model A Card */}
        <div
          className={`flex flex-col rounded-2xl transition-all duration-300 shadow-lg overflow-hidden ${
            session.revealed && session.winner === 'modelA'
              ? 'bg-[#171c19] border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.18)]'
              : session.revealed && session.winner === 'tie'
              ? 'bg-[#1a1916] border-amber-500/50 ring-1 ring-amber-500/30'
              : session.revealed && session.winner === 'both_bad'
              ? 'bg-[#1a1616] border-red-500/40'
              : session.revealed && session.winner === 'modelB'
              ? 'bg-[#151517] border-zinc-800/80 opacity-90'
              : 'bg-[#161619] border-[#27272a]'
          } border`}
        >
          {/* Card Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b transition-colors ${
              session.revealed && session.winner === 'modelA'
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : 'bg-[#1a1a1e] border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                  session.revealed && session.winner === 'modelA'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                A
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-100">
                    {session.revealed ? session.modelAName : 'Model A (Anonymous)'}
                  </span>
                  {/* Winning / Tie / Outcome Badges */}
                  {session.revealed && session.winner === 'modelA' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold tracking-wide uppercase">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>Winner</span>
                      {session.voteResult?.deltaA !== undefined && (
                        <span className="text-emerald-400 font-mono">
                          (+{session.voteResult.deltaA} Elo)
                        </span>
                      )}
                    </span>
                  )}
                  {session.revealed && session.winner === 'modelB' && (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-mono">
                      Runner-up
                      {session.voteResult?.deltaA !== undefined && (
                        <span> ({session.voteResult.deltaA} Elo)</span>
                      )}
                    </span>
                  )}
                  {session.revealed && session.winner === 'tie' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                      <Scale className="w-2.5 h-2.5 text-amber-400" />
                      <span>Tie (+0.5)</span>
                    </span>
                  )}
                  {session.revealed && session.winner === 'both_bad' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono">
                      <span>Poor</span>
                    </span>
                  )}
                </div>

                {session.revealed ? (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Provider: {session.providerA}
                    {session.voteResult?.eloA && ` • Rating: ${session.voteResult.eloA} Elo`}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-400" /> Identity hidden until vote
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {session.latencyA && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  {(session.latencyA / 1000).toFixed(1)}s
                </span>
              )}

              {session.responseA && (
                <button
                  type="button"
                  onClick={() => copyResponse(session.responseA, 'A')}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  title="Copy response"
                >
                  {copiedA ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 sm:p-5 flex-1 min-h-[260px] flex flex-col justify-between">
            <div>
              {session.streamingA && !session.responseA && !session.errorA && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 py-6 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Model A is generating response...</span>
                </div>
              )}

              {session.errorA && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                    <p className="leading-relaxed">{session.errorA}</p>
                  </div>
                  {onRetrySlot && !session.streamingA && (
                    <button
                      type="button"
                      onClick={() => onRetrySlot('A')}
                      className="self-start px-2.5 py-1 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/40 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Substitute & Retry Model A</span>
                    </button>
                  )}
                </div>
              )}

              {session.responseA && (
                <MarkdownRenderer
                  content={session.responseA}
                  reasoning={session.reasoningA}
                />
              )}
            </div>

            {session.streamingA && (
              <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Streaming tokens...</span>
              </div>
            )}
          </div>
        </div>

        {/* Model B Card */}
        <div
          className={`flex flex-col rounded-2xl transition-all duration-300 shadow-lg overflow-hidden ${
            session.revealed && session.winner === 'modelB'
              ? 'bg-[#171c19] border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.18)]'
              : session.revealed && session.winner === 'tie'
              ? 'bg-[#1a1916] border-amber-500/50 ring-1 ring-amber-500/30'
              : session.revealed && session.winner === 'both_bad'
              ? 'bg-[#1a1616] border-red-500/40'
              : session.revealed && session.winner === 'modelA'
              ? 'bg-[#151517] border-zinc-800/80 opacity-90'
              : 'bg-[#161619] border-[#27272a]'
          } border`}
        >
          {/* Card Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b transition-colors ${
              session.revealed && session.winner === 'modelB'
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : 'bg-[#1a1a1e] border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                  session.revealed && session.winner === 'modelB'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                B
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-100">
                    {session.revealed ? session.modelBName : 'Model B (Anonymous)'}
                  </span>
                  {/* Winning / Tie / Outcome Badges */}
                  {session.revealed && session.winner === 'modelB' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold tracking-wide uppercase">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>Winner</span>
                      {session.voteResult?.deltaB !== undefined && (
                        <span className="text-emerald-400 font-mono">
                          (+{session.voteResult.deltaB} Elo)
                        </span>
                      )}
                    </span>
                  )}
                  {session.revealed && session.winner === 'modelA' && (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-mono">
                      Runner-up
                      {session.voteResult?.deltaB !== undefined && (
                        <span> ({session.voteResult.deltaB} Elo)</span>
                      )}
                    </span>
                  )}
                  {session.revealed && session.winner === 'tie' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                      <Scale className="w-2.5 h-2.5 text-amber-400" />
                      <span>Tie (+0.5)</span>
                    </span>
                  )}
                  {session.revealed && session.winner === 'both_bad' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono">
                      <span>Poor</span>
                    </span>
                  )}
                </div>

                {session.revealed ? (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Provider: {session.providerB}
                    {session.voteResult?.eloB && ` • Rating: ${session.voteResult.eloB} Elo`}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-400" /> Identity hidden until vote
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {session.latencyB && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  {(session.latencyB / 1000).toFixed(1)}s
                </span>
              )}

              {session.responseB && (
                <button
                  type="button"
                  onClick={() => copyResponse(session.responseB, 'B')}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  title="Copy response"
                >
                  {copiedB ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 sm:p-5 flex-1 min-h-[260px] flex flex-col justify-between">
            <div>
              {session.streamingB && !session.responseB && !session.errorB && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 py-6 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Model B is generating response...</span>
                </div>
              )}

              {session.errorB && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                    <p className="leading-relaxed">{session.errorB}</p>
                  </div>
                  {onRetrySlot && !session.streamingB && (
                    <button
                      type="button"
                      onClick={() => onRetrySlot('B')}
                      className="self-start px-2.5 py-1 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/40 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Substitute & Retry Model B</span>
                    </button>
                  )}
                </div>
              )}

              {session.responseB && (
                <MarkdownRenderer
                  content={session.responseB}
                  reasoning={session.reasoningB}
                />
              )}
            </div>

            {session.streamingB && (
              <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Streaming tokens...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROMINENT VOTING SECTION DIRECTLY BELOW BOTH RESPONSE CARDS */}
      <section
        id="arena-voting-section"
        className={`rounded-2xl transition-all duration-300 shadow-xl overflow-hidden border ${
          session.voted
            ? 'bg-[#161619] border-emerald-500/40 shadow-emerald-950/20'
            : canVote
            ? 'bg-gradient-to-b from-[#1c1c24] to-[#161619] border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-[0_4px_30px_rgba(16,185,129,0.15)]'
            : 'bg-[#161619] border-[#27272a]'
        }`}
      >
        {/* Voting Header Bar */}
        {session.voted ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-emerald-950/40 via-[#181d1a] to-[#161619] border-b border-emerald-500/30 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Vote Confirmed & Elo Rankings Updated!
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-medium">
                    1 Vote Logged
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Verdict:{' '}
                  <span className="font-semibold text-emerald-400">
                    {session.winner === 'modelA'
                      ? `Model A (${session.modelAName}) won this battle`
                      : session.winner === 'modelB'
                      ? `Model B (${session.modelBName}) won this battle`
                      : session.winner === 'tie'
                      ? `Tie between ${session.modelAName} and ${session.modelBName}`
                      : 'Both models judged poor'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {onOpenLeaderboard && (
                <button
                  type="button"
                  onClick={onOpenLeaderboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                  title="View live Arena Elo leaderboard"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Leaderboard</span>
                </button>
              )}
              <button
                type="button"
                onClick={onNextBattle}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Battle</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 bg-emerald-700/60 rounded text-[9px] font-mono">
                  ↵
                </kbd>
              </button>
            </div>
          </div>
        ) : canVote ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-950/30 via-[#1a1a20] to-[#161619] border-b border-emerald-500/30 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Cast Your Anonymous Vote
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-medium">
                    Unlocked
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Select which model produced the superior response. Your decision directly updates official Elo ratings.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">1</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">2</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">3</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">4</span>
              <span className="text-zinc-500 ml-1">shortcuts</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#1a1a1e] border-b border-[#27272a]">
            <div className="flex items-center gap-2.5 text-xs text-zinc-400">
              <Clock className="w-4 h-4 text-zinc-400 animate-spin" />
              <span className="font-medium text-zinc-300">
                {isStreaming
                  ? 'Both models are streaming concurrently... Voting will unlock once both finish.'
                  : hasErrors
                  ? 'One or both models encountered an error. Substitute the failed model to unlock voting.'
                  : 'Waiting for both models to produce complete responses before voting unlocks...'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 px-2.5 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/60">
              Locked
            </span>
          </div>
        )}

        {/* 4 Functional Voting Buttons */}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
            {/* 1. Model A is better */}
            <button
              type="button"
              onClick={() => handleVote('modelA')}
              disabled={!canVote || isSubmitting}
              className={`group relative flex flex-col items-center justify-center gap-1.5 p-3.5 sm:p-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                session.voted && session.winner === 'modelA'
                  ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400/50 scale-[1.02]'
                  : session.voted
                  ? 'bg-zinc-900/60 text-zinc-500 border border-zinc-800/80 cursor-default opacity-60'
                  : canVote
                  ? 'bg-[#1e1e24] hover:bg-[#25252e] text-zinc-100 border border-zinc-700 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-950/30 active:scale-98'
                  : 'bg-zinc-900/40 text-zinc-500 border border-zinc-800/50 cursor-not-allowed opacity-40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ThumbsUp
                  className={`w-4 h-4 ${
                    session.voted && session.winner === 'modelA'
                      ? 'text-white'
                      : canVote
                      ? 'text-emerald-400 group-hover:scale-110 transition-transform'
                      : 'text-zinc-600'
                  }`}
                />
                <span className="text-xs sm:text-sm font-semibold tracking-tight">
                  Model A is better
                </span>
              </div>
              <span
                className={`text-[10px] font-mono ${
                  session.voted && session.winner === 'modelA'
                    ? 'text-emerald-100'
                    : 'text-zinc-400'
                }`}
              >
                {session.revealed ? session.modelAName : 'Key [1]'}
              </span>
              {session.voted && session.winner === 'modelA' && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              )}
            </button>

            {/* 2. Model B is better */}
            <button
              type="button"
              onClick={() => handleVote('modelB')}
              disabled={!canVote || isSubmitting}
              className={`group relative flex flex-col items-center justify-center gap-1.5 p-3.5 sm:p-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                session.voted && session.winner === 'modelB'
                  ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400/50 scale-[1.02]'
                  : session.voted
                  ? 'bg-zinc-900/60 text-zinc-500 border border-zinc-800/80 cursor-default opacity-60'
                  : canVote
                  ? 'bg-[#1e1e24] hover:bg-[#25252e] text-zinc-100 border border-zinc-700 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-950/30 active:scale-98'
                  : 'bg-zinc-900/40 text-zinc-500 border border-zinc-800/50 cursor-not-allowed opacity-40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ThumbsUp
                  className={`w-4 h-4 ${
                    session.voted && session.winner === 'modelB'
                      ? 'text-white'
                      : canVote
                      ? 'text-emerald-400 group-hover:scale-110 transition-transform'
                      : 'text-zinc-600'
                  }`}
                />
                <span className="text-xs sm:text-sm font-semibold tracking-tight">
                  Model B is better
                </span>
              </div>
              <span
                className={`text-[10px] font-mono ${
                  session.voted && session.winner === 'modelB'
                    ? 'text-emerald-100'
                    : 'text-zinc-400'
                }`}
              >
                {session.revealed ? session.modelBName : 'Key [2]'}
              </span>
              {session.voted && session.winner === 'modelB' && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              )}
            </button>

            {/* 3. Tie */}
            <button
              type="button"
              onClick={() => handleVote('tie')}
              disabled={!canVote || isSubmitting}
              className={`group relative flex flex-col items-center justify-center gap-1.5 p-3.5 sm:p-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                session.voted && session.winner === 'tie'
                  ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-400/50 scale-[1.02]'
                  : session.voted
                  ? 'bg-zinc-900/60 text-zinc-500 border border-zinc-800/80 cursor-default opacity-60'
                  : canVote
                  ? 'bg-[#1e1e24] hover:bg-[#25252e] text-zinc-100 border border-zinc-700 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-950/30 active:scale-98'
                  : 'bg-zinc-900/40 text-zinc-500 border border-zinc-800/50 cursor-not-allowed opacity-40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Scale
                  className={`w-4 h-4 ${
                    session.voted && session.winner === 'tie'
                      ? 'text-white'
                      : canVote
                      ? 'text-amber-400 group-hover:scale-110 transition-transform'
                      : 'text-zinc-600'
                  }`}
                />
                <span className="text-xs sm:text-sm font-semibold tracking-tight">Tie</span>
              </div>
              <span
                className={`text-[10px] font-mono ${
                  session.voted && session.winner === 'tie'
                    ? 'text-amber-100'
                    : 'text-zinc-400'
                }`}
              >
                Key [3]
              </span>
            </button>

            {/* 4. Both are bad */}
            <button
              type="button"
              onClick={() => handleVote('both_bad')}
              disabled={!canVote || isSubmitting}
              className={`group relative flex flex-col items-center justify-center gap-1.5 p-3.5 sm:p-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                session.voted && session.winner === 'both_bad'
                  ? 'bg-red-800 text-white shadow-lg ring-2 ring-red-400/50 scale-[1.02]'
                  : session.voted
                  ? 'bg-zinc-900/60 text-zinc-500 border border-zinc-800/80 cursor-default opacity-60'
                  : canVote
                  ? 'bg-[#1e1e24] hover:bg-[#25252e] text-zinc-100 border border-zinc-700 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-950/30 active:scale-98'
                  : 'bg-zinc-900/40 text-zinc-500 border border-zinc-800/50 cursor-not-allowed opacity-40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ThumbsDown
                  className={`w-4 h-4 ${
                    session.voted && session.winner === 'both_bad'
                      ? 'text-white'
                      : canVote
                      ? 'text-red-400 group-hover:scale-110 transition-transform'
                      : 'text-zinc-600'
                  }`}
                />
                <span className="text-xs sm:text-sm font-semibold tracking-tight">
                  Both are bad
                </span>
              </div>
              <span
                className={`text-[10px] font-mono ${
                  session.voted && session.winner === 'both_bad'
                    ? 'text-red-100'
                    : 'text-zinc-400'
                }`}
              >
                Key [4]
              </span>
            </button>
          </div>

          {/* Detailed Post-Vote Model Breakdown Box */}
          {session.revealed && (
            <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-300">
              {/* Model A Summary Box */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                  session.winner === 'modelA'
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-inner'
                    : 'bg-zinc-900/50 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded font-mono text-[10px] flex items-center justify-center font-bold ${
                        session.winner === 'modelA'
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      A
                    </span>
                    <span className="font-semibold text-white font-mono text-[13px]">
                      {session.modelAName}
                    </span>
                  </div>
                  {session.winner === 'modelA' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                      <Trophy className="w-3 h-3 text-amber-400" /> WINNER
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {session.winner === 'tie' ? 'Tie (+0.5)' : 'Runner-up'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono border-t border-zinc-800/60 pt-2">
                  <span>
                    Provider: <strong className="text-zinc-200">{session.providerA}</strong>
                  </span>
                  {session.voteResult?.eloA !== undefined && (
                    <span>
                      Elo: <strong className="text-zinc-200">{session.voteResult.eloA}</strong>{' '}
                      <span
                        className={
                          session.voteResult.deltaA && session.voteResult.deltaA > 0
                            ? 'text-emerald-400 font-bold'
                            : 'text-zinc-400'
                        }
                      >
                        (
                        {session.voteResult.deltaA && session.voteResult.deltaA > 0
                          ? `+${session.voteResult.deltaA}`
                          : session.voteResult.deltaA}
                        )
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Model B Summary Box */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                  session.winner === 'modelB'
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-inner'
                    : 'bg-zinc-900/50 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded font-mono text-[10px] flex items-center justify-center font-bold ${
                        session.winner === 'modelB'
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      B
                    </span>
                    <span className="font-semibold text-white font-mono text-[13px]">
                      {session.modelBName}
                    </span>
                  </div>
                  {session.winner === 'modelB' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                      <Trophy className="w-3 h-3 text-amber-400" /> WINNER
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {session.winner === 'tie' ? 'Tie (+0.5)' : 'Runner-up'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono border-t border-zinc-800/60 pt-2">
                  <span>
                    Provider: <strong className="text-zinc-200">{session.providerB}</strong>
                  </span>
                  {session.voteResult?.eloB !== undefined && (
                    <span>
                      Elo: <strong className="text-zinc-200">{session.voteResult.eloB}</strong>{' '}
                      <span
                        className={
                          session.voteResult.deltaB && session.voteResult.deltaB > 0
                            ? 'text-emerald-400 font-bold'
                            : 'text-zinc-400'
                        }
                      >
                        (
                        {session.voteResult.deltaB && session.voteResult.deltaB > 0
                          ? `+${session.voteResult.deltaB}`
                          : session.voteResult.deltaB}
                        )
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
