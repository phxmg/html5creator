import { ImageGenModel } from '../types';

export const geminiImageGenAdapter: ImageGenModel = {
  id: 'imagen-4-fast',
  name: 'Imagen 4 Fast',
  provider: 'google',
  async generate(prompt: string, _width: number, _height: number): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    // Try Imagen 4 Fast endpoint first
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:generateImages?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            config: { numberOfImages: 1 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const b64 = data.generatedImages?.[0]?.image?.imageBytes;
        if (b64) return `data:image/png;base64,${b64}`;
      }
    } catch {
      // Fall through to Gemini Flash fallback
    }

    // Fallback: Gemini 2.5 Flash with image generation
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini image gen failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error('No image data in Gemini response');
  },
};
