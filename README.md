# HTML5 Ad Creator

Upload an ad image and get a pixel-perfect HTML5 recreation using frontier AI models.

## How It Works

1. **Upload** an ad image (PNG, JPG, GIF, WebP)
2. **Analyze** with 5 parallel vision models (GPT-4.1, Claude Sonnet 4.5, Gemini 2.5 Pro, Grok-3, Claude Opus 4.6)
3. **Generate** HTML5 recreation using AI code generation + AI image generation
4. **Compare** original vs generated side-by-side
5. **Iterate** on prompts and model selection

## Architecture

```
Image Upload → 5 Vision Analyzers (parallel) → Structured JSON
                                                    ↓
                    Image Generation ← Ad Description → Code Generation
                         ↓                                    ↓
                    Base64 Assets ──────────────→ Self-contained HTML5 File
```

## Models Used

### Vision Analysis
- OpenAI GPT-4.1
- Anthropic Claude Sonnet 4.5
- Anthropic Claude Opus 4.6
- Google Gemini 2.5 Pro
- xAI Grok-3

### Code Generation
- Claude Sonnet 4.5 / Opus 4.6
- GPT-4.1
- Gemini 2.5 Pro

### Image Generation
- OpenAI gpt-image-1
- FAL.ai Nano Banana Pro
- FAL.ai Flux Pro v1.1
- Google Imagen 4 Fast
- Replicate SDXL

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- PostgreSQL + Drizzle ORM
- SSE streaming for real-time progress
- Docker + Coolify deployment

## Setup

```bash
# Start PostgreSQL
docker compose up -d

# Install deps
npm install

# Set environment variables in .env.local
# OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY
# FAL_API_KEY, REPLICATE_API_TOKEN, DATABASE_URL

# Run dev server
npm run dev
```

## Status

- [x] Project scaffolding
- [x] Vision analysis pipeline (5 models)
- [x] Image generation pipeline (5 models)
- [x] Code generation pipeline (4 models)
- [x] SSE streaming API routes
- [x] Frontend UI (upload, analysis, comparison)
- [x] Prompt editor & template library
- [ ] PostgreSQL persistence (using file storage for MVP)
- [ ] Run history
- [ ] Deployment to Coolify
