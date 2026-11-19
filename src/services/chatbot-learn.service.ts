import crypto from 'crypto';
import { ChatLearnModel, IChatLearnItem } from '../models/chatbot-learn.model';
import { ChatTrainingModel } from '../models/chatbot-training.model';
import {
  prepareTrainingItem,
  invalidateTrainingCache,
  searchKnowledgeDetailed,
} from './chatbot-knowledge.service';

export const normalizeQuestion = (text: string): string =>
  String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const hashQuestionKey = (norm: string): string =>
  crypto.createHash('sha1').update(norm).digest('hex').slice(0, 24);

/**
 * Capture unknown or low-confidence questions into the self-learning queue.
 * Automatically de-duplicates and increments the occurrence count (`asked`).
 */
export const captureUnansweredQuestion = async (params: {
  question: string;
  visitorMessage?: string;
  botReply?: string;
  language?: string;
  sessionId?: string;
  confidence?: number;
}): Promise<void> => {
  const q = String(params.question || '').trim();
  const norm = normalizeQuestion(q);
  if (!norm || norm.length < 4) return;

  // Filter out pure greetings, numbers, and abusive messages from the learning queue
  if (/^(hi|hello|hey|namaste|ok|okay|bye|goodbye|test)\b/i.test(norm) && norm.split(/\s+/).length <= 2) {
    return;
  }
  if (/^\d+$/.test(norm)) return;

  const key = hashQuestionKey(norm);

  try {
    await ChatLearnModel.findOneAndUpdate(
      { key },
      {
        $setOnInsert: {
          key,
          question: q,
          normalizedQuestion: norm,
          language: params.language || 'en',
          status: 'pending',
        },
        $inc: { asked: 1 },
        $set: {
          visitorMessage: params.visitorMessage || q,
          botReply: params.botReply || '',
          confidence: params.confidence ?? 0,
          lastAskedAt: new Date(),
        },
        ...(params.sessionId ? { $addToSet: { sessionIds: params.sessionId } } : {}),
      },
      { upsert: true, new: true }
    );
  } catch (err: any) {
    console.warn(`[chatbot-learn] captureUnansweredQuestion failed: ${err.message}`);
  }
};

/**
 * Record visitor 👍 or 👎 feedback.
 * If negative, captures the question for admin review.
 */
export const recordChatbotFeedback = async (params: {
  sessionId: string;
  rating: 'positive' | 'negative' | 'thumbs_up' | 'thumbs_down';
  question?: string;
  botReply?: string;
  language?: string;
}): Promise<void> => {
  const isNegative = params.rating === 'negative' || params.rating === 'thumbs_down';
  const isPositive = params.rating === 'positive' || params.rating === 'thumbs_up';

  if (!params.question) return;
  const norm = normalizeQuestion(params.question);
  if (!norm) return;
  const key = hashQuestionKey(norm);

  try {
    const update: Record<string, any> = {
      $inc: {
        ...(isPositive ? { 'feedback.thumbsUp': 1 } : {}),
        ...(isNegative ? { 'feedback.thumbsDown': 1 } : {}),
      },
    };

    if (isNegative) {
      update.$set = {
        status: 'pending',
        visitorMessage: params.question,
        botReply: params.botReply || '',
        lastAskedAt: new Date(),
      };
      if (params.sessionId) update.$addToSet = { sessionIds: params.sessionId };
    }

    await ChatLearnModel.findOneAndUpdate({ key }, update, {
      upsert: isNegative,
      setDefaultsOnInsert: true,
    });
  } catch (err: any) {
    console.warn(`[chatbot-learn] recordChatbotFeedback failed: ${err.message}`);
  }
};

/**
 * Get items for the Admin Review Queue (matching ensis-admin AIKnowledgeTab shape)
 */
export const getReviewQueueItems = async (limit = 100): Promise<
  Array<{
    key: string;
    question: string;
    asked: number;
    visitorMessage: string;
    botReply: string;
    lastAskedAt: string;
    status: string;
  }>
> => {
  const items = await ChatLearnModel.find({
    status: { $in: ['pending', 'drafted', 'needs_content'] },
  })
    .sort({ asked: -1, lastAskedAt: -1 })
    .limit(limit)
    .lean();

  return (items as unknown as IChatLearnItem[]).map((it) => ({
    key: it.key,
    question: it.question,
    asked: it.asked || 1,
    visitorMessage: it.visitorMessage || it.question,
    botReply: it.botReply || 'Maaf kijiye, main samajh nahi payi.',
    lastAskedAt: it.lastAskedAt ? new Date(it.lastAskedAt).toISOString() : new Date().toISOString(),
    status: it.status,
  }));
};

