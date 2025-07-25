import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyResult } from 'aws-lambda';

let dynamoDBClient: DynamoDBDocumentClient | null = null;

// 初始化 DynamoDB 客戶端
export const createDynamoDBClient = () => {
  const ddbClient = new DynamoDBClient({});
  return DynamoDBDocumentClient.from(ddbClient);
};

export const getDynamoDBClient = () => {
  if (!dynamoDBClient) {
    dynamoDBClient = createDynamoDBClient();
  }
  return dynamoDBClient;
};

// 環境變數取得
export const getEnvironmentVariables = () => {
  const tableName = process.env['TABLE_NAME'];
  if (!tableName) {
    throw new Error('TABLE_NAME environment variable is required');
  }

  const stage = process.env['STAGE'];
  if (!stage) {
    throw new Error('STAGE environment variable is required');
  }

  const gsiGoogleSubName = process.env['GSI_GOOGLE_SUB_NAME'];
  if (!gsiGoogleSubName) {
    throw new Error('GSI_GOOGLE_SUB_NAME environment variable is required');
  }

  return {
    TABLE_NAME: tableName,
    STAGE: stage,
    GSI_GOOGLE_SUB_NAME: gsiGoogleSubName,
  };
};

// 標準 API 回應格式
export const createResponse = (
  statusCode: number,
  body: Record<string, unknown> | string | null,
  additionalHeaders?: Record<string, string>
): APIGatewayProxyResult => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  return {
    statusCode,
    headers: {
      ...defaultHeaders,
      ...additionalHeaders,
    },
    body: JSON.stringify(body),
  };
};

// 錯誤回應格式
export const createErrorResponse = (
  statusCode: number,
  error: string,
  details?: any
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    error,
    ...(details && { details }),
  });
};

// 成功回應格式
export const createSuccessResponse = (
  statusCode: number = 200,
  data: any
): APIGatewayProxyResult => {
  return createResponse(statusCode, data);
};
