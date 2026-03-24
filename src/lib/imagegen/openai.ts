import OpenAI from 'openai';
import { ImageGenModel } from '../types';

function closestSize(width: number, height: number): '1024x1024' | '1024x1536' | '1536x1024' {
  const aspect = width / height;
  if (aspect > 1.2) return '1536x1024';
  if (aspect < 0.8) return '1024x1536';
  return '1024x1024';
}

export const openaiImageGenAdapter: ImageGenModel = {
  id: 'gpt-image-1',
  name: 'GPT Image 1',
  provider: 'openai',
  async generate(prompt: string, width: number, height: number): Promise<string> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const size = closestSize(width, height);
    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size,
    });
    const b64 = response.data?.[0]?.b64_json;
    if (b64) {
      return `data:image/png;base64,${b64}`;
    }
    const url = response.data?.[0]?.url;
    if (url) {
      return await fetchUrlToDataUri(url);
    }
    throw new Error('No image data returned from OpenAI');
  },
};

async function fetchUrlToDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}
