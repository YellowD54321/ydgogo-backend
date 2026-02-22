import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { authenticate } from '@/middleware/authMiddleware';
import { createRecord } from '@/services/recordService';
import { createErrorResponse, createSuccessResponse } from '@/utils';

export const createRecordHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const user = await authenticate(event);
    if (!user) {
      return createErrorResponse(401, 'Unauthorized');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Missing request body');
    }

    let body: { title?: string; gameTree?: Record<string, unknown> };
    try {
      body = JSON.parse(event.body);
    } catch {
      return createErrorResponse(400, 'Invalid JSON format');
    }

    const { title, gameTree } = body;

    if (!title || typeof title !== 'string') {
      return createErrorResponse(400, 'Missing or invalid title');
    }

    if (!gameTree || typeof gameTree !== 'object') {
      return createErrorResponse(400, 'Missing or invalid gameTree');
    }

    const record = await createRecord(user.userId, title, gameTree);

    return createSuccessResponse(201, {
      recordId: record.recordId,
      title: record.title,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error('Error in createRecordHandler:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
