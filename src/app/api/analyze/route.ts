import { nanoid } from 'nanoid';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { runAnalyses } from '@/lib/vision';
import { VISION_SYSTEM_PROMPT, VISION_USER_PROMPT } from '@/lib/prompts/vision-system';
import { SSEEvent } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const imageFile = formData.get('image') as File | null;
  const configRaw = formData.get('config') as string | null;

  if (!imageFile) {
    return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 });
  }

  const config = configRaw ? JSON.parse(configRaw) : {};
  const selectedModels: string[] = config.selectedVisionModels || [];
  const systemPrompt = config.visionSystemPrompt || VISION_SYSTEM_PROMPT;
  const userPrompt = config.visionUserPrompt || VISION_USER_PROMPT;

  if (selectedModels.length === 0) {
    return new Response(JSON.stringify({ error: 'No vision models selected' }), { status: 400 });
  }

  const runId = nanoid(12);
  const outputDir = path.join(process.cwd(), 'public', 'outputs', runId);
  await mkdir(outputDir, { recursive: true });

  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
  const ext = imageFile.name.split('.').pop() || 'png';
  await writeFile(path.join(outputDir, `original.${ext}`), imageBuffer);

  const imageBase64 = imageBuffer.toString('base64');
  // Detect actual MIME from magic bytes, don't trust the upload header
  let mimeType = imageFile.type || 'image/png';
  if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) mimeType = 'image/jpeg';
  else if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mimeType = 'image/png';
  else if (imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49) mimeType = 'image/gif';
  else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mimeType = 'image/webp';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // Send runId first
      send({ type: 'analysis_start', modelId: '__run__', data: { runId } } as any);

      const promises = selectedModels.map(modelId => {
        send({ type: 'analysis_start', modelId });
        const start = Date.now();

        return runAnalyses(imageBase64, mimeType, [modelId], systemPrompt, userPrompt)
          .then(results => {
            const result = results[modelId];
            if (result.error) {
              send({ type: 'analysis_error', modelId, error: result.error, duration: Date.now() - start });
            } else {
              send({ type: 'analysis_complete', modelId, data: result.result, duration: Date.now() - start });
            }
          })
          .catch(err => {
            send({ type: 'analysis_error', modelId, error: err.message, duration: Date.now() - start });
          });
      });

      Promise.allSettled(promises).then(() => {
        send({ type: 'done', modelId: '__all__' } as any);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
