'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import UploadZone from '@/components/UploadZone';
import PipelineConfig from '@/components/PipelineConfig';
import AnalysisPanel from '@/components/AnalysisPanel';
import ComparisonView from '@/components/ComparisonView';
import PromptEditor from '@/components/PromptEditor';
import HtmlPreview from '@/components/HtmlPreview';
import { AdAnalysis, AnalysisResult, GenerationResult, PromptTemplate } from '@/lib/types';

type Phase = 'upload' | 'analyzing' | 'results' | 'generating' | 'comparison';

interface AvailableModels {
  vision: Array<{ id: string; name: string; provider: string; available: boolean }>;
  codegen: Array<{ id: string; name: string; provider: string; available: boolean }>;
  imagegen: Array<{ id: string; name: string; provider: string; available: boolean }>;
}

interface Config {
  visionModels: string[];
  codegenModel: string;
  imagegenModel: string;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
  const [generations, setGenerations] = useState<Record<string, GenerationResult>>({});
  const [availableModels, setAvailableModels] = useState<AvailableModels>({ vision: [], codegen: [], imagegen: [] });
  const [config, setConfig] = useState<Config>({ visionModels: [], codegenModel: '', imagegenModel: '' });
  const [prompts, setPrompts] = useState({
    visionSystemPrompt: '',
    visionUserPrompt: '',
    codegenSystemPrompt: '',
    codegenUserPrompt: '',
  });
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);

  // Fetch available models on mount
  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then((data: AvailableModels) => {
        setAvailableModels(data);
        // Auto-select available models
        const availVision = data.vision.filter(m => m.available).map(m => m.id);
        const availCodegen = data.codegen.find(m => m.available);
        const availImagegen = data.imagegen.find(m => m.available);
        setConfig({
          visionModels: availVision,
          codegenModel: availCodegen?.id || '',
          imagegenModel: availImagegen?.id || '',
        });
      })
      .catch(console.error);
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageFile || config.visionModels.length === 0) return;

    setPhase('analyzing');
    // Initialize all analyses as pending
    const initial: Record<string, AnalysisResult> = {};
    config.visionModels.forEach(id => {
      initial[id] = { status: 'pending' };
    });
    setAnalyses(initial);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('config', JSON.stringify({
      selectedVisionModels: config.visionModels,
      ...(prompts.visionSystemPrompt && { visionSystemPrompt: prompts.visionSystemPrompt }),
      ...(prompts.visionUserPrompt && { visionUserPrompt: prompts.visionUserPrompt }),
    }));

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'analysis_start' && event.modelId === '__run__') {
              setRunId(event.data.runId);
            } else if (event.type === 'analysis_start') {
              setAnalyses(prev => ({ ...prev, [event.modelId]: { status: 'running' } }));
            } else if (event.type === 'analysis_complete') {
              setAnalyses(prev => ({
                ...prev,
                [event.modelId]: { status: 'complete', result: event.data, duration: event.duration },
              }));
            } else if (event.type === 'analysis_error') {
              setAnalyses(prev => ({
                ...prev,
                [event.modelId]: { status: 'error', error: event.error, duration: event.duration },
              }));
            } else if (event.type === 'done') {
              setPhase('results');
            }
          } catch {}
        }
      }
      setPhase('results');
    } catch (err: any) {
      console.error('Analysis failed:', err);
    }
  }, [imageFile, config.visionModels, prompts]);

  const handleGenerate = useCallback(async (analysisModelId: string) => {
    const analysis = analyses[analysisModelId]?.result;
    if (!analysis || !runId) return;

    const genKey = `${analysisModelId}__${config.codegenModel}`;
    setGenerations(prev => ({ ...prev, [genKey]: { status: 'running' } }));
    setPhase('generating');
    setSelectedAnalysis(analysisModelId);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          analysisModelId,
          analysis,
          codegenModelId: config.codegenModel,
          imagegenModelId: config.imagegenModel,
          ...(prompts.codegenSystemPrompt && { codegenSystemPrompt: prompts.codegenSystemPrompt }),
          ...(prompts.codegenUserPrompt && { codegenUserPrompt: prompts.codegenUserPrompt }),
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'generation_complete') {
              setGenerations(prev => ({
                ...prev,
                [genKey]: { status: 'complete', html: event.data.html, duration: event.duration },
              }));
              setPhase('comparison');
            } else if (event.type === 'generation_error') {
              setGenerations(prev => ({
                ...prev,
                [genKey]: { status: 'error', error: event.error, duration: event.duration },
              }));
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setGenerations(prev => ({
        ...prev,
        [genKey]: { status: 'error', error: err.message },
      }));
    }
  }, [analyses, runId, config, prompts]);

  const handleReset = () => {
    setPhase('upload');
    setImageFile(null);
    setImagePreview(null);
    setRunId(null);
    setAnalyses({});
    setGenerations({});
    setSelectedAnalysis(null);
  };

  const modelNameMap: Record<string, string> = {};
  [...availableModels.vision, ...availableModels.codegen, ...availableModels.imagegen].forEach(m => {
    modelNameMap[m.id] = m.name;
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <div className="flex items-center gap-4">
          {phase !== 'upload' && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              &larr; New Upload
            </button>
          )}
          <span className="text-sm text-gray-500">
            {phase === 'upload' && 'Upload an ad image to begin'}
            {phase === 'analyzing' && 'Analyzing with AI vision models...'}
            {phase === 'results' && 'Analysis complete — select a result to generate HTML5'}
            {phase === 'generating' && 'Generating HTML5 ad...'}
            {phase === 'comparison' && 'Compare original vs generated HTML5'}
          </span>
        </div>
        <button
          onClick={() => setShowPromptEditor(!showPromptEditor)}
          className="text-sm px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
        >
          {showPromptEditor ? 'Hide' : 'Edit'} Prompts
        </button>
      </div>

      {/* Prompt Editor Drawer */}
      {showPromptEditor && (
        <div className="border-b border-gray-800 p-4 bg-gray-900/50">
          <PromptEditor
            prompts={prompts}
            onChange={setPrompts}
            onSave={(name) => {
              // Save template
              fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ...prompts }),
              }).then(() => {
                // Refresh templates
                fetch('/api/templates').then(r => r.json()).then(setTemplates);
              });
            }}
            templates={templates}
            onLoadTemplate={(t) => {
              setPrompts({
                visionSystemPrompt: t.visionSystemPrompt,
                visionUserPrompt: t.visionUserPrompt,
                codegenSystemPrompt: t.codegenSystemPrompt,
                codegenUserPrompt: t.codegenUserPrompt,
              });
            }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Upload Phase */}
        {phase === 'upload' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <UploadZone onImageSelect={handleImageSelect} />

            {imagePreview && (
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <p className="text-sm text-gray-400 mb-2">Preview</p>
                  <img
                    src={imagePreview}
                    alt="Uploaded ad"
                    className="max-h-64 rounded-lg border border-gray-700"
                  />
                </div>
                <div className="flex-1">
                  <PipelineConfig
                    config={config}
                    onChange={setConfig}
                    availableModels={availableModels}
                  />
                </div>
              </div>
            )}

            {imageFile && config.visionModels.length > 0 && (
              <button
                onClick={handleAnalyze}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-lg"
              >
                Analyze with {config.visionModels.length} Vision Model{config.visionModels.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Analyzing / Results Phase */}
        {(phase === 'analyzing' || phase === 'results') && (
          <div className="flex gap-6">
            {/* Left: Original Image */}
            <div className="flex-shrink-0 w-80">
              <p className="text-sm text-gray-400 mb-2">Original Image</p>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Original ad"
                  className="w-full rounded-lg border border-gray-700 sticky top-6"
                />
              )}
              {phase === 'results' && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-400">Code Gen Model</p>
                  <select
                    value={config.codegenModel}
                    onChange={e => setConfig(c => ({ ...c, codegenModel: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  >
                    {availableModels.codegen.filter(m => m.available).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-400 mt-2">Image Gen Model</p>
                  <select
                    value={config.imagegenModel}
                    onChange={e => setConfig(c => ({ ...c, imagegenModel: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  >
                    {availableModels.imagegen.filter(m => m.available).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right: Analysis Cards */}
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-2">Vision Analysis Results</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(analyses).map(([modelId, result]) => (
                  <div key={modelId} className="relative">
                    <div
                      className={`rounded-lg border p-4 transition-all ${
                        result.status === 'complete'
                          ? 'border-green-600 bg-gray-900'
                          : result.status === 'error'
                          ? 'border-red-600 bg-gray-900'
                          : result.status === 'running'
                          ? 'border-blue-500 bg-gray-900 animate-pulse'
                          : 'border-gray-700 bg-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">
                          {modelNameMap[modelId] || modelId}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          result.status === 'complete' ? 'bg-green-900 text-green-300' :
                          result.status === 'error' ? 'bg-red-900 text-red-300' :
                          result.status === 'running' ? 'bg-blue-900 text-blue-300' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {result.status}
                        </span>
                      </div>

                      {result.duration && (
                        <p className="text-xs text-gray-500 mb-2">{(result.duration / 1000).toFixed(1)}s</p>
                      )}

                      {result.status === 'error' && (
                        <p className="text-sm text-red-400 truncate">{result.error}</p>
                      )}

                      {result.status === 'complete' && result.result && (
                        <div className="space-y-2">
                          {/* Color palette */}
                          <div className="flex gap-1 flex-wrap">
                            {result.result.colorPalette?.slice(0, 6).map((c, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded border border-gray-600"
                                style={{ backgroundColor: c.hex }}
                                title={`${c.hex} - ${c.usage}`}
                              />
                            ))}
                          </div>

                          {/* Stats */}
                          <div className="flex gap-3 text-xs text-gray-400">
                            <span>{result.result.textElements?.length || 0} texts</span>
                            <span>{result.result.imageRegions?.length || 0} images</span>
                            <span>{result.result.buttons?.length || 0} buttons</span>
                            <span>{result.result.sections?.length || 0} sections</span>
                          </div>

                          {/* Expandable JSON */}
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                              View raw JSON
                            </summary>
                            <pre className="mt-2 text-xs text-gray-400 bg-gray-950 rounded p-2 max-h-48 overflow-auto">
                              {JSON.stringify(result.result, null, 2)}
                            </pre>
                          </details>

                          {/* Generate button */}
                          {phase === 'results' && (
                            <button
                              onClick={() => handleGenerate(modelId)}
                              className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
                            >
                              Generate HTML5 →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generating Phase */}
        {phase === 'generating' && (
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-80">
              <p className="text-sm text-gray-400 mb-2">Original Image</p>
              {imagePreview && (
                <img src={imagePreview} alt="Original ad" className="w-full rounded-lg border border-gray-700" />
              )}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-500"></div>
                <p className="text-gray-400">Generating HTML5 ad...</p>
                <p className="text-sm text-gray-500">
                  Using {modelNameMap[config.codegenModel] || config.codegenModel} for code +{' '}
                  {modelNameMap[config.imagegenModel] || config.imagegenModel} for images
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Phase */}
        {phase === 'comparison' && (
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              {Object.entries(generations).map(([key, gen]) => (
                <button
                  key={key}
                  onClick={() => setSelectedAnalysis(key)}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    selectedAnalysis === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {key.split('__').map(k => modelNameMap[k] || k).join(' + ')}
                  {gen.status === 'complete' && gen.duration && ` (${(gen.duration / 1000).toFixed(1)}s)`}
                </button>
              ))}
              <button
                onClick={() => setPhase('results')}
                className="text-sm px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                + Generate Another
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Original */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Original Image</p>
                <div className="rounded-lg border border-gray-700 overflow-hidden bg-white">
                  {imagePreview && (
                    <img src={imagePreview} alt="Original ad" className="w-full" />
                  )}
                </div>
              </div>

              {/* Generated HTML5 */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Generated HTML5</p>
                {selectedAnalysis && generations[selectedAnalysis]?.status === 'complete' && generations[selectedAnalysis]?.html && (
                  <div className="rounded-lg border border-gray-700 overflow-hidden">
                    <HtmlPreview html={generations[selectedAnalysis].html!} />
                  </div>
                )}
                {selectedAnalysis && generations[selectedAnalysis]?.status === 'error' && (
                  <div className="rounded-lg border border-red-700 p-4 bg-gray-900">
                    <p className="text-red-400">{generations[selectedAnalysis].error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Download HTML button */}
            {selectedAnalysis && generations[selectedAnalysis]?.html && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const blob = new Blob([generations[selectedAnalysis!].html!], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ad-${runId}-${selectedAnalysis}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Download HTML
                </button>
                <button
                  onClick={() => {
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(generations[selectedAnalysis!].html!);
                      w.document.close();
                    }
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Open in New Tab
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
