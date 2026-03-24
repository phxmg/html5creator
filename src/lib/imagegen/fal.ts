import { ImageGenModel } from '../types';

async function fetchUrlToDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

function createFalAdapter(modelId: string, id: string, name: string): ImageGenModel {
  return {
    id,
    name,
    provider: 'fal',
    async generate(prompt: string, width: number, height: number): Promise<string> {
      const apiKey = process.env.FAL_API_KEY;
      if (!apiKey) throw new Error('FAL_API_KEY not set');

      // Submit job
      const submitRes = await fetch(`https://queue.fal.run/${modelId}`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image_size: { width, height },
        }),
      });
      if (!submitRes.ok) throw new Error(`FAL submit failed: ${submitRes.status} ${await submitRes.text()}`);
      const { request_id } = await submitRes.json();

      // Poll for completion
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(
          `https://queue.fal.run/${modelId}/requests/${request_id}/status`,
          { headers: { Authorization: `Key ${apiKey}` } }
        );
        if (!statusRes.ok) continue;
        const status = await statusRes.json();
        if (status.status === 'COMPLETED') break;
        if (status.status === 'FAILED') throw new Error(`FAL generation failed: ${JSON.stringify(status)}`);
      }

      // Get result
      const resultRes = await fetch(
        `https://queue.fal.run/${modelId}/requests/${request_id}`,
        { headers: { Authorization: `Key ${apiKey}` } }
      );
      if (!resultRes.ok) throw new Error(`FAL result fetch failed: ${resultRes.status}`);
      const result = await resultRes.json();
      const imageUrl = result.images?.[0]?.url;
      if (!imageUrl) throw new Error('No image URL in FAL response');
      return await fetchUrlToDataUri(imageUrl);
    },
  };
}

export const nanoBananaAdapter = createFalAdapter('fal-ai/nano-banana-pro', 'nano-banana-pro', 'Nano Banana Pro');
export const fluxProAdapter = createFalAdapter('fal-ai/flux-pro/v1.1', 'flux-pro-v1.1', 'Flux Pro v1.1');
