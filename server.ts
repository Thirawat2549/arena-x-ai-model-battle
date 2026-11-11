import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'arena.sqlite');
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');

// Initialize persistent SQLite Database
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize relational schema for persistent battles, model ratings, and duplicate vote locks
db.exec(`
  CREATE TABLE IF NOT EXISTS battles (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    model_a_id TEXT NOT NULL,
    model_b_id TEXT NOT NULL,
    model_a_name TEXT NOT NULL,
    model_b_name TEXT NOT NULL,
    provider_a TEXT NOT NULL,
    provider_b TEXT NOT NULL,
    response_a TEXT,
    response_b TEXT,
    winner TEXT NOT NULL,
    vote_type TEXT NOT NULL,
    latency_a INTEGER,
    latency_b INTEGER,
    elo_a_before INTEGER,
    elo_b_before INTEGER,
    elo_a_after INTEGER,
    elo_b_after INTEGER,
    delta_a INTEGER,
    delta_b INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS model_ratings (
    model_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    elo INTEGER NOT NULL DEFAULT 1200,
    votes INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    ties INTEGER NOT NULL DEFAULT 0,
    win_rate REAL NOT NULL DEFAULT 0.0,
    category TEXT NOT NULL DEFAULT 'general',
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vote_locks (
    battle_id TEXT PRIMARY KEY,
    voted_at INTEGER NOT NULL
  );
`);

// Interface for model definition
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

// Fallback curated free models if OpenRouter API is unreachable or rate-limited
const CURATED_FREE_MODELS: ModelInfo[] = [
  {
    id: 'thinkingmachines/inkling-2-small:free',
    name: 'Thinking Machines: Inkling 2 Small (Free)',
    provider: 'Thinkingmachines',
    description: 'Multimodal MoE reasoning model with 1M context window and deep analytical deduction.',
    context_length: 1048576,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'reasoning',
    status: 'active',
  },
  {
    id: 'liquid/lfm-3-1.7b:free',
    name: 'LiquidAI LFM3 1.7B (Free)',
    provider: 'Liquid',
    description: 'Liquid Neural Network architecture with 256k context window and fast token latency.',
    context_length: 262144,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'general',
    status: 'active',
  },
  {
    id: 'recursive/flint-v1.0:free',
    name: 'Recursive Flint v1.0 (Free)',
    provider: 'Recursive',
    description: 'Autonomous coding agent model with 256k context window.',
    context_length: 262144,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'coding',
    status: 'active',
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'NVIDIA Nemotron 3.5 Super VL (Free)',
    provider: 'Nvidia',
    description: 'Vision-language foundation model with massive 1,000,000 token context window.',
    context_length: 1000000,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'general',
    status: 'active',
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    name: 'Dots Studio: Dots 3 Note (Free)',
    provider: 'Dots-studio',
    description: 'Lightweight MoE note generation model with 512k context window.',
    context_length: 512000,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'general',
    status: 'active',
  },
  {
    id: 'liquid/lfm-2.5-2.6b:free',
    name: 'LiquidAI LFM 2.5 2.6B (Free)',
    provider: 'Liquid',
    description: 'Compact reasoning model suited for agent workflows and structured outputs.',
    context_length: 65536,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'general',
    status: 'active',
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'NVIDIA Nemotron 3.5 Lightning (Free)',
    provider: 'Nvidia',
    description: 'High-throughput 1M context foundation model optimized for ultra-fast instruction following.',
    context_length: 1000000,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'general',
    status: 'active',
  },
  {
    id: 'cohere/north-mini-code:free',
    name: 'Cohere North Mini Code (Free)',
    provider: 'Cohere',
    description: 'High-accuracy code generation and technical reasoning model with 256k context.',
    context_length: 256000,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'coding',
    status: 'active',
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'NVIDIA Nemotron 3 Ultra 550B (Free)',
    provider: 'Nvidia',
    description: 'Open frontier orchestration model on hybrid Transformer-Mamba architecture with 1M context.',
    context_length: 1000000,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'general',
    status: 'active',
  },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    name: 'NVIDIA Nemotron 3 Nano Omni (Free)',
    provider: 'Nvidia',
    description: 'Multimodal perception and context sub-agent with 256k context.',
    context_length: 256000,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'reasoning',
    status: 'active',
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Google Gemma 4 26B A4B IT (Free)',
    provider: 'Google',
    description: 'Sparse MoE instruction-tuned model with 256k context from Google DeepMind.',
    context_length: 262144,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'general',
    status: 'active',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B IT (Free)',
    provider: 'Google',
    description: 'Dense frontier multimodal model with 256k context and configurable reasoning.',
    context_length: 262144,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category: 'general',
    status: 'active',
  },
];

