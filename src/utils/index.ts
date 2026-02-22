import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyResult } from 'aws-lambda';

let dynamoDBClient: DynamoDBDocumentClient | null = null;

export const createDynamoDBClient = () => {
  const isLocal = process.env['AWS_SAM_LOCAL'] === 'true';

  const options = isLocal
    ? {
        endpoint: 'http://ddb-local:8000',
        credentials: {
          accessKeyId: 'dummyKeyId',
          secretAccessKey: 'dummySecretKey',
        },
      }
    : {};

  const ddbClient = new DynamoDBClient(options);
  return DynamoDBDocumentClient.from(ddbClient);
};

export const getDynamoDBClient = () => {
  if (!dynamoDBClient) {
    dynamoDBClient = createDynamoDBClient();
  }
  return dynamoDBClient;
};

export const getTableName = (): string => {
  const tableName = process.env['TABLE_NAME'];
  if (!tableName)
    throw new Error('TABLE_NAME environment variable is required');
  return tableName;
};

export const getStage = (): string => {
  const stage = process.env['STAGE'];
  if (!stage) throw new Error('STAGE environment variable is required');
  return stage;
};

export const getGsiGoogleSubName = (): string => {
  const gsiGoogleSubName = process.env['GSI_GOOGLE_SUB_NAME'];
  if (!gsiGoogleSubName)
    throw new Error('GSI_GOOGLE_SUB_NAME environment variable is required');
  return gsiGoogleSubName;
};

export const getEnvironmentVariables = () => ({
  TABLE_NAME: getTableName(),
  STAGE: getStage(),
  GSI_GOOGLE_SUB_NAME: getGsiGoogleSubName(),
});

export const createResponse = (
  statusCode: number,
  body: Record<string, unknown> | string | null,
  additionalHeaders?: Record<string, string>,
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

export const createErrorResponse = (
  statusCode: number,
  error: string,
  details?: any,
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    error,
    ...(details && { details }),
  });
};

export const createSuccessResponse = (
  statusCode: number = 200,
  data: any,
): APIGatewayProxyResult => {
  return createResponse(statusCode, data);
};