/**
 * Dismiss a question from the review queue (or undo dismissal)
 */
export const dismissReviewQueueItem = async (key: string, undo = false): Promise<boolean> => {
  const status = undo ? 'pending' : 'dismissed';
  const result = await ChatLearnModel.findOneAndUpdate({ key }, { status });
  return Boolean(result);
};

/**
 * Approve a verified answer for a question in the review queue:
 * 1. Mark ChatLearn item as approved.
 * 2. Save into ChatTrainingModel as an approved verified note.
 * 3. Generate embeddings & index into vector knowledge immediately.
 * 4. Invalidate in-memory knowledge cache so new questions are answered instantly!
 */
export const approveReviewQuestion = async (params: {
  key: string;
  en: string;
  hi?: string;
  reference?: string;
  owner?: string;
}): Promise<boolean> => {
  const item = await ChatLearnModel.findOne({ key: params.key });
  if (!item) return false;

  item.status = 'approved';
  item.draftAnswer = {
    en: params.en.trim(),
    hi: params.hi?.trim() || '',
    reference: params.reference?.trim() || '',
  };
  await item.save();

  // Create training note in ChatTrainingModel
  const hindiPart = params.hi?.trim() ? `\n(Hindi: ${params.hi.trim()})` : '';
  const content = `Question: ${item.question}\nAnswer: ${params.en.trim()}${hindiPart}\nReference: ${params.reference || 'Admin Verified'}`;

  const trainingDoc = new ChatTrainingModel({
    kind: 'note',
    title: `Verified Q&A: ${item.question.slice(0, 100)}`,
    content,
    always: false,
    enabled: true,
    createdBy: params.owner || 'Admin',
    updatedBy: params.owner || 'Admin',
  });

  await prepareTrainingItem(trainingDoc);
  await trainingDoc.save();

  // Invalidate knowledge cache so future searches find this immediately
  invalidateTrainingCache();

  return true;
};

/**
 * Auto-draft grounded answers from website knowledge for pending items
 */
export const draftGroundedAnswers = async (): Promise<{ drafted: number; needsContent: number }> => {
  const pending = await ChatLearnModel.find({
    status: 'pending',
    draftAnswer: { $exists: false },
  })
    .limit(20)
    .lean();

  let drafted = 0;
  let needsContent = 0;

  for (const doc of pending as unknown as IChatLearnItem[]) {
    try {
      const detailed = await searchKnowledgeDetailed(doc.question, 3);
      if (detailed.confidence < 0.35 || !detailed.passages.length) {
        await ChatLearnModel.updateOne({ _id: doc._id }, { status: 'needs_content' });
        needsContent++;
        continue;
      }

      const passagesContext = detailed.passages.map((p) => `- ${p.title}: ${p.text}`).join('\n');
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) continue;

      const prompt = `Based ONLY on the following official Ensis knowledge, draft a clear, 2-sentence verified answer to the visitor's question in English and conversational Hindi/Hinglish.
Do NOT invent facts. If the knowledge does not answer the question, reply {"canAnswer": false}.
Knowledge:
${passagesContext}

Question: "${doc.question}"

Reply strictly in JSON:
{
  "canAnswer": true,
  "en": "...",
  "hi": "...",
  "reference": "${detailed.passages[0]?.title || 'Website Knowledge'}"
}`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) continue;
      const json = (await res.json()) as any;
      const parsed = JSON.parse(json?.choices?.[0]?.message?.content || '{}');

      if (parsed.canAnswer && parsed.en) {
        await ChatLearnModel.updateOne(
          { _id: doc._id },
          {
            status: 'drafted',
            draftAnswer: {
              en: parsed.en,
              hi: parsed.hi || '',
              reference: parsed.reference || detailed.passages[0]?.title || 'Website',
            },
          }
        );
        drafted++;
      } else {
        await ChatLearnModel.updateOne({ _id: doc._id }, { status: 'needs_content' });
        needsContent++;
      }
    } catch {
      // Continue to next item
    }
  }

  return { drafted, needsContent };
};

/**
 * Start background learning job to draft grounded answers for pending questions
 */
export const startLearningSchedule = (): void => {
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  // Delay initial run by 3 minutes after boot
  setTimeout(() => {
    draftGroundedAnswers().catch((err) => {
      console.warn('[chatbot-learn] initial background drafting error:', err.message);
    });
  }, 3 * 60 * 1000);

  setInterval(() => {
    draftGroundedAnswers().catch((err) => {
      console.warn('[chatbot-learn] recurring background drafting error:', err.message);
    });
  }, SIX_HOURS_MS);
};
