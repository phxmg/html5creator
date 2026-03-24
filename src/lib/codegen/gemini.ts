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

    const fullUserPrompt = userPrompt
      .replace('{analysisJson}', JSON.stringify(analysis, null, 2))
      .replace('{imageMapping}', Object.entries(imageDataUris)
        .map(([regionId, dataUri]) => `Region "${regionId}":\n${dataUri}`)
        .join('\n\n'));

    const result = await model.generateContent(fullUserPrompt);
    const text = result.response.text();
    return stripCodeFences(text);
  },
};
