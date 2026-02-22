import { listRecordsHandler } from '../listRecords';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

const mockAuthenticate = jest.fn();
jest.mock('@/middleware/authMiddleware', () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
}));

const mockListRecords = jest.fn();
jest.mock('@/services/recordService', () => ({
  listRecords: (...args: unknown[]) => mockListRecords(...args),
}));

const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    httpMethod: 'GET',
    body: null,
    headers: { Authorization: 'Bearer valid-token' },
    pathParameters: null,
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    isBase64Encoded: false,
    path: '/records',
    requestContext: {} as any,
    resource: '',
    stageVariables: null,
    ...overrides,
  }) as APIGatewayProxyEvent;

const context = {} as Context;
const MOCK_USER = { userId: 'user-123', email: 'test@example.com' };

describe('listRecordsHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockAuthenticate.mockResolvedValue(null);

    const result = await listRecordsHandler(createEvent(), context);

    expect(result.statusCode).toBe(401);
  });

  it('should return records list', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    const mockResult = {
      records: [{ recordId: 'r1', title: 'Game 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
      nextCursor: null,
    };
    mockListRecords.mockResolvedValue(mockResult);

    const result = await listRecordsHandler(createEvent(), context);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(mockResult);
    expect(mockListRecords).toHaveBeenCalledWith('user-123', undefined, undefined);
  });

  it('should pass limit and cursor parameters', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockListRecords.mockResolvedValue({ records: [], nextCursor: null });

    const result = await listRecordsHandler(
      createEvent({ queryStringParameters: { limit: '10', cursor: 'abc123' } }),
      context
    );

    expect(result.statusCode).toBe(200);
    expect(mockListRecords).toHaveBeenCalledWith('user-123', 10, 'abc123');
  });

  it('should return 400 for invalid limit', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await listRecordsHandler(
      createEvent({ queryStringParameters: { limit: 'abc' } }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 for invalid cursor', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockListRecords.mockRejectedValue(new Error('Invalid cursor'));

    const result = await listRecordsHandler(
      createEvent({ queryStringParameters: { cursor: 'bad' } }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 500 on unexpected error', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockListRecords.mockRejectedValue(new Error('DynamoDB error'));

    const result = await listRecordsHandler(createEvent(), context);

    expect(result.statusCode).toBe(500);
  });
});
