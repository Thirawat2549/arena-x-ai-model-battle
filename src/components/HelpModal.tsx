import React from 'react';
import {
  HelpCircle,
  X,
  Swords,
  Trophy,
  ShieldCheck,
  Zap,
  Command,
  Code,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#161619] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#27272a] bg-[#1a1a1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-headline text-2xl font-bold text-white">
                Arena X Documentation & Help
              </h2>
              <p className="text-xs text-zinc-400">
                Evaluation methodology and interaction guidelines
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

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto text-xs text-zinc-300 leading-relaxed">
          {/* Methodology */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Swords className="w-4 h-4 text-emerald-400" />
              <span>How Blind Battles Work</span>
            </div>
            <p className="text-zinc-400">
              In Battle Mode, two anonymous LLMs are randomly paired from our verified catalog. Both
              receive your identical prompt simultaneously. Identities remain strictly concealed
              until you cast a preference vote:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <li className="p-2 rounded-lg bg-[#1a1a1e] border border-zinc-800">
                👍 <strong className="text-emerald-400">Model A is better</strong> — 1 win to A
              </li>
              <li className="p-2 rounded-lg bg-[#1a1a1e] border border-zinc-800">
                👍 <strong className="text-emerald-400">Model B is better</strong> — 1 win to B
              </li>
              <li className="p-2 rounded-lg bg-[#1a1a1e] border border-zinc-800">
                🤝 <strong className="text-amber-400">Tie</strong> — Half-win to both
              </li>
              <li className="p-2 rounded-lg bg-[#1a1a1e] border border-zinc-800">
                👎 <strong className="text-red-400">Both are bad</strong> — Small penalty to both
              </li>
            </ul>
          </div>

          {/* Elo Formula */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Bradley-Terry Elo Rating</span>
            </div>
            <p className="text-zinc-400">
              Each vote dynamically adjusts the models’ Elo scores using the Bradley-Terry algorithm
              (K-factor = 32). Beating a higher-ranked model awards significantly more Elo points,
              reflecting true empirical performance rather than synthetic benchmarks.
            </p>
          </div>

          {/* Free Tier */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Free Tier Models</span>
            </div>
            <p className="text-zinc-400">
              Arena X queries OpenRouter’s dynamic catalog for models with verified zero input and output
              pricing or explicit <code className="bg-zinc-800 text-emerald-400 px-1 py-0.5 rounded font-mono">:free</code> variants,
              including Llama 3.3 70B, DeepSeek R1, Gemini 2.0 Flash, and Qwen 2.5 Coder.
            </p>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Command className="w-4 h-4 text-zinc-400" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1e] border border-zinc-800">
                <span className="text-zinc-400">Send prompt</span>
                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">Enter</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1e] border border-zinc-800">
                <span className="text-zinc-400">New line</span>
                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">Shift+Enter</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1e] border border-zinc-800">
                <span className="text-zinc-400">New Battle</span>
                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">Ctrl+K / ⌘K</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1e] border border-zinc-800">
                <span className="text-zinc-400">Close modal</span>
                <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">Esc</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#1a1a1e] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
