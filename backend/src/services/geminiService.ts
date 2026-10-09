import { GoogleGenerativeAI } from '@google/generative-ai';

const getApiKey = (): string => {
  return process.env.GEMINI_API_KEY || '';
};

const getGenAI = (): GoogleGenerativeAI => {
  const key = getApiKey();
  return new GoogleGenerativeAI(key);
};

const CANDIDATE_CHAT_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview',
];

export const geminiChatModel = {
  generateContent: async (prompt: string) => {
    const genAI = getGenAI();
    for (const mName of CANDIDATE_CHAT_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: mName });
        return await model.generateContent(prompt);
      } catch {
        // try next candidate
      }
    }
    const fallbackModel = genAI.getGenerativeModel({ model: CANDIDATE_CHAT_MODELS[0] });
    return await fallbackModel.generateContent(prompt);
  },
};

export const geminiEmbeddingModel = {
  embedContent: async (content: any) => {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const payload =
      typeof content === 'string'
        ? { content: { parts: [{ text: content }] }, outputDimensionality: 768 }
        : { ...content, outputDimensionality: 768 };
    return await model.embedContent(payload as any);
  },
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[WARN] GEMINI_API_KEY not configured. Returning empty embedding.');
    return [];
  }

  try {
    const result = await geminiEmbeddingModel.embedContent(text);
    const embedding = result.embedding;
    if (!embedding || !embedding.values) {
      throw new Error('Failed to generate embedding: no embedding values returned');
    }
    return embedding.values;
  } catch (err: any) {
    console.error('[ERR] Failed to generate embedding from Gemini:', err?.message || err);
    return [];
  }
};

export const generateAnswer = async (
  question: string,
  contextChunks: Array<{
    content: string;
    service_name: string;
    topic: string;
    service_id: string;
    document_type?: string;
    metadata?: Record<string, unknown>;
  }>
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return 'The AI assistant is temporarily unavailable because the API key is not configured.';
  }

  const systemInstruction = `
You are NagrikQ's government service assistant.

Answer ONLY using the provided NagrikQ context below.

Do not invent or assume government requirements.

If the context does not contain the answer, clearly state that the information is unavailable.

Give simple, clear answers suitable for citizens.

When listing documents, clearly distinguish required, optional, and conditional documents.

Answer in the user's language when possible.

---

Context:
`;

  const contextText = contextChunks
    .map((chunk) => {
      const serviceInfo = chunk.service_name ? `Service: ${chunk.service_name}` : '';
      const topicInfo = chunk.topic ? `Topic: ${chunk.topic}` : '';
      const docTypeInfo = chunk.document_type ? `Document Type: ${chunk.document_type}` : '';
      return `[${serviceInfo} | ${topicInfo} | ${docTypeInfo}] ${chunk.content}`;
    })
    .join('\n\n');

  const fullPrompt = `${systemInstruction}${contextText}\n\nQuestion: ${question}\n\nAnswer:`;

  const genAI = getGenAI();

  try {
    let result;
    for (const mName of CANDIDATE_CHAT_MODELS) {
      try {
        result = await genAI.getGenerativeModel({ model: mName }).generateContent(fullPrompt);
        if (result) break;
      } catch {
        // try next candidate model
      }
    }

    if (!result) {
      return 'I do not have enough information about this requirement.';
    }

    const response = await result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      return 'I do not have enough information about this requirement.';
    }

    return text;
  } catch (err: any) {
    console.error('[ERR] Gemini generateContent failed:', err?.message || err);
    return 'I encountered an issue generating an answer right now. Please try again.';
  }
};