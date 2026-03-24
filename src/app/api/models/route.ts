import { NextResponse } from 'next/server';
import { visionRegistry, getAvailableModels } from '@/lib/vision';
import { codeGenModels, getAvailableCodeGenModels } from '@/lib/codegen';
import { imageGenModels, getAvailableImageGenModels } from '@/lib/imagegen';

export async function GET() {
  const formatModels = (models: Record<string, { id: string; name: string; provider: string }>, availableIds: string[]) =>
    Object.values(models).map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      available: availableIds.includes(m.id),
    }));

  const availableVision = getAvailableModels();
  const availableCodegen = getAvailableCodeGenModels();
  const availableImagegen = getAvailableImageGenModels();

  return NextResponse.json({
    vision: formatModels(visionRegistry, availableVision.map(m => m.id)),
    codegen: formatModels(codeGenModels, availableCodegen.map(m => m.id)),
    imagegen: formatModels(imageGenModels, availableImagegen.map(m => m.id)),
  });
}
