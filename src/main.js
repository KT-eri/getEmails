// src/main.js
document.addEventListener("DOMContentLoaded", () => {

  // 寫入 ts
  const tsInput = document.getElementById("ts");
  if (tsInput) tsInput.value = Date.now().toString();

  const form = document.getElementById("form");
  if (!form) {
    console.error("Form #form not found");
    return;
  }

  const endpoint = '/api/submit'; // 由 Vite 代理到 GAS /exec

  async function postWithTimeout(url, options = {}, timeoutMs = 20000) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort("timeout"), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(id);
    }
  }
// 更穩健的抓法：先在 form 範圍內找，支援 id 或 name
const nameEl  = form.querySelector('#name, [name="name"]');
const emailEl = form.querySelector('#email, [name="email"]');

function attachEnglishMessages(el, kind) {
  if (!el) return; // 沒這個欄位就跳過，避免 null.addEventListener

  el.addEventListener('invalid', (e) => {
    e.preventDefault();              // 阻止瀏覽器預設本地語系訊息
    el.setCustomValidity('');        // 先清空
    const v = el.validity;
    if (v.valueMissing) {
      el.setCustomValidity(kind === 'name'
        ? 'Please enter your name.'
        : 'Please enter your email address.');
    } else if (v.typeMismatch) {
      el.setCustomValidity('Please enter a valid email address.');
    } else if (v.tooShort || v.patternMismatch) {
      el.setCustomValidity(kind === 'name'
        ? 'Your name is too short.'
        : 'Please enter a valid email address.');
    }
    el.reportValidity();             // 立即顯示英文提示
  });

  // 輸入就清掉自訂錯誤，避免訊息卡住
  el.addEventListener('input', () => el.setCustomValidity(''));
}

attachEnglishMessages(nameEl,  'name');
attachEnglishMessages(emailEl, 'email');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form); // 會包含 name/email/hp/ts/token
    // 轉成 x-www-form-urlencoded，讓 GAS 的 e.parameter 可讀
    const body = new URLSearchParams();
    fd.forEach((v, k) => body.append(k, v));

    try {
      const res = await postWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const text = await res.text();
        // 後端有時可能回不是 JSON（例如 HTML），先防呆

      const data = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { status: "error", msg: text };
        }
      })();

      if (data.status === "success") {
        alert('Submitted successfully!');
        form.reset();
        return;
      }
      // 接受 202/200 等非錯誤碼但不是 success 的訊息
      if (res.status === 202) {
        alert("We’ve received your submission and are processing it.");
        form.reset();
        return;
      }
      throw new Error(data.msg || `HTTP ${res.status}`);
    } catch (err) {
      const msg = (err && err.message) || String(err);
      if (msg === "timeout") {
        alert('Submission failed: the server is busy. Please try again.');
      } else {
       // 若是整段 HTML（像「找不到網頁」），避免整頁塞進 alert
        const brief = msg.replace(/<[^>]+>/g, '').slice(0, 140);
        alert(`送出失敗：${brief || 'Unknown error'}`);
      }
    }
  });
});
