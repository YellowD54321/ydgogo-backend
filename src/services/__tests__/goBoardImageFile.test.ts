import { saveBoardImage } from '../goBoardImageService';
import { StoneColor } from '@/types/gameTree';
import type { ISerializedMoveTree } from '@/types/gameTree';

const mockToBuffer = jest.fn();
const mockPng = jest.fn(() => ({ toBuffer: mockToBuffer }));
const mockSharp = jest.fn((..._args: unknown[]) => ({ png: mockPng }));
jest.mock('sharp', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockSharp(...args),
}));

const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
jest.mock('fs/promises', () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

const TEST_CONSTANTS = {
  FILE_NAME: 'record-123',
  OUTPUT_DIR: 'generated-images',
  PNG_BUFFER: Buffer.from('fake-png-bytes'),
};

const GAME_TREE: ISerializedMoveTree = {
  rootNodeId: 'ROOT',
  nodes: {
    ROOT: {
      id: 'ROOT',
      x: -1,
      y: -1,
      color: StoneColor.Empty,
      currentMoveNumber: 0,
      capturedGroups: [],
      parentId: null,
      childrenIds: [],
    },
  },
  pointer: { currentNodeId: 'ROOT', currentMoveNumber: 0, totalMoveNumber: 0 },
};

describe('saveBoardImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToBuffer.mockResolvedValue(TEST_CONSTANTS.PNG_BUFFER);
  });

  describe('Success Cases', () => {
    it('should rasterise the rendered svg through sharp as png', async () => {
      await saveBoardImage(GAME_TREE, TEST_CONSTANTS.FILE_NAME);

      const svgBuffer = mockSharp.mock.calls[0]?.[0] as Buffer;
      expect(svgBuffer.toString()).toContain('<svg');
      expect(mockPng).toHaveBeenCalled();
    });

    it('should create the output directory recursively', async () => {
      await saveBoardImage(GAME_TREE, TEST_CONSTANTS.FILE_NAME);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining(TEST_CONSTANTS.OUTPUT_DIR),
        { recursive: true }
      );
    });

    it('should write the png bytes to a .png file named after the record', async () => {
      await saveBoardImage(GAME_TREE, TEST_CONSTANTS.FILE_NAME);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(`${TEST_CONSTANTS.FILE_NAME}.png`),
        TEST_CONSTANTS.PNG_BUFFER
      );
    });

    it('should return the absolute file path and byte size', async () => {
      const result = await saveBoardImage(GAME_TREE, TEST_CONSTANTS.FILE_NAME);

      expect(result.fileName).toBe(`${TEST_CONSTANTS.FILE_NAME}.png`);
      expect(result.byteSize).toBe(TEST_CONSTANTS.PNG_BUFFER.length);
      expect(result.filePath).toContain(`${TEST_CONSTANTS.FILE_NAME}.png`);
    });
  });

  describe('Error Cases', () => {
    it('should propagate a sharp rasterisation failure', async () => {
      mockToBuffer.mockRejectedValue(new Error('rasterise failed'));

      await expect(
        saveBoardImage(GAME_TREE, TEST_CONSTANTS.FILE_NAME)
      ).rejects.toThrow('rasterise failed');
    });
  });
});
