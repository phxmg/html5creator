import OpenAI from 'openai';
import { VisionModel, AdAnalysis } from '../types';
import { parseJsonResponse } from './utils';

function createAdapter(modelId: string, modelName: string): VisionModel {
  return {
    id: modelId,
    name: modelName,
    provider: 'openai',
    async analyze(imageBase64: string, mimeType: string, systemPrompt: string, userPrompt: string): Promise<AdAnalysis> {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await client.chat.completions.create({
        model: modelId,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 16384,
        temperature: 0.1,
      });

      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('OpenAI returned empty response');
      return parseJsonResponse(text);
    },
  };
}

export const gpt41Adapter = createAdapter('gpt-4.1', 'GPT-4.1');
