import { buildBoardState, renderBoardSvg } from '../goBoardImageService';
import { StoneColor } from '@/types/gameTree';
import type { ISerializedMoveTree } from '@/types/gameTree';

const TEST_CONSTANTS = {
  ROOT_NODE_ID: 'ROOT',
  BOARD_SIZE: 19,
};

const createGameTree = (
  overrides: Partial<ISerializedMoveTree> = {}
): ISerializedMoveTree => ({
  rootNodeId: TEST_CONSTANTS.ROOT_NODE_ID,
  nodes: {
    ROOT: {
      id: 'ROOT',
      x: -1,
      y: -1,
      color: StoneColor.Empty,
      currentMoveNumber: 0,
      capturedGroups: [],
      parentId: null,
      childrenIds: ['1'],
    },
    '1': {
      id: '1',
      x: 3,
      y: 3,
      color: StoneColor.Black,
      currentMoveNumber: 1,
      capturedGroups: [],
      parentId: 'ROOT',
      childrenIds: ['2'],
    },
    '2': {
      id: '2',
      x: 15,
      y: 15,
      color: StoneColor.White,
      currentMoveNumber: 2,
      capturedGroups: [],
      parentId: '1',
      childrenIds: [],
    },
  },
  pointer: { currentNodeId: '2', currentMoveNumber: 2, totalMoveNumber: 2 },
  ...overrides,
});

const createEmptyBoardState = (): StoneColor[][] =>
  Array.from({ length: TEST_CONSTANTS.BOARD_SIZE }, () =>
    Array.from({ length: TEST_CONSTANTS.BOARD_SIZE }, () => StoneColor.Empty)
  );

describe('goBoardImageService', () => {
  describe('buildBoardState', () => {
    describe('Success Cases', () => {
      it('should return a 19x19 grid', () => {
        const boardState = buildBoardState(createGameTree());

        expect(boardState).toHaveLength(TEST_CONSTANTS.BOARD_SIZE);
        expect(boardState[0]).toHaveLength(TEST_CONSTANTS.BOARD_SIZE);
      });

      it('should place stones along the path from root to the pointer node', () => {
        const boardState = buildBoardState(createGameTree());

        expect(boardState[3]?.[3]).toBe(StoneColor.Black);
        expect(boardState[15]?.[15]).toBe(StoneColor.White);
      });

      it('should leave unplayed intersections empty', () => {
        const boardState = buildBoardState(createGameTree());

        expect(boardState[0]?.[0]).toBe(StoneColor.Empty);
      });

      it('should not place a stone for the root placeholder node', () => {
        const boardState = buildBoardState(
          createGameTree({
            pointer: {
              currentNodeId: 'ROOT',
              currentMoveNumber: 0,
              totalMoveNumber: 2,
            },
          })
        );

        const occupied = boardState
          .flat()
          .filter((cell) => cell !== StoneColor.Empty);
        expect(occupied).toHaveLength(0);
      });
    });

    describe('Edge Cases', () => {
      it('should remove captured stones before placing the capturing stone', () => {
        const boardState = buildBoardState(
          createGameTree({
            nodes: {
              ROOT: {
                id: 'ROOT',
                x: -1,
                y: -1,
                color: StoneColor.Empty,
                currentMoveNumber: 0,
                capturedGroups: [],
                parentId: null,
                childrenIds: ['1'],
              },
              '1': {
                id: '1',
                x: 0,
                y: 0,
                color: StoneColor.Black,
                currentMoveNumber: 1,
                capturedGroups: [],
                parentId: 'ROOT',
                childrenIds: ['2'],
              },
              '2': {
                id: '2',
                x: 1,
                y: 0,
                color: StoneColor.White,
                currentMoveNumber: 2,
                capturedGroups: [
                  {
                    stones: [{ x: 0, y: 0 }],
                    liberties: [],
                    color: StoneColor.Black,
                  },
                ],
                parentId: '1',
                childrenIds: [],
              },
            },
          })
        );

        expect(boardState[0]?.[0]).toBe(StoneColor.Empty);
        expect(boardState[0]?.[1]).toBe(StoneColor.White);
      });

      it('should stop walking when the pointer node is missing', () => {
        const boardState = buildBoardState(
          createGameTree({
            pointer: {
              currentNodeId: 'does-not-exist',
              currentMoveNumber: 0,
              totalMoveNumber: 2,
            },
          })
        );

        expect(boardState.flat()).not.toContain(StoneColor.Black);
      });
    });
  });

  describe('renderBoardSvg', () => {
    describe('Success Cases', () => {
      it('should render a 620x620 svg root element', () => {
        const svg = renderBoardSvg(buildBoardState(createGameTree()));

        expect(svg).toContain('<svg');
        expect(svg).toContain('width="620"');
        expect(svg).toContain('height="620"');
        expect(svg).toContain('viewBox="0 0 620 620"');
        expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      });

      it('should render the wooden board background', () => {
        const svg = renderBoardSvg(buildBoardState(createGameTree()));

        expect(svg).toContain('fill="#DCB35C"');
      });

      it('should render 19 vertical and 19 horizontal grid lines', () => {
        const svg = renderBoardSvg(buildBoardState(createGameTree()));

        expect(svg.match(/<line /g)).toHaveLength(
          TEST_CONSTANTS.BOARD_SIZE * 2
        );
      });

      it('should render 9 star points', () => {
        const svg = renderBoardSvg(createEmptyBoardState());

        expect(svg.match(/<circle /g)).toHaveLength(9);
      });

      it('should render a black stone at the pointer path position', () => {
        const svg = renderBoardSvg(buildBoardState(createGameTree()));

        expect(svg).toContain(
          '<circle cx="130" cy="130" r="14" fill="black" />'
        );
      });

      it('should render a white stone with a black outline', () => {
        const svg = renderBoardSvg(buildBoardState(createGameTree()));

        expect(svg).toContain(
          '<circle cx="490" cy="490" r="14" fill="white" stroke="black" stroke-width="1" />'
        );
      });
    });
  });
});
