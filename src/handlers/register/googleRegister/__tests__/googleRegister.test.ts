import { googleRegisterHandler } from '../googleRegister';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import {
  verifyGoogleIdToken,
  checkExistingUser,
  createNewUser,
} from '../../../../services/googleService';
import { createErrorResponse, createSuccessResponse } from '../../../../utils';

jest.mock('@/services/googleService', () => ({
  verifyGoogleIdToken: jest.fn(),
  checkExistingUser: jest.fn(),
  createNewUser: jest.fn(),
}));

jest.mock('@/utils', () => ({
  createErrorResponse: jest.fn(),
  createSuccessResponse: jest.fn(),
}));

const mockVerifyGoogleIdToken = verifyGoogleIdToken as jest.MockedFunction<
  typeof verifyGoogleIdToken
>;
const mockCheckExistingUser = checkExistingUser as jest.MockedFunction<
  typeof checkExistingUser
>;
const mockCreateNewUser = createNewUser as jest.MockedFunction<
  typeof createNewUser
>;
const mockCreateErrorResponse = createErrorResponse as jest.MockedFunction<
  typeof createErrorResponse
>;
const mockCreateSuccessResponse = createSuccessResponse as jest.MockedFunction<
  typeof createSuccessResponse
>;

// Test constants
const TEST_CONSTANTS = {
  VALID_ID_TOKEN: 'valid-google-id-token',
  GOOGLE_USER_ID: 'google-user-id-123',
  TEST_EMAIL: 'test@example.com',
  TEST_USER_NAME: 'Test User',
  TEST_PICTURE_URL: 'https://example.com/picture.jpg',
  NEW_USER_ID: 'user-123',
  EXISTING_USER_ID: 'existing-user-123',
  CREATED_AT: '2023-01-01T00:00:00Z',
  ERROR_MESSAGES: {
    MISSING_ID_TOKEN: 'Missing idToken in request body',
    USER_ALREADY_EXISTS: 'User already exists',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    USER_REGISTERED_SUCCESS: 'User registered successfully',
    INVALID_GOOGLE_TOKEN: 'Invalid Google ID token',
    DATABASE_ERROR: 'Database error',
    DATABASE_WRITE_ERROR: 'Database write error',
  },
};