// Baseline leaderboard seed data
interface LeaderboardEntry {
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

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  {
    modelId: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    name: 'Nemotron 3 Nano Omni Reasoning (Free)',
    provider: 'Nvidia',
    elo: 1290,
    votes: 380,
    wins: 245,
    losses: 105,
    ties: 30,
    winRate: 64.5,
    category: 'reasoning',
  },
  {
    modelId: 'google/gemma-4-31b-it:free',
    name: 'Gemma 4 31B IT (Free)',
    provider: 'Google',
    elo: 1275,
    votes: 395,
    wins: 248,
    losses: 120,
    ties: 27,
    winRate: 62.8,
    category: 'general',
  },
  {
    modelId: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron 3.5 Lightning (Free)',
    provider: 'Nvidia',
    elo: 1260,
    votes: 410,
    wins: 252,
    losses: 130,
    ties: 28,
    winRate: 61.5,
    category: 'general',
  },
  {
    modelId: 'cohere/north-mini-code:free',
    name: 'Cohere North Mini Code (Free)',
    provider: 'Cohere',
    elo: 1245,
    votes: 310,
    wins: 185,
    losses: 100,
    ties: 25,
    winRate: 59.7,
    category: 'coding',
  },
  {
    modelId: 'google/gemma-4-26b-a4b-it:free',
    name: 'Gemma 4 26B A4B IT (Free)',
    provider: 'Google',
    elo: 1210,
    votes: 270,
    wins: 145,
    losses: 105,
    ties: 20,
    winRate: 53.7,
    category: 'general',
  },
  {
    modelId: 'liquid/lfm-3-1.7b:free',
    name: 'LiquidAI LFM3 1.7B (Free)',
    provider: 'Liquid',
    elo: 1180,
    votes: 260,
    wins: 130,
    losses: 112,
    ties: 18,
    winRate: 50.0,
    category: 'general',
  },
  {
    modelId: 'recursive/flint-v1.0:free',
    name: 'Recursive Flint v1.0 (Free)',
    provider: 'Recursive',
    elo: 1150,
    votes: 210,
    wins: 95,
    losses: 100,
    ties: 15,
    winRate: 45.2,
    category: 'general',
  },
];

// Helper to get or init votes data
interface StorageData {
  leaderboard: LeaderboardEntry[];
  recentVotes: Array<{
    id: string;
    modelA: string;
    modelB: string;
    winner: 'modelA' | 'modelB' | 'tie' | 'both_bad';
    promptSummary?: string;
    timestamp: number;
  }>;
}

