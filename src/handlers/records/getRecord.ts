import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { authenticate } from '@/middleware/authMiddleware';
import { getRecord } from '@/services/recordService';
import { createErrorResponse, createSuccessResponse } from '@/utils';

export const getRecordHandler = async (
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

    const record = await getRecord(user.userId, recordId);
    if (!record) {
      return createErrorResponse(404, 'Record not found');
    }

    return createSuccessResponse(200, record);
  } catch (error) {
    console.error('Error in getRecordHandler:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
