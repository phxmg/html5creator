import { GoogleGenerativeAI } from '@google/generative-ai';
import { AdAnalysis, CodeGenModel } from '../types';

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

export const geminiCodegenAdapter: CodeGenModel = {
  id: 'gemini-2.5-pro',
  name: 'Gemini 2.5 Pro',
  provider: 'google',
  async generate(
    analysis: AdAnalysis,
    imageDataUris: Record<string, string>,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: systemPrompt,
    });

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

    const result = await model.generateContent(fullUserPrompt + imageInstruction);
    let html = result.response.text();
    html = stripCodeFences(html);

    for (const [regionId, dataUri] of Object.entries(imageDataUris)) {
      html = html.replaceAll(`__IMG_${regionId}__`, dataUri);
    }

    return html;
  },
};
