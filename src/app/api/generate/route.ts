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

          const outputDir = path.join(process.cwd(), 'public', 'outputs', runId);
          await mkdir(outputDir, { recursive: true });
          const imagesDir = path.join(outputDir, 'images');
          await mkdir(imagesDir, { recursive: true });

          // Save the analysis and prompts for this run
          await writeFile(
            path.join(outputDir, `analysis-${analysisModelId}.json`),
            JSON.stringify(analysis, null, 2)
          );

          // Generate images for all imageRegions
          const imageRegions = analysis.imageRegions || [];
          const imageDataUris: Record<string, string> = {};

          if (imageRegions.length > 0) {
            send({ type: 'generation_start', modelId: imagegenModelId, data: { step: 'images', total: imageRegions.length } } as any);

            const imageResults = await generateImages(
              imageRegions.map(r => ({
                id: r.id,
                prompt: r.generationPrompt,
                width: Math.max(512, Math.min(1024, Math.round((r.bounds.w / 100) * analysis.canvas.width))),
                height: Math.max(512, Math.min(1024, Math.round((r.bounds.h / 100) * analysis.canvas.height))),
              })),
              imagegenModelId
            );

            for (const [id, dataUri] of Object.entries(imageResults)) {
              imageDataUris[id] = dataUri;

              // Save generated image to disk
              const base64Data = dataUri.split(',')[1];
              const ext = dataUri.startsWith('data:image/png') ? 'png' : 'jpg';
              if (base64Data) {
                await writeFile(
                  path.join(imagesDir, `${id}-${imagegenModelId}.${ext}`),
                  Buffer.from(base64Data, 'base64')
                );
              }

              // Save the prompt used
              const region = imageRegions.find(r => r.id === id);
              if (region) {
                await writeFile(
                  path.join(imagesDir, `${id}-${imagegenModelId}-prompt.txt`),
                  region.generationPrompt
                );
              }
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

          // Save HTML with imagegen model in filename
          const filename = `${analysisModelId}-${codegenModelId}-${imagegenModelId}.html`;
          await writeFile(path.join(outputDir, filename), html);

          // Save the codegen prompts used
          await writeFile(
            path.join(outputDir, `codegen-prompt-${codegenModelId}.txt`),
            `=== SYSTEM PROMPT ===\n${sysPrompt}\n\n=== USER PROMPT (template) ===\n${usrPrompt}`
          );

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
