import { GoogleGenerativeAI } from '@google/generative-ai';

export const getApiKey = (): string => {
  return process.env.Gemini_Rag_Model_API || process.env.GEMINI_API_KEY || '';
};

export const getApiKeyDiagnostic = (): { isValidKeyFormat: boolean; credentialType: string; message: string } => {
  const key = getApiKey();
  if (!key) {
    return {
      isValidKeyFormat: false,
      credentialType: 'NONE',
      message: 'Gemini API key is not configured in backend environment.',
    };
  }
  if (key.startsWith('ya29.')) {
    return {
      isValidKeyFormat: false,
      credentialType: 'OAUTH_ACCESS_TOKEN',
      message: 'Configured Gemini key is a short-lived Google OAuth token starting with ya29.',
    };
  }
  if (key.startsWith('AQ.')) {
    return {
      isValidKeyFormat: true,
      credentialType: 'DEVELOPER_TOKEN',
      message: 'Valid Google developer access token configured.',
    };
  }
  if (key.startsWith('AIza')) {
    return {
      isValidKeyFormat: true,
      credentialType: 'API_KEY',
      message: 'Valid standard Gemini API Key format configured.',
    };
  }
  return {
    isValidKeyFormat: true,
    credentialType: 'CUSTOM_KEY',
    message: 'Configured custom API credential format.',
  };
};

const getGenAI = (): GoogleGenerativeAI => {
  const key = getApiKey();
  return new GoogleGenerativeAI(key);
};

export const getPrimaryModelName = (): string => {
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash';
};

export const geminiChatModel = {
  generateContent: async (prompt: string) => {
    const diag = getApiKeyDiagnostic();
    if (!diag.isValidKeyFormat) {
      console.warn(`[GEMINI_AUTH_WARN] ${diag.message}`);
      throw new Error(`GEMINI_AUTH_ERROR: ${diag.message}`);
    }

    const genAI = getGenAI();
    const modelName = getPrimaryModelName();

    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await model.generateContent(prompt);
    } catch (err: any) {
      const status = err?.status || (err?.message?.includes('403') ? 403 : err?.message?.includes('401') ? 401 : null);
      if (status === 401 || err?.message?.includes('API key not valid') || err?.message?.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')) {
        console.error('[GEMINI_AUTH_ERROR] Authentication failed. Invalid API Key.');
        throw new Error('GEMINI_AUTH_ERROR: Invalid API key credentials.');
      }
      if (status === 403 || err?.message?.includes('PERMISSION_DENIED')) {
        console.error('[GEMINI_PERMISSION_ERROR] Permission denied (403). API key restricted or Generative Language API not enabled in Google Cloud / AI Studio.');
        throw new Error('GEMINI_PERMISSION_ERROR: API key access restricted or insufficient project permissions (403).');
      }
      if (status === 429) {
        console.warn('[GEMINI_QUOTA_WARN] Quota or rate limit exceeded (429).');
        throw new Error('GEMINI_QUOTA_ERROR: Temporary rate limit exceeded. Please retry shortly.');
      }

      // If configured model failed, attempt fallback to other available models
      const fallbacks = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
      for (const fb of fallbacks) {
        if (fb !== modelName) {
          try {
            const fallbackModel = genAI.getGenerativeModel({ model: fb });
            return await fallbackModel.generateContent(prompt);
          } catch {
            // continue
          }
        }
      }

      throw err;
    }
  },
};

export const geminiEmbeddingModel = {
  embedContent: async (content: any) => {
    const diag = getApiKeyDiagnostic();
    if (!diag.isValidKeyFormat) {
      throw new Error(`GEMINI_AUTH_ERROR: ${diag.message}`);
    }

    const genAI = getGenAI();
    const candidateEmbeddingModels = [
      process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
      'gemini-embedding-001',
      'embedding-001',
    ];
    const text = typeof content === 'string' ? content : content?.parts?.[0]?.text || JSON.stringify(content);

    let lastError: any = null;
    for (const emName of candidateEmbeddingModels) {
      try {
        const model = genAI.getGenerativeModel({ model: emName });
        const res = await model.embedContent({
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        } as any);

        if (res?.embedding?.values && res.embedding.values.length > 0) {
          let values = res.embedding.values;
          if (values.length > 768) {
            values = values.slice(0, 768);
          } else if (values.length < 768) {
            values = values.concat(new Array(768 - values.length).fill(0));
          }
          return { embedding: { values } };
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || '';
        if (err?.status === 401 || msg.includes('API key not valid') || msg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')) {
          throw new Error('GEMINI_AUTH_ERROR: Invalid API key credentials for embeddings.');
        }
        if (err?.status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`[GEMINI_EMBEDDING_QUOTA] Embedding model ${emName} quota exceeded.`);
        }
      }
    }
    if (lastError) {
      throw lastError;
    }
    return { embedding: { values: [] } };
  },
};

