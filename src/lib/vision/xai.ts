import OpenAI from 'openai';
import { VisionModel, AdAnalysis } from '../types';
import { parseJsonResponse } from './utils';

export const grokAdapter: VisionModel = {
  id: 'grok-2-vision',
  name: 'Grok 2 Vision',
  provider: 'xai',
  async analyze(imageBase64: string, mimeType: string, systemPrompt: string, userPrompt: string): Promise<AdAnalysis> {
    const client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });

    const response = await client.chat.completions.create({
      model: 'grok-2-vision-1212',
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
    if (!text) throw new Error('xAI returned empty response');
    return parseJsonResponse(text);
  },
};
