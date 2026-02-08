# Google OAuth 實作待辦事項

## 📊 目前進度總覽

- ✅ **Google 註冊 API** - 已完成
- ✅ **Google 登入 API** - 已完成
- ✅ **JWT Token 管理** - 已完成
- ⏳ **測試與部署** - 待實作

---

## ✅ 已完成項目

### 1. Google 註冊功能 (Google Register)

**端點**: `POST /register/googleOauth`

**完成項目**:
- [x] 建立 Lambda Handler (`src/handlers/register/googleRegister/googleRegister.ts`)
- [x] 實作 Google ID Token 驗證服務 (`verifyGoogleIdToken`)
- [x] 實作檢查使用者是否存在 (`checkExistingUser`)
- [x] 實作創建新使用者 (`createNewUser`)
- [x] DynamoDB 單表設計 (PROFILE + AUTH#GOOGLE)
- [x] GSI 索引 (`byGoogleSub-gsi`)
- [x] 錯誤處理 (400, 409, 500)
- [x] 本地開發環境 (Docker + DynamoDB Local)

**請求格式**:
```json
{
  "idToken": "Google ID Token from frontend"
}
```

**回應格式** (成功):
```json
{
  "message": "User registered successfully",
  "user": {
    "userId": "uuid-v7",
    "email": "user@example.com",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Google 登入功能 (Google Login)

**端點**: `POST /login/googleOauth`

**完成項目**:
- [x] 安裝 `jsonwebtoken` 及 `@types/jsonwebtoken` 套件
- [x] 建立 JWT 服務 (`src/services/jwtService.ts`)
  - [x] `generateToken(payload)` - 簽發 JWT Token (7 天過期)
  - [x] `verifyToken(token)` - 驗證 JWT Token
- [x] 新增 `getUserProfile` 服務 (`src/services/googleService.ts`)
- [x] 實作 Google Login Handler (`src/handlers/login/googleLogin/googleLogin.ts`)
  - [x] 從 POST body 取得 idToken
  - [x] 驗證 Google ID Token (使用 `verifyGoogleIdToken`)
  - [x] 查詢使用者是否存在 (使用 `getUserByGoogleSub`)
  - [x] 不存在則返回 404
  - [x] 存在則簽發 JWT Token 並返回使用者資訊
- [x] 更新 `template.yaml`
  - [x] 新增 `JwtSecret` Parameter
  - [x] `googleLoginFunction` Method 改為 POST
  - [x] 加入 `JWT_SECRET` 環境變數
- [x] 本地 `.env` 加入 `JWT_SECRET`

**請求格式**:
```json
{
  "idToken": "Google ID Token from frontend"
}
```

**回應格式** (成功):
```json
{
  "message": "Login successful",
  "user": {
    "userId": "uuid",
    "email": "user@example.com"
  },
  "token": "JWT_TOKEN_HERE"
}
```

**錯誤回應**:
| 狀態碼 | 情境 |
|--------|------|
| 400 | 缺少 request body / JSON 格式錯誤 / 缺少 idToken |
| 401 | Google Token 驗證失敗 |
| 404 | 使用者未註冊 |
| 500 | 伺服器內部錯誤 |

---

### 3. JWT Token 管理

**檔案**: `src/services/jwtService.ts`

**完成項目**:
- [x] `JwtPayload` 介面 (`userId`, `email`)
- [x] `getJwtSecret()` - 從環境變數取得 JWT 密鑰
- [x] `generateToken(payload)` - 使用 `jsonwebtoken` 簽發 Token，有效期 7 天
- [x] `verifyToken(token)` - 驗證 Token 並返回 payload



---

## 🚧 待實作項目

### 4. 撰寫單元測試

#### 註冊功能測試
**檔案**: `src/handlers/register/googleRegister/__tests__/googleRegister.test.ts`

**待補充測試案例**:
- [ ] 測試缺少 idToken 的情況
- [ ] 測試 Google Token 驗證失敗
- [ ] 測試使用者已存在的情況
- [ ] 測試成功註冊新使用者
- [ ] 測試 DynamoDB 錯誤處理

#### 登入功能測試
**新檔案**: `src/handlers/login/googleLogin/__tests__/googleLogin.test.ts`

**需要撰寫的測試**:
- [ ] 測試缺少 request body
- [ ] 測試 JSON 格式錯誤
- [ ] 測試缺少 idToken
- [ ] 測試使用者不存在 (404)
- [ ] 測試 Google Token 驗證失敗 (401)
- [ ] 測試成功登入並返回 JWT
- [ ] 測試 JWT Token 格式正確性

#### JWT 服務測試
**新檔案**: `src/services/__tests__/jwtService.test.ts`

**需要撰寫的測試**:
- [ ] 測試 Token 生成
- [ ] 測試 Token 驗證成功
- [ ] 測試 Token 過期
- [ ] 測試無效的 Token
- [ ] 測試缺少 JWT_SECRET 環境變數

---

### 5. 本地測試流程

#### 啟動本地環境
```bash
# 1. 啟動 DynamoDB Local
docker-compose up -d

# 2. 建立資料表
aws dynamodb create-table \
  --cli-input-json file://create-table.json \
  --endpoint-url http://localhost:8000

# 3. 啟動本地 API
npm run dev
```

#### 測試註冊 API
```bash
curl -X POST http://localhost:3000/register/googleOauth \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_GOOGLE_ID_TOKEN_HERE"
  }'
