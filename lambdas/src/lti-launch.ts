import * as AWS from 'aws-sdk';
import { APIGatewayProxyResult } from "aws-lambda";

const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (): Promise<APIGatewayProxyResult> => {

  return { statusCode: 200, body: JSON.stringify("Return from LTI Launch Lambda") };

//   return {
//     statusCode: process.env.HTTP_RESPONSE,
//     headers: {
//         "Location": process.env.NEW_DOMAIN + requestUri
//     },
//     body: null
//   }


//   const requestedItemId = event.pathParameters.id;
//   if (!requestedItemId) {
//     return { statusCode: 400, body: `Error: You are missing the path parameter id` };
//   }

//   const params = {
//     TableName: TABLE_NAME,
//     Key: {
//       [PRIMARY_KEY]: requestedItemId
//     }
//   };

//   try {
//     const response = await db.get(params).promise();
//     if (response.Item) {
//       return { statusCode: 200, body: JSON.stringify(response.Item) };
//     } else {
//       return { statusCode: 404 };
//     }
//   } catch (dbError) {
//     return { statusCode: 500, body: JSON.stringify(dbError) };
//   }
};