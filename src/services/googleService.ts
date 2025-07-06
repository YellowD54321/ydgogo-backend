import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_TOKEN_ISSUERS } from '@/constants';

export interface GoogleUserInfo {
  sub: string;
  email: string;
}

/**
 * 懶加載 OAuth2Client 實例
 */
function getOAuth2Client(): OAuth2Client {
  const googleClientId = process.env['GOOGLE_CLIENT_ID'];

  if (!googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
  }

  const client = new OAuth2Client(googleClientId);

  return client;
}

/**
 * 驗證 Google ID Token
 * @param idToken Google ID Token
 * @returns GoogleUserInfo
 * @throws Error 如果驗證失敗或配置錯誤
 */
export async function verifyGoogleIdToken(
  idToken: string
): Promise<GoogleUserInfo> {
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
    console.error('Error verifying Google ID token:', error);
    throw error;
  }
}
