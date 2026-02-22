import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_TOKEN_ISSUERS } from '@/constants';
import { QueryCommand, BatchWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName, getGsiGoogleSubName } from '@/utils';
import { getGoogleClientId } from '@/services/ssmService';
import { v7 as uuidv7 } from 'uuid';
import { USER_CONFIG } from '@/constants/db';

export interface GoogleUserInfo {
  sub: string;
  email: string;
}

let cachedOAuth2Client: OAuth2Client | null = null;
let cachedClientId: string | null = null;

const getOAuth2Client = async (): Promise<OAuth2Client> => {
  const googleClientId = await getGoogleClientId();

  if (cachedOAuth2Client && cachedClientId === googleClientId) {
    return cachedOAuth2Client;
  }

  cachedOAuth2Client = new OAuth2Client(googleClientId);
  cachedClientId = googleClientId;
  return cachedOAuth2Client;
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
    const oauthClient = await getOAuth2Client();
    const googleClientId = await getGoogleClientId();

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
    const tableName = getTableName();
    const gsiName = getGsiGoogleSubName();

    const params = {
      TableName: tableName,
      IndexName: gsiName,
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
    const tableName = getTableName();

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
        [tableName]: requestItems,
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

export const getUserProfile = async (userId: string): Promise<any> => {
  try {
    const db = getDynamoDBClient();
    const tableName = getTableName();

    const params = {
      TableName: tableName,
      Key: {
        PK: `${USER_CONFIG.PK_PREFIX}${userId}`,
        SK: USER_CONFIG.SK_PROFILE,
      },
    };

    const result = await db.send(new GetCommand(params));

    return result.Item || null;
  } catch (error) {
    console.error('Error getUserProfile:', error);
    throw error;
  }
};
