import { ImageGenModel } from '../types';

const SDXL_VERSION = '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';

async function fetchUrlToDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

export const replicateImageGenAdapter: ImageGenModel = {
  id: 'sdxl',
  name: 'Stable Diffusion XL',
  provider: 'replicate',
  async generate(prompt: string, width: number, height: number): Promise<string> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error('REPLICATE_API_TOKEN not set');

    const w = Math.min(1024, Math.round(width / 64) * 64) || 1024;
    const h = Math.min(1024, Math.round(height / 64) * 64) || 1024;

    // Use the official model endpoint instead of version hash (avoids deprecation)
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',  // Wait for result synchronously (up to 60s)
      },
      body: JSON.stringify({
        version: SDXL_VERSION,
        input: { prompt, width: w, height: h, num_outputs: 1 },
      }),
    });

    if (createRes.status === 429) {
      // Rate limited — wait and retry once
      await new Promise((r) => setTimeout(r, 10000));
      const retryRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify({
          version: SDXL_VERSION,
          input: { prompt, width: w, height: h, num_outputs: 1 },
        }),
      });
      if (!retryRes.ok) throw new Error(`Replicate create failed after retry: ${retryRes.status} ${await retryRes.text()}`);
      const prediction = await retryRes.json();
      if (prediction.status === 'succeeded' && prediction.output) {
        const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        return await fetchUrlToDataUri(outputUrl);
      }
      // Fall through to polling
    }

    if (!createRes.ok) throw new Error(`Replicate create failed: ${createRes.status} ${await createRes.text()}`);
    const prediction = await createRes.json();

    // If Prefer: wait returned a completed prediction
    if (prediction.status === 'succeeded' && prediction.output) {
      const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      return await fetchUrlToDataUri(outputUrl);
    }

    // Poll for completion
    const deadline = Date.now() + 90000;
    const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pollRes.ok) continue;
      const status = await pollRes.json();
      if (status.status === 'succeeded') {
        const outputUrl = Array.isArray(status.output) ? status.output[0] : status.output;
        if (!outputUrl) throw new Error('No output URL from Replicate');
        return await fetchUrlToDataUri(outputUrl);
      }
      if (status.status === 'failed' || status.status === 'canceled') {
        throw new Error(`Replicate prediction failed: ${status.error}`);
      }
    }
    throw new Error('Replicate prediction timed out');
  },
};
