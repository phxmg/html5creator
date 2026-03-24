const boundsSchema = {
  type: 'object' as const,
  properties: {
    x: { type: 'number' as const, description: 'X position as percentage (0-100)' },
    y: { type: 'number' as const, description: 'Y position as percentage (0-100)' },
    w: { type: 'number' as const, description: 'Width as percentage (0-100)' },
    h: { type: 'number' as const, description: 'Height as percentage (0-100)' },
  },
  required: ['x', 'y', 'w', 'h'] as const,
};

export const AD_ANALYSIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    canvas: {
      type: 'object' as const,
      properties: {
        width: { type: 'number' as const },
        height: { type: 'number' as const },
        backgroundColor: { type: 'string' as const },
      },
      required: ['width', 'height', 'backgroundColor'] as const,
    },
    sections: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          name: { type: 'string' as const },
          bounds: boundsSchema,
          backgroundColor: { type: 'string' as const },
          zIndex: { type: 'number' as const },
        },
        required: ['id', 'name', 'bounds', 'backgroundColor', 'zIndex'] as const,
      },
    },
    textElements: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          content: { type: 'string' as const },
          sectionId: { type: 'string' as const },
          position: boundsSchema,
          fontFamily: { type: 'string' as const },
          fontSize: { type: 'string' as const },
          fontWeight: { type: 'string' as const },
          fontStyle: { type: 'string' as const },
          color: { type: 'string' as const },
          textAlign: { type: 'string' as const },
          textShadow: { type: 'string' as const },
          letterSpacing: { type: 'string' as const },
          lineHeight: { type: 'string' as const },
        },
        required: ['content', 'sectionId', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'color', 'textAlign'] as const,
      },
    },
    imageRegions: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          sectionId: { type: 'string' as const },
          bounds: boundsSchema,
          description: { type: 'string' as const },
          generationPrompt: { type: 'string' as const },
          objectFit: { type: 'string' as const },
        },
        required: ['id', 'sectionId', 'bounds', 'description', 'generationPrompt', 'objectFit'] as const,
      },
    },
    buttons: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          text: { type: 'string' as const },
          sectionId: { type: 'string' as const },
          bounds: boundsSchema,
          backgroundColor: { type: 'string' as const },
          textColor: { type: 'string' as const },
          fontSize: { type: 'string' as const },
          fontWeight: { type: 'string' as const },
          borderRadius: { type: 'string' as const },
          boxShadow: { type: 'string' as const },
        },
        required: ['text', 'sectionId', 'bounds', 'backgroundColor', 'textColor', 'fontSize', 'fontWeight', 'borderRadius'] as const,
      },
    },
    badges: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          shape: { type: 'string' as const },
          sectionId: { type: 'string' as const },
          bounds: boundsSchema,
          backgroundColor: { type: 'string' as const },
          textLines: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                content: { type: 'string' as const },
                fontSize: { type: 'string' as const },
                fontWeight: { type: 'string' as const },
                color: { type: 'string' as const },
              },
              required: ['content', 'fontSize', 'fontWeight', 'color'] as const,
            },
          },
          boxShadow: { type: 'string' as const },
        },
        required: ['shape', 'sectionId', 'bounds', 'backgroundColor', 'textLines'] as const,
      },
    },
    icons: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          description: { type: 'string' as const },
          svgHint: { type: 'string' as const },
          sectionId: { type: 'string' as const },
          bounds: boundsSchema,
          color: { type: 'string' as const },
          size: { type: 'string' as const },
        },
        required: ['description', 'svgHint', 'sectionId', 'bounds', 'color', 'size'] as const,
      },
    },
    colorPalette: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          hex: { type: 'string' as const },
          usage: { type: 'string' as const },
          percentage: { type: 'number' as const },
        },
        required: ['hex', 'usage', 'percentage'] as const,
      },
    },
    overallStyle: { type: 'string' as const },
  },
  required: ['canvas', 'sections', 'textElements', 'imageRegions', 'buttons', 'badges', 'icons', 'colorPalette', 'overallStyle'] as const,
};

// Anthropic tool definition for structured output
export const AD_ANALYSIS_TOOL = {
  name: 'ad_analysis' as const,
  description: 'Submit the structured analysis of an advertisement image',
  input_schema: AD_ANALYSIS_SCHEMA,
};