```

#### 測試登入 API
```bash
curl -X POST http://localhost:3000/login/googleOauth \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_GOOGLE_ID_TOKEN_HERE"
  }'
```

> ⚠️ **注意**: `idToken` 必須是完整的 Google ID Token (JWT 格式，由三段 base64 用 `.` 連接組成)，不是 Google Sub ID (純數字字串)。

#### 驗證 DynamoDB 資料
```bash
# 查看所有使用者
aws dynamodb scan \
  --table-name ydgogo \
  --endpoint-url http://localhost:8000

# 查詢特定使用者
aws dynamodb query \
  --table-name ydgogo \
  --index-name byGoogleSub-gsi \
  --key-condition-expression "googleSub = :sub" \
  --expression-attribute-values '{":sub":{"S":"GOOGLE_SUB_ID"}}' \
  --endpoint-url http://localhost:8000
```

---

### 6. AWS 部署流程

#### 部署前檢查清單
- [ ] 確認 `.env` 檔案不會被提交 (已在 `.gitignore` 中)
- [ ] 在 AWS Parameter Store 中設定 `GOOGLE_CLIENT_ID`
- [ ] 在 AWS Parameter Store 中設定 `JWT_SECRET`
- [ ] 執行單元測試: `npm test`
- [ ] 執行 Lint 檢查: `npm run lint`
- [ ] 驗證 SAM template: `npm run sam:validate`

#### 設定 Parameter Store
```bash
# Google Client ID
aws ssm put-parameter \
  --name "/ydgogo/google-client-id" \
  --value "YOUR_GOOGLE_CLIENT_ID" \
  --type "SecureString" \
  --region ap-southeast-2

# JWT Secret
aws ssm put-parameter \
  --name "/ydgogo/jwt-secret" \
  --value "YOUR_STRONG_RANDOM_JWT_SECRET" \
  --type "SecureString" \
  --region ap-southeast-2
```

#### 部署到 Dev 環境
```bash
# 建置並部署
npm run deploy:dev

# 或使用完整指令
sam build && sam deploy --config-env dev
```

#### 測試 Dev 環境
```bash
# 取得 API Gateway URL
aws cloudformation describe-stacks \
  --stack-name ydgogo-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`WebEndpoint`].OutputValue' \
  --output text

# 測試註冊 API
curl -X POST https://YOUR_API_URL/dev/register/googleOauth \
  -H "Content-Type: application/json" \
  -d '{"idToken":"YOUR_TOKEN"}'

# 測試登入 API
curl -X POST https://YOUR_API_URL/dev/login/googleOauth \
  -H "Content-Type: application/json" \
  -d '{"idToken":"YOUR_TOKEN"}'
```

---

## 🔧 後續優化項目

### 短期優化
- [ ] 在登入回應中加入使用者 nickname (使用已完成的 `getUserProfile`)
- [ ] 加入 API 請求 rate limiting
- [ ] 實作 refresh token 機制
- [ ] 加入 API 請求日誌記錄
- [ ] 實作更詳細的錯誤訊息
- [ ] 加入 input validation (使用 Joi 或 Zod)

### 中期優化
- [ ] 實作 middleware 來驗證 JWT Token
- [ ] 加入使用者 profile 更新 API
- [ ] 實作使用者登出機制 (Token blacklist)
- [ ] 加入 API 文檔 (Swagger/OpenAPI)
- [ ] 實作 CI/CD Pipeline

### 長期優化
- [ ] 支援其他 OAuth 提供商 (Facebook, Apple)
- [ ] 實作使用者權限系統 (RBAC)
- [ ] 加入 email 驗證功能
- [ ] 實作使用者活動追蹤
- [ ] 加入監控與告警 (CloudWatch Alarms)

---

## 📚 參考文件

- [Google OAuth 2.0 文檔](https://developers.google.com/identity/protocols/oauth2)
- [AWS SAM 文檔](https://docs.aws.amazon.com/serverless-application-model/)
- [DynamoDB 單表設計最佳實踐](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/)
- [JWT 最佳實踐](https://tools.ietf.org/html/rfc8725)

---

## 🎯 優先執行順序

### ✅ 已完成
1. ~~完成 Google 登入 API~~
2. ~~實作 JWT Token 管理~~

### 近期目標
1. **撰寫單元測試** (註冊、登入、JWT 服務)
2. **本地環境完整測試**
3. **部署到 AWS Dev 環境**

### 未來目標
1. 整合前端測試
2. 實作進階功能 (refresh token, 權限管理)
3. 效能優化
4. 監控與維護

---

最後更新: 2026-02-08
