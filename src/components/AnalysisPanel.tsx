'use client';

import AnalysisCard from './AnalysisCard';
import { AnalysisResult } from '@/lib/types';

interface Props {
  analyses: Record<string, AnalysisResult & { modelName?: string }>;
}

export default function AnalysisPanel({ analyses }: Props) {
  const entries = Object.entries(analyses);
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {entries.map(([modelId, a]) => (
        <AnalysisCard
          key={modelId}
          modelId={modelId}
          modelName={a.modelName || modelId}
          status={a.status}
          result={a.result}
          error={a.error}
          duration={a.duration}
        />
      ))}
    </div>
  );
}
