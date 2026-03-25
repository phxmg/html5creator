'use client';

import { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import UploadZone from '@/components/UploadZone';
import PipelineConfig from '@/components/PipelineConfig';
import PromptEditor from '@/components/PromptEditor';
import HtmlPreview from '@/components/HtmlPreview';
import { AnalysisResult, GenerationResult, PromptTemplate } from '@/lib/types';

type Phase = 'upload' | 'analyzing' | 'results' | 'generating' | 'comparison';

interface AvailableModels {
  vision: Array<{ id: string; name: string; provider: string; available: boolean }>;
  codegen: Array<{ id: string; name: string; provider: string; available: boolean }>;
  imagegen: Array<{ id: string; name: string; provider: string; available: boolean }>;
}

interface Config {
  visionModels: string[];
  codegenModels: string[];
  imagegenModels: string[];
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
  const [generations, setGenerations] = useState<Record<string, GenerationResult>>({});
  const [availableModels, setAvailableModels] = useState<AvailableModels>({ vision: [], codegen: [], imagegen: [] });
  const [config, setConfig] = useState<Config>({ visionModels: [], codegenModels: [], imagegenModels: [] });
  const [prompts, setPrompts] = useState({
    visionSystemPrompt: '',
    visionUserPrompt: '',
    codegenSystemPrompt: '',
    codegenUserPrompt: '',
  });
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then((data: AvailableModels) => {
        setAvailableModels(data);
        const availVision = data.vision.filter(m => m.available).map(m => m.id);
        const availCodegen = data.codegen.filter(m => m.available).slice(0, 1).map(m => m.id);
        const availImagegen = data.imagegen.filter(m => m.available).slice(0, 1).map(m => m.id);
        setConfig({
          visionModels: availVision,
          codegenModels: availCodegen,
          imagegenModels: availImagegen,
        });
      })
      .catch(console.error);
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageFile || config.visionModels.length === 0) return;

    setPhase('analyzing');
    const initial: Record<string, AnalysisResult> = {};
    config.visionModels.forEach(id => { initial[id] = { status: 'pending' }; });
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
              setAnalyses(prev => ({ ...prev, [event.modelId]: { status: 'complete', result: event.data, duration: event.duration } }));
            } else if (event.type === 'analysis_error') {
              setAnalyses(prev => ({ ...prev, [event.modelId]: { status: 'error', error: event.error, duration: event.duration } }));
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

  // Generate HTML5 for a given analysis across all selected codegen × imagegen combos
  const handleGenerate = useCallback(async (analysisModelId: string) => {
    const analysis = analyses[analysisModelId]?.result;
    if (!analysis || !runId) return;
    if (config.codegenModels.length === 0 || config.imagegenModels.length === 0) return;

    setPhase('generating');

    // Build all combos
    const combos: Array<{ codegenId: string; imagegenId: string; key: string }> = [];
    for (const cg of config.codegenModels) {
      for (const ig of config.imagegenModels) {
        const key = `${analysisModelId}__${cg}__${ig}`;
        combos.push({ codegenId: cg, imagegenId: ig, key });
      }
    }

    // Initialize all as running
    setGenerations(prev => {
      const next = { ...prev };
      combos.forEach(c => { next[c.key] = { status: 'running' }; });
      return next;
    });

    // Fire all in parallel
    const promises = combos.map(async ({ codegenId, imagegenId, key }) => {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId, analysisModelId, analysis,
            codegenModelId: codegenId,
            imagegenModelId: imagegenId,
            ...(prompts.codegenSystemPrompt && { codegenSystemPrompt: prompts.codegenSystemPrompt }),
            ...(prompts.codegenUserPrompt && { codegenUserPrompt: prompts.codegenUserPrompt }),
          }),
        });

        const reader = response.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'generation_complete') {
                setGenerations(prev => ({ ...prev, [key]: { status: 'complete', html: event.data.html, duration: event.duration } }));
              } else if (event.type === 'generation_error') {
                setGenerations(prev => ({ ...prev, [key]: { status: 'error', error: event.error, duration: event.duration } }));
              }
            } catch {}
          }
        }
      } catch (err: any) {
        setGenerations(prev => ({ ...prev, [key]: { status: 'error', error: err.message } }));
      }
    });

    await Promise.allSettled(promises);
    setPhase('comparison');
  }, [analyses, runId, config, prompts, selectedGeneration]);

  // Generate ALL: for every successful analysis × every codegen × every imagegen
  const handleGenerateAll = useCallback(async () => {
    const successfulAnalyses = Object.entries(analyses).filter(([, r]) => r.status === 'complete' && r.result);
    if (successfulAnalyses.length === 0 || config.codegenModels.length === 0 || config.imagegenModels.length === 0) return;

    setPhase('generating');

    const allCombos: Array<{ analysisId: string; codegenId: string; imagegenId: string; key: string }> = [];
    for (const [analysisId] of successfulAnalyses) {
      for (const cg of config.codegenModels) {
        for (const ig of config.imagegenModels) {
          allCombos.push({ analysisId, codegenId: cg, imagegenId: ig, key: `${analysisId}__${cg}__${ig}` });
        }
      }
    }

    setGenerations(prev => {
      const next = { ...prev };
      allCombos.forEach(c => { next[c.key] = { status: 'running' }; });
      return next;
    });

    const promises = allCombos.map(async ({ analysisId, codegenId, imagegenId, key }) => {
      const analysis = analyses[analysisId]?.result;
      if (!analysis) return;

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId, analysisModelId: analysisId, analysis,
            codegenModelId: codegenId, imagegenModelId: imagegenId,
            ...(prompts.codegenSystemPrompt && { codegenSystemPrompt: prompts.codegenSystemPrompt }),
            ...(prompts.codegenUserPrompt && { codegenUserPrompt: prompts.codegenUserPrompt }),
          }),
        });

        const reader = response.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'generation_complete') {
                setGenerations(prev => ({ ...prev, [key]: { status: 'complete', html: event.data.html, duration: event.duration } }));
              } else if (event.type === 'generation_error') {
                setGenerations(prev => ({ ...prev, [key]: { status: 'error', error: event.error, duration: event.duration } }));
              }
            } catch {}
          }
        }
      } catch (err: any) {
        setGenerations(prev => ({ ...prev, [key]: { status: 'error', error: err.message } }));
      }
    });

    await Promise.allSettled(promises);
    setPhase('comparison');
  }, [analyses, runId, config, prompts]);

  const handleReset = () => {
    setPhase('upload');
    setImageFile(null);
    setImagePreview(null);
    setRunId(null);
    setAnalyses({});
    setGenerations({});
    setSelectedGeneration(null);
  };

  const modelNameMap: Record<string, string> = {};
  [...availableModels.vision, ...availableModels.codegen, ...availableModels.imagegen].forEach(m => {
    modelNameMap[m.id] = m.name;
  });

  const completedAnalyses = Object.entries(analyses).filter(([, r]) => r.status === 'complete');
  const totalCombos = completedAnalyses.length * config.codegenModels.length * config.imagegenModels.length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <div className="flex items-center gap-4">
          {phase !== 'upload' && (
            <button onClick={handleReset} className="text-sm text-gray-400 hover:text-white transition-colors">
              &larr; New Upload
            </button>
          )}
          <span className="text-sm text-gray-500">
            {phase === 'upload' && 'Upload an ad image to begin'}
            {phase === 'analyzing' && 'Analyzing with AI vision models...'}
            {phase === 'results' && 'Analysis complete — generate HTML5 from results'}
            {phase === 'generating' && `Generating HTML5 ads — ${Object.values(generations).filter(g => g.status === 'complete').length}/${Object.keys(generations).length} complete`}
            {phase === 'comparison' && `${Object.values(generations).filter(g => g.status === 'complete').length} HTML5 ads generated — compare results`}
          </span>
        </div>
        <button
          onClick={() => setShowPromptEditor(!showPromptEditor)}
          className="text-sm px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
        >
          {showPromptEditor ? 'Hide' : 'Edit'} Prompts
        </button>
      </div>

      {/* Prompt Editor */}
      {showPromptEditor && (
        <div className="border-b border-gray-800 p-4 bg-gray-900/50">
          <PromptEditor
            prompts={prompts}
            onChange={setPrompts}
            onSave={(name) => {
              fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ...prompts }),
              }).then(() => fetch('/api/templates').then(r => r.json()).then(setTemplates));
            }}
            templates={templates}
            onLoadTemplate={(t) => setPrompts({
              visionSystemPrompt: t.visionSystemPrompt,
              visionUserPrompt: t.visionUserPrompt,
              codegenSystemPrompt: t.codegenSystemPrompt,
              codegenUserPrompt: t.codegenUserPrompt,
            })}
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
                  <img src={imagePreview} alt="Uploaded ad" className="max-h-64 rounded-lg border border-gray-700" />
                </div>
                <div className="flex-1">
                  <PipelineConfig config={config} onChange={setConfig} availableModels={availableModels} />
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
            <div className="flex-shrink-0 w-80">
              <p className="text-sm text-gray-400 mb-2">Original Image</p>
              {imagePreview && <img src={imagePreview} alt="Original ad" className="w-full rounded-lg border border-gray-700 sticky top-6" />}

              {phase === 'results' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Code Gen Models ({config.codegenModels.length})</p>
                    {availableModels.codegen.filter(m => m.available).map(m => (
                      <label key={m.id} className="flex items-center gap-2 p-1 text-sm cursor-pointer hover:bg-gray-800 rounded">
                        <input
                          type="checkbox"
                          checked={config.codegenModels.includes(m.id)}
                          onChange={() => {
                            const cur = config.codegenModels;
                            setConfig(c => ({
                              ...c,
                              codegenModels: cur.includes(m.id) ? cur.filter(x => x !== m.id) : [...cur, m.id],
                            }));
                          }}
                          className="accent-blue-500"
                        />
                        <span>{m.name}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Image Gen Models ({config.imagegenModels.length})</p>
                    {availableModels.imagegen.filter(m => m.available).map(m => (
                      <label key={m.id} className="flex items-center gap-2 p-1 text-sm cursor-pointer hover:bg-gray-800 rounded">
                        <input
                          type="checkbox"
                          checked={config.imagegenModels.includes(m.id)}
                          onChange={() => {
                            const cur = config.imagegenModels;
                            setConfig(c => ({
                              ...c,
                              imagegenModels: cur.includes(m.id) ? cur.filter(x => x !== m.id) : [...cur, m.id],
                            }));
                          }}
                          className="accent-blue-500"
                        />
                        <span>{m.name}</span>
                      </label>
                    ))}
                  </div>

                  {completedAnalyses.length > 0 && config.codegenModels.length > 0 && config.imagegenModels.length > 0 && (
                    <button
                      onClick={handleGenerateAll}
                      className="w-full py-2 px-4 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      Generate All ({totalCombos} combo{totalCombos > 1 ? 's' : ''})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-2">Vision Analysis Results</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(analyses).map(([modelId, result]) => (
                  <div key={modelId} className={`rounded-lg border p-4 transition-all ${
                    result.status === 'complete' ? 'border-green-600 bg-gray-900'
                    : result.status === 'error' ? 'border-red-600 bg-gray-900'
                    : result.status === 'running' ? 'border-blue-500 bg-gray-900 animate-pulse'
                    : 'border-gray-700 bg-gray-900'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white">{modelNameMap[modelId] || modelId}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        result.status === 'complete' ? 'bg-green-900 text-green-300' :
                        result.status === 'error' ? 'bg-red-900 text-red-300' :
                        result.status === 'running' ? 'bg-blue-900 text-blue-300' :
                        'bg-gray-800 text-gray-400'
                      }`}>{result.status}</span>
                    </div>

                    {result.duration != null && <p className="text-xs text-gray-500 mb-2">{(result.duration / 1000).toFixed(1)}s</p>}
                    {result.status === 'error' && <p className="text-sm text-red-400 break-all">{result.error}</p>}

                    {result.status === 'complete' && result.result && (
                      <div className="space-y-2">
                        <div className="flex gap-1 flex-wrap">
                          {result.result.colorPalette?.slice(0, 6).map((c, i) => (
                            <div key={i} className="w-6 h-6 rounded border border-gray-600" style={{ backgroundColor: c.hex }} title={`${c.hex} - ${c.usage}`} />
                          ))}
                        </div>
                        <div className="flex gap-3 text-xs text-gray-400">
                          <span>{result.result.textElements?.length || 0} texts</span>
                          <span>{result.result.imageRegions?.length || 0} images</span>
                          <span>{result.result.buttons?.length || 0} buttons</span>
                          <span>{result.result.sections?.length || 0} sections</span>
                        </div>
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">View raw JSON</summary>
                          <pre className="mt-2 text-xs text-gray-400 bg-gray-950 rounded p-2 max-h-48 overflow-auto">
                            {JSON.stringify(result.result, null, 2)}
                          </pre>
                        </details>
                        {phase === 'results' && config.codegenModels.length > 0 && config.imagegenModels.length > 0 && (
                          <button
                            onClick={() => handleGenerate(modelId)}
                            className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
                          >
                            Generate HTML5 ({config.codegenModels.length}×{config.imagegenModels.length} combos) →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generating / Comparison Phase — Grid View */}
        {(phase === 'generating' || phase === 'comparison') && (() => {
          // Get ad dimensions from first completed analysis
          const firstAnalysis = Object.values(analyses).find(a => a.status === 'complete' && a.result);
          const adWidth = firstAnalysis?.result?.canvas?.width || 300;
          const adHeight = firstAnalysis?.result?.canvas?.height || 250;
          const hasCompleted = Object.values(generations).some(g => g.status === 'complete' && g.html);

          return (
            <div className="space-y-4">
              {/* Action bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setPhase('results')} className="text-xs px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700">
                  + Generate More
                </button>
                {hasCompleted && (
                  <button
                    onClick={async () => {
                      const zip = new JSZip();
                      if (imageFile) zip.file(`original-${imageFile.name}`, imageFile);
                      for (const [key, gen] of Object.entries(generations)) {
                        if (gen.status === 'complete' && gen.html) zip.file(`${key}.html`, gen.html);
                      }
                      const blob = await zip.generateAsync({ type: 'blob' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `adgen-${runId}.zip`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-xs px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
                  >
                    Download All as ZIP
                  </button>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {adWidth}x{adHeight} &middot; {Object.values(generations).filter(g => g.status === 'complete').length}/{Object.keys(generations).length} complete
                </span>
              </div>

              {/* Grid: original + all generations */}
              <div className="flex flex-wrap gap-4">
                {/* Original image at actual size */}
                <div className="flex-shrink-0">
                  <div className="border border-gray-500 overflow-hidden bg-white" style={{ width: adWidth, height: adHeight }}>
                    {imagePreview && <img src={imagePreview} alt="Original ad" style={{ width: adWidth, height: adHeight, objectFit: 'contain' }} />}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 text-center">Original</p>
                </div>

                {/* Generated results */}
                {Object.entries(generations).map(([key, gen]) => {
                  const parts = key.split('__');
                  const label = parts.map(p => modelNameMap[p] || p.split('/').pop() || p).join(' > ');
                  return (
                    <div key={key} className="flex-shrink-0 group relative">
                      <div className={`overflow-hidden transition-all ${
                        gen.status === 'complete' ? 'border-2 border-green-600'
                        : gen.status === 'error' ? 'border-2 border-red-600'
                        : 'border-2 border-blue-500 animate-pulse'
                      }`} style={{ width: adWidth, height: adHeight }}>
                        {gen.status === 'complete' && gen.html ? (
                          <HtmlPreview html={gen.html} width={adWidth} height={adHeight} />
                        ) : gen.status === 'error' ? (
                          <div className="w-full h-full bg-gray-900 flex items-center justify-center p-3">
                            <p className="text-xs text-red-400 text-center break-all">{gen.error}</p>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                            <div className="text-center">
                              <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-2" />
                              <p className="text-xs text-blue-400">Generating...</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 truncate text-center" style={{ maxWidth: adWidth }}>
                        {label}
                        {gen.duration != null && ` (${(gen.duration / 1000).toFixed(1)}s)`}
                      </p>
                      {/* Hover actions */}
                      {gen.status === 'complete' && gen.html && (
                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                          <button
                            onClick={() => {
                              const blob = new Blob([gen.html!], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `ad-${runId}-${key}.html`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="px-1.5 py-0.5 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-medium shadow"
                            title="Download HTML"
                          >
                            DL
                          </button>
                          <button
                            onClick={() => {
                              const w = window.open('', '_blank');
                              if (w) { w.document.write(gen.html!); w.document.close(); }
                            }}
                            className="px-1.5 py-0.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-[10px] font-medium shadow"
                            title="Open in New Tab"
                          >
                            Tab
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
