# Google OAuth 實作待辦事項

## 📊 目前進度總覽

- ✅ **Google 註冊 API** - 已完成
- ⚠️ **Google 登入 API** - 待實作
- ⏳ **JWT Token 管理** - 待實作
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

## 🚧 待實作項目

### 2. Google 登入功能 (Google Login)

**端點**: `GET /login/googleOauth` (目前只有骨架)

#### 實作步驟

##### Step 1: 更新 Handler 邏輯
**檔案**: `src/handlers/login/googleLogin/googleLogin.ts`

**需要做的事**:
```typescript
// 1. 從 query string 或 body 取得 idToken
// 2. 驗證 Google ID Token (使用既有的 verifyGoogleIdToken)
// 3. 查詢使用者是否存在 (使用既有的 getUserByGoogleSub)
// 4. 如果不存在，返回 404 (使用者未註冊)
// 5. 如果存在，簽發 JWT Token
// 6. 返回使用者資訊 + JWT Token
```

**預期輸入**:
```
GET /login/googleOauth?idToken=xxx
或
POST /login/googleOauth
Body: { "idToken": "xxx" }
```

**預期輸出**:
```json
{
  "message": "Login successful",
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "nickname": "暱稱"
  },
  "token": "JWT_TOKEN_HERE"
}
```

##### Step 2: 實作 JWT Token 簽發服務
**新檔案**: `src/services/jwtService.ts`

**需要做的事**:
- [ ] 安裝 `jsonwebtoken` 套件: `npm install jsonwebtoken @types/jsonwebtoken`
- [ ] 建立 JWT 簽發函數 `generateToken(userId, email)`
- [ ] 建立 JWT 驗證函數 `verifyToken(token)`
- [ ] 在環境變數中加入 `JWT_SECRET`
- [ ] 設定 Token 過期時間 (建議 7 天或 30 天)

**範例程式碼結構**:
```typescript
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = '7d'; // 7 days
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET!;
  return jwt.verify(token, secret) as JwtPayload;
};
```

##### Step 3: 更新環境變數
**檔案**: `.env` (本地), `template.yaml` (AWS)

**需要加入**:
```bash
# .env
JWT_SECRET=your-secret-key-here-use-a-strong-random-string
```

**template.yaml**:
```yaml
Environment:
  Variables:
    JWT_SECRET: !Ref JwtSecret

Parameters:
  JwtSecret:
    Type: String
    Description: JWT Secret Key
    NoEcho: true
    Default: ''
```

##### Step 4: 更新 googleLogin Handler
**檔案**: `src/handlers/login/googleLogin/googleLogin.ts`

**完整實作範例**:
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { verifyGoogleIdToken, getUserByGoogleSub } from '@/services/googleService';
import { generateToken } from '@/services/jwtService';
import { createErrorResponse, createSuccessResponse } from '@/utils';

interface LoginRequest {
  idToken: string;
}

export const googleLoginHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. 取得 idToken (支援 GET query 或 POST body)
    let idToken: string | undefined;
    
    if (event.httpMethod === 'GET') {
      idToken = event.queryStringParameters?.idToken;
    } else if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      idToken = body.idToken;
    }

    if (!idToken) {
      return createErrorResponse(400, 'Missing idToken');
    }

    // 2. 驗證 Google ID Token
    const googleUserInfo = await verifyGoogleIdToken(idToken);

    // 3. 查詢使用者是否存在
    const authItem = await getUserByGoogleSub(googleUserInfo.sub);

    if (!authItem) {
      return createErrorResponse(404, 'User not found. Please register first.');
    }

    // 4. 取得完整使用者資料
    // TODO: 實作 getUserProfile(userId) 來取得 PROFILE 資料

    // 5. 簽發 JWT Token
    const token = generateToken({
      userId: authItem.PK.replace('USER#', ''),
      email: authItem.email,
    });

    // 6. 返回成功回應
    return createSuccessResponse(200, {
      message: 'Login successful',
      user: {
        userId: authItem.PK.replace('USER#', ''),
        email: authItem.email,
      },
      token,
    });
  } catch (error) {
    console.error('Error in googleLoginHandler:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
```

##### Step 5: 新增取得使用者 Profile 的服務
**檔案**: `src/services/googleService.ts`

**需要新增**:
```typescript
import { GetCommand } from '@aws-sdk/lib-dynamodb';

export const getUserProfile = async (userId: string): Promise<any> => {
  try {
    const db = getDynamoDBClient();
    const { TABLE_NAME } = getEnvironmentVariables();

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
    };

    const result = await db.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    console.error('Error getUserProfile:', error);
    throw error;
  }
};
```

##### Step 6: 更新 template.yaml 中的 API Method
**檔案**: `template.yaml`

**需要修改**:
```yaml
googleLoginFunction:
  # ... 其他設定
  Events:
    Api:
      Type: Api
      Properties:
        Path: /login/googleOauth
        Method: POST  # 改為 POST (或同時支援 GET 和 POST)
```

---

### 3. 撰寫單元測試

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
- [ ] 測試缺少 idToken
- [ ] 測試使用者不存在 (404)
- [ ] 測試 Token 驗證失敗
- [ ] 測試成功登入並返回 JWT
- [ ] 測試 JWT Token 格式正確性

#### JWT 服務測試
**新檔案**: `src/services/__tests__/jwtService.test.ts`

**需要撰寫的測試**:
- [ ] 測試 Token 生成
- [ ] 測試 Token 驗證成功
- [ ] 測試 Token 過期
- [ ] 測試無效的 Token

---

### 4. 本地測試流程

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

#### 測試登入 API (實作完成後)
```bash
curl -X POST http://localhost:3000/login/googleOauth \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_GOOGLE_ID_TOKEN_HERE"
  }'
```

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

### 5. AWS 部署流程

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

### 本週目標
1. **完成 Google 登入 API** (Step 1-6)
2. **實作 JWT Token 管理**
3. **撰寫基本單元測試**

### 下週目標
1. **本地環境完整測試**
2. **部署到 AWS Dev 環境**
3. **整合前端測試**

### 未來目標
1. 實作進階功能 (refresh token, 權限管理)
2. 效能優化
3. 監控與維護

---

最後更新: 2026-02-08

