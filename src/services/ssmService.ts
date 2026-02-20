import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({});
const cache: Record<string, string> = {};

const getSSMParameter = async (paramName: string): Promise<string> => {
  if (cache[paramName]) {
    return cache[paramName];
  }

  const command = new GetParameterCommand({
    Name: paramName,
    WithDecryption: true,
  });

  const result = await ssmClient.send(command);
  const value = result.Parameter?.Value;

  if (!value) {
    throw new Error(`SSM parameter ${paramName} not found or empty`);
  }

  cache[paramName] = value;
  return value;
};

export const getGoogleClientId = async (): Promise<string> => {
  const envValue = process.env['GOOGLE_CLIENT_ID'];
  if (envValue) return envValue;

  const paramPath = process.env['GOOGLE_CLIENT_ID_PARAM'];
  if (!paramPath) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  return getSSMParameter(paramPath);
};

export const getJwtSecret = async (): Promise<string> => {
  const envValue = process.env['JWT_SECRET'];
  if (envValue) return envValue;

  const paramPath = process.env['JWT_SECRET_PARAM'];
  if (!paramPath) {
    throw new Error('JWT_SECRET is not configured');
  }

  return getSSMParameter(paramPath);
};
