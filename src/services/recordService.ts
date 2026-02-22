import {
  QueryCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from '@/utils';
import { USER_CONFIG, RECORD_CONFIG } from '@/constants/db';
import { v7 as uuidv7 } from 'uuid';

export interface RecordItem {
  recordId: string;
  title: string;
  gameTree: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RecordListItem {
  recordId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListRecordsResult {
  records: RecordListItem[];
  nextCursor: string | null;
}

export const listRecords = async (
  userId: string,
  limit?: number,
  cursor?: string
): Promise<ListRecordsResult> => {
  const db = getDynamoDBClient();
  const tableName = getTableName();

  const params: Record<string, unknown> = {
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    FilterExpression: 'attribute_not_exists(deletedAt)',
    ExpressionAttributeValues: {
      ':pk': `${USER_CONFIG.PK_PREFIX}${userId}`,
      ':skPrefix': RECORD_CONFIG.SK_PREFIX,
    },
    ProjectionExpression: 'recordId, title, createdAt, updatedAt',
    ScanIndexForward: false,
  };

  if (limit) {
    params['Limit'] = limit;
  }

  if (cursor) {
    try {
      params['ExclusiveStartKey'] = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf-8')
      );
    } catch {
      throw new Error('Invalid cursor');
    }
  }

  const result = await db.send(new QueryCommand(params as any));

  const records: RecordListItem[] = (result.Items ?? []).map((item) => ({
    recordId: item['recordId'] as string,
    title: item['title'] as string,
    createdAt: item['createdAt'] as string,
    updatedAt: item['updatedAt'] as string,
  }));

  let nextCursor: string | null = null;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(
      JSON.stringify(result.LastEvaluatedKey)
    ).toString('base64');
  }

  return { records, nextCursor };
};

export const getRecord = async (
  userId: string,
  recordId: string
): Promise<RecordItem | null> => {
  const db = getDynamoDBClient();
  const tableName = getTableName();

  const result = await db.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: `${USER_CONFIG.PK_PREFIX}${userId}`,
        SK: `${RECORD_CONFIG.SK_PREFIX}${recordId}`,
      },
    })
  );

  if (!result.Item || result.Item['deletedAt']) return null;

  return {
    recordId: result.Item['recordId'] as string,
    title: result.Item['title'] as string,
    gameTree: result.Item['gameTree'] as Record<string, unknown>,
    createdAt: result.Item['createdAt'] as string,
    updatedAt: result.Item['updatedAt'] as string,
  };
};

export const createRecord = async (
  userId: string,
  title: string,
  gameTree: Record<string, unknown>
): Promise<RecordItem> => {
  const db = getDynamoDBClient();
  const tableName = getTableName();

  const recordId = uuidv7();
  const now = new Date().toISOString();

  await db.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: `${USER_CONFIG.PK_PREFIX}${userId}`,
        SK: `${RECORD_CONFIG.SK_PREFIX}${recordId}`,
        recordId,
        title,
        gameTree,
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  return { recordId, title, gameTree, createdAt: now, updatedAt: now };
};

export const updateRecord = async (
  userId: string,
  recordId: string,
  title: string,
  gameTree: Record<string, unknown>
): Promise<RecordItem | null> => {
  const db = getDynamoDBClient();
  const tableName = getTableName();

  const now = new Date().toISOString();

  try {
    const result = await db.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `${USER_CONFIG.PK_PREFIX}${userId}`,
          SK: `${RECORD_CONFIG.SK_PREFIX}${recordId}`,
        },
        UpdateExpression:
          'SET title = :title, gameTree = :gameTree, updatedAt = :updatedAt',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeValues: {
          ':title': title,
          ':gameTree': gameTree,
          ':updatedAt': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    const attrs = result.Attributes;
    if (!attrs) return null;

    return {
      recordId: attrs['recordId'] as string,
      title: attrs['title'] as string,
      gameTree: attrs['gameTree'] as Record<string, unknown>,
      createdAt: attrs['createdAt'] as string,
      updatedAt: attrs['updatedAt'] as string,
    };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      return null;
    }
    throw error;
  }
};

export const deleteRecord = async (
  userId: string,
  recordId: string
): Promise<boolean> => {
  const db = getDynamoDBClient();
  const tableName = getTableName();

  const now = new Date().toISOString();

  try {
    await db.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `${USER_CONFIG.PK_PREFIX}${userId}`,
          SK: `${RECORD_CONFIG.SK_PREFIX}${recordId}`,
        },
        UpdateExpression: 'SET deletedAt = :deletedAt',
        ConditionExpression:
          'attribute_exists(PK) AND attribute_not_exists(deletedAt)',
        ExpressionAttributeValues: {
          ':deletedAt': now,
        },
      })
    );

    return true;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      return false;
    }
    throw error;
  }
};
