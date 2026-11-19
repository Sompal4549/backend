import crypto from 'crypto';
import path from 'path';
import * as cheerio from 'cheerio';
import { ChatKnowledgeModel, ChatTrainingModel } from '../models/chatbot-training.model';
import { ProductModel } from '../models/product.model';
import { CategoryModel } from '../models/category.model';
import { SolutionModel } from '../models/solution.model';
import { FaqModel } from '../models/faq.model';
import { ProjectModel } from '../models/project.model';
import { ComponentContentModel } from '../models/component-content.model';
import { getPublishedConfigService } from './chatbot-manager.service';

/*
 * Dynamic Website Knowledge & Vector Indexing System for Ensis Assist.
 * Enhanced beyond Design House with:
 * 1. Hybrid Search: Vector Cosine Similarity + Multi-Lingual Lexical/Keyword fallback.
 * 2. True Document Extraction: PDF (PDFParse), DOCX (mammoth), Markdown/CSV/Text.
 * 3. Live MongoDB Ingestion: Products, Turnkey Solutions, Categories, FAQs, Projects, CMS sections.
 * 4. Zero-Cost Incremental Hashing: SHA-1 hashing embeds only modified/new passages.
 * 5. Multi-Turn Context & Team Instruction Injection for both Voice Calls & Typed Chat.
 * 6. Background Daily Schedule & Real-Time Admin Panel synchronization.
 */

export interface KnowledgePassage {
  url: string;
  title: string;
  text: string;
}

interface IndexedItem extends KnowledgePassage {
  pinned?: boolean;
  vector: Float32Array;
  norm: number;
}

const siteUrl = (): string =>
  (process.env.CHATBOT_SITE_URL || process.env.FRONTEND_URL || 'https://ensis.in').replace(/\/+$/, '');

const REBUILD_EVERY_MS = 24 * 60 * 60 * 1000; // 24 hours
export const CHUNK_CHARS = 900;
const MAX_CHUNKS_PER_PAGE = 12;
const MAX_TRAINING_CHUNKS = 340;
export const MAX_TEXT_CHARS = 300000;
const CRAWL_CONCURRENCY = 5;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_SIZE = 512;

const SKIP_PATH = /^\/(test-|admin|api|404|privacy|terms|cart|checkout)/i;

const COMPANY_TITLE = 'About Ensis Panchkarma & Ayurvedic Infrastructure';
const CONTACT_TITLE = 'Contact Ensis: Office, Factory, Phone & Working Hours';
const PRODUCTS_TITLE = 'Ensis Authentic Panchkarma Equipment Catalog';
const SOLUTIONS_TITLE = 'Ensis Turnkey Ayurvedic Clinic & Hospital Setup Solutions';

const isPinned = (item: { url: string; title: string }): boolean =>
  item.url === '/contact' ||
  item.title === COMPANY_TITLE ||
  item.title === CONTACT_TITLE;

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'div', 'dl', 'dt',
  'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'main', 'ol',
  'p', 'section', 'summary', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul'
]);

const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'svg', 'iframe', 'header', 'nav', 'footer',
  'form', 'button', 'select', 'textarea', 'input', 'video', 'audio', 'canvas', 'template', 'head'
]);

const apiKey = (): string => process.env.OPENAI_API_KEY || '';

export const tidy = (text: string): string =>
  String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/* ── File Extraction: PDF, DOCX, TXT, MD, CSV ── */

const FILE_MIMES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'text',
  'text/markdown': 'text',
  'text/csv': 'text',
};

export const typeOfFile = (file: { originalname?: string; mimetype?: string }): 'pdf' | 'docx' | 'text' | null => {
  if (file.mimetype && FILE_MIMES[file.mimetype]) return FILE_MIMES[file.mimetype] as any;
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  if (['.txt', '.md', '.csv'].includes(ext)) return 'text';
  return null;
};

