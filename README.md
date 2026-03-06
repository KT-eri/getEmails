# KING TONY Friends S4 Landing Page (getEmails)

這個專案是一個響應式的行銷活動網頁，主要功能是推廣 **KING TONY Friends Season 4** 系列內容，並透過彈窗（Modal）與表單引導使用者留下電子郵件以獲取專屬優惠。

## 🛠 核心技術棧

* **前端框架**: [Vite](https://vitejs.dev/) (快速開發與打包工具)
* **樣式處理**: [Tailwind CSS](https://tailwindcss.com/) (實用優先的 CSS 框架)
* **邏輯控制**: Vanilla JavaScript (ES Modules)
* **後端轉發**: Vercel Serverless Functions (Node.js)
* **資料儲存**: Google Apps Script (GAS) 整合試算表

---

## ✨ 專案特點

### 1. 雙重表單收集機制

* **首頁彈窗 (Promo Modal)**：網頁載入時自動彈出，第一時間捕捉用戶注意力。
* **底部固定表單 (Section Form)**：位於網頁末端，提供完整的操作步驟引導。

### 2. 安全與驗證機制

* **Honeypot 陷阱**: 內建隱藏欄位防止自動化機器人惡意填寫。
* **時間戳記驗證**: 記錄用戶開啟頁面的時間，過濾過快的異常提交。
* **Token 驗證**: 確保提交請求來自授權的前端環境。
* **自動驗證提示**: 使用原生 JS 攔截並自定義英文錯誤訊息（如：*Please enter your name.*）。

### 3. 無縫後端整合

專案採用 Vercel 的伺服器端函數 (`/api/submit.js`) 作為代理，解決跨網域（CORS）問題，並將數據安全地加密轉發至 Google Apps Script 後台。

---

## 📂 資料夾結構

```text
getEmails/
├── api/                # Vercel Serverless Functions (API 轉發邏輯)
├── public/img/         # 圖片資源 (包含 WebP 優化圖檔)
├── src/
│   ├── main.js         # 主要邏輯：表單處理、Modal 控制、API 調用
│   └── slider_controller.js # 輪播圖控制邏輯
├── styles/             # Tailwind CSS 設定與全域樣式
├── index.html          # 主體網頁架構
├── package.json        # 專案依賴與腳本
└── vite.config.js      # Vite 配置

```

---

## 🚀 本地開發步驟

### 1. 安裝依賴

```bash
npm install

```

### 2. 啟動開發伺服器

```bash
npm run dev

```

### 3. 環境變數設定

若要在生產環境運行 API 轉發，請在 Vercel 後台設定以下環境變數：

* `GAS_ENDPOINT`: 你的 Google Apps Script 部署網址（Web App URL）。

---

## 📝 部署說明

1. **前端部署**: 建議部署至 **Vercel**，系統會自動辨識 `vite.config.js` 進行構建。
2. **API 路由**: Vercel 會自動將 `/api` 資料夾中的檔案對映為 API 端點。
3. **GAS 設定**: 確保你的 Google Apps Script 腳本能接收 `application/x-www-form-urlencoded` 格式的 POST 請求。

---

## 🤝 貢獻者

* **KT-eri** ([GitHub Profile](https://www.google.com/search?q=https://github.com/KT-eri))

---

### 需要我進一步幫你優化嗎？

目前的 README 已經準確描述了你的專案本質。如果你之後需要調整 **Google Apps Script (GAS)** 的接收邏輯，或是想在網頁中加入 **Google Analytics** 追蹤提交成功率，隨時跟我說！
