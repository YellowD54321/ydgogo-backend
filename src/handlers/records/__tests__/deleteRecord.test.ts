import { deleteRecordHandler } from '../deleteRecord';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

const mockAuthenticate = jest.fn();
jest.mock('@/middleware/authMiddleware', () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
}));

const mockDeleteRecord = jest.fn();
jest.mock('@/services/recordService', () => ({
  deleteRecord: (...args: unknown[]) => mockDeleteRecord(...args),
}));

const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    httpMethod: 'DELETE',
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

describe('deleteRecordHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockAuthenticate.mockResolvedValue(null);

    const result = await deleteRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(401);
  });

  it('should delete record and return 204', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockDeleteRecord.mockResolvedValue(true);

    const result = await deleteRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(204);
    expect(mockDeleteRecord).toHaveBeenCalledWith('user-123', 'record-456');
  });

  it('should return 404 when record not found', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockDeleteRecord.mockResolvedValue(false);

    const result = await deleteRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(404);
  });

  it('should return 400 when recordId is missing', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);

    const result = await deleteRecordHandler(
      createEvent({ pathParameters: null }),
      context
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 500 on unexpected error', async () => {
    mockAuthenticate.mockResolvedValue(MOCK_USER);
    mockDeleteRecord.mockRejectedValue(new Error('DynamoDB error'));

    const result = await deleteRecordHandler(createEvent(), context);

    expect(result.statusCode).toBe(500);
  });
});
