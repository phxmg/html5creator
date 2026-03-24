import Anthropic from '@anthropic-ai/sdk';
import { VisionModel, AdAnalysis } from '../types';
import { AD_ANALYSIS_TOOL } from '../prompts/analysis-schema';

function createAdapter(modelId: string, modelName: string): VisionModel {
  return {
    id: modelId,
    name: modelName,
    provider: 'anthropic',
    async analyze(imageBase64: string, mimeType: string, systemPrompt: string, userPrompt: string): Promise<AdAnalysis> {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

      const response = await client.messages.create({
        model: modelId,
        max_tokens: 16384,
        system: systemPrompt,
        tools: [AD_ANALYSIS_TOOL as any],
        tool_choice: { type: 'tool', name: 'ad_analysis' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
              { type: 'text', text: userPrompt },
            ],
          },
        ],
      });

      const toolBlock = response.content.find((b) => b.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        throw new Error('Anthropic did not return a tool_use block');
      }

      return toolBlock.input as AdAnalysis;
    },
  };
}

export const sonnetAdapter = createAdapter('claude-sonnet-4-20250514', 'Claude Sonnet 4.5');
export const opusAdapter = createAdapter('claude-opus-4-6', 'Claude Opus 4.6');
