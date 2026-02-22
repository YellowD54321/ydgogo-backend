import { APIGatewayProxyEvent } from 'aws-lambda';
import { verifyToken, JwtPayload } from '@/services/jwtService';

export const authenticate = async (
  event: APIGatewayProxyEvent
): Promise<JwtPayload | null> => {
  const authHeader =
    event.headers['Authorization'] || event.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
};
