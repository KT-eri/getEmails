// api/submit.js  (Vercel Serverless Function)
export default async function handler(req, res) {
  // --- 基本 CORS ---
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', msg: 'Method not allowed. Use POST.' });
  }

  // --- 讀取原始 body（不要依賴 req.body）---
  const rawBody = await new Promise((resolve) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
  });

  // --- 若前端傳 JSON，轉為 x-www-form-urlencoded ---
  let forwardBody = rawBody;
  const ct = (req.headers['content-type'] || '').toLowerCase();

  if (ct.includes('application/json')) {
    try {
      const obj = rawBody ? JSON.parse(rawBody) : {};
      forwardBody = new URLSearchParams(obj).toString();
    } catch (err) {
      console.warn('JSON parse error:', err);
      forwardBody = rawBody;
    }
  }

  try {
    // --- 轉發到 Google Apps Script ---
    const r = await fetch(process.env.GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: forwardBody,
    });

    const text = await r.text();

   // --- 嘗試回 JSON 給前端 ---
try {
  const data = JSON.parse(text);
  res.status(200).json(data);
} catch {
  // ✅ 不回 502，改回 200 + 結構化錯誤
  res.status(200).json({
    status: 'error',
    msg: 'Upstream (GAS) did not return JSON',
    raw: text
  });
}

  } catch (err) {
    res.status(502).json({ status: 'error', msg: String(err?.message || err) });
  }
}
