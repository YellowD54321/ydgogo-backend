import {
  verifyGoogleIdToken,
  getUserByGoogleSub,
  checkExistingUser,
  createNewUser,
} from '../googleService';
import { USER_CONFIG } from '../../constants/db';

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const mockSend = jest.fn();
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  QueryCommand: jest.fn().mockImplementation((params) => params),
  BatchWriteCommand: jest.fn().mockImplementation((params) => params),
}));

const mockTableName = 'test-table';
const mockGsiName = 'test-gsi';
const mockGoogleClientId = 'test-client-id';

jest.mock('@/utils', () => ({
  getDynamoDBClient: jest.fn(() => ({
    send: mockSend,
  })),
  getEnvironmentVariables: jest.fn(() => ({
    TABLE_NAME: mockTableName,
    GSI_GOOGLE_SUB_NAME: mockGsiName,
  })),
}));

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'test-uuid-123'),
}));

describe('Google Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['GOOGLE_CLIENT_ID'] = mockGoogleClientId;
  });

  afterEach(() => {
    delete process.env['GOOGLE_CLIENT_ID'];
  });

  describe('verifyGoogleIdToken', () => {
    const mockSub = '12345';
    const mockEmail = 'test@example.com';
    const mockValidIssuer = 'https://accounts.google.com';
    const mockInvalidIssuer = 'https://malicious-site.com';
    const mockValidToken = 'valid-token';
    const mockInvalidToken = 'invalid-token';

    it('should return GoogleUserInfo when token is valid', async () => {
      const mockPayload = {
        sub: mockSub,
        email: mockEmail,
        iss: mockValidIssuer,
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      const result = await verifyGoogleIdToken(mockValidToken);

      expect(result).toEqual({
        sub: mockSub,
        email: mockEmail,
      });

      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: mockValidToken,
        audience: mockGoogleClientId,
      });
    });

    it('should return GoogleUserInfo without optional fields when they are not present', async () => {
      const mockPayload = {
        sub: mockSub,
        email: mockEmail,
        iss: mockValidIssuer,
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      const result = await verifyGoogleIdToken(mockValidToken);

      expect(result).toEqual({
        sub: mockSub,
        email: mockEmail,
      });
    });

    it('should throw error when payload is null', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });

      await expect(verifyGoogleIdToken(mockValidToken)).rejects.toThrow();
    });

    it('should throw error when required fields are missing', async () => {
      const mockPayload = {
        sub: mockSub,
        // email is missing
        iss: mockValidIssuer,
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      await expect(verifyGoogleIdToken(mockValidToken)).rejects.toThrow();
    });

    it('should throw error when issuer is invalid', async () => {
      const mockPayload = {
        sub: mockSub,
        email: mockEmail,
        iss: mockInvalidIssuer,
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      await expect(verifyGoogleIdToken(mockValidToken)).rejects.toThrow();
    });

    it('should throw error when verifyIdToken throws error', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(verifyGoogleIdToken(mockInvalidToken)).rejects.toThrow();
    });

    it('should throw error when GOOGLE_CLIENT_ID is not set', async () => {
      delete process.env['GOOGLE_CLIENT_ID'];

      await expect(verifyGoogleIdToken(mockValidToken)).rejects.toThrow(
        'GOOGLE_CLIENT_ID environment variable is not set'
      );
    });
  });

  describe('getUserByGoogleSub', () => {
    const mockUserId = 'test-user-id';
    const mockEmail = 'test@example.com';
    const mockGoogleSub = 'test-google-sub';

    it('should return user when found', async () => {
      const mockUser = {
        userId: mockUserId,
        email: mockEmail,
        googleSub: mockGoogleSub,
      };

      mockSend.mockResolvedValue({
        Items: [mockUser],
      });

      const result = await getUserByGoogleSub(mockGoogleSub);

      expect(result).toEqual(mockUser);
      expect(mockSend).toHaveBeenCalledWith({
        TableName: mockTableName,
        IndexName: mockGsiName,
        KeyConditionExpression: 'googleSub = :sub',
        ExpressionAttributeValues: {
          ':sub': mockGoogleSub,
        },
      });
    });

    it('should return null when user not found', async () => {
      mockSend.mockResolvedValue({
        Items: [],
      });

      const result = await getUserByGoogleSub('non-existent-sub');

      expect(result).toBeNull();
    });

    it('should return null when Items is undefined', async () => {
      mockSend.mockResolvedValue({});

      const result = await getUserByGoogleSub('test-google-sub');

      expect(result).toBeNull();
    });

    it('should throw error when DynamoDB query fails', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(getUserByGoogleSub('test-google-sub')).rejects.toThrow(
        'DynamoDB error'
      );
    });
  });

  describe('checkExistingUser', () => {
    const mockUserId = 'test-user-id';
    const mockEmail = 'test@example.com';
    const mockGoogleSub = 'test-google-sub';

    it('should return true when user exists', async () => {
      const mockUser = {
        userId: mockUserId,
        email: mockEmail,
        googleSub: mockGoogleSub,
      };

      mockSend.mockResolvedValue({
        Items: [mockUser],
      });

      const result = await checkExistingUser(mockGoogleSub);

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockSend.mockResolvedValue({
        Items: [],
      });

      const result = await checkExistingUser('non-existent-sub');

      expect(result).toBe(false);
    });

    it('should throw error when getUserByGoogleSub throws error', async () => {
      mockSend.mockRejectedValue(new Error('Database error'));

      await expect(checkExistingUser(mockGoogleSub)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('createNewUser', () => {
    const mockDate = '2023-01-01T00:00:00.000Z';
    const mockUserId = 'test-uuid-123';
    const mockGoogleSub = 'test-google-sub';
    const mockEmail = 'test@example.com';
    let dateToISOStringSpy: jest.SpyInstance;

    beforeEach(() => {
      dateToISOStringSpy = jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue(mockDate);
    });

    afterEach(() => {
      dateToISOStringSpy.mockRestore();
    });

    it('should create new user successfully', async () => {
      const googleUserInfo = {
        sub: mockGoogleSub,
        email: mockEmail,
      };

      mockSend.mockResolvedValue({});

      const result = await createNewUser(googleUserInfo);

      expect(result).toEqual({
        userId: mockUserId,
        createdAt: mockDate,
      });

      expect(mockSend).toHaveBeenCalledWith({
        RequestItems: {
          [mockTableName]: [
            {
              PutRequest: {
                Item: {
                  PK: `${USER_CONFIG.PK_PREFIX}${mockUserId}`,
                  SK: USER_CONFIG.SK_PROFILE,
                  userId: mockUserId,
                  createdAt: mockDate,
                  updatedAt: mockDate,
                },
              },
            },
            {
              PutRequest: {
                Item: {
                  PK: `${USER_CONFIG.PK_PREFIX}${mockUserId}`,
                  SK: USER_CONFIG.AUTH_GOOGLE,
                  googleSub: mockGoogleSub,
                  email: mockEmail,
                  authProvider: 'Google',
                },
              },
            },
          ],
        },
      });
    });

    it('should throw error when DynamoDB BatchWrite fails', async () => {
      const googleUserInfo = {
        sub: mockGoogleSub,
        email: mockEmail,
      };

      mockSend.mockRejectedValue(new Error('BatchWrite failed'));

      await expect(createNewUser(googleUserInfo)).rejects.toThrow(
        'BatchWrite failed'
      );
    });
  });
});
