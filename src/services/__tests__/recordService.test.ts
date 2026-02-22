import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
} from '../recordService';
import { USER_CONFIG, RECORD_CONFIG } from '../../constants/db';

const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  QueryCommand: jest.fn().mockImplementation((params) => params),
  PutCommand: jest.fn().mockImplementation((params) => params),
  GetCommand: jest.fn().mockImplementation((params) => params),
  UpdateCommand: jest.fn().mockImplementation((params) => params),
  DeleteCommand: jest.fn().mockImplementation((params) => params),
}));

const MOCK_TABLE = 'test-table';

jest.mock('@/utils', () => ({
  getDynamoDBClient: jest.fn(() => ({
    send: mockSend,
  })),
  getTableName: jest.fn(() => MOCK_TABLE),
}));

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-record-uuid'),
}));

const MOCK_USER_ID = 'user-123';
const MOCK_RECORD_ID = 'record-456';
const MOCK_DATE = '2024-01-01T00:00:00.000Z';
const MOCK_GAME_TREE = {
  nodes: { root: { move: null } },
  rootNodeId: 'root',
  pointer: { currentNodeId: 'root', currentMoveNumber: 0, totalMoveNumber: 0 },
};

describe('recordService', () => {
  let dateToISOStringSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    dateToISOStringSpy = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue(MOCK_DATE);
  });

  afterEach(() => {
    dateToISOStringSpy.mockRestore();
  });

  describe('listRecords', () => {
    it('should return records without pagination', async () => {
      const mockItems = [
        {
          recordId: 'r1',
          title: 'Game 1',
          createdAt: MOCK_DATE,
          updatedAt: MOCK_DATE,
        },
        {
          recordId: 'r2',
          title: 'Game 2',
          createdAt: MOCK_DATE,
          updatedAt: MOCK_DATE,
        },
      ];

      mockSend.mockResolvedValue({ Items: mockItems });

      const result = await listRecords(MOCK_USER_ID);

      expect(result.records).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: MOCK_TABLE,
          KeyConditionExpression:
            'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': `${USER_CONFIG.PK_PREFIX}${MOCK_USER_ID}`,
            ':skPrefix': RECORD_CONFIG.SK_PREFIX,
          },
        })
      );
    });

    it('should support limit parameter', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      await listRecords(MOCK_USER_ID, 10);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ Limit: 10 })
      );
    });

    it('should support cursor-based pagination', async () => {
      const lastKey = {
        PK: `${USER_CONFIG.PK_PREFIX}${MOCK_USER_ID}`,
        SK: `${RECORD_CONFIG.SK_PREFIX}r2`,
      };
      const cursor = Buffer.from(JSON.stringify(lastKey)).toString('base64');

      mockSend.mockResolvedValue({ Items: [] });

      await listRecords(MOCK_USER_ID, undefined, cursor);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ ExclusiveStartKey: lastKey })
      );
    });

    it('should return nextCursor when LastEvaluatedKey exists', async () => {
      const lastKey = {
        PK: `${USER_CONFIG.PK_PREFIX}${MOCK_USER_ID}`,
        SK: `${RECORD_CONFIG.SK_PREFIX}r2`,
      };

      mockSend.mockResolvedValue({ Items: [], LastEvaluatedKey: lastKey });

      const result = await listRecords(MOCK_USER_ID, 1);

      expect(result.nextCursor).toBe(
        Buffer.from(JSON.stringify(lastKey)).toString('base64')
      );
    });

    it('should throw on invalid cursor', async () => {
      await expect(
        listRecords(MOCK_USER_ID, undefined, 'invalid-base64!!!')
      ).rejects.toThrow('Invalid cursor');
    });

    it('should return empty array when Items is undefined', async () => {
      mockSend.mockResolvedValue({});

      const result = await listRecords(MOCK_USER_ID);

      expect(result.records).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

  });

  describe('getRecord', () => {
    it('should return record when found', async () => {
      const mockItem = {
        PK: `${USER_CONFIG.PK_PREFIX}${MOCK_USER_ID}`,
        SK: `${RECORD_CONFIG.SK_PREFIX}${MOCK_RECORD_ID}`,
        recordId: MOCK_RECORD_ID,
        title: 'My Game',
        gameTree: MOCK_GAME_TREE,
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      };

      mockSend.mockResolvedValue({ Item: mockItem });

      const result = await getRecord(MOCK_USER_ID, MOCK_RECORD_ID);

      expect(result).toEqual({
        recordId: MOCK_RECORD_ID,
        title: 'My Game',
        gameTree: MOCK_GAME_TREE,
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: MOCK_TABLE,
          Key: {
            PK: `${USER_CONFIG.PK_PREFIX}${MOCK_USER_ID}`,
            SK: `${RECORD_CONFIG.SK_PREFIX}${MOCK_RECORD_ID}`,
          },
        })
      );
    });

    it('should return null when record not found', async () => {
      mockSend.mockResolvedValue({});

      const result = await getRecord(MOCK_USER_ID, 'non-existent');

      expect(result).toBeNull();
    });

    it('should throw when DynamoDB fails', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(
        getRecord(MOCK_USER_ID, MOCK_RECORD_ID)
      ).rejects.toThrow('DynamoDB error');
    });
  });

  describe('createRecord', () => {
    it('should create record and return it', async () => {
      mockSend.mockResolvedValue({});

      const result = await createRecord(
        MOCK_USER_ID,
        'New Game',
        MOCK_GAME_TREE
      );

      expect(result).toEqual({
        recordId: 'mock-record-uuid',
        title: 'New Game',
        gameTree: MOCK_GAME_TREE,
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: MOCK_TABLE,
          Item: {
            PK: `${USER_CONFIG.PK_PREFIX}${MOCK_USER_ID}`,
            SK: `${RECORD_CONFIG.SK_PREFIX}mock-record-uuid`,
            recordId: 'mock-record-uuid',
            title: 'New Game',
            gameTree: MOCK_GAME_TREE,
            createdAt: MOCK_DATE,
            updatedAt: MOCK_DATE,
          },
        })
      );
    });

    it('should throw when DynamoDB fails', async () => {
      mockSend.mockRejectedValue(new Error('PutItem failed'));

      await expect(
        createRecord(MOCK_USER_ID, 'New Game', MOCK_GAME_TREE)
      ).rejects.toThrow('PutItem failed');
    });
  });

  describe('updateRecord', () => {
    it('should update record and return updated item', async () => {
      const updatedAttrs = {
        recordId: MOCK_RECORD_ID,
        title: 'Updated Game',
        gameTree: MOCK_GAME_TREE,
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      };

      mockSend.mockResolvedValue({ Attributes: updatedAttrs });

      const result = await updateRecord(
        MOCK_USER_ID,
        MOCK_RECORD_ID,
        'Updated Game',
        MOCK_GAME_TREE
      );

      expect(result).toEqual(updatedAttrs);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: MOCK_TABLE,
          Key: {
            PK: `${USER_CONFIG.PK_PREFIX}${MOCK_USER_ID}`,
            SK: `${RECORD_CONFIG.SK_PREFIX}${MOCK_RECORD_ID}`,
          },
          ConditionExpression: 'attribute_exists(PK)',
          ReturnValues: 'ALL_NEW',
        })
      );
    });

    it('should return null when record does not exist', async () => {
      const error = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';
      mockSend.mockRejectedValue(error);

      const result = await updateRecord(
        MOCK_USER_ID,
        MOCK_RECORD_ID,
        'Updated',
        MOCK_GAME_TREE
      );

      expect(result).toBeNull();
    });

    it('should return null when Attributes is undefined', async () => {
      mockSend.mockResolvedValue({});

      const result = await updateRecord(
        MOCK_USER_ID,
        MOCK_RECORD_ID,
        'Updated',
        MOCK_GAME_TREE
      );

      expect(result).toBeNull();
    });

    it('should throw on non-conditional DynamoDB error', async () => {
      mockSend.mockRejectedValue(new Error('Internal error'));

      await expect(
        updateRecord(MOCK_USER_ID, MOCK_RECORD_ID, 'Updated', MOCK_GAME_TREE)
      ).rejects.toThrow('Internal error');
    });
  });

  describe('deleteRecord', () => {
    it('should return true when record is deleted', async () => {
      mockSend.mockResolvedValue({});

      const result = await deleteRecord(MOCK_USER_ID, MOCK_RECORD_ID);

      expect(result).toBe(true);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: MOCK_TABLE,
          Key: {
            PK: `${USER_CONFIG.PK_PREFIX}${MOCK_USER_ID}`,
            SK: `${RECORD_CONFIG.SK_PREFIX}${MOCK_RECORD_ID}`,
          },
          ConditionExpression: 'attribute_exists(PK)',
        })
      );
    });

    it('should return false when record does not exist', async () => {
      const error = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';
      mockSend.mockRejectedValue(error);

      const result = await deleteRecord(MOCK_USER_ID, MOCK_RECORD_ID);

      expect(result).toBe(false);
    });

    it('should throw on non-conditional DynamoDB error', async () => {
      mockSend.mockRejectedValue(new Error('Internal error'));

      await expect(
        deleteRecord(MOCK_USER_ID, MOCK_RECORD_ID)
      ).rejects.toThrow('Internal error');
    });
  });
});