describe('googleRegisterHandler', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({ idToken: TEST_CONSTANTS.VALID_ID_TOKEN }),
      headers: {},
      multiValueHeaders: {},
      isBase64Encoded: false,
      path: '/register/google',
      pathParameters: null,
      queryStringParameters: null,
      requestContext: {} as any,
      resource: '',
      stageVariables: null,
    } as APIGatewayProxyEvent;

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'googleRegisterHandler',
      functionVersion: '$LATEST',
      invokedFunctionArn:
        'arn:aws:lambda:us-east-1:123456789012:function:googleRegisterHandler',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/googleRegisterHandler',
      logStreamName: 'test-log-stream',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    } as Context;
  });

  describe('Success Cases', () => {
    it('should successfully register a new user', async () => {
      const mockGoogleUserInfo = {
        sub: TEST_CONSTANTS.GOOGLE_USER_ID,
        email: TEST_CONSTANTS.TEST_EMAIL,
        name: TEST_CONSTANTS.TEST_USER_NAME,
        picture: TEST_CONSTANTS.TEST_PICTURE_URL,
      };

      const mockNewUser = {
        userId: TEST_CONSTANTS.NEW_USER_ID,
        googleSub: TEST_CONSTANTS.GOOGLE_USER_ID,
        email: TEST_CONSTANTS.TEST_EMAIL,
        name: TEST_CONSTANTS.TEST_USER_NAME,
        picture: TEST_CONSTANTS.TEST_PICTURE_URL,
        createdAt: TEST_CONSTANTS.CREATED_AT,
      };

      const mockSuccessResponse = {
        statusCode: 201,
        body: JSON.stringify({
          message: TEST_CONSTANTS.ERROR_MESSAGES.USER_REGISTERED_SUCCESS,
          user: {
            userId: mockNewUser.userId,
            email: mockNewUser.email,
            createdAt: mockNewUser.createdAt,
          },
        }),
      };

      mockVerifyGoogleIdToken.mockResolvedValue(mockGoogleUserInfo);
      mockCheckExistingUser.mockResolvedValue(null);
      mockCreateNewUser.mockResolvedValue(mockNewUser);
      mockCreateSuccessResponse.mockReturnValue(mockSuccessResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockVerifyGoogleIdToken).toHaveBeenCalledWith(
        TEST_CONSTANTS.VALID_ID_TOKEN
      );
      expect(mockCheckExistingUser).toHaveBeenCalledWith(
        TEST_CONSTANTS.GOOGLE_USER_ID
      );
      expect(mockCreateNewUser).toHaveBeenCalledWith(mockGoogleUserInfo);
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(201, {
        message: TEST_CONSTANTS.ERROR_MESSAGES.USER_REGISTERED_SUCCESS,
        user: {
          userId: mockNewUser.userId,
          email: mockNewUser.email,
          createdAt: mockNewUser.createdAt,
        },
      });
      expect(result).toEqual(mockSuccessResponse);
    });
  });

  describe('Error Cases', () => {
    it('should return 400 error when idToken is missing', async () => {
      mockEvent.body = JSON.stringify({});
      const mockErrorResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN,
        }),
      };
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        400,
        TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN
      );
      expect(mockVerifyGoogleIdToken).not.toHaveBeenCalled();
      expect(mockCheckExistingUser).not.toHaveBeenCalled();
      expect(mockCreateNewUser).not.toHaveBeenCalled();
      expect(result).toEqual(mockErrorResponse);
    });

    it('should return 409 error when user already exists', async () => {
      const mockGoogleUserInfo = {
        sub: TEST_CONSTANTS.GOOGLE_USER_ID,
        email: TEST_CONSTANTS.TEST_EMAIL,
        name: TEST_CONSTANTS.TEST_USER_NAME,
        picture: TEST_CONSTANTS.TEST_PICTURE_URL,
      };

      const mockExistingUser = {
        userId: TEST_CONSTANTS.EXISTING_USER_ID,
        googleSub: TEST_CONSTANTS.GOOGLE_USER_ID,
        email: TEST_CONSTANTS.TEST_EMAIL,
      };

      const mockErrorResponse = {
        statusCode: 409,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.USER_ALREADY_EXISTS,
        }),
      };

      mockVerifyGoogleIdToken.mockResolvedValue(mockGoogleUserInfo);
      mockCheckExistingUser.mockResolvedValue(mockExistingUser);
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockVerifyGoogleIdToken).toHaveBeenCalledWith(
        TEST_CONSTANTS.VALID_ID_TOKEN
      );
      expect(mockCheckExistingUser).toHaveBeenCalledWith(
        TEST_CONSTANTS.GOOGLE_USER_ID
      );
      expect(mockCreateNewUser).not.toHaveBeenCalled();
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        409,
        TEST_CONSTANTS.ERROR_MESSAGES.USER_ALREADY_EXISTS
      );
      expect(result).toEqual(mockErrorResponse);
    });

    it('should return 500 error when verifyGoogleIdToken fails', async () => {
      mockVerifyGoogleIdToken.mockRejectedValue(
        new Error(TEST_CONSTANTS.ERROR_MESSAGES.INVALID_GOOGLE_TOKEN)
      );
      const mockErrorResponse = {
        statusCode: 500,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        }),
      };
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockVerifyGoogleIdToken).toHaveBeenCalledWith(
        TEST_CONSTANTS.VALID_ID_TOKEN
      );
      expect(mockCheckExistingUser).not.toHaveBeenCalled();
      expect(mockCreateNewUser).not.toHaveBeenCalled();
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        500,
        TEST_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
      expect(result).toEqual(mockErrorResponse);
    });

    it('should return 500 error when checkExistingUser fails', async () => {
      const mockGoogleUserInfo = {
        sub: TEST_CONSTANTS.GOOGLE_USER_ID,
        email: TEST_CONSTANTS.TEST_EMAIL,
        name: TEST_CONSTANTS.TEST_USER_NAME,
        picture: TEST_CONSTANTS.TEST_PICTURE_URL,
      };

      mockVerifyGoogleIdToken.mockResolvedValue(mockGoogleUserInfo);
      mockCheckExistingUser.mockRejectedValue(
        new Error(TEST_CONSTANTS.ERROR_MESSAGES.DATABASE_ERROR)
      );
      const mockErrorResponse = {
        statusCode: 500,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        }),
      };
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockVerifyGoogleIdToken).toHaveBeenCalledWith(
        TEST_CONSTANTS.VALID_ID_TOKEN
      );
      expect(mockCheckExistingUser).toHaveBeenCalledWith(
        TEST_CONSTANTS.GOOGLE_USER_ID
      );
      expect(mockCreateNewUser).not.toHaveBeenCalled();
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        500,
        TEST_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
      expect(result).toEqual(mockErrorResponse);
    });

    it('should return 500 error when createNewUser fails', async () => {
      const mockGoogleUserInfo = {
        sub: TEST_CONSTANTS.GOOGLE_USER_ID,
        email: TEST_CONSTANTS.TEST_EMAIL,
        name: TEST_CONSTANTS.TEST_USER_NAME,
        picture: TEST_CONSTANTS.TEST_PICTURE_URL,
      };

      mockVerifyGoogleIdToken.mockResolvedValue(mockGoogleUserInfo);
      mockCheckExistingUser.mockResolvedValue(null);
      mockCreateNewUser.mockRejectedValue(
        new Error(TEST_CONSTANTS.ERROR_MESSAGES.DATABASE_WRITE_ERROR)
      );
      const mockErrorResponse = {
        statusCode: 500,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        }),
      };
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockVerifyGoogleIdToken).toHaveBeenCalledWith(
        TEST_CONSTANTS.VALID_ID_TOKEN
      );
      expect(mockCheckExistingUser).toHaveBeenCalledWith(
        TEST_CONSTANTS.GOOGLE_USER_ID
      );
      expect(mockCreateNewUser).toHaveBeenCalledWith(mockGoogleUserInfo);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        500,
        TEST_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
      expect(result).toEqual(mockErrorResponse);
    });

    it('should return 500 error when request body is invalid JSON', async () => {
      mockEvent.body = 'invalid-json';
      const mockErrorResponse = {
        statusCode: 500,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        }),
      };
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        500,
        TEST_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
      expect(result).toEqual(mockErrorResponse);
    });

    it('should return 400 error when request body is null', async () => {
      mockEvent.body = null;
      const mockErrorResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN,
        }),
      };
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        400,
        TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN
      );
      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('Edge Cases', () => {
    it('should return 400 error when idToken is empty string', async () => {
      mockEvent.body = JSON.stringify({ idToken: '' });
      const mockErrorResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN,
        }),
      };
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        400,
        TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN
      );
      expect(result).toEqual(mockErrorResponse);
    });

    it('should return 400 error when idToken is null', async () => {
      mockEvent.body = JSON.stringify({ idToken: null });
      const mockErrorResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN,
        }),
      };
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        400,
        TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN
      );
      expect(result).toEqual(mockErrorResponse);
    });

    it('should return 400 error when idToken is undefined', async () => {
      mockEvent.body = JSON.stringify({ idToken: undefined });
      const mockErrorResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN,
        }),
      };
      mockCreateErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await googleRegisterHandler(mockEvent, mockContext);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        400,
        TEST_CONSTANTS.ERROR_MESSAGES.MISSING_ID_TOKEN
      );
      expect(result).toEqual(mockErrorResponse);
    });
  });
});
