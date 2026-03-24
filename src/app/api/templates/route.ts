import { NextResponse } from 'next/server';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { PromptTemplate } from '@/lib/types';

const TEMPLATES_DIR = path.join(process.cwd(), 'data', 'templates');

async function ensureDir() {
  await mkdir(TEMPLATES_DIR, { recursive: true });
}

export async function GET() {
  await ensureDir();
  try {
    const files = await readdir(TEMPLATES_DIR);
    const templates: PromptTemplate[] = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const raw = await readFile(path.join(TEMPLATES_DIR, f), 'utf-8');
      templates.push(JSON.parse(raw));
    }
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  await ensureDir();
  const body = await request.json();
  const now = new Date().toISOString();
  const template: PromptTemplate = {
    id: nanoid(10),
    name: body.name || 'Untitled Template',
    visionSystemPrompt: body.visionSystemPrompt || '',
    visionUserPrompt: body.visionUserPrompt || '',
    codegenSystemPrompt: body.codegenSystemPrompt || '',
    codegenUserPrompt: body.codegenUserPrompt || '',
    createdAt: now,
    updatedAt: now,
  };
  await writeFile(path.join(TEMPLATES_DIR, `${template.id}.json`), JSON.stringify(template, null, 2));
  return NextResponse.json(template, { status: 201 });
}
