import { mkdir, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';
import sharp from 'sharp';
import { BOARD_CONFIG, BOARD_DIMENSION, IMAGE_OUTPUT_DIR } from '@/constants/board';
import { StoneColor } from '@/types/gameTree';
import type { ISerializedMoveNode, ISerializedMoveTree } from '@/types/gameTree';

export type BoardState = StoneColor[][];

export const getImageOutputDir = (): string => {
  const configured = process.env['IMAGE_OUTPUT_DIR'] ?? IMAGE_OUTPUT_DIR;
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
};

const createEmptyBoard = (): BoardState =>
  Array.from({ length: BOARD_CONFIG.SIZE }, () =>
    Array.from({ length: BOARD_CONFIG.SIZE }, () => StoneColor.Empty)
  );

const collectPathToPointer = (
  gameTree: ISerializedMoveTree
): ISerializedMoveNode[] => {
  const path: ISerializedMoveNode[] = [];
  const visited = new Set<string>();

  let nodeId: string | null = gameTree.pointer.currentNodeId;
  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node: ISerializedMoveNode | undefined = gameTree.nodes[nodeId];
    if (!node) break;

    path.unshift(node);
    nodeId = node.parentId;
  }

  return path;
};

export const buildBoardState = (gameTree: ISerializedMoveTree): BoardState => {
  const boardState = createEmptyBoard();

  collectPathToPointer(gameTree).forEach((node) => {
    const { x, y, color, capturedGroups } = node;
    if (x < 0 || y < 0) return;

    capturedGroups?.forEach((group) => {
      group.stones?.forEach((point) => {
        const row = boardState[point.y];
        if (row && point.x >= 0 && point.x < BOARD_CONFIG.SIZE) {
          row[point.x] = StoneColor.Empty;
        }
      });
    });

    const row = boardState[y];
    if (row && x < BOARD_CONFIG.SIZE) {
      row[x] = color;
    }
  });

  return boardState;
};

const toPixel = (coord: number): number =>
  BOARD_CONFIG.PADDING + coord * BOARD_CONFIG.CELL_SIZE;

const renderGridLines = (): string => {
  const start = BOARD_CONFIG.PADDING;
  const end = toPixel(BOARD_CONFIG.SIZE - 1);
  const stroke = `stroke="${BOARD_CONFIG.COLORS.LINE}" stroke-width="${BOARD_CONFIG.LINE_WIDTH}"`;

  return Array.from({ length: BOARD_CONFIG.SIZE }, (_, i) => {
    const offset = toPixel(i);
    return (
      `<line x1="${offset}" y1="${start}" x2="${offset}" y2="${end}" ${stroke} />` +
      `<line x1="${start}" y1="${offset}" x2="${end}" y2="${offset}" ${stroke} />`
    );
  }).join('');
};

const renderStarPoints = (): string =>
  BOARD_CONFIG.STAR_POINTS.map(
    (point) =>
      `<circle cx="${toPixel(point.x)}" cy="${toPixel(point.y)}" r="${BOARD_CONFIG.STAR_RADIUS}" fill="${BOARD_CONFIG.COLORS.STAR}" />`
  ).join('');

const renderStones = (boardState: BoardState): string =>
  boardState
    .flatMap((row, y) =>
      row.map((cell, x) => {
        if (cell === StoneColor.Empty) return '';

        const cx = toPixel(x);
        const cy = toPixel(y);
        const radius = BOARD_CONFIG.STONE_RADIUS;

        return cell === StoneColor.Black
          ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="black" />`
          : `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="white" stroke="black" stroke-width="1" />`;
      })
    )
    .join('');

export const renderBoardSvg = (boardState: BoardState): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${BOARD_DIMENSION}" height="${BOARD_DIMENSION}" viewBox="0 0 ${BOARD_DIMENSION} ${BOARD_DIMENSION}">` +
  `<rect x="0" y="0" width="${BOARD_DIMENSION}" height="${BOARD_DIMENSION}" fill="${BOARD_CONFIG.COLORS.BOARD}" />` +
  renderGridLines() +
  renderStarPoints() +
  renderStones(boardState) +
  `</svg>`;

export const renderGameTreeToSvg = (gameTree: ISerializedMoveTree): string =>
  renderBoardSvg(buildBoardState(gameTree));

export interface SavedBoardImage {
  fileName: string;
  filePath: string;
  byteSize: number;
}

export const convertSvgToPng = async (svg: string): Promise<Buffer> =>
  sharp(Buffer.from(svg)).png().toBuffer();

export const saveBoardImage = async (
  gameTree: ISerializedMoveTree,
  fileName: string
): Promise<SavedBoardImage> => {
  const pngBuffer = await convertSvgToPng(renderGameTreeToSvg(gameTree));

  const outputDir = getImageOutputDir();
  await mkdir(outputDir, { recursive: true });

  const pngFileName = `${fileName}.png`;
  const filePath = join(outputDir, pngFileName);
  await writeFile(filePath, pngBuffer);

  return { fileName: pngFileName, filePath, byteSize: pngBuffer.length };
};
