// 1) 在載入時寫入 ts（20 分有效，後端會驗證）
document.addEventListener('DOMContentLoaded', () => {
  const ts = document.getElementById('ts');
  if (ts) ts.value = Date.now().toString();
});

const scriptURL = '/api/submit'; // ← Vite 代理，開發時解 CORS

async function postWithTimeout(url, options = {}, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort('timeout'), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

// 2) 表單送出
document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fd = new FormData(e.target);
  const body = new URLSearchParams();
  fd.forEach((v, k) => body.append(k, v));

  // 基本 email 檢查（和後端一致）
  const email = (fd.get('email') || '').toString().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  try {
    const res = await postWithTimeout(scriptURL, { method: 'POST', body });
    const raw = await res.text();
    let json;
    try { json = JSON.parse(raw); } catch { json = { status: 'error', msg: raw }; }

    // 後端對重複 email 會回 status: success + msg: dup...
    if (json.msg && String(json.msg).startsWith('dup')) {
      alert("You've already submitted this email. We won't add another entry.");
      e.target.reset();
      return;
    }

    if (json.status === 'success') {
      alert('Your submission was successful!');
      e.target.reset();
      return;
    }

    if (res.status === 202) {
      alert('We received your request. Processing may take a moment.');
      e.target.reset();
      return;
    }

    alert('Something went wrong: ' + (json.msg || res.status));
  } catch (err) {
    // 通常是網路/代理暫時不可用
    alert('Could not be submitted: ' + err.message);
  }
});
