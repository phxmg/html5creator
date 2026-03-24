'use client';

import { useState } from 'react';
import { PromptTemplate } from '@/lib/types';

interface Prompts {
  visionSystemPrompt: string;
  visionUserPrompt: string;
  codegenSystemPrompt: string;
  codegenUserPrompt: string;
}

interface Props {
  prompts: Prompts;
  onChange: (prompts: Prompts) => void;
  onSave: (name: string) => void;
  templates: PromptTemplate[];
  onLoadTemplate: (template: PromptTemplate) => void;
}

export default function PromptEditor({ prompts, onChange, onSave, templates, onLoadTemplate }: Props) {
  const [tab, setTab] = useState<'vision' | 'codegen'>('vision');
  const [templateName, setTemplateName] = useState('');
  const [showSave, setShowSave] = useState(false);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex gap-1">
          {(['vision', 'codegen'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {t === 'vision' ? 'Vision Prompts' : 'Code Gen Prompts'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <select
              onChange={e => {
                const t = templates.find(t => t.id === e.target.value);
                if (t) onLoadTemplate(t);
              }}
              defaultValue=""
              className="bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
            >
              <option value="" disabled>Load template...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {showSave ? (
            <div className="flex gap-1">
              <input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Template name"
                className="bg-gray-800 text-xs rounded px-2 py-1 border border-gray-700 text-white w-32"
              />
              <button
                onClick={() => { onSave(templateName); setShowSave(false); setTemplateName(''); }}
                className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSave(true)}
              className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-white border border-gray-700"
            >
              Save as Template
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {tab === 'vision' ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">System Prompt</label>
              <textarea
                value={prompts.visionSystemPrompt}
                onChange={e => onChange({ ...prompts, visionSystemPrompt: e.target.value })}
                rows={6}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-300 font-mono resize-y focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">User Prompt</label>
              <textarea
                value={prompts.visionUserPrompt}
                onChange={e => onChange({ ...prompts, visionUserPrompt: e.target.value })}
                rows={6}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-300 font-mono resize-y focus:outline-none focus:border-blue-500"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">System Prompt</label>
              <textarea
                value={prompts.codegenSystemPrompt}
                onChange={e => onChange({ ...prompts, codegenSystemPrompt: e.target.value })}
                rows={6}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-300 font-mono resize-y focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">User Prompt</label>
              <textarea
                value={prompts.codegenUserPrompt}
                onChange={e => onChange({ ...prompts, codegenUserPrompt: e.target.value })}
                rows={6}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-300 font-mono resize-y focus:outline-none focus:border-blue-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
