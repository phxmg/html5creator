import { ImageGenModel } from '../types';

export const geminiImageGenAdapter: ImageGenModel = {
  id: 'imagen-4-fast',
  name: 'Imagen 4 Fast',
  provider: 'google',
  async generate(prompt: string, _width: number, _height: number): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    // Use the :predict endpoint for Imagen 4 Fast
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Imagen 4 Fast failed: ${res.status} ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('No image data in Imagen response');
    return `data:image/png;base64,${b64}`;
  },
};
