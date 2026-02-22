import { updateRecordHandler } from '../updateRecord';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

const mockAuthenticate = jest.fn();
jest.mock('@/middleware/authMiddleware', () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
}));

const mockUpdateRecord = jest.fn();
jest.mock('@/services/recordService', () => ({
  updateRecord: (...args: unknown[]) => mockUpdateRecord(...args),
}));

const MOCK_GAME_TREE = {
  nodes: { root: { move: null } },
  rootNodeId: 'root',
  pointer: { currentNodeId: 'root', currentMoveNumber: 0, totalMoveNumber: 0 },
};

const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    httpMethod: 'PUT',
    body: JSON.stringify({ title: 'Updated Game', gameTree: MOCK_GAME_TREE }),
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

describe('updateRecordHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockAuthenticate.mockResolvedValue(null);

    const result = await updateRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(401);
  });

  it('should update record and return 200', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    const mockResult = {
      recordId: 'record-456',
      title: 'Updated Game',
      gameTree: MOCK_GAME_TREE,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    };
    mockUpdateRecord.mockResolvedValue(mockResult);

    const result = await updateRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(mockResult);
    expect(mockUpdateRecord).toHaveBeenCalledWith(
      'user-123', 'record-456', 'Updated Game', MOCK_GAME_TREE
    );
  });

  it('should return 404 when record not found', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockUpdateRecord.mockResolvedValue(null);

    const result = await updateRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(404);
  });

  it('should return 400 when recordId is missing', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await updateRecordHandler(
      createEvent({ pathParameters: null }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 when body is missing', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await updateRecordHandler(
      createEvent({ body: null }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 for invalid JSON', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await updateRecordHandler(
      createEvent({ body: 'not-json' }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 when title is missing', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await updateRecordHandler(
      createEvent({ body: JSON.stringify({ gameTree: MOCK_GAME_TREE }) }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 when gameTree is missing', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await updateRecordHandler(
      createEvent({ body: JSON.stringify({ title: 'Game' }) }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 500 on unexpected error', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockUpdateRecord.mockRejectedValue(new Error('DynamoDB error'));

    const result = await updateRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(500);
  });
});