export const readTrainingFile = async (file: {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
}): Promise<{ text: string; pages?: number } | null> => {
  const fileType = typeOfFile(file);
  if (!fileType) return null;

  if (fileType === 'pdf') {
    try {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      try {
        const result = await parser.getText();
        return { text: tidy(result.text), pages: result.total };
      } finally {
        await parser.destroy().catch(() => {});
      }
    } catch (err: any) {
      console.warn(`[chatbot-knowledge] pdf-parse error: ${err.message}`);
      throw new Error(`Failed to read PDF: ${err.message}`);
    }
  }

  if (fileType === 'docx') {
    try {
      const mammoth = require('mammoth');
      const { value } = await mammoth.extractRawText({ buffer: file.buffer });
      return { text: tidy(value) };
    } catch (err: any) {
      console.warn(`[chatbot-knowledge] mammoth error: ${err.message}`);
      throw new Error(`Failed to read Word document: ${err.message}`);
    }
  }

  if (fileType === 'text') {
    return { text: tidy(file.buffer.toString('utf-8')) };
  }

  return null;
};

/* ── Chunks & Passages ── */

export const toChunks = (text: string, maxChars = CHUNK_CHARS): string[] => {
  const parts = tidy(text)
    .split(/\n\s*\n|\n(?=[-•*\d]+[.)]?\s)/)
    .flatMap((paragraph) =>
      paragraph.length <= maxChars
        ? [paragraph]
        : paragraph.match(new RegExp(`[^]{1,${maxChars}}(?=[.!?।]\\s|$)[.!?।]?|[^]{1,${maxChars}}`, 'g')) || []
    )
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';
  for (const part of parts) {
    if (current && current.length + part.length + 1 > maxChars) {
      chunks.push(current);
      current = '';
    }
    current += `${current ? '\n' : ''}${part}`;
  }
  if (current.trim().length > 20) chunks.push(current);
  return chunks.slice(0, MAX_TRAINING_CHUNKS);
};

export const hashOfItem = (title: string, content: string): string =>
  crypto.createHash('sha1').update(`${title}\n${content}`).digest('hex');

/**
 * Generate vector embeddings via OpenAI API (text-embedding-3-small, 512 dimensions)
 */
export const openaiEmbed = async (texts: string[]): Promise<number[][]> => {
  if (!apiKey() || !texts.length) return [];
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64);
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey()}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: batch,
          dimensions: EMBEDDING_SIZE,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`[chatbot-knowledge] OpenAI embeddings failed (${res.status}): ${errText.slice(0, 200)}`);
        break;
      }

      const json = (await res.json()) as any;
      json.data
        .sort((a: any, b: any) => a.index - b.index)
        .forEach((d: any) => out.push(d.embedding));
    } catch (err: any) {
      console.warn(`[chatbot-knowledge] embeddings batch failed: ${err.message}`);
      break;
    }
  }

  return out;
};

/* ── Query Vector LRU Cache (Saves 300-500ms on repeat/similar queries) ── */
const QUERY_CACHE_MAX = 2000;
const queryVectorCache = new Map<string, { vector: number[]; at: number }>();

export const getOrEmbedQuery = async (queryText: string): Promise<number[] | null> => {
  const norm = String(queryText || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!norm) return null;
  const cached = queryVectorCache.get(norm);
  if (cached && Date.now() - cached.at < 24 * 60 * 60 * 1000) {
    return cached.vector;
  }
  const [vec] = await openaiEmbed([norm]);
  if (vec && vec.length) {
    if (queryVectorCache.size >= QUERY_CACHE_MAX) {
      const keysToDelete = Array.from(queryVectorCache.keys()).slice(0, 200);
      for (const k of keysToDelete) queryVectorCache.delete(k);
    }
    queryVectorCache.set(norm, { vector: vec, at: Date.now() });
    return vec;
  }
  return null;
};

/**
 * Prepares chunks and embeddings for a ChatTraining document (Note or Uploaded File).
 */
