import React, { useState } from 'react';
import {
  Columns2,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { SideBySideSession, ModelInfo } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface SideBySideViewProps {
  session: SideBySideSession;
  models: ModelInfo[];
  onRetryPrompt: (prompt: string) => void;
  isStreaming: boolean;
}

export const SideBySideView: React.FC<SideBySideViewProps> = ({
  session,
  models,
  onRetryPrompt,
  isStreaming,
}) => {
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

  const getModel = (id: string) => models.find((m) => m.id === id);

  const modelA = getModel(session.modelAId);
  const modelB = getModel(session.modelBId);

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
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 flex flex-col gap-6">
      {/* Prompt Card */}
      <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-zinc-800 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Columns2 className="w-4 h-4" />
            <span>Side-by-Side Model Benchmark</span>
          </div>
          <button
            type="button"
            onClick={() => onRetryPrompt(session.prompt)}
            disabled={isStreaming}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Resend this benchmark"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Rerun Evaluation</span>
          </button>
        </div>
        <p className="text-sm font-medium text-zinc-100 leading-relaxed font-sans">
          {session.prompt}
        </p>
      </div>

      {/* Side-by-Side Response Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model A Card */}
        <div className="flex flex-col rounded-2xl bg-[#161619] border border-[#27272a] shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1e] border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  {modelA?.name || session.modelAId}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {modelA?.provider || 'Provider'} • {(Number(modelA?.context_length || 32768) / 1024).toFixed(0)}k ctx
                </span>
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
                  title="Copy output"
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

          <div className="p-4 sm:p-5 flex-1 min-h-[300px] flex flex-col justify-between">
            <div>
              {session.streamingA && !session.responseA && !session.errorA && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 py-6 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Connecting and streaming from {modelA?.name || 'Model A'}...</span>
                </div>
              )}

              {session.errorA && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  <p>{session.errorA}</p>
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
                <span>Generating live response...</span>
              </div>
            )}
          </div>
        </div>

        {/* Model B Card */}
        <div className="flex flex-col rounded-2xl bg-[#161619] border border-[#27272a] shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1e] border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  {modelB?.name || session.modelBId}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {modelB?.provider || 'Provider'} • {(Number(modelB?.context_length || 32768) / 1024).toFixed(0)}k ctx
                </span>
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
                  title="Copy output"
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

          <div className="p-4 sm:p-5 flex-1 min-h-[300px] flex flex-col justify-between">
            <div>
              {session.streamingB && !session.responseB && !session.errorB && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 py-6 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Connecting and streaming from {modelB?.name || 'Model B'}...</span>
                </div>
              )}

              {session.errorB && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  <p>{session.errorB}</p>
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
              <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-cyan-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Generating live response...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
