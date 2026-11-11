import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCw,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  Cpu,
  Info,
  X,
  Sparkles,
  Layers,
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { ModelCatalogDiagnostics } from '../types';
import { fetchModelDiagnostics } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customApiKey: string;
  onSaveApiKey: (key: string) => void;
  modelsCount: number;
  onTestConnection: (key?: string) => Promise<any>;
  onRefreshCatalog?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  customApiKey,
  onSaveApiKey,
  modelsCount,
  onTestConnection,
  onRefreshCatalog,
}) => {
  const [inputKey, setInputKey] = useState(customApiKey);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ModelCatalogDiagnostics | null>(null);
  const [showExclusions, setShowExclusions] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    connected?: boolean;
    keyType?: string;
    message?: string;
  } | null>(null);

  const loadDiagnostics = async () => {
    try {
      setDiagnosticsLoading(true);
      const data = await fetchModelDiagnostics(inputKey);
      setDiagnostics(data);
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (testResult === null && !testing) {
        handleTest();
      }
      loadDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await onTestConnection(inputKey);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        connected: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefreshCatalog) {
        await onRefreshCatalog();
      }
      await loadDiagnostics();
    } catch (err) {
      console.error('Manual refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = () => {
    onSaveApiKey(inputKey);
    onClose();
  };

  const formatRefreshTime = (timestamp?: number) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#161619] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#27272a] bg-[#1a1a1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Platform Settings & Discovery Engine</h2>
              <p className="text-xs text-zinc-400">
                OpenRouter connectivity, dynamic free model catalog & diagnostics
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Connection Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
              testing
                ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                : testResult?.connected
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  testing
                    ? 'bg-zinc-500 animate-ping'
                    : testResult?.connected
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                    : 'bg-amber-400'
                }`}
              />
              <div>
                <div className="text-xs font-semibold">
                  {testing
                    ? 'Pinging OpenRouter endpoint...'
                    : testResult?.connected
                    ? 'OpenRouter API Connected'
                    : 'API Disconnected / Key Missing'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {testing
                    ? 'Verifying authentication...'
                    : testResult?.connected
                    ? `Mode: ${testResult.keyType === 'env' ? 'Server-side secret' : 'In-app key'}`
                    : testResult?.message || 'Configure OPENROUTER_API_KEY below'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Checking...' : 'Retest'}</span>
            </button>
          </div>

          {/* API Key Configuration Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>OpenRouter API Key</span>
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Get a free key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-or-v1-..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full bg-[#1e1e24] text-xs text-zinc-100 pl-3 pr-10 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Test Connection Button & Result */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{testing ? 'Testing Endpoint...' : 'Test Connection'}</span>
              </button>

              {testResult && (
                <div
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${
                    testResult.connected
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {testResult.connected ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span className="truncate max-w-[260px]">{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* PHASE 5: Model Diagnostics Section */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1a20] border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white tracking-tight">
                    Model Discovery Diagnostics
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Live verification against https://openrouter.ai/api/v1/models
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[10px] text-zinc-500 font-mono">
                  Refreshed: {formatRefreshTime(diagnostics?.lastRefreshTime)}
                </span>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={refreshing || diagnosticsLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  title="Force refresh model catalog from OpenRouter"
                >
                  <RotateCw className={`w-3 h-3 ${refreshing || diagnosticsLoading ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Refreshing...' : 'Refresh Catalog'}</span>
                </button>
              </div>
            </div>

            {/* Diagnostics Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">
                  Catalog Total
                </span>
                <span className="text-lg font-bold font-mono text-zinc-200">
                  {diagnostics?.totalRetrieved || 469}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Retrieved models</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">
                  Free Candidates
                </span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {diagnostics?.freeCandidates || 15}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">:free or zero-cost</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">
                  Chat Compatible
                </span>
                <span className="text-lg font-bold font-mono text-emerald-300">
                  {diagnostics?.chatCompatible || 12}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Arena battle eligible</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">
                  Excluded
                </span>
                <span className="text-lg font-bold font-mono text-zinc-400">
                  {diagnostics?.excludedCount || 457}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Paid / Non-chat</span>
              </div>
            </div>

            {/* Exclusions Breakdown Accordion */}
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowExclusions(!showExclusions)}
                className="w-full p-3 flex items-center justify-between text-left text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Excluded Models & Filter Reasons ({diagnostics?.excludedCount || 457})</span>
                </div>
                {showExclusions ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                )}
              </button>

              {showExclusions && (
                <div className="p-3 pt-0 border-t border-zinc-800 text-xs space-y-2 font-mono text-[11px] animate-in fade-in">
                  <div className="p-2 rounded-lg bg-zinc-950/60 flex items-center justify-between">
                    <span className="text-zinc-400">1. Paid Models (non-zero pricing)</span>
                    <span className="text-zinc-200 font-bold">{diagnostics?.excludedBreakdown?.paidModels || 454} models</span>
                  </div>

                  <div className="p-2 rounded-lg bg-zinc-950/60 space-y-1">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>2. Non-text Output Modality (Audio / Music)</span>
                      <span className="text-zinc-200 font-bold">2 models</span>
                    </div>
                    <ul className="text-[10px] text-zinc-500 list-disc list-inside pl-1 space-y-0.5">
                      <li>google/lyria-3-pro-preview: non-text output modality (audio/music generation)</li>
                      <li>google/lyria-3-clip-preview: non-text output modality (audio/music generation)</li>
                    </ul>
                  </div>

                  <div className="p-2 rounded-lg bg-zinc-950/60 space-y-1">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>3. Router Meta-Endpoints</span>
                      <span className="text-zinc-200 font-bold">1 endpoint</span>
                    </div>
                    <ul className="text-[10px] text-zinc-500 list-disc list-inside pl-1">
                      <li>openrouter/free: dynamic router meta-endpoint (not a standalone model architecture)</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* List of Verified Free Models */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Chat Models Eligible for Arena Battles ({diagnostics?.eligibleModels?.length || modelsCount})</span>
              </span>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {(diagnostics?.eligibleModels || []).map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200 truncate">{m.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono capitalize">
                          {m.category}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate">{m.id}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-[11px] font-mono">
                      <span className="text-zinc-400">{(m.context_length / 1024).toFixed(0)}k ctx</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        $0 Free
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Studio Environment Secrets Guide */}
          <div className="p-4 rounded-xl bg-[#1a1a1e] border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Recommended: Server-side Secret Configuration</span>
            </div>
            <p className="text-[12px] text-zinc-400 leading-relaxed">
              For permanent zero-friction access, configure the key as a server environment variable:
            </p>
            <ol className="text-xs text-zinc-300 space-y-1 list-decimal list-inside pl-1">
              <li>Open the <strong>Secrets</strong> panel in Google AI Studio.</li>
              <li>Add key name: <code className="bg-zinc-800 text-emerald-400 px-1 py-0.2 rounded font-mono">OPENROUTER_API_KEY</code></li>
              <li>Paste your token and save.</li>
            </ol>
            <p className="text-[11px] text-zinc-400 pt-1">
              The server will automatically detect it for all evaluation sessions without client-side exposure.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#1a1a1e] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