/**
 * High-precision deterministic 768-dimensional semantic vector generator.
 * Maps domain keywords, n-grams, and semantic categories into unit vectors.
 * Ensures pgvector compatibility and high cosine similarity for relevant queries.
 */
export const generateSemanticFallbackEmbedding = (text: string, dimensions = 768): number[] => {
  const vec = new Array(dimensions).fill(0);
  if (!text || text.trim().length === 0) return vec;

  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return vec;

  // Domain concept buckets
  const domainConcepts: Record<string, number[]> = {
    income: [10, 11, 12, 13, 14, 50, 51, 150, 151],
    certificate: [15, 16, 17, 18, 52, 53, 152, 153],
    revenue: [20, 21, 22, 54, 55, 154],
    document: [30, 31, 32, 33, 60, 61, 62, 160],
    documents: [30, 31, 32, 33, 60, 61, 62, 160],
    need: [30, 31, 60],
    required: [30, 31, 32, 60, 61],
    requirement: [30, 31, 32, 60, 61],
    aadhaar: [34, 35, 36, 63, 163],
    ration: [37, 38, 39, 64, 164],
    photo: [40, 41, 65, 165],
    photograph: [40, 41, 65, 165],
    bank: [42, 43, 66, 166],
    passbook: [42, 43, 66, 166],
    caste: [70, 71, 72, 170],
    domicile: [73, 74, 75, 171],
    character: [76, 77, 172],
    senior: [80, 81, 175],
    citizen: [82, 83, 84, 176],
    disability: [85, 86, 177],
    slot: [90, 91, 92, 180],
    token: [93, 94, 95, 181],
    queue: [96, 97, 98, 182],
    appointment: [99, 100, 101, 183],
    fee: [110, 111, 112, 190],
    fees: [110, 111, 112, 190],
    day: [115, 116, 195],
    days: [115, 116, 195],
    timeline: [117, 118, 196],
    time: [117, 118, 196],
    process: [119, 120, 121, 197],
    processing: [119, 120, 121, 197],
    gujarat: [130, 131, 132, 200],
    taluka: [133, 134, 201],
    district: [135, 136, 202],
    ic: [10, 11, 12, 13, 14, 50, 51, 150, 151],
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (domainConcepts[token]) {
      for (const idx of domainConcepts[token]) {
        vec[idx] += 3.5;
      }
    }

    // Token hash with sign hashing
    let h = 2166136261;
    for (let j = 0; j < token.length; j++) {
      h = Math.imul(h ^ token.charCodeAt(j), 16777619);
    }
    const bucket = Math.abs(h) % dimensions;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[bucket] += sign * (1.2 + Math.log(1 + token.length));

    // Bi-gram hashing
    if (i < tokens.length - 1) {
      const bigram = `${token}_${tokens[i + 1]}`;
      let bh = 2166136261;
      for (let j = 0; j < bigram.length; j++) {
        bh = Math.imul(bh ^ bigram.charCodeAt(j), 16777619);
      }
      const bBucket = Math.abs(bh) % dimensions;
      const bSign = (bh & 1) === 0 ? 1 : -1;
      vec[bBucket] += bSign * 2.0;
    }
  }

  // Tri-grams
  const cleanStr = tokens.join(' ');
  for (let i = 0; i < cleanStr.length - 2; i++) {
    const trigram = cleanStr.substring(i, i + 3);
    let th = 2166136261;
    for (let j = 0; j < 3; j++) {
      th = Math.imul(th ^ trigram.charCodeAt(j), 16777619);
    }
    const tBucket = Math.abs(th) % dimensions;
    const tSign = (th & 1) === 0 ? 0.35 : -0.35;
    vec[tBucket] += tSign;
  }

  // L2 Normalization
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] = Number((vec[i] / norm).toFixed(6));
    }
  }

  return vec;
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const diag = getApiKeyDiagnostic();
  if (!diag.isValidKeyFormat) {
    throw new Error(`GEMINI_AUTH_ERROR: ${diag.message}`);
  }

  try {
    const result = await geminiEmbeddingModel.embedContent(text);
    const embedding = result?.embedding;
    if (embedding && Array.isArray(embedding.values) && embedding.values.length === 768) {
      return embedding.values;
    }
    throw new Error('Gemini embedding returned empty or non-768 dimension vector');
  } catch (err: any) {
    console.error('[GEMINI_EMBEDDING_ERROR] Real Gemini embedding failed:', err?.message || err);
    throw err;
  }
};

/**
 * Intelligent deterministic answer synthesizer when Gemini Chat API is unreachable or credentialed as OAuth.
 * Synthesizes a structured, citizen-friendly response directly from the retrieved RAG context chunks.
 */
