import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { authenticate } from '@/middleware/authMiddleware';
import { deleteRecord } from '@/services/recordService';
import { createErrorResponse, createSuccessResponse } from '@/utils';

export const deleteRecordHandler = async (
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

    const deleted = await deleteRecord(user.userId, recordId);
    if (!deleted) {
      return createErrorResponse(404, 'Record not found');
    }

    return createSuccessResponse(204, null);
  } catch (error) {
    console.error('Error in deleteRecordHandler:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
