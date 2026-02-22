import { getRecordHandler } from '../getRecord';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

const mockAuthenticate = jest.fn();
jest.mock('@/middleware/authMiddleware', () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
}));

const mockGetRecord = jest.fn();
jest.mock('@/services/recordService', () => ({
  getRecord: (...args: unknown[]) => mockGetRecord(...args),
}));

const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    httpMethod: 'GET',
    body: null,
    headers: { Authorization: 'Bearer valid-token' },
    pathParameters: { recordId: 'record-456' },
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    isBase64Encoded: false,
    path: '/records/record-456',
    requestContext: {} as any,
    resource: '',
    stageVariables: null,
    ...overrides,
  }) as APIGatewayProxyEvent;

const context = {} as Context;
const MOCK_USER = { userId: 'user-123', email: 'test@example.com' };
const MOCK_RECORD = {
  recordId: 'record-456',
  title: 'My Game',
  gameTree: { nodes: {}, rootNodeId: 'root', pointer: {} },
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('getRecordHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockAuthenticate.mockResolvedValue(null);

    const result = await getRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(401);
  });

  it('should return record when found', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockGetRecord.mockResolvedValue(MOCK_RECORD);

    const result = await getRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(MOCK_RECORD);
    expect(mockGetRecord).toHaveBeenCalledWith('user-123', 'record-456');
  });

  it('should return 404 when record not found', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockGetRecord.mockResolvedValue(null);

    const result = await getRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(404);
  });

  it('should return 400 when recordId is missing', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await getRecordHandler(
      createEvent({ pathParameters: null }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 500 on unexpected error', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockGetRecord.mockRejectedValue(new Error('DynamoDB error'));

    const result = await getRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(500);
  });
});
