import { VisionModel, AnalysisResult } from '../types';
import { gpt41Adapter } from './openai';
import { sonnetAdapter, opusAdapter } from './anthropic';
import { geminiAdapter } from './gemini';
import { grokAdapter } from './xai';

export { parseJsonResponse } from './utils';

export const visionRegistry: Record<string, VisionModel> = {
  'gpt-4.1': gpt41Adapter,
  'claude-sonnet-4-20250514': sonnetAdapter,
  'claude-opus-4-6': opusAdapter,
  'gemini-2.5-pro': geminiAdapter,
  'grok-3': grokAdapter,
};

const API_KEY_MAP: Record<string, string> = {
  'gpt-4.1': 'OPENAI_API_KEY',
  'claude-sonnet-4-20250514': 'ANTHROPIC_API_KEY',
  'claude-opus-4-6': 'ANTHROPIC_API_KEY',
  'gemini-2.5-pro': 'GEMINI_API_KEY',
  'grok-3': 'XAI_API_KEY',
};

export function getAvailableModels(): VisionModel[] {
  return Object.entries(visionRegistry)
    .filter(([id]) => {
      const envVar = API_KEY_MAP[id];
      return envVar && !!process.env[envVar];
    })
    .map(([, model]) => model);
}

export async function runAnalyses(
  imageBase64: string,
  mimeType: string,
  selectedModelIds: string[],
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, AnalysisResult>> {
  const tasks = selectedModelIds.map(async (modelId) => {
    const model = visionRegistry[modelId];
    if (!model) {
      return { modelId, result: { status: 'error' as const, error: `Unknown model: ${modelId}` } };
    }

    const start = Date.now();
    try {
      const analysis = await model.analyze(imageBase64, mimeType, systemPrompt, userPrompt);
      return {
        modelId,
        result: { status: 'complete' as const, result: analysis, duration: Date.now() - start },
      };
    } catch (e) {
      return {
        modelId,
        result: { status: 'error' as const, error: (e as Error).message, duration: Date.now() - start },
      };
    }
  });

  const settled = await Promise.allSettled(tasks);

  const results: Record<string, AnalysisResult> = {};
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      results[outcome.value.modelId] = outcome.value.result;
    }
  }

  return results;
}