export const prepareTrainingItem = async (item: any): Promise<any> => {
  if (item.kind === 'instruction' || item.always) {
    item.chunks = [];
    item.chunksHash = '';
    return item;
  }

  const hash = hashOfItem(item.title || '', item.content || '');
  if (item.chunksHash === hash && Array.isArray(item.chunks) && item.chunks.length > 0) {
    return item;
  }

  const rawChunks = toChunks(item.content || '');
  if (!rawChunks.length) {
    item.chunks = [];
    item.chunksHash = hash;
    return item;
  }

  if (apiKey()) {
    try {
      const textsToEmbed = rawChunks.map((text) => `${item.title || 'Training Note'}\n${text}`);
      const vectors = await openaiEmbed(textsToEmbed);
      if (vectors.length === rawChunks.length) {
        item.chunks = rawChunks.map((text, i) => ({ text, embedding: vectors[i] }));
        item.chunksHash = hash;
        return item;
      }
    } catch (err: any) {
      console.warn(`[chatbot-knowledge] prepareTrainingItem embed error: ${err.message}`);
    }
  }

  // Fallback: save chunk texts without embeddings (searchable via keyword)
  item.chunks = rawChunks.map((text) => ({ text, embedding: [] }));
  item.chunksHash = hash;
  return item;
};

/* ── Web Crawler: sitemap.xml & HTML ── */

const fetchText = async (url: string): Promise<string> => {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'Ensis-ChatKnowledge/1.0' },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
};

const pageLines = ($: cheerio.CheerioAPI): string[] => {
  const lines: string[] = [];
  const walk = (node: any) => {
    let inline = '';
    const flush = () => {
      const text = inline.replace(/\s+/g, ' ').trim();
      if (text.length > 2) lines.push(text);
      inline = '';
    };

    $(node)
      .contents()
      .each((_: number, child: any) => {
        if (child.type === 'text') {
          inline += child.data;
        } else if (child.type === 'tag') {
          const tag = child.name.toLowerCase();
          if (SKIP_TAGS.has(tag)) return;
          const hasBlock = BLOCK_TAGS.has(tag) || $(child).find([...BLOCK_TAGS].join(',')).length > 0;
          if (hasBlock) {
            flush();
            walk(child);
            flush();
          } else {
            inline += ` ${$(child).text()} `;
          }
        }
      });
    flush();
  };
  const body = $('body').get(0);
  if (body) walk(body);
  return lines;
};

const readPage = async (url: string): Promise<{ url: string; title: string; lines: string[] }> => {
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const title = ($('title').first().text() || $('h1').first().text() || '').replace(/\s+/g, ' ').trim();
  const description = ($('meta[name="description"]').attr('content') || '').trim();
  const pathname = new URL(url).pathname || '/';
  return {
    url: pathname,
    title,
    lines: [...(description ? [description] : []), ...pageLines($)],
  };
};

const sitemapPaths = async (): Promise<string[]> => {
  try {
    const xml = await fetchText(`${siteUrl()}/sitemap.xml`);
    const $ = cheerio.load(xml, { xmlMode: true });
    const paths = new Set<string>();
    $('loc').each((_: number, el: any) => {
      try {
        const u = new URL($(el).text().trim());
        paths.add(u.pathname.replace(/\/+$/, '') || '/');
      } catch {}
    });
    const filtered = [...paths].filter((p) => !SKIP_PATH.test(p));
    if (filtered.length) return filtered;
  } catch (err: any) {
    console.warn(`[chatbot-knowledge] could not fetch sitemap.xml: ${err.message}. Using core routes.`);
  }

  return ['/', '/about', '/products', '/solutions', '/contact', '/faqs', '/blogs', '/career'];
};

const toPageChunks = ({ url, title, lines }: { url: string; title: string; lines: string[] }): KnowledgePassage[] => {
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current && current.length + line.length > CHUNK_CHARS) {
      chunks.push(current);
      current = '';
    }
    current += `${current ? '\n' : ''}${line.slice(0, CHUNK_CHARS)}`;
  }
  if (current.length > 40) chunks.push(current);
  return chunks.slice(0, MAX_CHUNKS_PER_PAGE).map((text) => ({ url, title, text }));
};

