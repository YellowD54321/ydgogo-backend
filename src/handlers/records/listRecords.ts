import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { authenticate } from '@/middleware/authMiddleware';
import { listRecords } from '@/services/recordService';
import { createErrorResponse, createSuccessResponse } from '@/utils';

export const listRecordsHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const user = await authenticate(event);
    if (!user) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const limit = event.queryStringParameters?.['limit']
      ? parseInt(event.queryStringParameters['limit'], 10)
      : undefined;
    const cursor = event.queryStringParameters?.['cursor'] ?? undefined;

    if (limit !== undefined && (isNaN(limit) || limit < 1)) {
      return createErrorResponse(400, 'Invalid limit parameter');
    }

    const result = await listRecords(user.userId, limit, cursor);

    return createSuccessResponse(200, result);
  } catch (error) {
    console.error('Error in listRecordsHandler:', error);

    if (error instanceof Error && error.message === 'Invalid cursor') {
      return createErrorResponse(400, 'Invalid cursor parameter');
    }

    return createErrorResponse(500, 'Internal server error');
  }
};
