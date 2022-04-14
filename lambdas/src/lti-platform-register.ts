import * as AWS from 'aws-sdk';
import { PutItemOutput } from 'aws-sdk/clients/dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { PlatformConfig } from "./lti-definitions";

const db = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.info("EVENT\n" + JSON.stringify(event, null, 2));

  const config: PlatformConfig = {
    [PRIMARY_KEY]: "",
    auth_token_url: event?.queryStringParameters?.auth_token_url ?? "",
    auth_login_url: event?.queryStringParameters?.auth_login_url ?? "",
    client_id: event?.queryStringParameters?.client_id ?? "",
    lti_deployment_id: event?.queryStringParameters?.lti_deployment_id ?? "",
    iss: event?.queryStringParameters?.iss ?? "",
    key_set_url:  event?.queryStringParameters?.key_set_url ?? ""
  };

  if(!config.auth_token_url || !config.auth_login_url || !config.client_id ||!config.lti_deployment_id || !config.iss || !config.key_set_url){
    return { 
      statusCode: 400, 
      body: JSON.stringify("InvalidParameterException")
    };
  }
  
  try {

    //Set the primary key
    config.PK = `CONFIG#${config.client_id}#${config.iss}#${config.lti_deployment_id}`;

    const configParams = {
      TableName: TABLE_NAME,
      Item: config
    };

    const response:PutItemOutput = await db.put(configParams).promise();

    return { 
      statusCode: 200, 
      body: JSON.stringify("Configuration Accepted"),
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify(error) };
  }
};

