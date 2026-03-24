export interface AdAnalysis {
  canvas: { width: number; height: number; backgroundColor: string };
  sections: Array<{
    id: string;
    name: string;
    bounds: { x: number; y: number; w: number; h: number };
    backgroundColor: string;
    zIndex: number;
  }>;
  textElements: Array<{
    content: string;
    sectionId: string;
    position: { x: number; y: number; w: number; h: number };
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    fontStyle: string;
    color: string;
    textAlign: string;
    textShadow?: string;
    letterSpacing?: string;
    lineHeight?: string;
  }>;
  imageRegions: Array<{
    id: string;
    sectionId: string;
    bounds: { x: number; y: number; w: number; h: number };
    description: string;
    generationPrompt: string;
    objectFit: string;
  }>;
  buttons: Array<{
    text: string;
    sectionId: string;
    bounds: { x: number; y: number; w: number; h: number };
    backgroundColor: string;
    textColor: string;
    fontSize: string;
    fontWeight: string;
    borderRadius: string;
    boxShadow?: string;
  }>;
  badges: Array<{
    shape: string;
    sectionId: string;
    bounds: { x: number; y: number; w: number; h: number };
    backgroundColor: string;
    textLines: Array<{ content: string; fontSize: string; fontWeight: string; color: string }>;
    boxShadow?: string;
  }>;
  icons: Array<{
    description: string;
    svgHint: string;
    sectionId: string;
    bounds: { x: number; y: number; w: number; h: number };
    color: string;
    size: string;
  }>;
  colorPalette: Array<{ hex: string; usage: string; percentage: number }>;
  overallStyle: string;
}

export interface PipelineRun {
  id: string;
  status: 'uploading' | 'analyzing' | 'generating' | 'complete' | 'error';
  originalImagePath: string;
  analyses: Record<string, AnalysisResult>;
  generations: Record<string, GenerationResult>;
  config: PipelineConfig;
  createdAt: string;
}

export interface AnalysisResult {
  status: 'pending' | 'running' | 'complete' | 'error';
  result?: AdAnalysis;
  error?: string;
  duration?: number;
}

export interface GenerationResult {
  status: 'pending' | 'running' | 'complete' | 'error';
  html?: string;
  htmlPath?: string;
  error?: string;
  duration?: number;
}

export interface PipelineConfig {
  visionModels: string[];
  codegenModel: string;
  imagegenModel: string;
  templateId?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  visionSystemPrompt: string;
  visionUserPrompt: string;
  codegenSystemPrompt: string;
  codegenUserPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SSEEvent {
  type: 'analysis_start' | 'analysis_complete' | 'analysis_error' | 'generation_start' | 'generation_complete' | 'generation_error' | 'done';
  modelId: string;
  data?: any;
  error?: string;
  duration?: number;
}

export interface VisionModel {
  id: string;
  name: string;
  provider: string;
  analyze: (imageBase64: string, mimeType: string, systemPrompt: string, userPrompt: string) => Promise<AdAnalysis>;
}

export interface ImageGenModel {
  id: string;
  name: string;
  provider: string;
  generate: (prompt: string, width: number, height: number) => Promise<string>;
}

export interface CodeGenModel {
  id: string;
  name: string;
  provider: string;
  generate: (analysis: AdAnalysis, imageDataUris: Record<string, string>, systemPrompt: string, userPrompt: string) => Promise<string>;
}
