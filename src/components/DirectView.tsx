import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Sparkles,
  AlertCircle,
  User,
  Bot,
  Clock,
} from 'lucide-react';
import { ChatMessage, ModelInfo } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface DirectViewProps {
  messages: ChatMessage[];
  models: ModelInfo[];
  selectedModelId: string;
  onRetry: (index: number) => void;
  onClear: () => void;
  isStreaming: boolean;
}

export const DirectView: React.FC<DirectViewProps> = ({
  messages,
  models,
  selectedModelId,
  onRetry,
  onClear,
  isStreaming,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeModel = models.find((m) => m.id === selectedModelId);

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 flex flex-col gap-6">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#1a1a1e] border border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                {activeModel?.name || selectedModelId}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                {activeModel?.provider || 'Provider'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Direct conversation • {(Number(activeModel?.context_length || 32768) / 1024).toFixed(0)}k context
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            disabled={isStreaming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        )}
      </div>

      {/* Messages List */}
      <div className="flex flex-col gap-5">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id || index}
              className={`flex flex-col rounded-2xl p-4 sm:p-5 transition-all ${
                isUser
                  ? 'bg-[#1e1e24] border border-zinc-700/80 ml-auto max-w-2xl'
                  : 'bg-[#161619] border border-[#27272a] shadow-lg w-full'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                      isUser
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <span className="font-semibold text-zinc-300">
                    {isUser ? 'You' : msg.modelName || activeModel?.name || 'Assistant'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {msg.latencyMs && (
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {(msg.latencyMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => copyMessage(msg.content, msg.id)}
                    className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {!isUser && !isStreaming && index === messages.length - 1 && (
                    <button
                      type="button"
                      onClick={() => onRetry(index)}
                      className="p-1 rounded text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Retry generation"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div>
                {msg.error ? (
                  <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                    <p>{msg.error}</p>
                  </div>
                ) : isUser ? (
                  <p className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                ) : (
                  <MarkdownRenderer content={msg.content} reasoning={msg.reasoning} />
                )}
              </div>

              {/* Streaming pulse */}
              {msg.isStreaming && (
                <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-emerald-400 font-mono animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Generating response...</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
