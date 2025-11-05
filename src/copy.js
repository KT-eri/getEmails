/********* 設定區 *********/
const SPREADSHEET_ID = "10uGLpu-VSwg66mrly5KCdz3vl2HZfbSHU0HXGDJllIY";
const SHEET_NAME = "Sheet1";

const DUPLICATE_WINDOW_DAYS = 0;          // Email 全時段視重複（0）或 N 天內視重複
const ENABLE_ADMIN_NOTIFY = true;
const ADMIN_EMAIL = "ktchartgpt@gmail.com";
const ENABLE_USER_AUTOREPLY = true;
const AUTOREPLY_SUBJECT = "Thank you! Your submission has been received.";
const ADMIN_NOTIFY_SUBJECT = "【e-mail 表單通知】收到一筆新提交";

// 安全參數
const APP_TOKEN = "CHANGE_ME_MINI_TOKEN"; // 可先放固定字串；要用就前端一併送上
const REQUIRE_TOKEN = true;               // 是否啟用 token 驗證
const MIN_SUBMIT_MS = 1500;               // 頁面載入後至少多少毫秒才能送出
const MAX_BODY_BYTES = 10 * 1024;         // 最大 body 大小（10KB）
const COOLDOWN_MINUTES = 5;              // 同 email 幾分鐘內不得重複送出
const ENABLE_RECAPTCHA = false;           // 若要啟用，設 true 並填入 SECRET
/********************************/

function doGet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ready = !!ss.getSheetByName(SHEET_NAME);
    return json({ status: "ok", msg: "Web App 已部署成功，請使用 POST 傳資料。", sheetReady: ready }, 200);
  } catch (err) {
    return json({ status: "error", msg: "無法開啟試算表", detail: String(err) }, 500);
  }
}

function doOptions() {
  return json({ ok: true, method: "OPTIONS" }, 200);
}


function doPost(e) {
  // 防重複（以 Email 為 key；依 DUPLICATE_WINDOW_DAYS）
  if (isDuplicateEmail(sheet, email, DUPLICATE_WINDOW_DAYS)) {
  return json({ status: 'error', code: 'DUPLICATE', msg: '你已提交過資料，請勿重複提交' }, 409);
}

  // --- 基本檢查與大小限制 ---
  const rawType = e && e.postData && e.postData.type;
  const rawBody = e && e.postData && e.postData.contents;
  if (!e || !e.postData) return json(err("EMPTY_BODY", "沒有收到任何資料"), 400);
  if (rawBody && rawBody.length > MAX_BODY_BYTES) return json(err("BODY_TOO_LARGE", "資料過大"), 413);

  console.log("🟦 type:", rawType, "len:", rawBody ? rawBody.length : 0);

  // --- 解析 body（支援 urlencoded 與 JSON） ---
  let payload = {};
  try {
    if (rawType === "application/x-www-form-urlencoded") {
      payload = {
        name: (e.parameter.name || "").trim(),
        email: (e.parameter.email || "").trim(),
        hp: (e.parameter.hp || "").trim(),       // honeypot
        ts: Number(e.parameter.ts || 0),         // 載入時間戳（ms）
        token: (e.parameter.token || "").trim(), // APP_TOKEN
        recaptcha: (e.parameter.recaptcha || "").trim() // 選配
      };
    } else {
      const parsed = JSON.parse(rawBody || "{}");
      payload = {
        name: (parsed.name || "").trim(),
        email: (parsed.email || "").trim(),
        hp: (parsed.hp || "").trim(),
        ts: Number(parsed.ts || 0),
        token: (parsed.token || "").trim(),
        recaptcha: (parsed.recaptcha || "").trim()
      };
    }
  } catch (ex) {
    console.error("❌ BAD_BODY:", ex);
    return json(err("BAD_BODY", "無法解析資料"), 400);
  }

  // --- 反 Bot：honeypot / 最短時間 ---
  if (payload.hp) return json(err("HONEYPOT", "拒絕機器人提交"), 400);
  const nowMs = Date.now();
  if (!payload.ts || nowMs - payload.ts < MIN_SUBMIT_MS) {
    return json(err("TOO_FAST", "送出過快，請稍後再試"), 429);
  }

  // --- 簽章 / token 驗證（可關閉） ---
  if (REQUIRE_TOKEN && payload.token !== APP_TOKEN) {
    return json(err("BAD_TOKEN", "來源未授權"), 403);
  }

  // --- reCAPTCHA 驗證（選配） ---
  if (ENABLE_RECAPTCHA) {
    const ok = verifyRecaptcha(payload.recaptcha);
    if (!ok) return json(err("RECAPTCHA_FAIL", "驗證未通過"), 403);
  }

  // --- 欄位驗證（長度/字符/CRLF 過濾） ---
  const name = sanitizeName(payload.name);
  const email = sanitizeEmail(payload.email);
  if (!name) return json(err("REQUIRED_NAME", "Please enter your name."), 422);
  if (!email) return json(err("REQUIRED_EMAIL", "Please enter your email address."), 422);
  if (!isValidEmail(email)) return json(err("INVALID_EMAIL", "Please enter a valid email address."), 422);

  // --- 速率限制（同 email 冷卻） ---
  const cooldownKey = "cooldown:" + email;
  const props = PropertiesService.getScriptProperties();
  const last = Number(props.getProperty(cooldownKey) || 0);
  if (last && (nowMs - last) < COOLDOWN_MINUTES * 60 * 1000) {
    return json(err("RATE_LIMIT", `請稍後再提交（${COOLDOWN_MINUTES} 分鐘）`), 429);
  }

  // --- 取得試算表/工作表 ---
  let ss, sheet;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return json(err("SHEET_NOT_FOUND", `找不到工作表：${SHEET_NAME}`), 500);
  } catch (ex) {
    console.error("❌ OPEN_SHEET:", ex);
    return json(err("OPEN_SHEET_ERROR", "無法開啟試算表"), 500);
  }

  // --- 標題列（如需要則建立） ---
  ensureHeader(sheet, ["time", "name", "email"]);

  // --- 防重（以 Email + DUPLICATE_WINDOW_DAYS） ---
  if (isDuplicateEmail(sheet, email, DUPLICATE_WINDOW_DAYS)) {
    return json(err("DUPLICATE", "你已提交過資料，請勿重複提交"), 409);
  }

  // --- 鎖定避免併發，寫入資料 ---
  const lock = LockService.getScriptLock();
  try {
    lock.tryLock(5000);
    sheet.appendRow([new Date(), name, email]);
  } catch (ex) {
    console.error("❌ APPEND_ERROR:", ex);
    return json(err("APPEND_ERROR", "寫入試算表失敗"), 500);
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }

  // 設定冷卻時間戳
  props.setProperty(cooldownKey, String(nowMs));

  // --- 通知信（管理者/使用者） ---
  if (ENABLE_ADMIN_NOTIFY) {
    safeSendMail(ADMIN_EMAIL, ADMIN_NOTIFY_SUBJECT, adminNotifyHtml({ name, email }));
  }
  if (ENABLE_USER_AUTOREPLY && email) {
    safeSendMail(email, AUTOREPLY_SUBJECT, userAutoReplyHtml({ name }));
  }

  return json({ status: "success", msg: "資料已寫入", echo: { name, email } }, 200);
}

