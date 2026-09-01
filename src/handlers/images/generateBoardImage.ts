import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { saveBoardImage } from '@/services/goBoardImageService';
import { createErrorResponse, createSuccessResponse } from '@/utils';
import type { ISerializedMoveTree } from '@/types/gameTree';

export const generateBoardImageHandler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Missing request body');
    }

    let body: { gameTree?: ISerializedMoveTree; fileName?: string };
    try {
      body = JSON.parse(event.body);
    } catch {
      return createErrorResponse(400, 'Invalid JSON format');
    }

    const { gameTree, fileName } = body;

    if (!gameTree || typeof gameTree !== 'object') {
      return createErrorResponse(400, 'Missing or invalid gameTree');
    }

    const savedImage = await saveBoardImage(
      gameTree,
      fileName ?? `board-${Date.now()}`
    );

    return createSuccessResponse(201, savedImage);
  } catch (error) {
    console.error('Error in generateBoardImageHandler:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