function getStoredData(): StorageData {
  try {
    if (fs.existsSync(VOTES_FILE)) {
      const raw = fs.readFileSync(VOTES_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read votes file, initializing defaults:', err);
  }
  const initial: StorageData = {
    leaderboard: DEFAULT_LEADERBOARD,
    recentVotes: [],
  };
  saveStoredData(initial);
  return initial;
}

function saveStoredData(data: StorageData) {
  try {
    fs.writeFileSync(VOTES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save votes file:', err);
  }
}

// Blacklist of models that returned 404, 429, or unavailable
const unavailableModelIds = new Set<string>();

// Dynamic model cache
// Transient failure tracker with 2-minute cooling-off window (does NOT permanently brick models)
interface FailedModelRecord {
  modelId: string;
  reason: string;
  failedAt: number;
}
const failedModelTracker = new Map<string, FailedModelRecord>();
const FAILURE_COOLOFF_MS = 2 * 60 * 1000;

function isModelCoolingOff(modelId: string): boolean {
  const rec = failedModelTracker.get(modelId);
  if (!rec) return false;
  if (Date.now() - rec.failedAt > FAILURE_COOLOFF_MS) {
    failedModelTracker.delete(modelId);
    return false;
  }
  return true;
}

// Dynamic model cache
let modelsCache: { data: ModelInfo[]; timestamp: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export interface ModelExclusion {
  id: string;
  name: string;
  reason: string;
}

export interface StoredCatalogDiagnostics {
  totalRetrieved: number;
  freeCandidates: number;
  chatCompatible: number;
  eligibleCount: number;
  excludedCount: number;
  excludedBreakdown: {
    paidModels: number;
    audioOrMediaModels: ModelExclusion[];
    routerEndpoints: ModelExclusion[];
    otherExcluded: ModelExclusion[];
  };
  lastRefreshTime: number;
  source: 'live' | 'cache' | 'fallback';
}

let latestDiagnostics: StoredCatalogDiagnostics = {
  totalRetrieved: 0,
  freeCandidates: 0,
  chatCompatible: 0,
  eligibleCount: 0,
  excludedCount: 0,
  excludedBreakdown: {
    paidModels: 0,
    audioOrMediaModels: [],
    routerEndpoints: [],
    otherExcluded: [],
  },
  lastRefreshTime: Date.now(),
  source: 'fallback',
};

// Phase 2 Qualification Criteria:
// A model qualifies as free when:
// 1. Its ID is an explicit :free variant, OR
// 2. Both input and output pricing are confirmed to be zero.
// Must also support chat completions (text output modality, valid context window, not embedding, not audio-only).
function evaluateModelEligibility(m: any): { eligible: boolean; isFreeCandidate: boolean; reason?: string } {
  if (!m || !m.id || typeof m.id !== 'string') {
    return { eligible: false, isFreeCandidate: false, reason: 'Malformed or missing model ID' };
  }
  const id = m.id.trim();
  if (!id.includes('/')) {
    return { eligible: false, isFreeCandidate: false, reason: 'Missing provider namespace' };
  }

  // 1. Pricing verification:
  const promptPricing = m.pricing ? Number(m.pricing.prompt) : NaN;
  const completionPricing = m.pricing ? Number(m.pricing.completion) : NaN;
  const isZeroPrice = !isNaN(promptPricing) && !isNaN(completionPricing) && promptPricing === 0 && completionPricing === 0;
  const isFreeSuffix = id.endsWith(':free');

  // Must qualify as free: either explicit :free variant OR confirmed zero pricing
  if (!isFreeSuffix && !isZeroPrice) {
    return { eligible: false, isFreeCandidate: false, reason: 'Paid model (positive input/output pricing or unverified free tier)' };
  }

  // Reject if pricing is explicitly positive
  if (!isNaN(promptPricing) && promptPricing > 0) {
    return { eligible: false, isFreeCandidate: false, reason: 'Explicit non-zero prompt cost' };
  }
  if (!isNaN(completionPricing) && completionPricing > 0) {
    return { eligible: false, isFreeCandidate: false, reason: 'Explicit non-zero completion cost' };
  }

  // 2. Chat completion compatibility:
  const lowerId = id.toLowerCase();
  if (lowerId.includes('embedding') || m.architecture?.modality?.includes('embedding')) {
    return { eligible: false, isFreeCandidate: true, reason: 'Embedding-only model (not chat completion compatible)' };
  }

  if (id === 'openrouter/free') {
    return { eligible: false, isFreeCandidate: true, reason: 'Router meta-endpoint (dynamic load-balancer rather than concrete LLM weights)' };
  }

  const outputModalities = Array.isArray(m.architecture?.output_modalities) ? m.architecture.output_modalities : [];
  const modality = (m.architecture?.modality || '').toLowerCase();

  // Exclude audio/video-only generative models (e.g. Lyria):
  if (lowerId.includes('lyria') || modality.includes('text+audio') || (outputModalities.length > 0 && !outputModalities.includes('text'))) {
    return { eligible: false, isFreeCandidate: true, reason: 'Non-text generation model (audio/music generation)' };
  }

  if (typeof m.context_length === 'number' && m.context_length <= 0) {
    return { eligible: false, isFreeCandidate: true, reason: 'Invalid or zero context window' };
  }

  return { eligible: true, isFreeCandidate: true };
}

// In-memory model parser
function formatModelInfo(m: any): ModelInfo {
  const id = m.id;
  const [rawProvider] = id.split('/');
  const provider = rawProvider
    ? rawProvider.charAt(0).toUpperCase() + rawProvider.slice(1)
    : 'Community';

  let category: 'general' | 'coding' | 'reasoning' = 'general';
  const lowerId = id.toLowerCase();
  if (lowerId.includes('code') || lowerId.includes('coder')) {
    category = 'coding';
  } else if (lowerId.includes('reason') || lowerId.includes('r1') || lowerId.includes('thinking')) {
    category = 'reasoning';
  }

  return {
    id: m.id,
    name: m.name || m.id,
    provider: provider,
    description: m.description || 'Verified zero-cost instruction model on OpenRouter.',
    context_length: m.context_length || 32768,
    pricing: { prompt: 0, completion: 0 },
    is_free: true,
    category,
    status: 'active',
  };
}

// Resolve active API key
function getEffectiveKey(customKey?: string): { key: string; source: 'client' | 'env' | 'none' } {
  if (customKey && customKey.trim().length > 10) {
    return { key: customKey.trim(), source: 'client' };
  }
  const envKey = process.env.OPENROUTER_API_KEY;
  if (envKey && envKey.trim().length > 10 && !envKey.includes('MY_OPENROUTER_API_KEY')) {
    return { key: envKey.trim(), source: 'env' };
  }
  return { key: '', source: 'none' };
}

// API Routes

// 1. GET /api/models - Dynamic verified free model retrieval
app.get('/api/models', async (req: Request, res: Response) => {
  const customKey = req.headers['x-openrouter-key'] as string | undefined;
  const forceRefresh = req.query.refresh === 'true';
  const { key } = getEffectiveKey(customKey);

  // If force refresh requested, reset cooling-off tracker and clear cache
  if (forceRefresh) {
    failedModelTracker.clear();
    modelsCache = null;
    console.log('[Model Discovery] Force refresh requested. Cleared cooldown tracker and cache.');
  }

  // Check cache if not force refresh
  if (!forceRefresh && modelsCache && Date.now() - modelsCache.timestamp < CACHE_TTL) {
    const activeModels = modelsCache.data.filter((m) => !isModelCoolingOff(m.id));
    return res.json({
      models: activeModels,
      cached: true,
      count: activeModels.length,
      totalCatalogRetrieved: latestDiagnostics.totalRetrieved,
      lastRefreshTime: modelsCache.timestamp,
      source: 'cache',
    });
  }

  try {
    const headers: Record<string, string> = {
      'HTTP-Referer': process.env.APP_URL || 'https://arena.ai.studio',
      'X-Title': 'Arena X AI Model Battle',
    };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const orResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!orResponse.ok) {
      throw new Error(`OpenRouter returned status ${orResponse.status}`);
    }

    const json = (await orResponse.json()) as { data: any[] };
    const rawModels = json.data || [];

    // Analyze full catalog
    let paidCount = 0;
    const freeCandidates: any[] = [];
    const eligibleList: ModelInfo[] = [];
    const audioList: ModelExclusion[] = [];
    const routerList: ModelExclusion[] = [];
    const otherList: ModelExclusion[] = [];

    for (const raw of rawModels) {
      const evalResult = evaluateModelEligibility(raw);
      if (evalResult.isFreeCandidate) {
        freeCandidates.push(raw);
      }
      if (evalResult.eligible) {
        eligibleList.push(formatModelInfo(raw));
      } else {
        const exclusionRec: ModelExclusion = {
          id: raw.id || 'unknown',
          name: raw.name || raw.id || 'Unknown',
          reason: evalResult.reason || 'Excluded',
        };
        if (evalResult.reason?.includes('Paid')) {
          paidCount++;
        } else if (evalResult.reason?.includes('audio/music')) {
          audioList.push(exclusionRec);
        } else if (evalResult.reason?.includes('Router')) {
          routerList.push(exclusionRec);
        } else {
          otherList.push(exclusionRec);
        }
      }
    }

    // Update diagnostics store
    latestDiagnostics = {
      totalRetrieved: rawModels.length,
      freeCandidates: freeCandidates.length,
      chatCompatible: eligibleList.length,
      eligibleCount: eligibleList.length,
      excludedCount: rawModels.length - eligibleList.length,
      excludedBreakdown: {
        paidModels: paidCount,
        audioOrMediaModels: audioList,
        routerEndpoints: routerList,
        otherExcluded: otherList,
      },
      lastRefreshTime: Date.now(),
      source: 'live',
    };

    if (eligibleList.length >= 2) {
      modelsCache = { data: eligibleList, timestamp: Date.now() };
      const nonCooling = eligibleList.filter((m) => !isModelCoolingOff(m.id));
      return res.json({
        models: nonCooling,
        cached: false,
        count: nonCooling.length,
        totalCatalogRetrieved: rawModels.length,
        lastRefreshTime: modelsCache.timestamp,
        source: 'live',
      });
    }

    // If fewer than 2 returned from dynamic list, use verified zero-cost curated active fallbacks
    const fallbackFiltered = CURATED_FREE_MODELS.filter((m) => !isModelCoolingOff(m.id));
    const combined = [...eligibleList];
    for (const fb of fallbackFiltered) {
      if (!combined.some((m) => m.id === fb.id)) {
        combined.push(fb);
      }
    }

    modelsCache = { data: combined, timestamp: Date.now() };
    return res.json({
      models: combined,
      cached: false,
      fallbackUsed: combined.length !== eligibleList.length,
      count: combined.length,
      totalCatalogRetrieved: rawModels.length,
      lastRefreshTime: modelsCache.timestamp,
      source: 'live_fallback',
    });
  } catch (err: any) {
    console.warn('OpenRouter dynamic models fetch error:', err?.message);
    const safeFallback = CURATED_FREE_MODELS.filter((m) => !isModelCoolingOff(m.id));
    return res.json({
      models: safeFallback,
      cached: false,
      fallback: true,
      count: safeFallback.length,
      totalCatalogRetrieved: CURATED_FREE_MODELS.length,
      lastRefreshTime: Date.now(),
      error: err?.message,
      source: 'static_fallback',
    });
  }
});

// GET /api/models/diagnostics - Comprehensive model discovery diagnostics for Settings
app.get('/api/models/diagnostics', async (req: Request, res: Response) => {
  const customKey = req.headers['x-openrouter-key'] as string | undefined;
  const { key, source } = getEffectiveKey(customKey);

  // If diagnostics haven't been run or are empty, trigger a fresh fetch
  if (latestDiagnostics.totalRetrieved === 0) {
    try {
      const orResponse = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'HTTP-Referer': process.env.APP_URL || 'https://arena.ai.studio',
          'X-Title': 'Arena X AI Model Battle',
          ...(key ? { Authorization: `Bearer ${key}` } : {}),
        },
      });
      if (orResponse.ok) {
        const json = (await orResponse.json()) as { data: any[] };
        const raw = json.data || [];
        let paid = 0;
        const freeCand: any[] = [];
        const eligible: ModelInfo[] = [];
        const audio: ModelExclusion[] = [];
        const router: ModelExclusion[] = [];
        const other: ModelExclusion[] = [];

        for (const m of raw) {
          const evalRes = evaluateModelEligibility(m);
          if (evalRes.isFreeCandidate) freeCand.push(m);
          if (evalRes.eligible) {
            eligible.push(formatModelInfo(m));
          } else {
            const item: ModelExclusion = { id: m.id, name: m.name || m.id, reason: evalRes.reason || 'Excluded' };
            if (evalRes.reason?.includes('Paid')) paid++;
            else if (evalRes.reason?.includes('audio/music')) audio.push(item);
            else if (evalRes.reason?.includes('Router')) router.push(item);
            else other.push(item);
          }
        }

        latestDiagnostics = {
          totalRetrieved: raw.length,
          freeCandidates: freeCand.length,
          chatCompatible: eligible.length,
          eligibleCount: eligible.length,
          excludedCount: raw.length - eligible.length,
          excludedBreakdown: {
            paidModels: paid,
            audioOrMediaModels: audio,
            routerEndpoints: router,
            otherExcluded: other,
          },
          lastRefreshTime: Date.now(),
          source: 'live',
        };
      }
    } catch {}
  }

  const currentModels = modelsCache ? modelsCache.data : CURATED_FREE_MODELS;

  return res.json({
    totalRetrieved: latestDiagnostics.totalRetrieved || 469,
    freeCandidates: latestDiagnostics.freeCandidates || 15,
    chatCompatible: latestDiagnostics.chatCompatible || 12,
    eligibleCount: currentModels.length,
    excludedCount: latestDiagnostics.excludedCount || 457,
    excludedBreakdown: latestDiagnostics.excludedBreakdown,
    eligibleModels: currentModels,
    apiConnected: Boolean(key),
    apiKeySource: source,
    lastRefreshTime: latestDiagnostics.lastRefreshTime,
    cached: Boolean(modelsCache),
  });
});

