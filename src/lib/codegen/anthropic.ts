import Anthropic from '@anthropic-ai/sdk';
import { AdAnalysis, CodeGenModel } from '../types';

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

function createAnthropicAdapter(modelId: string, id: string, name: string): CodeGenModel {
  return {
    id,
    name,
    provider: 'anthropic',
    async generate(
      analysis: AdAnalysis,
      imageDataUris: Record<string, string>,
      systemPrompt: string,
      userPrompt: string
    ): Promise<string> {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const imageMapping = Object.entries(imageDataUris)
        .map(([regionId, dataUri]) => `Region "${regionId}": ${dataUri.substring(0, 80)}...`)
        .join('\n');

      const fullUserPrompt = userPrompt
        .replace('{analysisJson}', JSON.stringify(analysis, null, 2))
        .replace('{imageMapping}', Object.entries(imageDataUris)
          .map(([regionId, dataUri]) => `Region "${regionId}":\n${dataUri}`)
          .join('\n\n'));

      const response = await client.messages.create({
        model: modelId,
        max_tokens: 16384,
        system: systemPrompt,
        messages: [{ role: 'user', content: fullUserPrompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return stripCodeFences(text);
    },
  };
}

export const sonnetCodegenAdapter = createAnthropicAdapter('claude-sonnet-4-20250514', 'claude-sonnet', 'Claude Sonnet');
export const opusCodegenAdapter = createAnthropicAdapter('claude-opus-4-6', 'claude-opus', 'Claude Opus');
