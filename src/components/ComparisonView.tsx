'use client';

import { useState } from 'react';
import HtmlPreview from './HtmlPreview';
import { GenerationResult } from '@/lib/types';

interface Props {
  originalImageUrl: string;
  generations: Record<string, GenerationResult & { label?: string }>;
}

export default function ComparisonView({ originalImageUrl, generations }: Props) {
  const entries = Object.entries(generations).filter(([, g]) => g.status === 'complete' && g.html);
  const [activeTab, setActiveTab] = useState(entries[0]?.[0] || '');

  const active = generations[activeTab];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lg:sticky lg:top-6 self-start">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Original</h3>
        <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
          <img src={originalImageUrl} alt="Original ad" className="w-full object-contain" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Generated HTML5</h3>
        {entries.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500">No generations yet</div>
        ) : (
          <>
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {entries.map(([key, g]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === key ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {g.label || key}
                </button>
              ))}
            </div>
            {active?.html && <HtmlPreview html={active.html} width={400} height={500} />}
          </>
        )}
      </div>
    </div>
  );
}