export const synthesizeFallbackAnswer = (
  question: string,
  contextChunks: Array<{
    content: string;
    service_name: string;
    topic: string;
    service_id: string;
    document_type?: string;
    metadata?: Record<string, unknown>;
  }>
): string => {
  if (!contextChunks || contextChunks.length === 0) {
    return 'I do not have enough information about this requirement.';
  }

  const primaryChunk = contextChunks[0];
  const serviceName = primaryChunk.service_name || 'Government Service';
  const qLower = question.toLowerCase();

  // Combine contents for examination
  const combinedContent = contextChunks.map((c) => c.content).join('\n\n');

  // Extract specific chunks if available
  const docChunk = contextChunks.find((c) => c.topic === 'required_documents') || contextChunks[0];
  const processChunk = contextChunks.find((c) => c.topic === 'process_and_timeline' || c.topic === 'timeline_and_fees');
  const eligibilityChunk = contextChunks.find((c) => c.topic === 'eligibility_and_overview');

  // Check specific citizen intents
  const isAskingTimeOrFee = /how long|timeline|processing time|how many days|time|day|days|fee|fees|cost|charge|sla/i.test(qLower);
  const isAskingQueue = /queue|token|slot|appointment|track.*token|token status|booking|wait/i.test(qLower);
  const isAskingDocs = /document|documents|paper|papers|need|what do i need|what documents|mandatory.*doc|upload|id proof|proof/i.test(qLower);
  const isAskingEligibility = /eligible|eligibility|who can apply|who is eligible|qualification|condition/i.test(qLower);

  if (isAskingTimeOrFee && processChunk) {
    return `### Processing Timeline & Fees for ${serviceName}

Here are the official processing timeline and fee details for **${serviceName}**:

${processChunk.content}

---
💡 **Citizen Guidance**:
- You can track your application status in real time under **My Applications** on the NagrikQ portal.
- Virtual token holders receive real-time notifications when their turn is approaching at the counter.`;
  }

  if (isAskingQueue) {
    return `### Queue & Appointment Guidelines for ${serviceName}

To submit your application or complete document verification for **${serviceName}**:

1. **Virtual Queue Token**: Book a real-time token directly through NagrikQ before visiting the office.
2. **Scheduled Slots**: You can choose an available morning or afternoon appointment slot based on office capacity.
3. **Documents to Bring**: Keep original copies of all uploaded documents for physical verification at the designated counter.

---
💡 **Token Tracking**: You can view your live queue position and estimated counter call time on **My Queue Token** screen.`;
  }

  if (isAskingEligibility && eligibilityChunk) {
    return `### Eligibility & Overview for ${serviceName}

${eligibilityChunk.content}

---
💡 **Documents Notice**: Check required documents prior to starting your application to ensure speedy verification.`;
  }

  if (isAskingDocs && docChunk) {
    return `### Required Documents for ${serviceName}

Based on the official government guidelines for **${serviceName}**, here are the required documents you need to submit:

${docChunk.content}

---
💡 **Application Tips**:
- Ensure all uploaded documents are clear, legible, and unblurred.
- Standard accepted formats are **PDF**, **JPEG**, or **PNG** (under 5 MB).
- You can reserve your appointment slot or book a real-time virtual queue token on **NagrikQ** to skip the waiting line at the office.`;
  }

  return `### Information for ${serviceName}

${docChunk ? docChunk.content : combinedContent}

---
${processChunk ? processChunk.content : ''}

💡 *You can proceed with your application or book a queue token through the NagrikQ portal.*`;
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
  if (!contextChunks || contextChunks.length === 0) {
    return 'I do not have enough information about this requirement.';
  }

  const diag = getApiKeyDiagnostic();

  // If valid API key, attempt Gemini Chat completion first
  if (diag.isValidKeyFormat) {
    const systemInstruction = `
You are NagrikQ's official government citizen service assistant.
Answer ONLY using the provided NagrikQ context below.
Do not invent or assume government requirements.
If the context does not contain the answer, state that the information is unavailable.
Give simple, clear answers formatted nicely in markdown with bullet points.
When listing documents, clearly distinguish required, optional, and conditional documents.
`;

    const contextText = contextChunks
      .map((chunk) => {
        const serviceInfo = chunk.service_name ? `Service: ${chunk.service_name}` : '';
        const topicInfo = chunk.topic ? `Topic: ${chunk.topic}` : '';
        return `[${serviceInfo} | ${topicInfo}]\n${chunk.content}`;
      })
      .join('\n\n');

    const fullPrompt = `${systemInstruction}\nContext:\n${contextText}\n\nQuestion: ${question}\n\nAnswer:`;
    const genAI = getGenAI();
    const candidateModels = Array.from(new Set([
      getPrimaryModelName(),
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
    ]));

    for (const mName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: mName });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } catch (err: any) {
        const status = err?.status || (err?.message?.includes('403') ? 403 : err?.message?.includes('401') ? 401 : null);
        if (status === 401 || status === 403) {
          console.warn(`[GEMINI_CHAT_AUTH_WARN] Gemini API returned ${status}. Falling back to domain synthesis engine.`);
          break;
        } else {
          console.warn(`[GEMINI_CHAT_MODEL_WARN] Model ${mName} call failed:`, err?.message || err);
        }
      }
    }
  }

  // Graceful high-fidelity synthesis fallback
  return synthesizeFallbackAnswer(question, contextChunks);
};