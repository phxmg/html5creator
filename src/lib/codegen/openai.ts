import OpenAI from 'openai';
import { AdAnalysis, CodeGenModel } from '../types';

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

function createOpenAIAdapter(modelId: string, id: string, name: string): CodeGenModel {
  return {
    id,
    name,
    provider: 'openai',
    async generate(
      analysis: AdAnalysis,
      imageDataUris: Record<string, string>,
      systemPrompt: string,
      userPrompt: string
    ): Promise<string> {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const fullUserPrompt = userPrompt
        .replace('{analysisJson}', JSON.stringify(analysis, null, 2))
        .replace('{imageMapping}', Object.entries(imageDataUris)
          .map(([regionId, dataUri]) => `Region "${regionId}":\n${dataUri}`)
          .join('\n\n'));

      const response = await client.chat.completions.create({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullUserPrompt },
        ],
        max_tokens: 16384,
      });

      const text = response.choices[0]?.message?.content || '';
      return stripCodeFences(text);
    },
  };
}

export const gpt53CodegenAdapter = createOpenAIAdapter('gpt-4.1', 'gpt-5.3', 'GPT-5.3');
export const gpt41CodegenAdapter = createOpenAIAdapter('gpt-4.1', 'gpt-4.1', 'GPT-4.1');
