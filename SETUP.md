# 環境設定說明

## 🏠 本地開發環境

### 1. 設定環境變數

在專案根目錄建立 `.env` 檔案：

```bash
# Google OAuth 設定
GOOGLE_CLIENT_ID=your-actual-google-client-id-here
```

> 💡 **跨平台支援**：專案已安裝 `dotenv-cli`，確保在 Windows, macOS, Linux 上都能正常使用 `.env` 檔案。

### 2. 本地測試

```bash
# 啟動本地 API（推薦）
npm run dev

# 或者使用完整指令
npm run sam:local:api

# 測試單一 function
npm run sam:local:test

# 建置專案
npm run sam:build

# 驗證 template
npm run sam:validate
```

### 3. 單元測試

```bash
npm test

# 或者開啟 watch 模式
npm run test:watch
```

## ☁️ AWS 部署環境

### 1. 設定 Parameter Store

在 AWS Console 或 CLI 中建立 Parameter Store：

```bash
# 使用 AWS CLI 建立 Parameter
aws ssm put-parameter \
  --name "/ydgogo/google-client-id" \
  --value "your-actual-google-client-id" \
  --type "SecureString" \
  --region ap-southeast-2
```

### 2. 部署到不同環境

**部署到 dev 環境：**

```bash
npm run deploy:dev
```

**部署到 prod 環境：**

```bash
npm run deploy:prod
```

## 🔒 安全性注意事項

1. **絕對不要**將 `.env` 檔案提交到版本控制
2. `.env` 檔案已經在 `.gitignore` 中被忽略
3. 生產環境的敏感資訊都存儲在 AWS Parameter Store 中
4. Parameter Store 使用 `SecureString` 類型進行加密

## 🛠️ dotenv-cli 的好處

專案已安裝 `dotenv-cli`，提供以下優勢：

✅ **跨平台支援**：在 Windows, macOS, Linux 上都能使用相同的指令  
✅ **簡潔語法**：`dotenv sam local start-api` 比 `source .env && sam local start-api` 更簡潔  
✅ **自動載入**：自動讀取 `.env` 檔案中的環境變數  
✅ **團隊協作**：確保所有開發者都能使用相同的開發環境設定

## 📋 NPM Scripts 指令

### 開發指令

```bash
npm run dev                # 啟動本地 API（等同於 sam:local:api）
npm run sam:local:api      # 啟動本地 API Gateway
npm run sam:local:test     # 測試單一 function
npm run sam:build          # 建置 SAM 應用程式
npm run sam:validate       # 驗證 SAM template
```

### 測試指令

```bash
npm test                   # 執行所有測試
npm run test:watch         # 開啟測試 watch 模式
npm run lint               # 執行 ESLint 檢查
npm run lint:fix           # 自動修復 ESLint 問題
```

### 部署指令

```bash
npm run deploy:dev         # 部署到 dev 環境
npm run deploy:prod        # 部署到 prod 環境
```

### 建置指令

```bash
npm run build              # TypeScript 編譯
npm run build:esbuild      # 使用 esbuild 打包
npm run clean              # 清除 dist 目錄
```

## 🧪 測試流程

### 本地開發

```bash
# 1. 啟動本地 API
npm run dev

# 2. 測試端點
curl -X POST http://localhost:3000/register/googleOauth \
  -H "Content-Type: application/json" \
  -d '{"idToken":"your-test-token"}'

# 3. 測試單一 function
npm run sam:local:test
```

### 部署前測試

```bash
# 建置並驗證
npm run sam:build
npm run sam:validate

# 部署到 dev 環境
npm run deploy:dev

# 測試 dev 環境
curl -X POST https://your-api-gateway-url/dev/register/googleOauth \
  -H "Content-Type: application/json" \
  -d '{"idToken":"your-test-token"}'
```
