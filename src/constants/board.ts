export const BOARD_CONFIG = {
  SIZE: 19,
  CELL_SIZE: 30,
  PADDING: 40,
  STONE_RADIUS: 14,
  STAR_RADIUS: 3,
  LINE_WIDTH: 0.8,
  STAR_POINTS: [
    { x: 3, y: 3 },
    { x: 9, y: 3 },
    { x: 15, y: 3 },
    { x: 3, y: 9 },
    { x: 9, y: 9 },
    { x: 15, y: 9 },
    { x: 3, y: 15 },
    { x: 9, y: 15 },
    { x: 15, y: 15 },
  ],
  COLORS: {
    BOARD: '#DCB35C',
    LINE: '#4A3500',
    STAR: '#4A3500',
  },
};

export const BOARD_DIMENSION =
  BOARD_CONFIG.CELL_SIZE * (BOARD_CONFIG.SIZE - 1) + BOARD_CONFIG.PADDING * 2;

export const IMAGE_OUTPUT_DIR = 'generated-images';
