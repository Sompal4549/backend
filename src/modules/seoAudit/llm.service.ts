/**
 * Real LLM brand-visibility testing.
 *
 * For every assistant that has an API key in the environment this service
 * sends live prompts and inspects the actual model response for brand
 * mentions and cited URLs. Assistants without a key are reported as
 * `tested: false` — never as a fabricated pass.
 *
 * Supported keys: OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY,
 * PERPLEXITY_API_KEY.
 */

import type { LlmPlatformResult } from "./types";

const BRAND_TERMS = [
  "ensis",
  "ensis.in",
  "ensis wellness",
  "ensis panchkarma",
  "ensis panchakarma",
];

const DEFAULT_QUERIES = [
  "Tell me about Ensis Panchakarma (ensis.in) in Haridwar, India and what wellness equipment they manufacture.",
  "What are the top Ayurvedic and Panchakarma equipment manufacturers in Haridwar and Rishikesh, India?",
  "What are the top Ayurvedic and Panchkarma equipment manufacturers in India?",
  "Which company provides turnkey spa and wellness clinic setups in India?",
];

function detectMention(text: string): { mentioned: boolean; citedDomain: boolean; excerpt: string } {
  const lower = text.toLowerCase();
  const mentioned = BRAND_TERMS.some((term) => lower.includes(term));
  const citedDomain = lower.includes("ensis.in");
  let excerpt = "";
  const idx = lower.indexOf("ensis");
  const domIdx = lower.indexOf("ensis.in");
  const at = idx >= 0 ? idx : domIdx;
  if (at >= 0) {
    excerpt = text.slice(Math.max(0, at - 80), at + 160).replace(/\s+/g, " ").trim();
  }
  return { mentioned, citedDomain, excerpt };
}

async function testOpenAi(queries: string[], model = "gpt-4o-mini"): Promise<LlmPlatformResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { platform: "ChatGPT (OpenAI)", model, tested: false, reason: "OPENAI_API_KEY not set", results: [] };
  }
  const results: LlmPlatformResult["results"] = [];
  for (const query of queries) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant answering industry research questions. Mention specific real companies and their websites where relevant." },
          { role: "user", content: query },
        ],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      return { platform: "ChatGPT (OpenAI)", model, tested: false, reason: `OpenAI responded ${res.status}`, results };
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content || "";
    results.push({ query, ...detectMention(text) });
  }
  return { platform: "ChatGPT (OpenAI)", model, tested: true, results };
}

async function testGemini(queries: string[], model = process.env.GEMINI_MODEL || "gemini-3.5-flash"): Promise<LlmPlatformResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { platform: "Google Gemini", model, tested: false, reason: "GEMINI_API_KEY not set", results: [] };
  }
  const results: LlmPlatformResult["results"] = [];
  for (const query of queries) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "You are a helpful assistant answering industry and brand research questions. Mention specific real companies, wellness equipment manufacturers, and their websites where relevant." }],
          },
          contents: [{ role: "user", parts: [{ text: query }] }],
          generationConfig: { temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (!res.ok) {
      return { platform: "Google Gemini", model, tested: false, reason: `Gemini responded ${res.status}`, results };
    }
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p?.text ?? "").join("") || "";
    results.push({ query, ...detectMention(text) });
  }
  return { platform: "Google Gemini", model, tested: true, results };
}

async function testAnthropic(queries: string[], model = "claude-3-5-sonnet-latest"): Promise<LlmPlatformResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { platform: "Claude (Anthropic)", model, tested: false, reason: "ANTHROPIC_API_KEY not set", results: [] };
  }
  const results: LlmPlatformResult["results"] = [];
  for (const query of queries) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        messages: [{ role: "user", content: query }],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      return { platform: "Claude (Anthropic)", model, tested: false, reason: `Anthropic responded ${res.status}`, results };
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.map((c) => c?.text ?? "").join("") || "";
    results.push({ query, ...detectMention(text) });
  }
  return { platform: "Claude (Anthropic)", model, tested: true, results };
}

async function testPerplexity(queries: string[], model = "sonar"): Promise<LlmPlatformResult> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    return { platform: "Perplexity AI", model, tested: false, reason: "PERPLEXITY_API_KEY not set", results: [] };
  }
  const results: LlmPlatformResult["results"] = [];
  for (const query of queries) {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Answer with specific real events and cite their websites." },
          { role: "user", content: query },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      return { platform: "Perplexity AI", model, tested: false, reason: `Perplexity responded ${res.status}`, results };
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content || "";
    results.push({ query, ...detectMention(text) });
  }
  return { platform: "Perplexity AI", model, tested: true, results };
}

/** Runs live brand-mention probes across every configured assistant. */
export async function runLlmVisibility(queries: string[] = DEFAULT_QUERIES): Promise<LlmPlatformResult[]> {
  const platforms = await Promise.all([
    testOpenAi(queries),
    testGemini(queries),
    testAnthropic(queries),
    testPerplexity(queries),
  ]);
  return platforms;
}

/** List of assistant names that currently have credentials. */
export function configuredLlmPlatforms(): string[] {
  const out: string[] = [];
  if (process.env.OPENAI_API_KEY) out.push("openai");
  if (process.env.GEMINI_API_KEY) out.push("gemini");
  if (process.env.ANTHROPIC_API_KEY) out.push("anthropic");
  if (process.env.PERPLEXITY_API_KEY) out.push("perplexity");
  return out;
}

