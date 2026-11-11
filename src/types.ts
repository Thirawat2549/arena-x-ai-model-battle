export type ArenaMode = 'battle' | 'side-by-side' | 'direct' | 'agent' | 'leaderboard' | 'history';

export interface BattleRecord {
  id: string;
  prompt: string;
  modelAId: string;
  modelBId: string;
  modelAName: string;
  modelBName: string;
  providerA: string;
  providerB: string;
  responseA: string;
  responseB: string;
  winner: 'modelA' | 'modelB' | 'tie' | 'both_bad';
  voteType: string;
  latencyA?: number;
  latencyB?: number;
  eloABefore?: number;
  eloBBefore?: number;
  eloAAfter?: number;
  eloBAfter?: number;
  deltaA?: number;
  deltaB?: number;
  createdAt: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string | number;
    completion: string | number;
  };
  is_free: boolean;
  category: 'general' | 'coding' | 'reasoning';
  status: 'active' | 'degraded' | 'offline';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  modelId?: string;
  modelName?: string;
  latencyMs?: number;
  timestamp: number;
  isStreaming?: boolean;
  error?: string;
}

export interface BattleSession {
  id: string;
  prompt: string;
  modelAId: string;
  modelBId: string;
  modelAName: string;
  modelBName: string;
  providerA: string;
  providerB: string;
  responseA: string;
  responseB: string;
  reasoningA?: string;
  reasoningB?: string;
  streamingA: boolean;
  streamingB: boolean;
  errorA?: string;
  errorB?: string;
  latencyA?: number;
  latencyB?: number;
  voted: boolean;
  winner?: 'modelA' | 'modelB' | 'tie' | 'both_bad';
  revealed: boolean;
  retriedA?: boolean;
  retriedB?: boolean;
  replacedModelA?: string;
  replacedModelB?: string;
  voteResult?: {
    eloA?: number;
    eloB?: number;
    deltaA?: number;
    deltaB?: number;
  };
  timestamp: number;
}

export interface SideBySideSession {
  id: string;
  prompt: string;
  modelAId: string;
  modelBId: string;
  responseA: string;
  responseB: string;
  reasoningA?: string;
  reasoningB?: string;
  streamingA: boolean;
  streamingB: boolean;
  errorA?: string;
  errorB?: string;
  latencyA?: number;
  latencyB?: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  modelId: string;
  name: string;
  provider: string;
  elo: number;
  votes: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  category: 'general' | 'coding' | 'reasoning';
}

export interface AgentTaskStep {
  id: string;
  title: string;
  details: string;
  completed: boolean;
}

export interface SettingsState {
  customApiKey: string;
  soundEffects: boolean;
  autoScroll: boolean;
}

export interface ModelDiagnosticExclusion {
  id: string;
  name: string;
  reason: string;
}

export interface ModelCatalogDiagnostics {
  totalRetrieved: number;
  freeCandidates: number;
  chatCompatible: number;
  eligibleCount: number;
  excludedCount: number;
  excludedBreakdown: {
    paidModels: number;
    audioOrMediaModels: ModelDiagnosticExclusion[];
    routerEndpoints: ModelDiagnosticExclusion[];
    otherExcluded: ModelDiagnosticExclusion[];
  };
  eligibleModels: ModelInfo[];
  apiConnected: boolean;
  apiKeySource: 'client' | 'env' | 'none';
  lastRefreshTime: number;
  cached: boolean;
}