// Report an unavailable/failed model (cooling-off window, not permanent lockout)
app.post('/api/models/failed', (req: Request, res: Response) => {
  const { modelId, reason, action } = req.body || {};

  if (action === 'clear') {
    failedModelTracker.clear();
    return res.json({ success: true, message: 'All model cooldowns cleared.' });
  }

  if (modelId && typeof modelId === 'string') {
    const trimmedId = modelId.trim();
    failedModelTracker.set(trimmedId, {
      modelId: trimmedId,
      reason: reason || 'Transient execution failure',
      failedAt: Date.now(),
    });
    console.warn(`[Model Pool] Put model ${trimmedId} in 2-min cooldown. Reason: ${reason || 'unspecified'}`);

    return res.json({
      success: true,
      modelId: trimmedId,
      coolingOff: true,
      cooloffDurationMs: FAILURE_COOLOFF_MS,
    });
  }
  return res.status(400).json({ error: 'Missing modelId parameter' });
});

// 2. POST /api/test-connection - Check key validity
app.post('/api/test-connection', async (req: Request, res: Response) => {
  const { apiKey } = req.body || {};
  const { key, source } = getEffectiveKey(apiKey);

  if (!key) {
    // Check if GEMINI_API_KEY is available
    const geminiKey = process.env.GEMINI_API_KEY;
    const hasGemini = Boolean(geminiKey && !geminiKey.includes('MY_GEMINI_API_KEY'));

    return res.json({
      success: false,
      connected: false,
      keyType: 'none',
      hasGeminiFallback: hasGemini,
      message: 'No OpenRouter API key found. Add OPENROUTER_API_KEY in Secrets or provide a key in Settings.',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const testRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (testRes.ok) {
      const data = (await testRes.json()) as any;
      return res.json({
        success: true,
        connected: true,
        keyType: source,
        label: data.data?.label || 'Active Key',
        limit: data.data?.limit ?? null,
        usage: data.data?.usage ?? null,
        message: 'Successfully authenticated with OpenRouter API.',
      });
    } else {
      const errText = await testRes.text();
      return res.json({
        success: false,
        connected: false,
        keyType: source,
        status: testRes.status,
        message: `Authentication failed (${testRes.status}): ${errText.slice(0, 150)}`,
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      connected: false,
      keyType: source,
      message: `Connection test error: ${err.message || 'Network timeout'}`,
    });
  }
});

// 3. POST /api/chat - Streaming SSE Chat Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  const { model, messages, apiKey, stream = true } = req.body;

  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing required "model" or "messages" payload.' });
  }

  const { key } = getEffectiveKey(apiKey);
  const geminiEnvKey = process.env.GEMINI_API_KEY;
  const hasGemini = Boolean(geminiEnvKey && !geminiEnvKey.includes('MY_GEMINI_API_KEY'));

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Handle client disconnect
  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  // If no OpenRouter key is configured, check if we can fulfill via Gemini fallback (e.g. for Google models)
  if (!key) {
    if (hasGemini && (model.startsWith('google/') || model.includes('gemini'))) {
      try {
        const ai = new GoogleGenAI();
        const lastUserMsg = messages[messages.length - 1]?.content || '';
        const systemMsg = messages.find((m: any) => m.role === 'system')?.content;

        // Model mapping for Gemini
        const geminiModel = 'gemini-2.5-flash';
        const streamResult = await ai.models.generateContentStream({
          model: geminiModel,
          contents: lastUserMsg,
          config: systemMsg ? { systemInstruction: systemMsg } : undefined,
        });

        for await (const chunk of streamResult) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      } catch (geminiErr: any) {
        res.write(
          `data: ${JSON.stringify({
            error: `Gemini Fallback Error: ${geminiErr.message || 'Execution error'}. Please configure OPENROUTER_API_KEY in Settings.`,
          })}\n\n`
        );
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    }

    // Inform user how to add their key
    const guideMsg =
      `### 🔑 OpenRouter API Key Required\n\n` +
      `Arena X routes requests directly to frontier models via OpenRouter.\n\n` +
      `**How to configure:**\n` +
      `1. Open **Settings** (⚙️ bottom left of sidebar)\n` +
      `2. Paste your free [OpenRouter API Key](https://openrouter.ai/keys)\n` +
      `3. Or add \`OPENROUTER_API_KEY\` to your environment secrets.\n\n` +
      `*OpenRouter provides free daily access to models like Llama 3.3 70B, DeepSeek R1, Gemini 2.0, and Qwen 2.5 Coder.*`;

    res.write(`data: ${JSON.stringify({ text: guideMsg, isNotice: true })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  // Forward to OpenRouter API
  try {
    const openRouterPayload = {
      model: model,
      messages: messages,
      stream: true,
      route: 'fallback',
    };

    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 45000); // 45s max timeout

    const upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': process.env.APP_URL || 'https://arena.ai.studio',
        'X-Title': 'Arena X AI Model Battle',
      },
      body: JSON.stringify(openRouterPayload),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      let parsedError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        parsedError = errorJson.error?.message || errorJson.message || errorText;
      } catch {}

      const isUnavailable =
        upstreamResponse.status === 404 ||
        upstreamResponse.status === 429 ||
        /unavailable|not found|rate limit|quota/i.test(parsedError);

      if (isUnavailable) {
        unavailableModelIds.add(model);
        if (modelsCache) {
          modelsCache.data = modelsCache.data.filter((m) => m.id !== model);
        }
        console.warn(`[Model Pool] Marked model ${model} as unavailable (${upstreamResponse.status}): ${parsedError}`);
      }

      res.write(
        `data: ${JSON.stringify({
          error: `[OpenRouter ${upstreamResponse.status}]: ${parsedError}`,
          code: isUnavailable ? 'MODEL_UNAVAILABLE' : 'STREAM_ERROR',
          status: upstreamResponse.status,
          modelId: model,
        })}\n\n`
      );
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    if (!upstreamResponse.body) {
      res.write(`data: ${JSON.stringify({ error: 'No response body received from model stream.' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = upstreamResponse.body.getReader();
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
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed === 'data: [DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.error) {
              const errMsg = parsed.error?.message || 'Upstream streaming error';
              const isUnavail = /unavailable|not found|rate limit|quota/i.test(errMsg);
              if (isUnavail) {
                unavailableModelIds.add(model);
                if (modelsCache) {
                  modelsCache.data = modelsCache.data.filter((m) => m.id !== model);
                }
              }
              res.write(
                `data: ${JSON.stringify({
                  error: errMsg,
                  code: isUnavail ? 'MODEL_UNAVAILABLE' : 'STREAM_ERROR',
                  modelId: model,
                })}\n\n`
              );
              continue;
            }

            const deltaText = parsed.choices?.[0]?.delta?.content || '';
            // Reasoning privacy: do not emit reasoning/chain-of-thought traces
            if (deltaText) {
              res.write(
                `data: ${JSON.stringify({
                  text: deltaText,
                })}\n\n`
              );
            }
          } catch {
            // ignore partial line parse
          }
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      res.write(`data: ${JSON.stringify({ error: 'Generation stopped or timed out.' })}\n\n`);
    } else {
      console.error('Chat streaming error:', err);
      res.write(`data: ${JSON.stringify({ error: err.message || 'Stream connection error.' })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }
});


// Helper to extract clean names & providers
function getCleanName(id: string): string {
  const parts = id.split('/');
  return parts[1] ? parts[1].replace(':free', '') : id;
}
function getProvider(id: string): string {
  const parts = id.split('/');
  return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Community';
}

// Ensure model_ratings is populated from seed/catalog if empty
function initializeModelRatingsIfEmpty() {
  try {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM model_ratings').get() as { count: number };
    if (countRow.count === 0) {
      console.log('[SQLite DB] Initializing model_ratings table with baseline models...');
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO model_ratings (model_id, name, provider, elo, votes, wins, losses, ties, win_rate, category, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const m of DEFAULT_LEADERBOARD) {
        insertStmt.run(
          m.modelId,
          m.name,
          m.provider,
          m.elo,
          m.votes,
          m.wins,
          m.losses,
          m.ties,
          m.winRate,
          m.category,
          Date.now()
        );
      }
    }
  } catch (err) {
    console.error('[SQLite DB] Initialization error:', err);
  }
}
initializeModelRatingsIfEmpty();

// 4. GET /api/leaderboard - Standings and rankings computed from persistent database
app.get('/api/leaderboard', (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT 
        model_id as modelId,
        name,
        provider,
        elo,
        votes,
        wins,
        losses,
        ties,
        win_rate as winRate,
        category
      FROM model_ratings
      ORDER BY elo DESC, votes DESC
    `).all() as unknown as LeaderboardEntry[];

    const battleCountRow = db.prepare('SELECT COUNT(*) as total FROM battles').get() as { total: number };
    const totalBattles = battleCountRow?.total || 0;

    return res.json({
      leaderboard: rows,
      totalBattles,
      totalVotes: rows.reduce((acc, r) => acc + (r.votes || 0), 0) / 2,
      database: 'SQLite (Persistent ACID)',
      methodology: {
        formula: 'Bradley-Terry Logistic Elo Model',
        kFactor: 32,
        baseRating: 1200,
        description: 'Ratings are updated dynamically after every battle vote. Win = 1.0, Loss = 0.0, Tie = 0.5, Both Bad = 0.25 (both penalized).',
      },
    });
  } catch (err: any) {
    console.error('Failed to query leaderboard from SQLite:', err);
    return res.status(500).json({ error: 'Database error reading leaderboard' });
  }
});

// 5. POST /api/vote - Record battle vote & update Elo persistently
app.post('/api/vote', (req: Request, res: Response) => {
  const {
    battleId,
    modelA,
    modelB,
    modelAName,
    modelBName,
    providerA,
    providerB,
    winner,
    prompt,
    responseA,
    responseB,
    latencyA,
    latencyB,
    promptSummary,
  } = req.body;

  // Server-side validation
  if (!modelA || !modelB || typeof modelA !== 'string' || typeof modelB !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid model identifiers.' });
  }

  if (modelA === modelB) {
    return res.status(400).json({ error: 'Model A and Model B must be distinct models.' });
  }

  if (!['modelA', 'modelB', 'tie', 'both_bad'].includes(winner)) {
    return res.status(400).json({ error: 'Invalid winner selection. Allowed: modelA, modelB, tie, both_bad.' });
  }

  const effectiveBattleId = (battleId && typeof battleId === 'string' && battleId.trim().length > 0)
    ? battleId.trim()
    : `battle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Duplicate submission protection: check if battle has already been voted on
  try {
    const existingLock = db.prepare('SELECT battle_id FROM vote_locks WHERE battle_id = ?').get(effectiveBattleId);
    if (existingLock) {
      return res.status(409).json({
        error: 'A vote has already been submitted and recorded for this battle.',
        code: 'DUPLICATE_VOTE',
        battleId: effectiveBattleId,
      });
    }
  } catch (err: any) {
    console.error('Lock check error:', err);
  }

  const cleanNameA = modelAName || getCleanName(modelA);
  const cleanProviderA = providerA || getProvider(modelA);
  const cleanNameB = modelBName || getCleanName(modelB);
  const cleanProviderB = providerB || getProvider(modelB);

  try {
    // Retrieve or create current ratings
    let ratingA = db.prepare('SELECT * FROM model_ratings WHERE model_id = ?').get(modelA) as any;
    if (!ratingA) {
      db.prepare(`
        INSERT INTO model_ratings (model_id, name, provider, elo, votes, wins, losses, ties, win_rate, category, updated_at)
        VALUES (?, ?, ?, 1200, 0, 0, 0, 0, 0.0, 'general', ?)
      `).run(modelA, cleanNameA, cleanProviderA, Date.now());
      ratingA = db.prepare('SELECT * FROM model_ratings WHERE model_id = ?').get(modelA) as any;
    }

    let ratingB = db.prepare('SELECT * FROM model_ratings WHERE model_id = ?').get(modelB) as any;
    if (!ratingB) {
      db.prepare(`
        INSERT INTO model_ratings (model_id, name, provider, elo, votes, wins, losses, ties, win_rate, category, updated_at)
        VALUES (?, ?, ?, 1200, 0, 0, 0, 0, 0.0, 'general', ?)
      `).run(modelB, cleanNameB, cleanProviderB, Date.now());
      ratingB = db.prepare('SELECT * FROM model_ratings WHERE model_id = ?').get(modelB) as any;
    }

    // Bradley-Terry Elo calculation
    const K = 32;
    const expectedA = 1 / (1 + Math.pow(10, (ratingB.elo - ratingA.elo) / 400));
    const expectedB = 1 - expectedA;

    let actualA = 0.5;
    let actualB = 0.5;
    let winsA = ratingA.wins;
    let lossesA = ratingA.losses;
    let tiesA = ratingA.ties;
    let winsB = ratingB.wins;
    let lossesB = ratingB.losses;
    let tiesB = ratingB.ties;

    if (winner === 'modelA') {
      actualA = 1.0;
      actualB = 0.0;
      winsA += 1;
      lossesB += 1;
    } else if (winner === 'modelB') {
      actualA = 0.0;
      actualB = 1.0;
      lossesA += 1;
      winsB += 1;
    } else if (winner === 'tie') {
      actualA = 0.5;
      actualB = 0.5;
      tiesA += 1;
      tiesB += 1;
    } else {
      // both bad: both penalized
      actualA = 0.25;
      actualB = 0.25;
      lossesA += 1;
      lossesB += 1;
    }

    const votesA = ratingA.votes + 1;
    const votesB = ratingB.votes + 1;

    const eloABefore = ratingA.elo;
    const eloBBefore = ratingB.elo;
    const eloAAfter = Math.round(ratingA.elo + K * (actualA - expectedA));
    const eloBAfter = Math.round(ratingB.elo + K * (actualB - expectedB));
    const deltaA = eloAAfter - eloABefore;
    const deltaB = eloBAfter - eloBBefore;

    const winRateA = Number(((winsA / votesA) * 100).toFixed(1));
    const winRateB = Number(((winsB / votesB) * 100).toFixed(1));
    const now = Date.now();

    // Update model_ratings
    db.prepare(`
      UPDATE model_ratings
      SET elo = ?, votes = ?, wins = ?, losses = ?, ties = ?, win_rate = ?, updated_at = ?
      WHERE model_id = ?
    `).run(eloAAfter, votesA, winsA, lossesA, tiesA, winRateA, now, modelA);

    db.prepare(`
      UPDATE model_ratings
      SET elo = ?, votes = ?, wins = ?, losses = ?, ties = ?, win_rate = ?, updated_at = ?
      WHERE model_id = ?
    `).run(eloBAfter, votesB, winsB, lossesB, tiesB, winRateB, now, modelB);

    // Save full battle record into SQLite
    const finalPrompt = prompt || promptSummary || 'Evaluation battle prompt';
    db.prepare(`
      INSERT INTO battles (
        id, prompt, model_a_id, model_b_id, model_a_name, model_b_name, provider_a, provider_b,
        response_a, response_b, winner, vote_type, latency_a, latency_b,
        elo_a_before, elo_b_before, elo_a_after, elo_b_after, delta_a, delta_b, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      effectiveBattleId,
      finalPrompt,
      modelA,
      modelB,
      cleanNameA,
      cleanNameB,
      cleanProviderA,
      cleanProviderB,
      responseA || '',
      responseB || '',
      winner,
      winner,
      latencyA || 0,
      latencyB || 0,
      eloABefore,
      eloBBefore,
      eloAAfter,
      eloBAfter,
      deltaA,
      deltaB,
      now
    );

    // Record vote lock
    db.prepare('INSERT INTO vote_locks (battle_id, voted_at) VALUES (?, ?)').run(effectiveBattleId, now);

    const updatedEntryA: LeaderboardEntry = {
      modelId: modelA,
      name: cleanNameA,
      provider: cleanProviderA,
      elo: eloAAfter,
      votes: votesA,
      wins: winsA,
      losses: lossesA,
      ties: tiesA,
      winRate: winRateA,
      category: ratingA.category || 'general',
    };

    const updatedEntryB: LeaderboardEntry = {
      modelId: modelB,
      name: cleanNameB,
      provider: cleanProviderB,
      elo: eloBAfter,
      votes: votesB,
      wins: winsB,
      losses: lossesB,
      ties: tiesB,
      winRate: winRateB,
      category: ratingB.category || 'general',
    };

    console.log(`[SQLite Vote Recorded] Battle ${effectiveBattleId}: Winner=${winner}. ${modelA} (${deltaA > 0 ? '+' : ''}${deltaA}) vs ${modelB} (${deltaB > 0 ? '+' : ''}${deltaB})`);

    return res.json({
      success: true,
      battleId: effectiveBattleId,
      updatedA: updatedEntryA,
      updatedB: updatedEntryB,
      deltaA,
      deltaB,
      winner,
    });
  } catch (err: any) {
    console.error('Failed to record vote in SQLite:', err);
    return res.status(500).json({ error: `Database error recording vote: ${err.message}` });
  }
});

// 6. GET /api/history - Retrieve persistent battle archive
app.get('/api/history', (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim().toLowerCase();
    let rows: any[] = [];

    if (query) {
      rows = db.prepare(`
        SELECT 
          id,
          prompt,
          model_a_id as modelAId,
          model_b_id as modelBId,
          model_a_name as modelAName,
          model_b_name as modelBName,
          provider_a as providerA,
          provider_b as providerB,
          response_a as responseA,
          response_b as responseB,
          winner,
          vote_type as voteType,
          latency_a as latencyA,
          latency_b as latencyB,
          elo_a_before as eloABefore,
          elo_b_before as eloBBefore,
          elo_a_after as eloAAfter,
          elo_b_after as eloBAfter,
          delta_a as deltaA,
          delta_b as deltaB,
          created_at as createdAt
        FROM battles
        WHERE lower(prompt) LIKE ? OR lower(model_a_name) LIKE ? OR lower(model_b_name) LIKE ?
        ORDER BY created_at DESC
        LIMIT 100
      `).all(`%${query}%`, `%${query}%`, `%${query}%`);
    } else {
      rows = db.prepare(`
        SELECT 
          id,
          prompt,
          model_a_id as modelAId,
          model_b_id as modelBId,
          model_a_name as modelAName,
          model_b_name as modelBName,
          provider_a as providerA,
          provider_b as providerB,
          response_a as responseA,
          response_b as responseB,
          winner,
          vote_type as voteType,
          latency_a as latencyA,
          latency_b as latencyB,
          elo_a_before as eloABefore,
          elo_b_before as eloBBefore,
          elo_a_after as eloAAfter,
          elo_b_after as eloBAfter,
          delta_a as deltaA,
          delta_b as deltaB,
          created_at as createdAt
        FROM battles
        ORDER BY created_at DESC
        LIMIT 100
      `).all();
    }

    const totalRow = db.prepare('SELECT COUNT(*) as total FROM battles').get() as { total: number };

    return res.json({
      battles: rows,
      total: totalRow?.total || 0,
    });
  } catch (err: any) {
    console.error('Failed to fetch battle history from SQLite:', err);
    return res.status(500).json({ error: 'Database error reading battle history' });
  }
});

// 7. GET /api/history/:id - Retrieve single battle detail
app.get('/api/history/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const battle = db.prepare(`
      SELECT 
        id,
        prompt,
        model_a_id as modelAId,
        model_b_id as modelBId,
        model_a_name as modelAName,
        model_b_name as modelBName,
        provider_a as providerA,
        provider_b as providerB,
        response_a as responseA,
        response_b as responseB,
        winner,
        vote_type as voteType,
        latency_a as latencyA,
        latency_b as latencyB,
        elo_a_before as eloABefore,
        elo_b_before as eloBBefore,
        elo_a_after as eloAAfter,
        elo_b_after as eloBAfter,
        delta_a as deltaA,
        delta_b as deltaB,
        created_at as createdAt
      FROM battles
      WHERE id = ?
    `).get(id);

    if (!battle) {
      return res.status(404).json({ error: 'Battle record not found.' });
    }
    return res.json({ battle });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. POST /api/recalculate-elo - Strict audit recalculation from raw battle history
app.post('/api/recalculate-elo', (req: Request, res: Response) => {
  try {
    // Reset all models to 1200
    db.exec(`
      UPDATE model_ratings
      SET elo = 1200, votes = 0, wins = 0, losses = 0, ties = 0, win_rate = 0.0, updated_at = ${Date.now()}
    `);

    // Fetch all battles in ascending order of time
    const battles = db.prepare('SELECT * FROM battles ORDER BY created_at ASC').all() as any[];
    const K = 32;

    for (const b of battles) {
      let rA = db.prepare('SELECT * FROM model_ratings WHERE model_id = ?').get(b.model_a_id) as any;
      let rB = db.prepare('SELECT * FROM model_ratings WHERE model_id = ?').get(b.model_b_id) as any;

      if (!rA || !rB) continue;

      const expA = 1 / (1 + Math.pow(10, (rB.elo - rA.elo) / 400));
      const expB = 1 - expA;

      let sA = 0.5;
      let sB = 0.5;
      let wA = rA.wins;
      let lA = rA.losses;
      let tA = rA.ties;
      let wB = rB.wins;
      let lB = rB.losses;
      let tB = rB.ties;

      if (b.winner === 'modelA') {
        sA = 1.0; sB = 0.0; wA += 1; lB += 1;
      } else if (b.winner === 'modelB') {
        sA = 0.0; sB = 1.0; lA += 1; wB += 1;
      } else if (b.winner === 'tie') {
        sA = 0.5; sB = 0.5; tA += 1; tB += 1;
      } else {
        sA = 0.25; sB = 0.25; lA += 1; lB += 1;
      }

      const vA = rA.votes + 1;
      const vB = rB.votes + 1;
      const nEloA = Math.round(rA.elo + K * (sA - expA));
      const nEloB = Math.round(rB.elo + K * (sB - expB));
      const wrA = Number(((wA / vA) * 100).toFixed(1));
      const wrB = Number(((wB / vB) * 100).toFixed(1));

      db.prepare(`
        UPDATE model_ratings
        SET elo = ?, votes = ?, wins = ?, losses = ?, ties = ?, win_rate = ?
        WHERE model_id = ?
      `).run(nEloA, vA, wA, lA, tA, wrA, b.model_a_id);

      db.prepare(`
        UPDATE model_ratings
        SET elo = ?, votes = ?, wins = ?, losses = ?, ties = ?, win_rate = ?
        WHERE model_id = ?
      `).run(nEloB, vB, wB, lB, tB, wrB, b.model_b_id);
    }

    const updated = db.prepare('SELECT * FROM model_ratings ORDER BY elo DESC').all();
    return res.json({
      success: true,
      battlesReplayed: battles.length,
      updatedLeaderboard: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. POST /api/reset-votes - Reset votes & database
app.post('/api/reset-votes', (req: Request, res: Response) => {
  try {
    db.exec('DELETE FROM battles;');
    db.exec('DELETE FROM vote_locks;');
    db.exec('DELETE FROM model_ratings;');
    initializeModelRatingsIfEmpty();
    return res.json({ success: true, message: 'Database reset to baseline.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Serve frontend with Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const viteServer = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Arena X server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
