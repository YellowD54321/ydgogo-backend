import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import {
  verifyGoogleIdToken,
  checkExistingUser,
  createNewUser,
} from '@/services/googleService';
import { createErrorResponse, createSuccessResponse } from '@/utils';

interface RegisterRequest {
  idToken: string;
}

export const googleRegisterHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { idToken }: RegisterRequest = body;

    if (!idToken) {
      return createErrorResponse(400, 'Missing idToken in request body');
    }

    const googleUserInfo = await verifyGoogleIdToken(idToken);

    const existingUser = await checkExistingUser(googleUserInfo.sub);

    if (existingUser) {
      return createErrorResponse(409, 'User already exists');
    }

    const newUser = await createNewUser(googleUserInfo);

    return createSuccessResponse(201, {
      message: 'User registered successfully',
      user: {
        userId: newUser.userId,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in googleRegisterHandler:', error);

    return createErrorResponse(500, 'Internal server error');
  }
};
