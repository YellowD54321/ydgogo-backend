export enum StoneColor {
  Empty = 'empty',
  Black = 'black',
  White = 'white',
}

export interface Point {
  x: number;
  y: number;
}

export interface Group {
  stones: Point[];
  liberties: Point[];
  color: StoneColor;
}

export interface ISerializedMoveNode {
  id: string;
  x: number;
  y: number;
  color: StoneColor;
  currentMoveNumber: number;
  capturedGroups: Group[];
  parentId: string | null;
  childrenIds: string[];
}

export interface ISerializedMoveTree {
  nodes: Record<string, ISerializedMoveNode>;
  rootNodeId: string;
  pointer: {
    currentNodeId: string;
    currentMoveNumber: number;
    totalMoveNumber: number;
  };
}
