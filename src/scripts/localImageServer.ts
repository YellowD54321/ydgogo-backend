/**
 * 本機圖片生成測試伺服器。
 *
 * SAM local 在 Docker 容器內執行 handler，寫出的檔案不會落在專案目錄，
 * 因此本機驗證改用原生 http server 直接呼叫同一支 handler。
 *
 * 啟動：npm run dev:image
 */
import { createServer } from 'http';
import type { IncomingMessage } from 'http';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { generateBoardImageHandler } from '@/handlers/images/generateBoardImage';
import { getImageOutputDir } from '@/services/goBoardImageService';

const PORT = Number(process.env['IMAGE_SERVER_PORT'] ?? 3100);
const ROUTE = '/images/board';

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
};

const server = createServer((req, res) => {
  void (async () => {
    if (req.method !== 'POST' || req.url !== ROUTE) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Try POST ${ROUTE}` }));
      return;
    }

    const body = await readBody(req);
    const event = { body, headers: {} } as APIGatewayProxyEvent;
    const result = await generateBoardImageHandler(event, {} as Context);

    res.writeHead(result.statusCode, result.headers as Record<string, string>);
    res.end(result.body);

    console.log(`[${result.statusCode}] POST ${ROUTE} -> ${result.body}`);
  })();
});

server.listen(PORT, () => {
  console.log(`Go board image server listening on http://localhost:${PORT}`);
  console.log(`  POST ${ROUTE}   body: { "gameTree": {...}, "fileName": "..." }`);
  console.log(`  Output dir: ${getImageOutputDir()}`);
});
