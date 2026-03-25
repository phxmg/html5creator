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

      const hasImages = Object.keys(imageDataUris).length > 0;
      const imageInstruction = hasImages
        ? `\n\nFor image regions, use these exact img src values:\n${
            Object.entries(imageDataUris).map(([regionId]) =>
              `- Region "${regionId}": src="__IMG_${regionId}__"`
            ).join('\n')
          }\nI will replace the placeholders with actual data URIs after generation.`
        : '';

      const fullUserPrompt = userPrompt
        .replace('{analysisJson}', JSON.stringify(analysis, null, 2))
        .replace('{imageMapping}', imageInstruction);

      const response = await client.chat.completions.create({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullUserPrompt + imageInstruction },
        ],
        max_tokens: 16384,
      });

      let html = response.choices[0]?.message?.content || '';
      html = stripCodeFences(html);

      for (const [regionId, dataUri] of Object.entries(imageDataUris)) {
        html = html.replaceAll(`__IMG_${regionId}__`, dataUri);
      }

      return html;
    },
  };
}

export const gpt53CodegenAdapter = createOpenAIAdapter('gpt-4.1', 'gpt-5.3', 'GPT-5.3');
export const gpt41CodegenAdapter = createOpenAIAdapter('gpt-4.1', 'gpt-4.1', 'GPT-4.1');
