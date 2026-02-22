import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { authenticate } from '@/middleware/authMiddleware';
import { updateRecord } from '@/services/recordService';
import { createErrorResponse, createSuccessResponse } from '@/utils';

export const updateRecordHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const user = await authenticate(event);
    if (!user) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const recordId = event.pathParameters?.['recordId'];
    if (!recordId) {
      return createErrorResponse(400, 'Missing recordId');
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

    const record = await updateRecord(user.userId, recordId, title, gameTree);
    if (!record) {
      return createErrorResponse(404, 'Record not found');
    }

    return createSuccessResponse(200, record);
  } catch (error) {
    console.error('Error in updateRecordHandler:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
