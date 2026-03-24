import { CodeGenModel } from '../types';
import { sonnetCodegenAdapter, opusCodegenAdapter } from './anthropic';
import { gpt53CodegenAdapter, gpt41CodegenAdapter } from './openai';
import { geminiCodegenAdapter } from './gemini';

export const codeGenModels: Record<string, CodeGenModel> = {
  [sonnetCodegenAdapter.id]: sonnetCodegenAdapter,
  [opusCodegenAdapter.id]: opusCodegenAdapter,
  [gpt53CodegenAdapter.id]: gpt53CodegenAdapter,
  [gpt41CodegenAdapter.id]: gpt41CodegenAdapter,
  [geminiCodegenAdapter.id]: geminiCodegenAdapter,
};

export function getAvailableCodeGenModels(): CodeGenModel[] {
  const available: CodeGenModel[] = [];
  if (process.env.ANTHROPIC_API_KEY) {
    available.push(sonnetCodegenAdapter);
    available.push(opusCodegenAdapter);
  }
  if (process.env.OPENAI_API_KEY) {
    available.push(gpt53CodegenAdapter);
    available.push(gpt41CodegenAdapter);
  }
  if (process.env.GEMINI_API_KEY) {
    available.push(geminiCodegenAdapter);
  }
  return available;
}