/* ================= Utils ================= */
function json(payload, status) {
  const out = ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  try { out.setResponseCode(status); } catch (_) {}
  return out;
}

function err(code, msg) { return { status: "error", code, msg }; }

function isValidEmail(email) {
  // 過濾 CRLF（防郵件標頭注入）
  if (/[\r\n]/.test(email)) return false;
  if (!email) return false;
  if (email.length > 254) return false;
  // 寬鬆但實用的檢查（允許 +、多層網域）
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function sanitizeName(s) {
  s = String(s || "").replace(/[\r\n]/g, "").trim();
  // 允許中英數、空白與常見符號，限制長度
  s = s.substring(0, 80);
  if (!s) return "";
  return s;
}

function sanitizeEmail(s) {
  s = String(s || "");
  // 去除換行/零寬/nbsp，轉小寫
  s = s.replace(/[\r\n]/g, "")
       .replace(/[\u200B-\u200D\uFEFF]/g, "")
       .replace(/\u00A0/g, " ")
       .trim()
       // 全形 -> 半形
       .replace(/＠/g, "@")
       .replace(/[．｡]/g, ".")
       .toLowerCase();
  return s.substring(0, 254);
}

function ensureHeader(sheet, headers) {
  const rows = sheet.getLastRow();
  if (rows === 0) {
    sheet.appendRow(headers);
    return;
  }
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const same = headers.every((h, i) => (firstRow[i] || "").toString().toLowerCase() === h);
  if (!same) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

// 與前版相同，但找 "time" 當時間欄
function isDuplicateEmail(sheet, email, windowDays) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return false; // 只有標題或空

  const header = (values[0] || []).map(v => String(v || '').toLowerCase());
  const emailIdx = header.findIndex(h => h.includes('email'));
  const timeIdx  = header.findIndex(h => h.includes('time'));
  const eIdx = emailIdx >= 0 ? emailIdx : 2; // 預設第三欄是 email
  const tIdx = timeIdx  >= 0 ? timeIdx  : 0; // 預設第一欄是 time

  const now = new Date();
  for (let r = 1; r < values.length; r++) {
    const rowEmail = String(values[r][eIdx] || '').trim().toLowerCase();
    if (rowEmail && rowEmail === email.toLowerCase()) {
      if (windowDays <= 0) return true; // 全時段重複
      const ts = values[r][tIdx] instanceof Date ? values[r][tIdx] : new Date(values[r][tIdx]);
      if (isFinite(ts)) {
        const days = (now - ts) / 86400000;
        if (days <= windowDays) return true; // 窗口內重複
      } else {
        // 沒時間就保守視為重複
        return true;
      }
    }
  }
  return false;
}

function safeSendMail(to, subject, htmlBody) {
  // 基本過濾
  if (/[\\r\\n]/.test(to) || /[\\r\\n]/.test(subject)) return; // 防注入
  try { MailApp.sendEmail({ to, subject, htmlBody }); }
  catch (e) { console.warn("Mail failed:", e); }
}

/* Email 模板（沿用） */
function adminNotifyHtml({ name, email }) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6">
      <p>你有一筆新的表單提交：</p>
      <ul>
        <li><b>姓名：</b> ${escapeHtml(name)}</li>
        <li><b>Email：</b> ${escapeHtml(email)}</li>
        <li><b>時間：</b> ${new Date().toLocaleString()}</li>
      </ul>
    </div>`;
}
function userAutoReplyHtml({ name }) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.8">
      <p>Hi ${escapeHtml(name)},</p>
     <p>Thank you for your submission. We’ve received your information.</p>
<p>Have a great day!</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
      <p style="color:#666">This is an automated message. Please do not reply directly.</p>
    </div>`;
}
function escapeHtml(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
