import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_TOKEN_ISSUERS } from '@/constants';
import { QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getEnvironmentVariables } from '@/utils';
import { v7 as uuidv7 } from 'uuid';
import { USER_CONFIG } from '@/constants/db';

export interface GoogleUserInfo {
  sub: string;
  email: string;
}

/**
 * 懶加載 OAuth2Client 實例
 */
const getOAuth2Client = (): OAuth2Client => {
  const googleClientId = process.env['GOOGLE_CLIENT_ID'];

  if (!googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
  }

  const client = new OAuth2Client(googleClientId);

  return client;
};

/**
 * 驗證 Google ID Token
 * @param idToken Google ID Token
 * @returns GoogleUserInfo
 * @throws Error 如果驗證失敗或配置錯誤
 */
export const verifyGoogleIdToken = async (
  idToken: string
): Promise<GoogleUserInfo> => {
  try {
    const oauthClient = getOAuth2Client();
    const googleClientId = process.env['GOOGLE_CLIENT_ID']!;

    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      console.error('No payload found in Google ID token');
      throw new Error('No payload found in Google ID token');
    }

    if (!payload.sub || !payload.email) {
      console.error('Missing required fields in Google ID token payload');
      throw new Error('Missing required fields in Google ID token payload');
    }

    if (
      !payload.iss ||
      !GOOGLE_TOKEN_ISSUERS.includes(
        payload.iss as (typeof GOOGLE_TOKEN_ISSUERS)[number]
      )
    ) {
      console.error('Invalid Google ID token issuer');
      throw new Error('Invalid Google ID token issuer');
    }

    return {
      sub: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    console.error('Error verifyGoogleIdToken:', error);
    throw error;
  }
};

export const getUserByGoogleSub = async (googleSub: string): Promise<any> => {
  try {
    const db = getDynamoDBClient();
    const { TABLE_NAME, GSI_GOOGLE_SUB_NAME } = getEnvironmentVariables();

    try {
      const { ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
      const listResult = await db.send(new ListTablesCommand({}));
      console.log('Available tables:', listResult.TableNames);
    } catch (listError) {
      console.error('Error listing tables:', listError);
    }

    const params = {
      TableName: TABLE_NAME,
      IndexName: GSI_GOOGLE_SUB_NAME,
      KeyConditionExpression: 'googleSub = :sub',
      ExpressionAttributeValues: {
        ':sub': googleSub,
      },
    };

    const result = await db.send(new QueryCommand(params));

    if (result.Items && result.Items.length > 0) {
      return result.Items[0];
    }

    return null;
  } catch (error) {
    console.error('Error getUserByGoogleSub:', error);
    throw error;
  }
};

export const checkExistingUser = async (googleSub: string): Promise<any> => {
  try {
    const user = await getUserByGoogleSub(googleSub);

    if (user) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checkExistingUser:', error);
    throw error;
  }
};

export const createNewUser = async (
  googleUserInfo: GoogleUserInfo
): Promise<any> => {
  try {
    const db = getDynamoDBClient();
    const { TABLE_NAME } = getEnvironmentVariables();

    const userId = uuidv7();
    const userPK = `${USER_CONFIG.PK_PREFIX}${userId}`;
    const now = new Date().toISOString();

    const requestItems = [
      {
        PutRequest: {
          Item: {
            PK: userPK,
            SK: USER_CONFIG.SK_PROFILE,
            userId: userId,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
      {
        PutRequest: {
          Item: {
            PK: userPK,
            SK: USER_CONFIG.AUTH_GOOGLE,
            googleSub: googleUserInfo.sub,
            email: googleUserInfo.email,
            authProvider: 'Google',
          },
        },
      },
    ];

    const batchParams = {
      RequestItems: {
        [TABLE_NAME]: requestItems,
      },
    };

    await db.send(new BatchWriteCommand(batchParams));

    return {
      userId,
      createdAt: now,
    };
  } catch (error) {
    console.error('Error createNewUser:', error);
    throw error;
  }
};