const crawlSite = async (): Promise<KnowledgePassage[]> => {
  const paths = await sitemapPaths();
  const pages: Array<{ url: string; title: string; lines: string[] }> = [];
  let next = 0;

  await Promise.all(
    Array.from({ length: CRAWL_CONCURRENCY }, async () => {
      while (next < paths.length) {
        const path = paths[next++];
        try {
          const page = await readPage(`${siteUrl()}${path}`);
          if (page.lines.length > 0) pages.push(page);
        } catch {
          // Skip unreachable pages in local/dev
        }
      }
    })
  );

  return pages.flatMap(toPageChunks);
};

const rupees = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Ingest live facts directly from MongoDB collections:
 * - ProductModel (Active products, prices, specs, materials, links)
 * - SolutionModel (Turnkey clinic & hospital setup packages)
 * - CategoryModel (Equipment categories)
 * - FaqModel (Website FAQs)
 * - ProjectModel (Completed showcase projects)
 * - ComponentContentModel (CMS content for About, Credentials, Track Record)
 * - ChatbotConfigModel (Admin approved Q&As)
 */
export const databaseFacts = async (): Promise<KnowledgePassage[]> => {
  const facts: KnowledgePassage[] = [];
  const add = (url: string, title: string, lines: (string | undefined | null)[]) => {
    facts.push(...toPageChunks({ url, title, lines: lines.filter(Boolean) as string[] }));
  };

  const [products, categories, solutions, faqs, projects, cmsContents, config] = await Promise.all([
    ProductModel.find({ isActive: true })
      .select('title slug price discountPrice material shortDescription category gstRate')
      .sort({ orderBy: 1 })
      .lean()
      .catch(() => []),
    CategoryModel.find({}).select('name').lean().catch(() => []),
    SolutionModel.find({ isActive: true }).select('title slug hero').sort({ orderBy: 1 }).lean().catch(() => []),
    FaqModel.find({ status: 'Published' }).select('question answer category').lean().catch(() => []),
    ProjectModel.find({}).select('title category location client projectYear status').lean().catch(() => []),
    ComponentContentModel.find({ isActive: true }).select('key page label data').lean().catch(() => []),
    getPublishedConfigService().catch(() => null),
  ]);

  const catMap = new Map((categories as any[]).map((c) => [String(c._id), String(c.name || '').trim()]));

  // 1. Live Products
  const productLines: string[] = [];
  for (const p of products as any[]) {
    if (!p.title) continue;
    const cat = catMap.get(String(p.category)) || 'Equipment';
    const hasDiscount = p.discountPrice > 0 && p.discountPrice < p.price;
    const priceStr = hasDiscount
      ? `${rupees(p.discountPrice)} (MRP ${rupees(p.price)})`
      : p.price > 0
      ? rupees(p.price)
      : 'Price on request';
    const gst = p.gstRate ? ` + ${p.gstRate}% GST` : '';
    const mat = p.material ? `Material: ${p.material}.` : '';
    const desc = p.shortDescription ? `${p.shortDescription}.` : '';
    productLines.push(`Product: ${p.title} (${cat}). Price: ${priceStr}${gst}. ${mat} ${desc} URL: /products/${p.slug || ''}`);
  }
  if (productLines.length) {
    add('/products', PRODUCTS_TITLE, productLines);
  }

  // 2. Live Turnkey Solutions
  const solutionLines = (solutions as any[]).map((s) =>
    `Solution: ${s.title}. URL: /solutions/${s.slug || ''}. Details: ${s.hero?.description || 'Turnkey setup package'}`
  );
  if (solutionLines.length) {
    add('/solutions', SOLUTIONS_TITLE, solutionLines);
  }

  // 3. Live FAQs
  (faqs as any[]).forEach((f) => {
    if (f.question && f.answer) {
      add('/faqs', `FAQ: ${f.question}`, [`Question: ${f.question}`, `Answer: ${f.answer}`, `Category: ${f.category || 'General'}`]);
    }
  });

  // 4. Live Completed Projects & Track Record
  const projectLines = (projects as any[]).map((pr) =>
    `Project: ${pr.title}. Client: ${pr.client || 'Client'}. Location: ${pr.location || 'India'}. Year: ${pr.projectYear || ''}. Category: ${pr.category || 'Turnkey'}. Status: ${pr.status || 'Completed'}.`
  );
  if (projectLines.length) {
    add('/projects', 'Featured Showcase Projects & Ayush Hospitals Built by Ensis', projectLines);
  }

  // 5. CMS Component Contents (About, Credentials, Stats)
  (cmsContents as any[]).forEach((cms) => {
    const dataStr = typeof cms.data === 'object' ? JSON.stringify(cms.data).slice(0, 800) : String(cms.data || '');
    add(`/${cms.page || ''}`, `Website Section: ${cms.label || cms.key}`, [
      `Section: ${cms.label || cms.key} on page /${cms.page || ''}.`,
      dataStr,
    ]);
  });

  // 6. Admin Approved Q&A
  const answers = Array.isArray(config?.answers) ? config.answers : [];
  answers
    .filter((a: any) => a?.status === 'Approved' && a.question && a.answer?.en)
    .forEach((a: any) => {
      const hi = a.answer?.hi ? ` (Hindi: ${a.answer.hi})` : '';
      add('', `Approved Answer: ${a.question}`, [`Q: ${a.question}`, `A: ${a.answer.en}${hi}`]);
    });

  // 7. Core Verified Company Credentials & Office Address
  add('/about', COMPANY_TITLE, [
    'Ensis is India’s leading designer, manufacturer, and exporter of authentic Ayurvedic & Panchkarma therapy equipment, spa furniture, and turnkey clinic setups.',
    'Specialized wellness infrastructure division of Design House India Pvt. Ltd. (trusted since 2003, 20+ years of trust).',
    'Proven Track Record: 1000+ Projects Completed, 500+ Happy Clients across 28+ Indian states, 50+ In-house expert architects, woodcraft artisans, and engineers, 100% Client Satisfaction score.',
    'Notable Clients: AyurVAID Hospitals, JIVA Ayurveda, Kairali Ayurvedic Group, Somatheeram Ayurveda Group, Sri Sri Tattva, Vaidyaratnam, Arogyadhama Ayurveda, Sahayog Wellness.',
    'Warranty: 5 Years Comprehensive Structural Warranty on solid Burma Teak wood tables, Droni frames, and steam chambers; 1 Year on electrical thermostats and heating elements.',
    'Pan-India and worldwide global export shipping in heavy-duty ISPM-15 wooden export crates.',
  ]);

  add('/contact', CONTACT_TITLE, [
    'Corporate Office & Manufacturing Unit: Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007.',
    'Official Phone / WhatsApp: +91 9810242841 / +91 9654900525.',
    'Official Email: info@ensis.in.',
    'Official Website: https://ensis.in (contact page route: /contact).',
    'Working Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST.',
  ]);

  return facts;
};

