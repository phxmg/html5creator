import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { generateImages } from '@/lib/imagegen';
import { getAvailableCodeGenModels } from '@/lib/codegen';
import { CODEGEN_SYSTEM_PROMPT, CODEGEN_USER_PROMPT_TEMPLATE } from '@/lib/prompts/codegen-system';
import { AdAnalysis, SSEEvent } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json();
  const {
    runId,
    analysisModelId,
    analysis,
    codegenModelId,
    imagegenModelId,
    codegenSystemPrompt,
    codegenUserPrompt,
  } = body as {
    runId: string;
    analysisModelId: string;
    analysis: AdAnalysis;
    codegenModelId: string;
    imagegenModelId: string;
    codegenSystemPrompt?: string;
    codegenUserPrompt?: string;
  };

  if (!runId || !analysis || !codegenModelId || !imagegenModelId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      (async () => {
        try {
          send({ type: 'generation_start', modelId: codegenModelId });

          // Generate images for all imageRegions
          const imageRegions = analysis.imageRegions || [];
          const imageDataUris: Record<string, string> = {};

          if (imageRegions.length > 0) {
            send({ type: 'generation_start', modelId: imagegenModelId, data: { step: 'images', total: imageRegions.length } } as any);

            const imageResults = await generateImages(
              imageRegions.map(r => ({
                id: r.id,
                prompt: r.generationPrompt,
                width: Math.round((r.bounds.w / 100) * analysis.canvas.width),
                height: Math.round((r.bounds.h / 100) * analysis.canvas.height),
              })),
              imagegenModelId
            );

            for (const [id, dataUri] of Object.entries(imageResults)) {
              imageDataUris[id] = dataUri;
            }

            send({ type: 'generation_start', modelId: imagegenModelId, data: { step: 'images_complete', count: Object.keys(imageDataUris).length } } as any);
          }

          // Run code generation
          const codegenModels = getAvailableCodeGenModels();
          const model = codegenModels.find(m => m.id === codegenModelId);
          if (!model) {
            send({ type: 'generation_error', modelId: codegenModelId, error: `Model ${codegenModelId} not available` });
            controller.close();
            return;
          }

          const sysPrompt = codegenSystemPrompt || CODEGEN_SYSTEM_PROMPT;
          const usrPrompt = codegenUserPrompt || CODEGEN_USER_PROMPT_TEMPLATE;

          const start = Date.now();
          const html = await model.generate(analysis, imageDataUris, sysPrompt, usrPrompt);
          const duration = Date.now() - start;

          // Save HTML
          const outputDir = path.join(process.cwd(), 'public', 'outputs', runId);
          await mkdir(outputDir, { recursive: true });
          const filename = `${analysisModelId}-${codegenModelId}.html`;
          await writeFile(path.join(outputDir, filename), html);

          send({
            type: 'generation_complete',
            modelId: codegenModelId,
            data: { html, htmlPath: `/outputs/${runId}/${filename}` },
            duration,
          });
          send({ type: 'done', modelId: '__all__' } as any);
        } catch (err: any) {
          send({ type: 'generation_error', modelId: codegenModelId, error: err.message });
          send({ type: 'done', modelId: '__all__' } as any);
        }
        controller.close();
      })();
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
