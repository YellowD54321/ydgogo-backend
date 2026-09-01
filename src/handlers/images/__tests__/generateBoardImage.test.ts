import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { generateBoardImageHandler } from '../generateBoardImage';

const mockSaveBoardImage = jest.fn();
jest.mock('@/services/goBoardImageService', () => ({
  saveBoardImage: (...args: unknown[]) => mockSaveBoardImage(...args),
}));

const TEST_CONSTANTS = {
  FILE_NAME: 'my-game',
  SAVED_IMAGE: {
    fileName: 'my-game.png',
    filePath: '/abs/generated-images/my-game.png',
    byteSize: 1234,
  },
  ERROR_MESSAGES: {
    MISSING_BODY: 'Missing request body',
    INVALID_JSON: 'Invalid JSON format',
    INVALID_GAME_TREE: 'Missing or invalid gameTree',
    INTERNAL: 'Internal server error',
  },
};

const GAME_TREE = {
  nodes: {},
  rootNodeId: 'ROOT',
  pointer: { currentNodeId: 'ROOT', currentMoveNumber: 0, totalMoveNumber: 0 },
};

const context = {} as Context;

const createEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent =>
  ({
    body: JSON.stringify({
      gameTree: GAME_TREE,
      fileName: TEST_CONSTANTS.FILE_NAME,
    }),
    headers: {},
    ...overrides,
  }) as APIGatewayProxyEvent;

describe('generateBoardImageHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveBoardImage.mockResolvedValue(TEST_CONSTANTS.SAVED_IMAGE);
  });

  describe('Success Cases', () => {
    it('should return 201 with the saved image metadata', async () => {
      const result = await generateBoardImageHandler(createEvent(), context);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual(TEST_CONSTANTS.SAVED_IMAGE);
    });

    it('should pass the gameTree and fileName to the image service', async () => {
      await generateBoardImageHandler(createEvent(), context);

      expect(mockSaveBoardImage).toHaveBeenCalledWith(
        GAME_TREE,
        TEST_CONSTANTS.FILE_NAME
      );
    });

    it('should fall back to a generated file name when none is provided', async () => {
      await generateBoardImageHandler(
        createEvent({ body: JSON.stringify({ gameTree: GAME_TREE }) }),
        context
      );

      expect(mockSaveBoardImage).toHaveBeenCalledWith(
        GAME_TREE,
        expect.stringMatching(/^board-\d+$/)
      );
    });
  });

  describe('Error Cases', () => {
    it('should return 400 when the request body is missing', async () => {
      const result = await generateBoardImageHandler(
        createEvent({ body: null }),
        context
      );

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toBe(
        TEST_CONSTANTS.ERROR_MESSAGES.MISSING_BODY
      );
    });

    it('should return 400 when the body is not valid JSON', async () => {
      const result = await generateBoardImageHandler(
        createEvent({ body: 'not-json' }),
        context
      );

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toBe(
        TEST_CONSTANTS.ERROR_MESSAGES.INVALID_JSON
      );
    });

    it('should return 400 when gameTree is missing', async () => {
      const result = await generateBoardImageHandler(
        createEvent({ body: JSON.stringify({}) }),
        context
      );

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toBe(
        TEST_CONSTANTS.ERROR_MESSAGES.INVALID_GAME_TREE
      );
    });

    it('should return 500 when image generation fails', async () => {
      mockSaveBoardImage.mockRejectedValue(new Error('sharp exploded'));

      const result = await generateBoardImageHandler(createEvent(), context);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBe(
        TEST_CONSTANTS.ERROR_MESSAGES.INTERNAL
      );
    });
  });
});
