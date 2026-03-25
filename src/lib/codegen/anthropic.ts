import Anthropic from '@anthropic-ai/sdk';
import { AdAnalysis, CodeGenModel } from '../types';

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

function buildPrompt(analysis: AdAnalysis, imageDataUris: Record<string, string>, userPrompt: string): string {
  // Build a short mapping showing region IDs and their data URI variable names
  const imageInstructions = Object.keys(imageDataUris).length > 0
    ? `\n\n## Image Assets\nThe following image regions have been generated. Use the EXACT data URI provided for each region's <img> src attribute:\n${
        Object.entries(imageDataUris).map(([id, uri]) =>
          `- Region "${id}": Use this data URI (${uri.length} chars, starts with "${uri.substring(0, 40)}...")`
        ).join('\n')
      }\n\nIMPORTANT: I will provide the actual data URIs in a follow-up. For now, use placeholder src="IMG_${'{regionId}'}" and I'll replace them.`
    : '';

  return userPrompt
    .replace('{analysisJson}', JSON.stringify(analysis, null, 2))
    .replace('{imageMapping}', imageInstructions);
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

      // Build messages with image data URIs passed separately to keep prompt manageable
      const promptText = buildPrompt(analysis, imageDataUris, userPrompt);

      // If we have images, tell the model to use placeholder tags, then we'll replace them
      const hasImages = Object.keys(imageDataUris).length > 0;
      const imageInstruction = hasImages
        ? `\n\nFor image regions, use these exact img src values:\n${
            Object.entries(imageDataUris).map(([regionId]) =>
              `- Region "${regionId}": src="__IMG_${regionId}__"`
            ).join('\n')
          }\nI will replace the placeholders with actual data URIs after generation.`
        : '';

      const response = await client.messages.create({
        model: modelId,
        max_tokens: 16384,
        system: systemPrompt,
        messages: [{ role: 'user', content: promptText + imageInstruction }],
      });

      let html = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      html = stripCodeFences(html);

      // Replace image placeholders with actual data URIs
      for (const [regionId, dataUri] of Object.entries(imageDataUris)) {
        html = html.replaceAll(`__IMG_${regionId}__`, dataUri);
      }

      return html;
    },
  };
}

export const sonnetCodegenAdapter = createAnthropicAdapter('claude-sonnet-4-20250514', 'claude-sonnet', 'Claude Sonnet');
export const opusCodegenAdapter = createAnthropicAdapter('claude-opus-4-6', 'claude-opus', 'Claude Opus');
