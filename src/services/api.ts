import { ModelInfo, LeaderboardEntry, BattleRecord, ModelCatalogDiagnostics } from '../types';

export interface StreamCallbacks {
  onChunk: (text: string, reasoning?: string) => void;
  onError: (error: string, code?: string, modelId?: string) => void;
  onDone: () => void;
}

export async function fetchModels(apiKey?: string, forceRefresh = false): Promise<ModelInfo[]> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-openrouter-key'] = apiKey;
    }
    const url = `/api/models${forceRefresh ? '?refresh=true' : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch models (${res.status})`);
    }
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    console.error('Error fetching models:', err);
    throw err;
  }
}

export async function fetchModelDiagnostics(apiKey?: string): Promise<ModelCatalogDiagnostics> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-openrouter-key'] = apiKey;
    }
    const res = await fetch('/api/models/diagnostics', { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch model diagnostics (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error('Error fetching model diagnostics:', err);
    throw err;
  }
}

export async function reportFailedModel(modelId: string, reason?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/models/failed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, reason }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function testConnection(apiKey?: string) {
  try {
    const res = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      connected: false,
      message: err?.message || 'Network error while testing connection',
    };
  }
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  totalBattles: number;
  totalVotes: number;
  database?: string;
  methodology?: {
    formula: string;
    kFactor: number;
    baseRating: number;
    description: string;
  };
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return await res.json();
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    throw err;
  }
}

export interface VotePayload {
  battleId?: string;
  modelA: string;
  modelB: string;
  winner: 'modelA' | 'modelB' | 'tie' | 'both_bad';
  modelAName?: string;
  modelBName?: string;
  providerA?: string;
  providerB?: string;
  prompt?: string;
  promptSummary?: string;
  responseA?: string;
  responseB?: string;
  latencyA?: number;
  latencyB?: number;
}

export interface VoteResponse {
  success: boolean;
  battleId: string;
  updatedA?: LeaderboardEntry;
  updatedB?: LeaderboardEntry;
  deltaA?: number;
  deltaB?: number;
  winner?: string;
  error?: string;
  code?: string;
}

export async function submitVote(payload: VotePayload): Promise<VoteResponse> {
  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Vote submission failed') as any;
      err.code = data.code;
      err.status = res.status;
      throw err;
    }
    return data;
  } catch (err) {
    console.error('Error submitting vote:', err);
    throw err;
  }
}

export async function fetchBattleHistory(query?: string): Promise<{
  battles: BattleRecord[];
  total: number;
}> {
  try {
    const url = `/api/history${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch battle history');
    return await res.json();
  } catch (err) {
    console.error('Error fetching history:', err);
    throw err;
  }
}

export async function fetchBattleById(id: string): Promise<BattleRecord | null> {
  try {
    const res = await fetch(`/api/history/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.battle || null;
  } catch (err) {
    console.error('Error fetching battle by id:', err);
    return null;
  }
}

export async function recalculateElo(): Promise<{ success: boolean; message: string; battlesReplayed: number }> {
  const res = await fetch('/api/recalculate-elo', { method: 'POST' });
  return await res.json();
}

export async function resetLeaderboard() {
  const res = await fetch('/api/reset-votes', { method: 'POST' });
  return await res.json();
}

/**
 * Stream SSE chat completion from /api/chat
 */
export async function streamChat(
  payload: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    apiKey?: string;
  },
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        apiKey: payload.apiKey,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      callbacks.onError(`HTTP ${response.status}: ${errText}`);
      callbacks.onDone();
      return;
    }

    if (!response.body) {
      callbacks.onError('ReadableStream not supported by browser/environment.');
      callbacks.onDone();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed === 'data: [DONE]') {
          callbacks.onDone();
          return;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.error) {
              callbacks.onError(data.error, data.code, data.modelId);
            } else if (data.text || data.reasoning) {
              callbacks.onChunk(data.text || '', data.reasoning);
            }
          } catch {
            // Ignore incomplete chunks
          }
        }
      }
    }

    callbacks.onDone();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      callbacks.onDone();
      return;
    }
    callbacks.onError(err.message || 'Stream connection error');
    callbacks.onDone();
  }
}
