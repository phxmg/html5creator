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

export async function generateImages(
  regions: Array<{ id: string; prompt: string; width: number; height: number }>,
  modelId: string
): Promise<Record<string, string>> {
  const model = imageGenModels[modelId];
  if (!model) throw new Error(`Unknown image gen model: ${modelId}`);

  const results = await Promise.all(
    regions.map(async (region) => {
      try {
        const dataUri = await model.generate(region.prompt, region.width, region.height);
        return { id: region.id, dataUri };
      } catch (error) {
        console.error(`Image generation failed for region ${region.id}:`, error);
        throw error;
      }
    })
  );

  const map: Record<string, string> = {};
  for (const r of results) {
    map[r.id] = r.dataUri;
  }
  return map;
}
