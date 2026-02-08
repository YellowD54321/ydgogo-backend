import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { verifyGoogleIdToken, getUserByGoogleSub } from '@/services/googleService';
import { generateToken } from '@/services/jwtService';
import { createErrorResponse, createSuccessResponse } from '@/utils';

interface LoginRequest {
  idToken: string;
}

export const googleLoginHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Missing request body');
    }

    let requestBody: LoginRequest;
    try {
      requestBody = JSON.parse(event.body);
    } catch {
      return createErrorResponse(400, 'Invalid JSON format');
    }

    const { idToken } = requestBody;

    if (!idToken) {
      return createErrorResponse(400, 'Missing idToken');
    }

    const googleUserInfo = await verifyGoogleIdToken(idToken);

    const authItem = await getUserByGoogleSub(googleUserInfo.sub);

    if (!authItem) {
      return createErrorResponse(404, 'User not found. Please register first.');
    }

    const userId = authItem.PK.replace('USER#', '');

    const token = generateToken({
      userId,
      email: authItem.email,
    });

    return createSuccessResponse(200, {
      message: 'Login successful',
      user: {
        userId,
        email: authItem.email,
      },
      token,
    });
  } catch (error) {
    console.error('Error in googleLoginHandler:', error);

    if (error instanceof Error) {
      if (error.message.includes('Google')) {
        return createErrorResponse(401, 'Invalid Google token');
      }
    }

    return createErrorResponse(500, 'Internal server error');
  }
};
