import { NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
  }

  const outputDir = path.join(process.cwd(), 'public', 'outputs', runId);

  try {
    await stat(outputDir);
  } catch {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  // Build a simple tar-like structure using a multipart approach
  // Actually, let's just create a zip in memory using basic approach
  // Since archiver isn't installed, we'll return a JSON manifest with file list
  // and let the client download files individually, OR we can use JSZip on the client

  // Return file listing for the run
  const files: Array<{ name: string; size: number; path: string }> = [];

  async function scanDir(dir: string, prefix: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath, `${prefix}${entry.name}/`);
      } else {
        const s = await stat(fullPath);
        files.push({
          name: `${prefix}${entry.name}`,
          size: s.size,
          path: `/outputs/${runId}/${prefix}${entry.name}`,
        });
      }
    }
  }

  await scanDir(outputDir, '');

  return NextResponse.json({ runId, files });
}
