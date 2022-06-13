import * as AWS from 'aws-sdk';
import { PutItemOutput } from 'aws-sdk/clients/dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LTIPlatform, LTIPlatformConfig, LTIPlatformStorage } from "./lti-platform";
import { APIGatewayProxyHttpHelper } from "./lti-http-helper";

const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const PARTITION_KEY = process.env.PARTITION_KEY || '';

const platformStorage: LTIPlatformStorage = {
  PartitionKey: PARTITION_KEY,
  TableName: TABLE_NAME,
  DDBClient: db
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.info("EVENT\n" + JSON.stringify(event, null, 2));

  let config: LTIPlatformConfig = {
    PK: "",
    auth_token_url: APIGatewayProxyHttpHelper.ValueFromRequest(event, "auth_token_url"),
    auth_login_url: APIGatewayProxyHttpHelper.ValueFromRequest(event, "auth_login_url"),
    client_id: APIGatewayProxyHttpHelper.ValueFromRequest(event, "client_id"),
    lti_deployment_id: APIGatewayProxyHttpHelper.ValueFromRequest(event, "lti_deployment_id"),
    iss: APIGatewayProxyHttpHelper.ValueFromRequest(event, "iss"),
    key_set_url: APIGatewayProxyHttpHelper.ValueFromRequest(event, "key_set_url"),
  };

  if (!config.auth_token_url || !config.auth_login_url || !config.client_id || !config.lti_deployment_id || !config.iss || !config.key_set_url) {
    return {
      statusCode: 400,
      body: JSON.stringify("InvalidParameterException")
    };
  }

  try {

    //Instantiate a new platform instance with the required input pararms and persist to storage
    let platform = await new LTIPlatform(platformStorage, config).save();

    //Return a JSON representation of the Configuration
    return {
      statusCode: 200,
      body: JSON.stringify(config),
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify((error as Error).message) };
  }
};

