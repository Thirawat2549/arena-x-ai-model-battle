import React from 'react';
import { Sparkles, Swords, Columns2, MessageSquare, Bot, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { ArenaMode } from '../types';

interface HeroSectionProps {
  onSelectPrompt: (prompt: string) => void;
  onSelectMode: (mode: ArenaMode) => void;
  activeMode: ArenaMode;
  modelsCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSelectPrompt,
  onSelectMode,
  activeMode,
  modelsCount,
}) => {
  const suggestions = [
    {
      title: 'Launch a storefront',
      desc: 'Architecture, tech stack & go-to-market plan for a headless e-commerce store',
      prompt:
        'Outline the technical architecture, recommended open-source stack, and 30-day go-to-market execution plan to launch a headless e-commerce storefront targeting 10,000 daily active shoppers.',
      category: 'Business',
    },
    {
      title: 'Draft smart contracts',
      desc: 'Secure ERC-20 staking vault with reentrancy guards and reward distribution',
      prompt:
        'Write a complete, gas-optimized Solidity smart contract for an ERC-20 staking vault with reentrancy protection, emergency pause functionality, and a time-weighted reward calculation algorithm.',
      category: 'Coding',
    },
    {
      title: 'Explain quantum computing',
      desc: 'Intuitive breakdown of superposition, entanglement & Shor algorithm for a senior developer',
      prompt:
        'Explain quantum computing to a senior software engineer. Clarify qubits, superposition, and entanglement using vector math analogies, and explain why Shor’s algorithm threatens RSA encryption.',
      category: 'Science',
    },
    {
      title: 'Build a business strategy',
      desc: 'Competitive moat, unit economics & pricing tiers for a developer API platform',
      prompt:
        'Develop a comprehensive business strategy for an AI developer platform. Include analysis of defensible moats against hyperscalers, tiered pricing models, and payback period economics.',
      category: 'Strategy',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-8 md:py-12 text-center select-none">
      {/* Top Banner Tag */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-6">
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        <span>Anonymous LLM Benchmark & Free Frontier Arena</span>
      </div>

      {/* Hero Title */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-4">
        <span className="block font-serif-headline font-normal tracking-wide text-zinc-300">
          Arena
        </span>
        <span className="block font-serif-headline text-3xl sm:text-5xl md:text-6xl mt-1">
          Experience the{' '}
          <span className="relative inline-block bg-emerald-600 text-white px-3.5 py-0.5 rounded-xl font-serif-headline italic shadow-lg shadow-emerald-950/50">
            frontier
          </span>
        </span>
      </h1>

      {/* Subtitle */}
      <p className="max-w-2xl text-zinc-400 text-sm sm:text-base leading-relaxed mb-8">
        Pit leading frontier models against each other in real-time blind battles. Vote on
        unbiased outputs, benchmark reasoning quality, and contribute to the community Elo leaderboard.
      </p>

      {/* Feature Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-10 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1e] border border-zinc-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Double-Blind Voting</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1e] border border-zinc-800">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>Concurrent Multi-Stream</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1e] border border-zinc-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-zinc-300">{modelsCount} Verified Free Models</span>
        </div>
      </div>

      {/* Mode Quick Select Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-10 text-left">
        {[
          {
            id: 'battle' as ArenaMode,
            title: 'Battle (Blind)',
            sub: '2 hidden models',
            icon: Swords,
            accent: 'border-emerald-500/40 bg-emerald-950/10',
          },
          {
            id: 'side-by-side' as ArenaMode,
            title: 'Side-by-Side',
            sub: 'Choose 2 fighters',
            icon: Columns2,
            accent: 'border-zinc-800 hover:border-zinc-700',
          },
          {
            id: 'direct' as ArenaMode,
            title: 'Direct Chat',
            sub: 'Single model deep dive',
            icon: MessageSquare,
            accent: 'border-zinc-800 hover:border-zinc-700',
          },
          {
            id: 'agent' as ArenaMode,
            title: 'Agent Mode',
            sub: 'Multi-step planner',
            icon: Bot,
            accent: 'border-zinc-800 hover:border-zinc-700',
          },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = activeMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectMode(item.id)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-[#1e1e24] shadow-md shadow-emerald-950/20'
                  : 'border-zinc-800 bg-[#161619] hover:bg-[#1a1a1e] hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">
                    Active
                  </span>
                )}
              </div>
              <div className="text-xs font-semibold text-zinc-200">{item.title}</div>
              <div className="text-[11px] text-zinc-400 -mt-0.5">{item.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Prompt Suggestions Grid */}
      <div className="w-full text-left">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Suggested Evaluations
          </span>
          <span className="text-[11px] text-zinc-400">Click to load into Arena</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-3.5 rounded-xl bg-[#1a1a1e] border border-zinc-800 hover:border-emerald-500/40 hover:bg-[#202026] text-left transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                    {item.category}
                  </span>
                </div>
                <p className="text-[12px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 group-hover:text-zinc-300">
                <span>Evaluate now</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:text-emerald-400 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
