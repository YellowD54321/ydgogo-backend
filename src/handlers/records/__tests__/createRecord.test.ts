import { createRecordHandler } from '../createRecord';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

const mockAuthenticate = jest.fn();
jest.mock('@/middleware/authMiddleware', () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
}));

const mockCreateRecord = jest.fn();
jest.mock('@/services/recordService', () => ({
  createRecord: (...args: unknown[]) => mockCreateRecord(...args),
}));

const MOCK_GAME_TREE = {
  nodes: { root: { move: null } },
  rootNodeId: 'root',
  pointer: { currentNodeId: 'root', currentMoveNumber: 0, totalMoveNumber: 0 },
};

const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    httpMethod: 'POST',
    body: JSON.stringify({ title: 'New Game', gameTree: MOCK_GAME_TREE }),
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

describe('createRecordHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockAuthenticate.mockResolvedValue(null);

    const result = await createRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(401);
  });

  it('should create record and return 201', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    const mockResult = {
      recordId: 'new-id',
      title: 'New Game',
      gameTree: MOCK_GAME_TREE,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    mockCreateRecord.mockResolvedValue(mockResult);

    const result = await createRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({
      recordId: 'new-id',
      title: 'New Game',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    });
    expect(mockCreateRecord).toHaveBeenCalledWith('user-123', 'New Game', MOCK_GAME_TREE);
  });

  it('should return 400 when body is missing', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await createRecordHandler(
      createEvent({ body: null }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 for invalid JSON', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await createRecordHandler(
      createEvent({ body: 'not-json' }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 when title is missing', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await createRecordHandler(
      createEvent({ body: JSON.stringify({ gameTree: MOCK_GAME_TREE }) }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 when gameTree is missing', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await createRecordHandler(
      createEvent({ body: JSON.stringify({ title: 'Game' }) }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 500 on unexpected error', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockCreateRecord.mockRejectedValue(new Error('DynamoDB error'));

    const result = await createRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(500);
  });
});
