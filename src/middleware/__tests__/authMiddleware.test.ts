import { authenticate } from '../authMiddleware';
import { APIGatewayProxyEvent } from 'aws-lambda';

const mockVerifyToken = jest.fn();
jest.mock('@/services/jwtService', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

const createEvent = (headers: Record<string, string> = {}): APIGatewayProxyEvent =>
  ({
    headers,
    body: null,
    httpMethod: 'GET',
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueHeaders: {},
    isBase64Encoded: false,
    requestContext: {} as any,
    resource: '',
    stageVariables: null,
    multiValueQueryStringParameters: null,
  }) as APIGatewayProxyEvent;

const TEST_PAYLOAD = { userId: 'user-123', email: 'test@example.com' };

describe('authMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return payload when valid Bearer token is provided', async () => {
    mockVerifyToken.mockResolvedValue(TEST_PAYLOAD);

    const result = await authenticate(createEvent({ Authorization: 'Bearer valid-token' }));

    expect(result).toEqual(TEST_PAYLOAD);
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
  });

  it('should handle lowercase authorization header', async () => {
    mockVerifyToken.mockResolvedValue(TEST_PAYLOAD);

    const result = await authenticate(createEvent({ authorization: 'Bearer valid-token' }));

    expect(result).toEqual(TEST_PAYLOAD);
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
  });

  it('should return null when no Authorization header', async () => {
    const result = await authenticate(createEvent({}));

    expect(result).toBeNull();
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('should return null when Authorization header has no Bearer prefix', async () => {
    const result = await authenticate(createEvent({ Authorization: 'Basic some-token' }));

    expect(result).toBeNull();
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('should return null when token is empty after Bearer', async () => {
    mockVerifyToken.mockRejectedValue(new Error('invalid token'));

    const result = await authenticate(createEvent({ Authorization: 'Bearer ' }));

    expect(result).toBeNull();
  });

  it('should return null when verifyToken throws', async () => {
    mockVerifyToken.mockRejectedValue(new Error('Token expired'));

    const result = await authenticate(createEvent({ Authorization: 'Bearer expired-token' }));

    expect(result).toBeNull();
  });
});