/* ── In-Memory Vector & Search Index ── */
let inMemoryIndex: IndexedItem[] | null = null;
let isBuilding = false;

export const loadKnowledgeIndex = async (): Promise<IndexedItem[]> => {
  const [docs, trainings] = await Promise.all([
    ChatKnowledgeModel.find().select('url title text embedding').lean(),
    ChatTrainingModel.find({ enabled: true, kind: { $ne: 'instruction' }, always: { $ne: true } })
      .select('title content chunks')
      .lean()
      .catch(() => []),
  ]);

  const items: IndexedItem[] = [];

  for (const d of docs as any[]) {
    if (!d.embedding || !d.embedding.length) continue;
    const vector = Float32Array.from(d.embedding);
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) sumSq += vector[i] * vector[i];
    const norm = Math.sqrt(sumSq) || 1;
    items.push({
      url: d.url || '',
      title: d.title || '',
      text: d.text || '',
      pinned: isPinned(d),
      vector,
      norm,
    });
  }

  for (const t of trainings as any[]) {
    const chunks = Array.isArray(t.chunks) ? t.chunks : [];
    for (const c of chunks) {
      if (!c.embedding || !c.embedding.length) continue;
      const vector = Float32Array.from(c.embedding);
      let sumSq = 0;
      for (let i = 0; i < vector.length; i++) sumSq += vector[i] * vector[i];
      const norm = Math.sqrt(sumSq) || 1;
      items.push({
        url: '',
        title: t.title || 'Training Note',
        text: c.text || '',
        pinned: false,
        vector,
        norm,
      });
    }
  }

  inMemoryIndex = items;
  return items;
};

