# DynamoDB 資料表設計：圍棋網站使用者管理

這份文件定義了專案所使用的 DynamoDB 資料表結構，採用**單一資料表設計 (Single-Table Design)** 模式，以達到高效能、高擴展性及精細的存取控制。

## 1\. 核心設計原則

- **單一資料表 (Single-Table)**：所有實體（使用者個人檔案、驗證資訊）都存放在同一個資料表中，以最小化讀取時的網路請求次數。
- **複合主鍵 (Composite Key)**：利用 `PK` (Partition Key) 和 `SK` (Sort Key) 的組合來建立和查詢項目之間的關聯。
- **分組與區分**：
  - `PK` 用於**分組**所有與單一使用者相關的資料。
  - `SK` 用於**區分**和**排序**群組內的各種資料。
- **GSI 反向索引**：建立一個 Global Secondary Index (GSI) 以支援使用第三方 ID（如 Google `sub`）進行高效的使用者登入查找。

## 2\. 資料表與索引定義

- **資料表名稱**: `ydgogo`
- **主鍵 (Primary Key)**:
  - **Partition Key (PK)**: `String`
  - **Sort Key (SK)**: `String`
- **全域次要索引 (Global Secondary Index)**:
  - **Index Name**: `byGoogleSub-gsi`
  - **GSI Partition Key**: `googleSub` (`String`)
  - **GSI Sort Key**: (無)
  - **Projection**: `ALL`

## 3\. 項目 (Item) 結構定義

下方使用表格來呈現不同類型項目的具體設計。

### 3.1 使用者個人檔案 (Profile)

> **目的**：存放公開的、不敏感的、使用者可修改的個人資料。

| 屬性 (Attribute) | 資料類型 | 範例值                                      | 說明                                         |
| :--------------- | :------- | :------------------------------------------ | :------------------------------------------- |
| **`PK`**         | `String` | `USER#a1b2c3d4-e5f6-7890-1234-567890abcdef` | 使用者的唯一分組鍵。                         |
| **`SK`**         | `String` | `PROFILE`                                   | 標示此項目為「個人檔案」。                   |
| `userId`         | `String` | `a1b2c3d4-e5f6-7890-1234-567890abcdef`      | 乾淨的內部 ID，方便應用程式使用和 GSI 投影。 |
| `nickname`       | `String` | `台北棋聖`                                  | 使用者暱稱。                                 |
| `createdAt`      | `String` | `2025-07-06T14:10:42Z`                      | 帳號建立時間 (ISO 8601)。                    |
| `updatedAt`      | `String` | `2025-07-06T14:10:42Z`                      | 最後更新時間 (ISO 8601)。                    |

### 3.2 使用者驗證資訊 (Authentication)

> **目的**：存放私密的、與登入驗證相關的資料。每種登入方式一個項目。

| 屬性 (Attribute) | 資料類型 | 範例值                                      | 說明                                      |
| :--------------- | :------- | :------------------------------------------ | :---------------------------------------- |
| **`PK`**         | `String` | `USER#a1b2c3d4-e5f6-7890-1234-567890abcdef` | 與該使用者的 `PROFILE` 項目 **PK 相同**。 |
| **`SK`**         | `String` | `AUTH#GOOGLE`                               | 標示此項目為「Google 驗證資訊」。         |
| **`googleSub`**  | `String` | `109876543210987654321`                     | **GSI 的 Partition Key**。                |
| `email`          | `String` | `go.player@email.com`                       | 從 Google 取得的 Email。                  |
| `authProvider`   | `String` | `Google`                                    | 標示驗證提供商。                          |

---

## 4\. 常見存取模式 (Access Patterns) 實作

以下是如何使用此設計來執行常見操作的偽代碼。

### 4.1 使用者透過 Google 登入

```
// 1. 後端從 Google ID Token 取得 sub
const googleSub = "109876543210987654321";

// 2. 查詢 GSI
const params = {
  TableName: "ydgogo",
  IndexName: "byGoogleSub-gsi",
  KeyConditionExpression: "googleSub = :sub",
  ExpressionAttributeValues: {
    ":sub": googleSub,
  },
};

// 3. 執行查詢，結果將只包含該使用者的 PROFILE 和 AUTH#GOOGLE 項目
// 因為 GSI 是稀疏的，且我們投影了所有屬性
// 實際上只會回傳 AUTH#GOOGLE 項目對應的主表項目，但因為我們把 email 也放在這裡了，
// 如果需要 profile 資訊，需要再做一次 GetItem
// （註：一個更優化的設計是將 email, nickname 等登入後立即需要的資訊也放在 AUTH 項目中，或是在 GSI 中投影多個項目的屬性，但這會增加複雜度。目前的設計在安全性和職責分離上最清晰）
// 修正：最清晰的作法是 GSI 的 PK 為 googleSub，但這個屬性只存在 AUTH#GOOGLE 項目中。
// 所以查詢 GSI 只會回傳 AUTH#GOOGLE 這個項目。我們從這個項目中的 PK (`USER#...`) 得到內部 ID。
// 然後再用這個內部 ID 去取得 PROFILE。
// 為了簡化，常見作法是在 AUTH#GOOGLE 項目中也存放 nickname, email 等。
// 此處以最安全的模型為準：
const gsiResult = await query(params);
const internalUserId = gsiResult.Items[0].PK; // 拿到 'USER#a1b2c3d4...'

// 4. 取得使用者完整資料 (Profile + Auth)
const batchParams = {
  RequestItems: {
    "ydgogo": {
      Keys: [
        { PK: internalUserId, SK: "PROFILE" },
        { PK: internalUserId, SK: "AUTH#GOOGLE" }
      ]
    }
  }
};

const batchResult = await batchGetItem(batchParams);
const userProfile = batchResult.Responses["ydgogo"].find(item => item.SK === "PROFILE");
const userAuth = batchResult.Responses["ydgogo"].find(item => item.SK === "AUTH#GOOGLE");
```

**修正後的登入流程與說明**

一個更精準且安全的登入流程如下：

1.  **查詢 GSI (`byGoogleSub-gsi`)**：使用 `googleSub` 查詢。因為只有 `AUTH#GOOGLE` 項目有 `googleSub` 屬性，此查詢**只會回傳 `AUTH#GOOGLE` 這一個項目**。
2.  **獲取內部 ID**：從回傳的 `AUTH#GOOGLE` 項目中，讀取其 `PK` 屬性，這就是我們系統內部的 `userId` (例如 `USER#a1b2c3d4...`)。
3.  **獲取 Profile**：使用上一步得到的 `PK` 和 `SK: "PROFILE"` 執行一次 `BatchGetItem` 操作，同時獲取使用者的個人檔案與驗證資訊。
4.  **組合資料 & 簽發 Token**：後端將 `PROFILE` 和 `AUTH` 的資訊組合，簽發自己應用的 JWT。

這個流程確保了登入時可以透過兩次高效的操作（一次 `Query` GSI，一次 `BatchGetItem` 主表）完成。
