import { ImageGenModel } from '../types';
import { openaiImageGenAdapter } from './openai';
import { nanoBananaAdapter, fluxProAdapter } from './fal';
import { geminiImageGenAdapter } from './gemini';
import { replicateImageGenAdapter } from './replicate';

export const imageGenModels: Record<string, ImageGenModel> = {
  [openaiImageGenAdapter.id]: openaiImageGenAdapter,
  [nanoBananaAdapter.id]: nanoBananaAdapter,
  [fluxProAdapter.id]: fluxProAdapter,
  [geminiImageGenAdapter.id]: geminiImageGenAdapter,
  [replicateImageGenAdapter.id]: replicateImageGenAdapter,
};

export function getAvailableImageGenModels(): ImageGenModel[] {
  const available: ImageGenModel[] = [];
  if (process.env.OPENAI_API_KEY) available.push(openaiImageGenAdapter);
  if (process.env.FAL_API_KEY) {
    available.push(nanoBananaAdapter);
    available.push(fluxProAdapter);
  }
  if (process.env.GEMINI_API_KEY) available.push(geminiImageGenAdapter);
  if (process.env.REPLICATE_API_TOKEN) available.push(replicateImageGenAdapter);
  return available;
}

async function generateWithRetry(
  model: ImageGenModel,
  prompt: string,
  width: number,
  height: number,
  maxRetries: number = 10,
  delayMs: number = 10000
): Promise<string> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await model.generate(prompt, width, height);
    } catch (err: any) {
      lastError = err;
      const isRateLimit = err.message?.includes('429') || err.message?.includes('rate') || err.message?.includes('throttl');
      if (isRateLimit && attempt < maxRetries) {
        console.log(`[imagegen] Rate limited on attempt ${attempt + 1}, retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('Image generation failed after retries');
}

export async function generateImages(
  regions: Array<{ id: string; prompt: string; width: number; height: number }>,
  modelId: string
): Promise<Record<string, string>> {
  const model = imageGenModels[modelId];
  if (!model) throw new Error(`Unknown image gen model: ${modelId}`);

  // Generate images sequentially to avoid rate limits
  const map: Record<string, string> = {};
  for (const region of regions) {
    const dataUri = await generateWithRetry(model, region.prompt, region.width, region.height);
    map[region.id] = dataUri;
  }
  return map;
}
