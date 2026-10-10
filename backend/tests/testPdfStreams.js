require('dotenv').config();
const ws = require('ws');
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}
const { createClient } = require('@supabase/supabase-js');
const zlib = require('zlib');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function testPdfStreams() {
  const { data: docs } = await supabase.from('documents').select('*');
  for (const doc of docs) {
    console.log(`\nDocument: ${doc.requirement_name} (${doc.file_name})`);
    console.log(`URL: ${doc.storage_path}`);
    const res = await fetch(doc.storage_path);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`Size: ${buf.length} bytes`);

    // Check for DCTDecode (JPEG) in PDF
    const str = buf.toString('binary');
    const dctMatches = [...str.matchAll(/\/Filter\s*\/DCTDecode/g)];
    console.log(`DCTDecode (JPEG) count: ${dctMatches.length}`);

    // Check text streams
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    let totalText = '';
    while ((match = streamRegex.exec(str)) !== null) {
      try {
        const decompressed = zlib.inflateSync(Buffer.from(match[1], 'binary')).toString('utf8');
        // Extract visible characters
        const cleaned = decompressed.replace(/[^\x20-\x7E\r\n]/g, ' ');
        if (cleaned.trim().length > 10) {
          totalText += ' ' + cleaned;
        }
      } catch (e) {}
    }
    console.log(`Extracted raw stream text length: ${totalText.length}`);
    if (totalText.length > 0) {
      console.log(`Snippet: ${totalText.substring(0, 300)}`);
    }
  }
}

testPdfStreams();