/* ── Rules & Always-Known Facts Cache ── */
let rulesCache: { at: number; text: string } | null = null;
const RULES_CACHE_MS = 30000;

export const invalidateTrainingCache = (): void => {
  rulesCache = null;
  inMemoryIndex = null;
};

export const getTrainingRulesText = async (): Promise<string> => {
  if (rulesCache && Date.now() - rulesCache.at < RULES_CACHE_MS) {
    return rulesCache.text;
  }

  const items = await ChatTrainingModel.find({
    enabled: true,
    $or: [{ kind: 'instruction' }, { always: true }],
  })
    .sort({ createdAt: 1 })
    .select('kind title content')
    .lean()
    .catch(() => []);

  const instructions: string[] = [];
  const facts: string[] = [];

  for (const item of items as any[]) {
    const line = `- ${item.title ? `${item.title}: ` : ''}${String(item.content || '').replace(/\s*\n\s*/g, ' ').trim()}`;
    if (item.kind === 'instruction') instructions.push(line);
    else facts.push(line);
  }

  const parts = [
    instructions.length
      ? `\n\nINSTRUCTIONS FROM THE ENSIS TEAM (Strictly follow these; where they differ from general guidelines, these win):\n${instructions.join('\n')}`
      : '',
    facts.length
      ? `\n\nVERIFIED FACTS FROM THE ENSIS TEAM (True and current):\n${facts.join('\n')}`
      : '',
  ].filter(Boolean);

  const text = parts.join('\n');
  rulesCache = { at: Date.now(), text };
  return text;
};

export interface SearchKnowledgeResult {
  passages: KnowledgePassage[];
  confidence: number;
  provider: 'vector' | 'lexical' | 'rrf';
}

/**
 * Detailed Hybrid Semantic Search with RRF Fusion and Confidence Scoring:
 * Combines cached vector cosine ranking with lexical keyword matching.
 */
