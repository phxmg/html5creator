import { AdAnalysis } from '../types';

export function parseJsonResponse(text: string): AdAnalysis {
  let cleaned = text.trim();

  // Strip markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Strip leading/trailing non-JSON characters
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  try {
    return JSON.parse(cleaned) as AdAnalysis;
  } catch (e) {
    throw new Error(`Failed to parse vision model JSON response: ${(e as Error).message}\nRaw text (first 500 chars): ${text.slice(0, 500)}`);
  }
}
