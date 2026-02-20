import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/services/ssmService';

export interface JwtPayload {
  userId: string;
  email: string;
}

export const generateToken = async (payload: JwtPayload): Promise<string> => {
  const secret = await getJwtSecret();
  const expiresIn = '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = async (token: string): Promise<JwtPayload> => {
  const secret = await getJwtSecret();

  return jwt.verify(token, secret) as JwtPayload;
};