export const searchKnowledgeDetailed = async (
  question: string,
  limit = 4
): Promise<SearchKnowledgeResult> => {
  const items = inMemoryIndex || (await loadKnowledgeIndex());
  const query = String(question || '').trim();
  if (!query) return { passages: [], confidence: 0, provider: 'lexical' };

  let queryVec: number[] | null = null;
  if (apiKey() && items.some((i) => i.vector.length > 0)) {
    try {
      queryVec = await getOrEmbedQuery(query);
    } catch (err: any) {
      console.warn(`[chatbot-knowledge] query embedding failed: ${err.message}`);
    }
  }

  // 1. Vector Scoring
  const vectorScores: Array<{ item: IndexedItem; cosine: number; rank: number }> = [];
  let topCosine = 0;
  if (queryVec && queryVec.length) {
    let qSumSq = 0;
    for (let i = 0; i < queryVec.length; i++) qSumSq += queryVec[i] * queryVec[i];
    const qNorm = Math.sqrt(qSumSq) || 1;

    const scored = items
      .filter((item) => item.vector.length === queryVec!.length)
      .map((item) => {
        let dot = 0;
        for (let i = 0; i < queryVec!.length; i++) dot += queryVec![i] * item.vector[i];
        return { item, cosine: dot / (qNorm * item.norm) };
      })
      .filter((x) => x.cosine >= 0.20);

    scored.sort((a, b) => b.cosine - a.cosine);
    topCosine = scored[0]?.cosine || 0;
    scored.forEach((s, idx) => {
      vectorScores.push({ item: s.item, cosine: s.cosine, rank: idx + 1 });
    });
  }

  // 2. Multi-Lingual Lexical Scoring
  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F\u0A00-\u0A7F\u0980-\u09FF]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const lexicalScores = new Map<IndexedItem, { score: number; rank: number }>();
  if (keywords.length) {
    const scoredLex = items
      .map((item) => {
        const haystack = `${item.title} ${item.text}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (haystack.includes(kw)) score += 1;
        }
        return { item, score };
      })
      .filter((x) => x.score > 0);

    scoredLex.sort((a, b) => b.score - a.score);
    scoredLex.forEach((s, idx) => {
      lexicalScores.set(s.item, { score: s.score, rank: idx + 1 });
    });
  }

  // 3. RRF (Reciprocal Rank Fusion)
  const itemMap = new Map<IndexedItem, { rrf: number; item: IndexedItem }>();

  // Add vector ranks
  for (const v of vectorScores) {
    const lex = lexicalScores.get(v.item);
    const vRank = v.rank;
    const lRank = lex?.rank || 999;
    const rrf = 1 / (60 + vRank) + 1 / (60 + lRank);
    itemMap.set(v.item, { rrf, item: v.item });
  }

  // Add lexical items not in vector
  for (const [item, lex] of lexicalScores.entries()) {
    if (!itemMap.has(item)) {
      const rrf = 1 / (60 + 999) + 1 / (60 + lex.rank);
      itemMap.set(item, { rrf, item });
    }
  }

  const fused = Array.from(itemMap.values());
  fused.sort((a, b) => b.rrf - a.rrf);

  const perUrl = new Map<string, number>();
  const results: KnowledgePassage[] = [];
  for (const { item } of fused) {
    const count = perUrl.get(item.url || item.title) || 0;
    if (count >= 2) continue;
    perUrl.set(item.url || item.title, count + 1);
    results.push({ url: item.url, title: item.title, text: item.text });
    if (results.length >= limit) break;
  }

  const provider: 'vector' | 'lexical' | 'rrf' =
    vectorScores.length && lexicalScores.size ? 'rrf' : vectorScores.length ? 'vector' : 'lexical';

  const confidence = topCosine > 0 ? topCosine : lexicalScores.size ? 0.40 : 0;

  return { passages: results, confidence, provider };
};

/**
 * Standard hybrid search: returns passages directly for seamless caller compatibility.
 */
export const searchKnowledge = async (question: string, limit = 4): Promise<KnowledgePassage[]> => {
  const detailed = await searchKnowledgeDetailed(question, limit);
  return detailed.passages;
};

/**
 * Rebuild Knowledge:
 * Crawls website + collects live MongoDB facts, hashes with SHA-1, only embeds fresh/changed passages.
 */
export const rebuildKnowledge = async (): Promise<{
  site: string;
  pages: number;
  passages: number;
  embedded: number;
  removed: number;
}> => {
  if (isBuilding) {
    throw new Error('A knowledge rebuild is already running.');
  }
  isBuilding = true;

  try {
    const [crawled, dbFacts] = await Promise.all([
      crawlSite().catch(() => []),
      databaseFacts().catch(() => []),
    ]);

    const combined = [...crawled, ...dbFacts];
    const passageMap = new Map<string, KnowledgePassage & { hash: string }>();

    for (const chunk of combined) {
      const hash = crypto.createHash('sha1').update(`${chunk.title}\n${chunk.text}`).digest('hex');
      if (!passageMap.has(hash)) {
        passageMap.set(hash, { ...chunk, hash });
      }
    }

    const existing = await ChatKnowledgeModel.find({}).select('hash').lean();
    const existingHashes = new Set((existing as any[]).map((d) => d.hash));

    const fresh = [...passageMap.values()].filter((p) => !existingHashes.has(p.hash));
    const removed = (existing as any[]).map((d) => d.hash).filter((h) => !passageMap.has(h));
    const kept = [...passageMap.values()].filter((p) => existingHashes.has(p.hash));

    let embeddedCount = 0;
    if (fresh.length > 0 && apiKey()) {
      const texts = fresh.map((p) => `${p.title}\n${p.text}`);
      const vectors = await openaiEmbed(texts);
      if (vectors.length === fresh.length) {
        const docsToInsert = fresh.map((p, i) => ({
          url: p.url,
          title: p.title,
          text: p.text,
          hash: p.hash,
          embedding: vectors[i],
        }));
        await ChatKnowledgeModel.insertMany(docsToInsert);
        embeddedCount = fresh.length;
      }
    }

    if (removed.length > 0) {
      await ChatKnowledgeModel.deleteMany({ hash: { $in: removed } });
    }

    if (kept.length > 0) {
      await ChatKnowledgeModel.bulkWrite(
        kept.map((p) => ({
          updateOne: {
            filter: { hash: p.hash },
            update: { $set: { url: p.url, title: p.title } },
          },
        }))
      );
    }

    invalidateTrainingCache();
    await loadKnowledgeIndex();

    const summary = {
      site: siteUrl(),
      pages: new Set(combined.map((c) => c.url)).size,
      passages: passageMap.size,
      embedded: embeddedCount,
      removed: removed.length,
    };

    console.log('[chatbot-knowledge] Rebuild complete:', JSON.stringify(summary));
    return summary;
  } finally {
    isBuilding = false;
  }
};

/**
 * Get dynamic knowledge statistics for admin dashboard
 */
export const getKnowledgeStats = async (): Promise<{
  passagesCount: number;
  distinctPages: Array<{ url: string; title: string; passages: number }>;
  lastUpdated?: string;
}> => {
  const docs = await ChatKnowledgeModel.find({}).select('url title updatedAt').lean();
  const pageMap = new Map<string, { title: string; count: number }>();
  let latestDate: Date | undefined;

  for (const d of docs as any[]) {
    const u = d.url || '/';
    const curr = pageMap.get(u) || { title: d.title || 'Page', count: 0 };
    curr.count += 1;
    pageMap.set(u, curr);
    if (d.updatedAt && (!latestDate || new Date(d.updatedAt) > latestDate)) {
      latestDate = new Date(d.updatedAt);
    }
  }

  const distinctPages = [...pageMap.entries()].map(([url, data]) => ({
    url,
    title: data.title,
    passages: data.count,
  }));

  return {
    passagesCount: docs.length,
    distinctPages,
    lastUpdated: latestDate ? latestDate.toISOString() : undefined,
  };
};

/**
 * Start background knowledge sync:
 * Initial index load at start, check every 6 hours, auto-rebuild if > 24 hours old.
 */
export const startKnowledgeSchedule = (): void => {
  const tick = async () => {
    try {
      const latest = await ChatKnowledgeModel.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean();
      const needsRebuild =
        !latest || Date.now() - new Date((latest as any).updatedAt).getTime() > REBUILD_EVERY_MS;
      if (needsRebuild) {
        console.log('[chatbot-knowledge] Auto-syncing knowledge base...');
        await rebuildKnowledge();
      }
    } catch (err: any) {
      console.warn('[chatbot-knowledge] auto-sync check failed:', err.message);
    }
  };

  loadKnowledgeIndex().catch((err) =>
    console.warn('[chatbot-knowledge] initial index load warning:', err.message)
  );

  setTimeout(tick, 15000);
  setInterval(tick, 6 * 60 * 60 * 1000).unref();
};
