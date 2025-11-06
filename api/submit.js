// api/submit.js  (Vercel Serverless Function)
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', msg: 'Method not allowed. Use POST.' });
  }

  // --- Read raw body (不要依賴 req.body) ---
  const rawBody = await new Promise((resolve) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });

  // 若前端誤用 JSON，轉成 x-www-form-urlencoded 再轉發
  let forwardBody = rawBody;
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!rawBody && ct.includes('application/json')) {
    // 沒 body但宣稱 json，就當成空
    forwardBody = '';
  } else if (ct.includes('application/json') && rawBody) {
    try {
      const obj = JSON.parse(rawBody);
      forwardBody = new URLSearchParams(obj).toString();
    } catch {
      // 解析失敗就原樣傳
      forwardBody = rawBody;
    }
  }

  try {
    const r = await fetch(process.env.GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: forwardBody // 原樣/轉好的 urlencoded
    });

    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (err) {
    res.status(502).json({ status: 'error', msg: String(err?.message || err) });
  }
}
