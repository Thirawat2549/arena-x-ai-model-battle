import React, { useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  ListTodo,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AgentViewProps {
  goal: string;
  response: string;
  reasoning?: string;
  isStreaming: boolean;
  onRetry: () => void;
  onSelectPrompt: (p: string) => void;
}

export const AgentView: React.FC<AgentViewProps> = ({
  goal,
  response,
  reasoning,
  isStreaming,
  onRetry,
  onSelectPrompt,
}) => {
  const [copied, setCopied] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (stepIdx: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepIdx]: !prev[stepIdx],
    }));
  };

  const copyPlan = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const suggestedGoals = [
    'Migrate a legacy PostgreSQL database to a distributed serverless cluster with zero downtime',
    'Audit a smart contract repository for reentrancy vulnerabilities and front-running risks',
    'Design a scalable multi-agent microservice architecture on Kubernetes with Kafka event streaming',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 flex flex-col gap-6">
      {/* Explicit Agent Prototype Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3">
        <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-purple-200">
          <span className="font-semibold text-purple-300">
            Agent Workflow & Task Decomposition (Preview Prototype):{' '}
          </span>
          This mode structures prompts into goal analysis, step-by-step execution plans, and
          verification criteria. Autonomous tool execution and sandbox actions are currently in
          preview.
        </div>
      </div>

      {goal ? (
        <div className="flex flex-col gap-4">
          {/* Active Goal Header */}
          <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ListTodo className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-purple-400 font-mono font-semibold uppercase">
                  Target Objective
                </span>
                <p className="text-sm font-semibold text-zinc-100">{goal}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyPlan}
                disabled={!response}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Plan</span>
              </button>
              <button
                type="button"
                onClick={onRetry}
                disabled={isStreaming}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                title="Regenerate plan"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Decomposed Plan Output */}
          <div className="p-5 rounded-2xl bg-[#161619] border border-[#27272a] shadow-xl">
            {isStreaming && !response && (
              <div className="flex items-center gap-2 text-xs text-purple-400 py-6 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span>Decomposing objective into tactical execution phases...</span>
              </div>
            )}

            {response && (
              <MarkdownRenderer content={response} reasoning={reasoning} />
            )}

            {isStreaming && (
              <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-purple-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span>Formulating verification checklist...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State Suggestions */
        <div className="p-6 rounded-2xl bg-[#1a1a1e] border border-zinc-800 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">
            Task Decomposition & Execution Planning
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
            Specify any high-level engineering or strategic project. The planner will structure it
            into prerequisites, phased implementation tasks, edge cases, and test benchmarks.
          </p>

          <div className="w-full text-left space-y-2">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Example Objectives:
            </span>
            {suggestedGoals.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectPrompt(g)}
                className="w-full p-3 rounded-xl bg-[#222228] hover:bg-[#282830] border border-zinc-700/60 text-xs text-zinc-200 flex items-center justify-between group transition-colors"
              >
                <span className="truncate mr-2">{g}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
