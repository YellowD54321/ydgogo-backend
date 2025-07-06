import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

export const googleLoginHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('**console.log** Hi there! See you on CloudWatch!');
  console.info('**console.info** Hi there! See you on CloudWatch!');

  const queryString = event.queryStringParameters;
  console.log('queryString', queryString);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello, wooooooooooorld!' }),
  };
};
