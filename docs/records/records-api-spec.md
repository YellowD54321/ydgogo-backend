# 棋譜 CRUD API 規格

## 概述

提供棋譜（對局紀錄）的雲端 CRUD API，需 JWT 驗證，資料存於 DynamoDB。

## DynamoDB 資料模型

沿用單表設計，棋譜項目格式：

| 欄位 | 型別 | 說明 |
|------|------|------|
| PK | S | `USER#${userId}` |
| SK | S | `RECORD#${recordId}` |
| recordId | S | uuid v7，唯一識別 |
| title | S | 棋譜標題 |
| gameTree | M | ISerializedMoveTree（JSON 結構） |
| createdAt | S | ISO 8601 字串 |
| updatedAt | S | ISO 8601 字串（用於衝突偵測） |

查詢方式：`PK = USER#${userId}` + `begins_with(SK, 'RECORD#')`，無需新增 GSI。

## API 端點

### 認證

所有端點需在 Header 帶入：
```
Authorization: Bearer <JWT_TOKEN>
```

未帶或驗證失敗回傳 `401 Unauthorized`。

### 1. 取得棋譜列表

- **GET** `/records`
- Query 參數（可選）：`limit`, `cursor`（分頁用）
- Response 200：
```json
{
  "records": [
    {
      "recordId": "string",
      "title": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "nextCursor": "string | null"
}
```

### 2. 取得單一棋譜

- **GET** `/records/{recordId}`
- Response 200：
```json
{
  "recordId": "string",
  "title": "string",
  "gameTree": { /* ISerializedMoveTree */ },
  "createdAt": "string",
  "updatedAt": "string"
}
```
- 404：棋譜不存在或非本人

### 3. 新增棋譜

- **POST** `/records`
- Body：
```json
{
  "title": "string",
  "gameTree": { /* ISerializedMoveTree */ }
}
```
- Response 201：
```json
{
  "recordId": "string",
  "title": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### 4. 更新棋譜

- **PUT** `/records/{recordId}`
- Body：
```json
{
  "title": "string",
  "gameTree": { /* ISerializedMoveTree */ }
}
```
- Response 200：同 GET 單一棋譜
- 404：棋譜不存在或非本人
- （可選）409：版本衝突，見「衝突處理」章節

### 5. 刪除棋譜

- **DELETE** `/records/{recordId}`
- Response 204：成功
- 404：棋譜不存在或非本人

## gameTree 結構（ISerializedMoveTree）

```typescript
interface ISerializedMoveTree {
  nodes: Record<string, ISerializedMoveNode>;
  rootNodeId: string;
  pointer: {
    currentNodeId: string;
    currentMoveNumber: number;
    totalMoveNumber: number;
  };
}
```

## 實作結構

```
src/
├── middleware/
│   └── authMiddleware.ts    # 驗證 JWT，回傳 userId
├── services/
│   └── recordService.ts     # DynamoDB CRUD
└── handlers/
    └── records/
        ├── listRecords.ts
        ├── getRecord.ts
        ├── createRecord.ts
        ├── updateRecord.ts
        └── deleteRecord.ts
```

## template.yaml 新增 Lambda

每個 handler 對應一個 Lambda，Event 綁定對應的 API Gateway 路徑與方法。共 5 個 function。
