import { googleLoginHandler } from '../googleLogin';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('Test googleLoginHandler', () => {
  it('should return a 200 status code', async () => {
    const event = {
      httpMethod: 'GET',
      body: null,
      headers: {},
      multiValueHeaders: {},
      isBase64Encoded: false,
      path: '/',
      pathParameters: null,
      queryStringParameters: null,
      requestContext: {} as any,
      resource: '',
      stageVariables: null,
    } as APIGatewayProxyEvent;

    const context = {} as Context;

    const result = await googleLoginHandler(event, context);

    const expectedResult = {
      statusCode: 200,
      body: JSON.stringify({ message: 'Hello, wooooooooooorld!' }),
    };

    expect(result).toEqual(expectedResult);
  });
});
