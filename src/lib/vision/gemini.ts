import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { VisionModel, AdAnalysis } from '../types';

const boundsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    x: { type: SchemaType.NUMBER },
    y: { type: SchemaType.NUMBER },
    w: { type: SchemaType.NUMBER },
    h: { type: SchemaType.NUMBER },
  },
  required: ['x', 'y', 'w', 'h'],
};

const geminiResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    canvas: {
      type: SchemaType.OBJECT,
      properties: {
        width: { type: SchemaType.NUMBER },
        height: { type: SchemaType.NUMBER },
        backgroundColor: { type: SchemaType.STRING },
      },
      required: ['width', 'height', 'backgroundColor'],
    },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          bounds: boundsSchema,
          backgroundColor: { type: SchemaType.STRING },
          zIndex: { type: SchemaType.NUMBER },
        },
        required: ['id', 'name', 'bounds', 'backgroundColor', 'zIndex'],
      },
    },
    textElements: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          content: { type: SchemaType.STRING },
          sectionId: { type: SchemaType.STRING },
          position: boundsSchema,
          fontFamily: { type: SchemaType.STRING },
          fontSize: { type: SchemaType.STRING },
          fontWeight: { type: SchemaType.STRING },
          fontStyle: { type: SchemaType.STRING },
          color: { type: SchemaType.STRING },
          textAlign: { type: SchemaType.STRING },
          textShadow: { type: SchemaType.STRING },
          letterSpacing: { type: SchemaType.STRING },
          lineHeight: { type: SchemaType.STRING },
        },
        required: ['content', 'sectionId', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'color', 'textAlign'],
      },
    },
    imageRegions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          sectionId: { type: SchemaType.STRING },
          bounds: boundsSchema,
          description: { type: SchemaType.STRING },
          generationPrompt: { type: SchemaType.STRING },
          objectFit: { type: SchemaType.STRING },
        },
        required: ['id', 'sectionId', 'bounds', 'description', 'generationPrompt', 'objectFit'],
      },
    },
    buttons: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          text: { type: SchemaType.STRING },
          sectionId: { type: SchemaType.STRING },
          bounds: boundsSchema,
          backgroundColor: { type: SchemaType.STRING },
          textColor: { type: SchemaType.STRING },
          fontSize: { type: SchemaType.STRING },
          fontWeight: { type: SchemaType.STRING },
          borderRadius: { type: SchemaType.STRING },
          boxShadow: { type: SchemaType.STRING },
        },
        required: ['text', 'sectionId', 'bounds', 'backgroundColor', 'textColor', 'fontSize', 'fontWeight', 'borderRadius'],
      },
    },
    badges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          shape: { type: SchemaType.STRING },
          sectionId: { type: SchemaType.STRING },
          bounds: boundsSchema,
          backgroundColor: { type: SchemaType.STRING },
          textLines: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                content: { type: SchemaType.STRING },
                fontSize: { type: SchemaType.STRING },
                fontWeight: { type: SchemaType.STRING },
                color: { type: SchemaType.STRING },
              },
              required: ['content', 'fontSize', 'fontWeight', 'color'],
            },
          },
          boxShadow: { type: SchemaType.STRING },
        },
        required: ['shape', 'sectionId', 'bounds', 'backgroundColor', 'textLines'],
      },
    },
    icons: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING },
          svgHint: { type: SchemaType.STRING },
          sectionId: { type: SchemaType.STRING },
          bounds: boundsSchema,
          color: { type: SchemaType.STRING },
          size: { type: SchemaType.STRING },
        },
        required: ['description', 'svgHint', 'sectionId', 'bounds', 'color', 'size'],
      },
    },
    colorPalette: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          hex: { type: SchemaType.STRING },
          usage: { type: SchemaType.STRING },
          percentage: { type: SchemaType.NUMBER },
        },
        required: ['hex', 'usage', 'percentage'],
      },
    },
    overallStyle: { type: SchemaType.STRING },
  },
  required: ['canvas', 'sections', 'textElements', 'imageRegions', 'buttons', 'badges', 'icons', 'colorPalette', 'overallStyle'],
};

export const geminiAdapter: VisionModel = {
  id: 'gemini-2.5-pro',
  name: 'Gemini 2.5 Pro',
  provider: 'google',
  async analyze(imageBase64: string, mimeType: string, systemPrompt: string, userPrompt: string): Promise<AdAnalysis> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiResponseSchema as any,
        temperature: 0.1,
      },
    });

    const result = await model.generateContent([
      { text: userPrompt },
      { inlineData: { mimeType, data: imageBase64 } },
    ]);

    const text = result.response.text();
    return JSON.parse(text) as AdAnalysis;
  },
};
