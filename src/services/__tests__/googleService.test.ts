const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

import { verifyGoogleIdToken } from '../googleService';

describe('Google Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['GOOGLE_CLIENT_ID'] = 'test-client-id';
  });

  afterEach(() => {
    delete process.env['GOOGLE_CLIENT_ID'];
  });

  describe('verifyGoogleIdToken', () => {
    it('should return GoogleUserInfo when token is valid', async () => {
      const mockPayload = {
        sub: '12345',
        email: 'test@example.com',
        iss: 'https://accounts.google.com',
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      const result = await verifyGoogleIdToken('valid-token');

      expect(result).toEqual({
        sub: '12345',
        email: 'test@example.com',
      });

      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: 'valid-token',
        audience: 'test-client-id',
      });
    });

    it('should return GoogleUserInfo without optional fields when they are not present', async () => {
      const mockPayload = {
        sub: '12345',
        email: 'test@example.com',
        iss: 'https://accounts.google.com',
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      const result = await verifyGoogleIdToken('valid-token');

      expect(result).toEqual({
        sub: '12345',
        email: 'test@example.com',
      });
    });

    it('should throw error when payload is null', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });

      await expect(verifyGoogleIdToken('valid-token')).rejects.toThrow();
    });

    it('should throw error when required fields are missing', async () => {
      const mockPayload = {
        sub: '12345',
        // email is missing
        iss: 'https://accounts.google.com',
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      await expect(verifyGoogleIdToken('valid-token')).rejects.toThrow();
    });

    it('should throw error when issuer is invalid', async () => {
      const mockPayload = {
        sub: '12345',
        email: 'test@example.com',
        iss: 'https://malicious-site.com',
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      await expect(verifyGoogleIdToken('valid-token')).rejects.toThrow();
    });

    it('should throw error when verifyIdToken throws error', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(verifyGoogleIdToken('invalid-token')).rejects.toThrow();
    });

    it('should throw error when GOOGLE_CLIENT_ID is not set', async () => {
      delete process.env['GOOGLE_CLIENT_ID'];

      await expect(verifyGoogleIdToken('valid-token')).rejects.toThrow(
        'GOOGLE_CLIENT_ID environment variable is not set'
      );
    });
  });
});
