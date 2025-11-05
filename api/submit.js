// api/submit.js (Vercel Serverless Function)
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', msg: 'Method not allowed' });

  try {
    // 用 x-www-form-urlencoded 轉送到 GAS
    const params = new URLSearchParams(req.body ?? {});
    const r = await fetch(process.env.GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const text = await r.text();
    // 把 GAS 的回應原樣回傳給前端（維持 JSON）
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (err) {
    res.status(502).json({ status: 'error', msg: String(err?.message || err) });
  }
}
