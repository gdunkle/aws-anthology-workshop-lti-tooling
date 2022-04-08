import * as AWS from 'aws-sdk';
import { PutItemInput, PutItemOutput } from 'aws-sdk/clients/dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';


const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const STATE_TTL = process.env.STATE_TTL || '';

const db = new AWS.DynamoDB.DocumentClient();


export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.info("EVENT\n" + JSON.stringify(event, null, 2));

  //const appInfo = applicationInfo(req.query.client_id);
  //****AppConfig Data Elements ****
  //client ID (application ID in the dev portal)
  //key (REST key)
  //secret (REST secret)
  //LTI OAuth 2 token URL
  //JWKS URL
  //OIDC Auth response URL
  //Issuer (always https://blackboard.com)
  //Deployment ID
  
  let state = uuidv4();
  //let nonce = uuidv4();
  
  const STATE_ITEM_TTL = (Math.floor(+new Date() / 1000) + STATE_TTL).toString() 

  const params = {
    TableName: TABLE_NAME,
    Item: {
      [PRIMARY_KEY]: "STATE-" + uuidv4(),
      ttl: STATE_ITEM_TTL
    }
  };
  
  try {
    const response:PutItemOutput = await db.put(params).promise();

    return { 
      statusCode: 200, 
      body: JSON.stringify("Return from OIDC Lambda"),
      multiValueHeaders: {
        "Set-Cookie": [`state=${state}`]
      }
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify(error) };
  }




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