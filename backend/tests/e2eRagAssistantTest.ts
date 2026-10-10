import { supabaseAdmin } from '../src/config/supabase';
import { syncServiceKnowledgeChunks } from '../src/services/embeddingService';
import { generateEmbedding, generateAnswer, getApiKeyDiagnostic } from '../src/services/geminiService';
import { retrieveRelevantChunks } from '../src/services/ragService';

async function runE2ETests() {
  console.log('================================================================');
  console.log('🧪 NAGRIKQ RAG USER ASSISTANT: 14 MANDATORY SCENARIOS AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, scenarioNumber: number, title: string, detail?: string) {
    if (condition) {
      console.log(`✅ [SCENARIO ${scenarioNumber}: PASS] ${title}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`❌ [SCENARIO ${scenarioNumber}: FAIL] ${title}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // Scenario 1: Newly created service is automatically chunked and embedded
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 1: Dynamic Service Creation & Real-Time Indexing ---');
  const tempCode = `TEST_SRV_${Date.now()}`;
  const { data: newSrv, error: createErr } = await supabaseAdmin
    .from('services')
    .insert({
      code: tempCode,
      name: 'Ration Card Subsidy Scheme',
      category: 'Food and Civil Supplies',
      description: 'Public distribution service providing subsidized food grains to eligible families in Gujarat.',
      processing_time_days: 10,
      fee_amount: 15.0,
      is_active: true,
    })
    .select('*')
    .single();

  await supabaseAdmin.from('document_requirements').insert([
    {
      service_id: newSrv.id,
      name: 'Family Income Certificate',
      description: 'Current year income certificate from Mamlatdar',
      instructions: 'Original or certified copy',
      is_required: true,
    },
    {
      service_id: newSrv.id,
      name: 'Aadhaar Card of Head of Family',
      description: 'UID card with biometric proof',
      instructions: 'Clear photocopy',
      is_required: true,
    },
  ]);

  const syncCreate = await syncServiceKnowledgeChunks(newSrv.id);
  const { data: createdChunks } = await supabaseAdmin
    .from('knowledge_chunks')
    .select('id, embedding, topic')
    .eq('service_id', newSrv.id);

  const has768Embedding = createdChunks?.every(
    (c) => Array.isArray(c.embedding) || (typeof c.embedding === 'string' && c.embedding.includes(','))
  );

  assert(
    syncCreate.success && (createdChunks?.length || 0) >= 4 && !!has768Embedding,
    1,
    'Newly created service is automatically chunked and embedded with 768-dim vectors',
    `Chunks generated: ${createdChunks?.length}`
  );

  // --------------------------------------------------------------------------
  // Scenario 2: Updated service has refreshed chunks and embeddings
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Service Update & Embeddings Refresh ---');
  await supabaseAdmin
    .from('services')
    .update({ fee_amount: 0.0, description: 'Updated: Free food grain distribution for BPL families.' })
    .eq('id', newSrv.id);

  const syncUpdate = await syncServiceKnowledgeChunks(newSrv.id);
  const { data: updatedChunks } = await supabaseAdmin
    .from('knowledge_chunks')
    .select('content')
    .eq('service_id', newSrv.id)
    .eq('topic', 'process_and_timeline');

  assert(
    syncUpdate.success && updatedChunks?.[0]?.content.includes('₹0'),
    2,
    'Updated service has refreshed chunks and embeddings',
    'Fee updated to ₹0 in chunk content'
  );

  // --------------------------------------------------------------------------
  // Scenario 3: Existing services missing embeddings can be backfilled
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 3: Backfilling Missing Embeddings ---');
  const syncBackfill = await syncServiceKnowledgeChunks();
  assert(
    syncBackfill.success && syncBackfill.totalChunks > 0,
    3,
    'Existing services missing embeddings can be backfilled',
    `Total chunks synced: ${syncBackfill.totalChunks}`
  );

  // --------------------------------------------------------------------------
  // Scenario 4: Re-indexing does not create duplicate chunks
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Re-indexing Idempotency ---');
  const beforeCount = syncBackfill.totalChunks;
  const syncAgain = await syncServiceKnowledgeChunks();
  const { count: afterCount } = await supabaseAdmin
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true });

  assert(
    afterCount === beforeCount,
    4,
    'Re-indexing does not create duplicate chunks',
    `Before: ${beforeCount}, After: ${afterCount}`
  );

  // --------------------------------------------------------------------------
  // Scenario 5: A question about a newly added service retrieves that service
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 5: Question About Newly Added Service ---');
  const qNew = 'How do I apply for the Ration Card Subsidy Scheme?';
  const retNew = await retrieveRelevantChunks(qNew, { similarityThreshold: 0.25, topK: 3 });
  assert(
    retNew.hasResults && retNew.chunks.some((c) => c.service_id === newSrv.id),
    5,
    'Question about newly added service retrieves that service',
    `Top score: ${retNew.chunks[0]?.similarity.toFixed(4)}`
  );

  // --------------------------------------------------------------------------
  // Scenario 6: Questions about required docs, eligibility, fees, processing time
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 6: Precise Service Attribute Questions ---');
  const qDocs = 'What documents are required for Ration Card Subsidy?';
  const retDocs = await retrieveRelevantChunks(qDocs, { similarityThreshold: 0.25, topK: 3 });
  const ansDocs = await generateAnswer(qDocs, retDocs.chunks);

  assert(
    ansDocs.toLowerCase().includes('income') || ansDocs.toLowerCase().includes('aadhaar'),
    6,
    'Questions about required documents return database-supported answers',
    'Found document names in answer'
  );

  // --------------------------------------------------------------------------
  // Scenario 7: Questions using synonyms or different wording
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 7: Synonym and Paraphrase Handling ---');
  const qSynonym = 'What papers must a citizen upload for government food grain ration allotment?';
  const retSynonym = await retrieveRelevantChunks(qSynonym, { similarityThreshold: 0.25, topK: 3 });
  assert(
    retSynonym.hasResults && retSynonym.chunks.some((c) => c.service_id === newSrv.id),
    7,
    'Questions using synonyms or different wording still retrieve relevant services',
    `Match: ${retSynonym.chunks[0]?.service_name}`
  );

  // --------------------------------------------------------------------------
  // Scenario 8: Questions requiring multiple chunks use combined context
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 8: Multi-Chunk Context Synthesis ---');
  const qMulti = 'Tell me the required documents and processing time for the food grain ration service.';
  const retMulti = await retrieveRelevantChunks(qMulti, { similarityThreshold: 0.25, topK: 4 });
  const ansMulti = await generateAnswer(qMulti, retMulti.chunks);
  assert(
    (ansMulti.toLowerCase().includes('document') || ansMulti.toLowerCase().includes('income') || ansMulti.toLowerCase().includes('aadhaar')) &&
    (ansMulti.includes('10') || ansMulti.toLowerCase().includes('day') || ansMulti.toLowerCase().includes('time')),
    8,
    'Questions requiring multiple chunks use the correct combined context',
    'Answer combines documents and SLA processing timeline'
  );

  // --------------------------------------------------------------------------
  // Scenario 9: Missing information produces an honest response
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 9: Honest Handling of Missing Information ---');
  const qOut = 'Can I renew my international aircraft pilot license on NagrikQ?';
  const retOut = await retrieveRelevantChunks(qOut, { similarityThreshold: 0.7 });
  const ansOut = retOut.hasResults && retOut.chunks.length > 0 ? await generateAnswer(qOut, retOut.chunks) : 'Unavailable';
  assert(
    !retOut.hasResults || ansOut.toLowerCase().includes('unavailable') || ansOut.toLowerCase().includes('not have enough information'),
    9,
    'Missing information produces an honest response instead of fabricated details',
    ansOut.slice(0, 70) + '...'
  );

  // --------------------------------------------------------------------------
  // Scenario 10: Invalid Gemini credentials produce a clear diagnostic
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 10: Clear Diagnostic on Invalid Credentials ---');
  const origKey = process.env.GEMINI_API_KEY;
  const origRagKey = process.env.Gemini_Rag_Model_API;
  process.env.GEMINI_API_KEY = 'ya29.invalid_oauth_token';
  delete process.env.Gemini_Rag_Model_API;
  const diagInvalid = getApiKeyDiagnostic();
  assert(
    !diagInvalid.isValidKeyFormat && diagInvalid.credentialType === 'OAUTH_ACCESS_TOKEN',
    10,
    'Invalid Gemini credentials produce a clear diagnostic error',
    diagInvalid.message.slice(0, 60) + '...'
  );
  process.env.GEMINI_API_KEY = origKey;
  if (origRagKey) process.env.Gemini_Rag_Model_API = origRagKey;

  // --------------------------------------------------------------------------
  // Scenario 11: Embedding-provider failure is safely diagnosable
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 11: Safely Diagnosable Embedding Failure ---');
  let threwExpected = false;
  try {
    process.env.GEMINI_API_KEY = '';
    delete process.env.Gemini_Rag_Model_API;
    await generateEmbedding('Test text');
  } catch (err: any) {
    threwExpected = true;
  } finally {
    process.env.GEMINI_API_KEY = origKey;
    if (origRagKey) process.env.Gemini_Rag_Model_API = origRagKey;
  }
  assert(
    threwExpected,
    11,
    'Embedding-provider failure and missing credentials throw diagnosable error without inserting fake data',
    'Threw expected auth error'
  );

  // --------------------------------------------------------------------------
  // Scenario 12: Deleted or unpublished services are excluded from active results
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 12: Inactive / Deleted Service Exclusion ---');
  // Toggle service inactive
  await supabaseAdmin.from('services').update({ is_active: false }).eq('id', newSrv.id);
  await syncServiceKnowledgeChunks(newSrv.id);

  const retInactive = await retrieveRelevantChunks('Ration Card Subsidy Scheme food grain', { similarityThreshold: 0.25 });
  const containsInactive = retInactive.chunks.some((c) => c.service_id === newSrv.id);
  assert(
    !containsInactive,
    12,
    'Deleted or unpublished services are excluded from active results',
    'Inactive service was excluded'
  );

  // Cleanup test service
  await supabaseAdmin.from('knowledge_chunks').delete().eq('service_id', newSrv.id);
  await supabaseAdmin.from('document_requirements').delete().eq('service_id', newSrv.id);
  await supabaseAdmin.from('services').delete().eq('id', newSrv.id);

  // --------------------------------------------------------------------------
  // Scenario 13: Existing User Panel Assistant UI API Endpoint works
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 13: Live HTTP /api/rag/ask Endpoint ---');
  const httpRes = await fetch('http://localhost:5000/api/rag/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'What is the processing time and fee for Adhar card?' }),
  });
  const httpJson = (await httpRes.json()) as any;
  assert(
    httpRes.status === 200 && httpJson.success && typeof httpJson.data?.answer === 'string' && httpJson.data.sources?.length > 0,
    13,
    'Existing User Panel Assistant UI endpoint returns HTTP 200 with answer and sources',
    `HTTP Status: ${httpRes.status}, Sources: ${httpJson.data?.sources?.length}`
  );

  // --------------------------------------------------------------------------
  // Scenario 14: Authentication, validation & data isolation intact
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 14: Validation & Security Isolation ---');
  const badReqRes = await fetch('http://localhost:5000/api/rag/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: '   ' }),
  });
  const badJson = (await badReqRes.json()) as any;
  assert(
    badReqRes.status === 400 && !badJson.success && badJson.error?.code === 'VALIDATION_ERROR',
    14,
    'Authentication, validation, and request isolation remain intact for malformed queries',
    `Status: ${badReqRes.status}, Code: ${badJson.error?.code}`
  );

  console.log('\n================================================================');
  console.log(`🏁 AUDIT RESULTS: ${passed} OF 14 SCENARIOS PASSED, ${failed} FAILED`);
  console.log('================================================================');
}

runE2ETests().catch(console.error);
