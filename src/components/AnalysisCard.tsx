'use client';

import { useState } from 'react';
import { AdAnalysis } from '@/lib/types';

interface Props {
  modelId: string;
  modelName: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  result?: AdAnalysis;
  error?: string;
  duration?: number;
  onRetry?: () => void;
}

export default function AnalysisCard({ modelId, modelName, status, result, error, duration, onRetry }: Props) {
  const [expanded, setExpanded] = useState(false);

  const borderColor = {
    pending: 'border-gray-700',
    running: 'border-blue-500',
    complete: 'border-green-500',
    error: 'border-red-500',
  }[status];

  const statusBadge = {
    pending: <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">Pending</span>,
    running: <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400 animate-pulse">Running...</span>,
    complete: <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">Complete</span>,
    error: <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">Error</span>,
  }[status];

  return (
    <div className={`bg-gray-900 rounded-xl border ${borderColor} p-5 transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-sm">{modelName}</h4>
          <p className="text-xs text-gray-500">{modelId}</p>
        </div>
        <div className="flex items-center gap-2">
          {duration != null && <span className="text-xs text-gray-500">{(duration / 1000).toFixed(1)}s</span>}
          {statusBadge}
        </div>
      </div>

      {status === 'error' && (
        <div className="mt-3">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="text-xs px-3 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50">
              Retry
            </button>
          )}
        </div>
      )}

      {status === 'complete' && result && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {result.colorPalette?.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-800 rounded px-2 py-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.hex }} />
                <span className="text-xs text-gray-400">{c.hex}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>{result.textElements?.length || 0} texts</span>
            <span>{result.imageRegions?.length || 0} images</span>
            <span>{result.buttons?.length || 0} buttons</span>
            <span>{result.sections?.length || 0} sections</span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {expanded ? 'Hide' : 'Show'} raw JSON
          </button>
          {expanded && (
            <pre className="mt-2 p-3 bg-gray-950 rounded-lg text-xs text-gray-400 overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
