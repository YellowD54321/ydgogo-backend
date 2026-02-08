import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
}

const getJwtSecret = (): string => {
  const secret = process.env['JWT_SECRET'];

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return secret;
};

export const generateToken = (payload: JwtPayload): string => {
  const secret = getJwtSecret();
  const expiresIn = '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = getJwtSecret();

  return jwt.verify(token, secret) as JwtPayload;
};

