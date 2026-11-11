import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArenaMode,
  ModelInfo,
  ChatMessage,
  BattleSession,
  SideBySideSession,
  LeaderboardEntry,
} from './types';
import {
  fetchModels,
  fetchLeaderboard,
  submitVote,
  resetLeaderboard,
  streamChat,
  testConnection,
  reportFailedModel,
} from './services/api';
import { Sidebar } from './components/Sidebar';
import { HeroSection } from './components/HeroSection';
import { CommandDock } from './components/CommandDock';
import { BattleView } from './components/BattleView';
import { SideBySideView } from './components/SideBySideView';
import { DirectView } from './components/DirectView';
import { AgentView } from './components/AgentView';
import { LeaderboardView } from './components/LeaderboardView';
import { HistoryView } from './components/HistoryView';
import { LeaderboardModal } from './components/LeaderboardModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { Menu, Zap } from 'lucide-react';

export default function App() {
  // Navigation & UI State
  const [currentMode, setCurrentMode] = useState<ArenaMode>('battle');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Settings & Keys
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('arena_custom_key') || '';
  });

  // Models & Leaderboard Data
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [failedModelIds, setFailedModelIds] = useState<Set<string>>(new Set());
  const [battleError, setBattleError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [modelsLoading, setModelsLoading] = useState(true);

  // Model Selection
  const [selectedModelDirect, setSelectedModelDirect] = useState<string>(
    'nvidia/nemotron-3.5-lightning:free'
  );
  const [selectedModelA, setSelectedModelA] = useState<string>(
    'nvidia/nemotron-3.5-lightning:free'
  );
  const [selectedModelB, setSelectedModelB] = useState<string>('google/gemma-4-31b-it:free');

  // Input & Streaming State
  const [prompt, setPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sessions by Mode
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [sideBySideSession, setSideBySideSession] = useState<SideBySideSession | null>(null);
  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([]);
  const [agentGoal, setAgentGoal] = useState<string>('');
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [agentReasoning, setAgentReasoning] = useState<string>('');

  // Load models & leaderboard on mount
  useEffect(() => {
    async function init() {
      try {
        setModelsLoading(true);
        const [modelsList, lbData] = await Promise.all([
          fetchModels(customApiKey),
          fetchLeaderboard(),
        ]);

        if (modelsList && modelsList.length > 0) {
          setModels(modelsList);
          // Set initial defaults if present
          setSelectedModelDirect(modelsList[0].id);
          setSelectedModelA(modelsList[0].id);
          setSelectedModelB(modelsList[1]?.id || modelsList[0].id);
        }

        if (lbData?.leaderboard) {
          setLeaderboard(lbData.leaderboard);
          setTotalVotes(lbData.totalVotes || 0);
        }
      } catch (err) {
        console.error('Initialization failed:', err);
      } finally {
        setModelsLoading(false);
      }
    }
    init();
  }, [customApiKey]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: New Chat/Battle
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
      // Escape: Close all modals
      if (e.key === 'Escape') {
        setIsLeaderboardOpen(false);
        setIsSettingsOpen(false);
        setIsHelpOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save custom key
  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    if (key) {
      localStorage.setItem('arena_custom_key', key);
    } else {
      localStorage.removeItem('arena_custom_key');
    }
  };

  // Pick 2 random distinct free models for Battle
  const pickRandomBattlePair = useCallback((): { modelA: ModelInfo; modelB: ModelInfo } | null => {
    const eligible = models.filter(
      (m) => !failedModelIds.has(m.id) && m.is_free && m.status === 'active'
    );
    if (eligible.length < 2) {
      return null;
    }

    const idxA = Math.floor(Math.random() * eligible.length);
    let idxB = Math.floor(Math.random() * eligible.length);
    while (idxB === idxA && eligible.length > 1) {
      idxB = Math.floor(Math.random() * eligible.length);
    }
    return { modelA: eligible[idxA], modelB: eligible[idxB] };
  }, [models, failedModelIds]);

  // Stop active generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

    if (battleSession) {
      setBattleSession((prev) =>
        prev ? { ...prev, streamingA: false, streamingB: false } : null
      );
    }
    if (sideBySideSession) {
      setSideBySideSession((prev) =>
        prev ? { ...prev, streamingA: false, streamingB: false } : null
      );
    }
    setDirectMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  // New Chat action
  const handleNewChat = () => {
    handleStop();
    setPrompt('');
    setBattleError(null);
    setBattleSession(null);
    setSideBySideSession(null);
    setDirectMessages([]);
    setAgentGoal('');
    setAgentResponse('');
    setAgentReasoning('');
  };

  // Substitute & retry a single battle slot
  const handleRetryBattleSlot = (slot: 'A' | 'B') => {
    if (!battleSession || isStreaming) return;
    const textPrompt = battleSession.prompt;
    const currentModelId = slot === 'A' ? battleSession.modelAId : battleSession.modelBId;
    const otherModelId = slot === 'A' ? battleSession.modelBId : battleSession.modelAId;

    // Mark current as failed if user requested substitution
    setFailedModelIds((prev) => new Set([...prev, currentModelId]));
    reportFailedModel(currentModelId, 'User requested substitution');

    const available = models.filter(
      (m) =>
        m.id !== currentModelId &&
        m.id !== otherModelId &&
        !failedModelIds.has(m.id) &&
        m.is_free &&
        m.status === 'active'
    );

    if (available.length === 0) {
      setBattleSession((prev) =>
        prev
          ? slot === 'A'
            ? { ...prev, errorA: 'No other verified free models are currently available to substitute.' }
            : { ...prev, errorB: 'No other verified free models are currently available to substitute.' }
          : null
      );
      return;
    }

    const replacement = available[Math.floor(Math.random() * available.length)];
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    const slotStartTime = Date.now();

    setBattleSession((prev) => {
      if (!prev) return null;
      return slot === 'A'
        ? {
            ...prev,
            modelAId: replacement.id,
            modelAName: replacement.name,
            providerA: replacement.provider,
            responseA: '',
            errorA: undefined,
            streamingA: true,
            retriedA: true,
          }
        : {
            ...prev,
            modelBId: replacement.id,
            modelBName: replacement.name,
            providerB: replacement.provider,
            responseB: '',
            errorB: undefined,
            streamingB: true,
            retriedB: true,
          };
    });

    streamChat(
      {
        model: replacement.id,
        messages: [{ role: 'user', content: textPrompt }],
        apiKey: customApiKey,
      },
      {
        onChunk: (chunk) => {
          setBattleSession((prev) => {
            if (!prev) return null;
            return slot === 'A'
              ? { ...prev, responseA: prev.responseA + chunk }
              : { ...prev, responseB: prev.responseB + chunk };
          });
        },
        onError: (err) => {
          setBattleSession((prev) => {
            if (!prev) return null;
            return slot === 'A'
              ? { ...prev, errorA: err, streamingA: false }
              : { ...prev, errorB: err, streamingB: false };
          });
        },
        onDone: () => {
          setBattleSession((prev) => {
            if (!prev) return null;
            return slot === 'A'
              ? { ...prev, streamingA: false, latencyA: Date.now() - slotStartTime }
              : { ...prev, streamingB: false, latencyB: Date.now() - slotStartTime };
          });
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
      },
      controller.signal
    );
  };

  // SUBMIT HANDLER - Dispatches based on currentMode
  const handleSubmit = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt ?? prompt).trim();
    if (!textToSend || isStreaming) return;

    setPrompt('');
    setBattleError(null);
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (currentMode === 'battle') {
      // Check eligible free models before starting battle
      const eligible = models.filter(
        (m) => !failedModelIds.has(m.id) && m.is_free && m.status === 'active'
      );
      if (eligible.length < 2) {
        setBattleError(
          `Unable to start battle: at least 2 verified free models are required, but only ${eligible.length} are currently available. Please click 'Refresh Catalog' or check your OpenRouter connection.`
        );
        setIsStreaming(false);
        abortControllerRef.current = null;
        return;
      }

      const pair = pickRandomBattlePair();
      if (!pair) {
        setBattleError('Could not select two valid verified free models for Battle Mode.');
        setIsStreaming(false);
        abortControllerRef.current = null;
        return;
      }

      const newSession: BattleSession = {
        id: `battle_${Date.now()}`,
        prompt: textToSend,
        modelAId: pair.modelA.id,
        modelBId: pair.modelB.id,
        modelAName: pair.modelA.name,
        modelBName: pair.modelB.name,
        providerA: pair.modelA.provider,
        providerB: pair.modelB.provider,
        responseA: '',
        responseB: '',
        streamingA: true,
        streamingB: true,
        voted: false,
        revealed: false,
        timestamp: Date.now(),
      };
      setBattleSession(newSession);

      let activeStreams = 2;
      const onSlotFinished = () => {
        activeStreams -= 1;
        if (activeStreams <= 0) {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      };

      const runBattleSlot = (
        slot: 'A' | 'B',
        modelToStream: ModelInfo,
        signal: AbortSignal,
        isRetry = false
      ) => {
        const slotStartTime = Date.now();
        streamChat(
          {
            model: modelToStream.id,
            messages: [{ role: 'user', content: textToSend }],
            apiKey: customApiKey,
          },
          {
            onChunk: (chunk) => {
              setBattleSession((prev) => {
                if (!prev) return null;
                return slot === 'A'
                  ? { ...prev, responseA: prev.responseA + chunk }
                  : { ...prev, responseB: prev.responseB + chunk };
              });
            },
            onError: async (err, code, errModelId) => {
              const failedId = errModelId || modelToStream.id;
              const isUnavail =
                code === 'MODEL_UNAVAILABLE' ||
                /404|429|unavailable|not found|rate limit|quota|deprecated/i.test(err);

              if (isUnavail) {
                setFailedModelIds((prev) => new Set([...prev, failedId]));
                reportFailedModel(failedId, err);
                fetchModels(customApiKey, true)
                  .then((fresh) => {
                    if (fresh && fresh.length > 0) setModels(fresh);
                  })
                  .catch(() => {});
              }

              // Automatic single retry with alternative free model if not retried yet
              if (isUnavail && !isRetry) {
                const currentPool = models.filter(
                  (m) =>
                    m.id !== failedId &&
                    !failedModelIds.has(m.id) &&
                    m.is_free &&
                    m.status === 'active'
                );

                setBattleSession((cur) => {
                  if (!cur) return null;
                  const otherSlotId = slot === 'A' ? cur.modelBId : cur.modelAId;
                  const replacements = currentPool.filter((m) => m.id !== otherSlotId);

                  if (replacements.length > 0) {
                    const replacement = replacements[Math.floor(Math.random() * replacements.length)];
                    console.log(`[Auto-Recovery] Model ${slot} (${failedId}) failed. Substituting with ${replacement.id}`);

                    // Stream replacement model for this slot
                    setTimeout(() => {
                      runBattleSlot(slot, replacement, signal, true);
                    }, 100);

                    return slot === 'A'
                      ? {
                          ...cur,
                          modelAId: replacement.id,
                          modelAName: replacement.name,
                          providerA: replacement.provider,
                          responseA: '',
                          errorA: undefined,
                          streamingA: true,
                          retriedA: true,
                          replacedModelA: `${modelToStream.name} (auto-recovered)`,
                        }
                      : {
                          ...cur,
                          modelBId: replacement.id,
                          modelBName: replacement.name,
                          providerB: replacement.provider,
                          responseB: '',
                          errorB: undefined,
                          streamingB: true,
                          retriedB: true,
                          replacedModelB: `${modelToStream.name} (auto-recovered)`,
                        };
                  } else {
                    return slot === 'A'
                      ? {
                          ...cur,
                          errorA: `Model returned: ${err}. No alternative free models available.`,
                          streamingA: false,
                        }
                      : {
                          ...cur,
                          errorB: `Model returned: ${err}. No alternative free models available.`,
                          streamingB: false,
                        };
                  }
                });
                return;
              }

              // Permanent error on this slot
              setBattleSession((prev) => {
                if (!prev) return null;
                return slot === 'A'
                  ? { ...prev, errorA: err, streamingA: false }
                  : { ...prev, errorB: err, streamingB: false };
              });
            },
            onDone: () => {
              setBattleSession((prev) => {
                if (!prev) return null;
                return slot === 'A'
                  ? {
                      ...prev,
                      streamingA: false,
                      latencyA: Date.now() - slotStartTime,
                    }
                  : {
                      ...prev,
                      streamingB: false,
                      latencyB: Date.now() - slotStartTime,
                    };
              });
              onSlotFinished();
            },
          },
          signal
        );
      };

      runBattleSlot('A', pair.modelA, controller.signal, false);
      runBattleSlot('B', pair.modelB, controller.signal, false);
    } else if (currentMode === 'side-by-side') {
      // SIDE-BY-SIDE MODE: Stream Model A & B chosen manually
      const startTime = Date.now();
      const newSession: SideBySideSession = {
        id: `sbs_${Date.now()}`,
        prompt: textToSend,
        modelAId: selectedModelA,
        modelBId: selectedModelB,
        responseA: '',
        responseB: '',
        streamingA: true,
        streamingB: true,
        timestamp: Date.now(),
      };
      setSideBySideSession(newSession);

      let streamCount = 2;
      const checkDone = () => {
        streamCount -= 1;
        if (streamCount <= 0) {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      };

      streamChat(
        {
          model: selectedModelA,
          messages: [{ role: 'user', content: textToSend }],
          apiKey: customApiKey,
        },
        {
          onChunk: (chunk, reasoning) => {
            setSideBySideSession((prev) =>
              prev
                ? {
                    ...prev,
                    responseA: prev.responseA + chunk,
                    reasoningA: reasoning ? (prev.reasoningA || '') + reasoning : prev.reasoningA,
                  }
                : null
            );
          },
          onError: (err) => {
            setSideBySideSession((prev) =>
              prev ? { ...prev, errorA: err, streamingA: false } : null
            );
          },
          onDone: () => {
            setSideBySideSession((prev) =>
              prev ? { ...prev, streamingA: false, latencyA: Date.now() - startTime } : null
            );
            checkDone();
          },
        },
        controller.signal
      );

      streamChat(
        {
          model: selectedModelB,
          messages: [{ role: 'user', content: textToSend }],
          apiKey: customApiKey,
        },
        {
          onChunk: (chunk, reasoning) => {
            setSideBySideSession((prev) =>
              prev
                ? {
                    ...prev,
                    responseB: prev.responseB + chunk,
                    reasoningB: reasoning ? (prev.reasoningB || '') + reasoning : prev.reasoningB,
                  }
                : null
            );
          },
          onError: (err) => {
            setSideBySideSession((prev) =>
              prev ? { ...prev, errorB: err, streamingB: false } : null
            );
          },
          onDone: () => {
            setSideBySideSession((prev) =>
              prev ? { ...prev, streamingB: false, latencyB: Date.now() - startTime } : null
            );
            checkDone();
          },
        },
        controller.signal
      );
    } else if (currentMode === 'direct') {
      // DIRECT CHAT MODE: Multi-turn streaming chat
      const startTime = Date.now();
      const userMsg: ChatMessage = {
        id: `msg_u_${Date.now()}`,
        role: 'user',
        content: textToSend,
        timestamp: Date.now(),
      };
      const assistantMsgId = `msg_a_${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        modelId: selectedModelDirect,
        isStreaming: true,
        timestamp: Date.now(),
      };

      const newHistory = [...directMessages, userMsg];
      setDirectMessages([...newHistory, assistantMsg]);

      const apiMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      streamChat(
        {
          model: selectedModelDirect,
          messages: apiMessages,
          apiKey: customApiKey,
        },
        {
          onChunk: (chunk, reasoning) => {
            setDirectMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: m.content + chunk,
                      reasoning: reasoning ? (m.reasoning || '') + reasoning : m.reasoning,
                    }
                  : m
              )
            );
          },
          onError: (err) => {
            setDirectMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, error: err, isStreaming: false } : m
              )
            );
          },
          onDone: () => {
            setDirectMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, isStreaming: false, latencyMs: Date.now() - startTime }
                  : m
              )
            );
            setIsStreaming(false);
            abortControllerRef.current = null;
          },
        },
        controller.signal
      );
    } else if (currentMode === 'agent') {
      // AGENT MODE: Goal decomposition and task planning
      setAgentGoal(textToSend);
      setAgentResponse('');
      setAgentReasoning('');

      const systemPrompt =
        'You are an expert Autonomous Systems Architect and Task Planner. ' +
        'Structure the provided objective into a rigorous tactical execution plan. ' +
        'Include: 1) Goal Formulation & Core Constraints, 2) Phased Step-by-Step Implementation Roadmap, ' +
        '3) Edge Cases & Failure Mitigation, and 4) Acceptance & Verification Checklist.';

      streamChat(
        {
          model: selectedModelDirect,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: textToSend },
          ],
          apiKey: customApiKey,
        },
        {
          onChunk: (chunk, reasoning) => {
            setAgentResponse((prev) => prev + chunk);
            if (reasoning) {
              setAgentReasoning((prev) => prev + reasoning);
            }
          },
          onError: (err) => {
            setAgentResponse((prev) => prev + `\n\n**Error during plan formulation**: ${err}`);
          },
          onDone: () => {
            setIsStreaming(false);
            abortControllerRef.current = null;
          },
        },
        controller.signal
      );
    }
  };

  // Voting in Battle Mode
  const handleVote = async (winner: 'modelA' | 'modelB' | 'tie' | 'both_bad') => {
    if (!battleSession || battleSession.voted) return;

    setBattleSession((prev) =>
      prev
        ? {
            ...prev,
            voted: true,
            winner,
            revealed: true,
          }
        : null
    );

    try {
      const res = await submitVote({
        battleId: battleSession.id,
        modelA: battleSession.modelAId,
        modelB: battleSession.modelBId,
        modelAName: battleSession.modelAName,
        modelBName: battleSession.modelBName,
        providerA: battleSession.providerA,
        providerB: battleSession.providerB,
        winner,
        prompt: battleSession.prompt,
        promptSummary: battleSession.prompt,
        responseA: battleSession.responseA,
        responseB: battleSession.responseB,
        latencyA: battleSession.latencyA,
        latencyB: battleSession.latencyB,
      });

      if (res?.success) {
        setBattleSession((prev) =>
          prev
            ? {
                ...prev,
                voteResult: {
                  eloA: res.updatedA?.elo,
                  eloB: res.updatedB?.elo,
                  deltaA: res.deltaA,
                  deltaB: res.deltaB,
                },
              }
            : null
        );
      }

      // Refresh leaderboard data
      const updatedLb = await fetchLeaderboard();
      if (updatedLb?.leaderboard) {
        setLeaderboard(updatedLb.leaderboard);
        setTotalVotes(updatedLb.totalVotes || 0);
      }
    } catch (err: any) {
      console.error('Failed to submit vote to backend:', err);
      if (err?.code === 'DUPLICATE_VOTE') {
        setBattleError('Vote locked: This battle has already been voted on and permanently recorded in the database.');
      } else {
        setBattleError(`Vote recording error: ${err?.message || 'Database error'}`);
      }
    }
  };

  // Next Battle helper
  const handleNextBattle = () => {
    handleStop();
    setBattleSession(null);
    setPrompt('');
  };

  // Reset Leaderboard
  const handleResetLeaderboard = async () => {
    try {
      await resetLeaderboard();
      const updated = await fetchLeaderboard();
      if (updated?.leaderboard) {
        setLeaderboard(updated.leaderboard);
        setTotalVotes(updated.totalVotes || 0);
      }
    } catch (err) {
      console.error('Failed to reset leaderboard:', err);
    }
  };

  // Direct retry
  const handleDirectRetry = (index: number) => {
    if (index > 0 && directMessages[index - 1]?.role === 'user') {
      const lastUserText = directMessages[index - 1].content;
      setDirectMessages((prev) => prev.slice(0, index));
      handleSubmit(lastUserText);
    }
  };

  const hasActiveSession =
    (currentMode === 'battle' && battleSession !== null) ||
    (currentMode === 'side-by-side' && sideBySideSession !== null) ||
    (currentMode === 'direct' && directMessages.length > 0) ||
    (currentMode === 'agent' && agentGoal.length > 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121214] text-zinc-100 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentMode={currentMode}
        onSelectMode={(mode) => setCurrentMode(mode)}
        onNewChat={handleNewChat}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        modelsCount={models.length}
        models={models}
        onSelectModelDirect={(id) => setSelectedModelDirect(id)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 border-b border-[#27272a] bg-[#161619] px-4 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-serif-headline text-lg font-bold text-white tracking-tight">
              Arena X
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono capitalize">
              {currentMode}
            </span>
          </div>
        </header>

        {/* Scrollable Main Viewport */}
        <main
          className={`flex-1 overflow-y-auto ${
            currentMode === 'leaderboard' || currentMode === 'history' ? 'pb-12' : 'pb-44'
          }`}
        >
          {battleError && (
            <div className="mx-4 my-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <span>{battleError}</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setModelsLoading(true);
                  try {
                    const fresh = await fetchModels(customApiKey, true);
                    if (fresh && fresh.length > 0) {
                      setModels(fresh);
                      setBattleError(null);
                    }
                  } catch {}
                  setModelsLoading(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 font-mono text-[11px] cursor-pointer whitespace-nowrap"
              >
                Refresh Catalog
              </button>
            </div>
          )}

          {currentMode === 'leaderboard' ? (
            <LeaderboardView
              onStartBattle={() => {
                setCurrentMode('battle');
                setBattleSession(null);
                setPrompt('');
              }}
              onChatWithModel={(modelId) => {
                setSelectedModelDirect(modelId);
                setCurrentMode('direct');
                setDirectMessages([]);
              }}
            />
          ) : currentMode === 'history' ? (
            <HistoryView
              onStartBattle={() => {
                setCurrentMode('battle');
                setBattleSession(null);
                setPrompt('');
              }}
              onRematchPrompt={(rematchPrompt) => {
                setCurrentMode('battle');
                setBattleSession(null);
                setPrompt(rematchPrompt);
                handleSubmit(rematchPrompt);
              }}
            />
          ) : !hasActiveSession ? (
            <HeroSection
              onSelectPrompt={(p) => {
                setPrompt(p);
                // Also optionally fire immediate execution for smooth demo
                handleSubmit(p);
              }}
              onSelectMode={(m) => setCurrentMode(m)}
              activeMode={currentMode}
              modelsCount={models.length}
            />
          ) : (
            <div className="pt-2">
              {currentMode === 'battle' && battleSession && (
                <BattleView
                  session={battleSession}
                  onVote={handleVote}
                  onNextBattle={handleNextBattle}
                  onRetryPrompt={(p) => handleSubmit(p)}
                  onRetrySlot={handleRetryBattleSlot}
                  onOpenLeaderboard={() => setCurrentMode('leaderboard')}
                  isStreaming={isStreaming}
                />
              )}

              {currentMode === 'side-by-side' && sideBySideSession && (
                <SideBySideView
                  session={sideBySideSession}
                  models={models}
                  onRetryPrompt={(p) => handleSubmit(p)}
                  isStreaming={isStreaming}
                />
              )}

              {currentMode === 'direct' && directMessages.length > 0 && (
                <DirectView
                  messages={directMessages}
                  models={models}
                  selectedModelId={selectedModelDirect}
                  onRetry={handleDirectRetry}
                  onClear={() => setDirectMessages([])}
                  isStreaming={isStreaming}
                />
              )}

              {currentMode === 'agent' && (
                <AgentView
                  goal={agentGoal}
                  response={agentResponse}
                  reasoning={agentReasoning}
                  isStreaming={isStreaming}
                  onRetry={() => handleSubmit(agentGoal)}
                  onSelectPrompt={(p) => handleSubmit(p)}
                />
              )}
            </div>
          )}
        </main>

        {/* Sticky Floating Command Dock at bottom (hidden on dedicated leaderboard/history views) */}
        {currentMode !== 'leaderboard' && currentMode !== 'history' && (
          <CommandDock
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={() => handleSubmit()}
            onStop={handleStop}
            isStreaming={isStreaming}
            currentMode={currentMode}
            onSelectMode={(mode) => setCurrentMode(mode)}
            models={models}
            selectedModelDirect={selectedModelDirect}
            onSelectModelDirect={setSelectedModelDirect}
            selectedModelA={selectedModelA}
            onSelectModelA={setSelectedModelA}
            selectedModelB={selectedModelB}
            onSelectModelB={setSelectedModelB}
            onShuffleBattleModels={() => {
              const pair = pickRandomBattlePair();
              if (pair) {
                setSelectedModelA(pair.modelA.id);
                setSelectedModelB(pair.modelB.id);
              }
            }}
            disabled={modelsLoading && models.length === 0}
          />
        )}
      </div>

      {/* Modals */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
        totalVotes={totalVotes}
        onReset={handleResetLeaderboard}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        customApiKey={customApiKey}
        onSaveApiKey={handleSaveApiKey}
        modelsCount={models.length}
        onTestConnection={testConnection}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
