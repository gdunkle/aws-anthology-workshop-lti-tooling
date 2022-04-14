import * as AWS from 'aws-sdk';
import { GetItemOutput, PutItemInput, PutItemOutput } from 'aws-sdk/clients/dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';
import { GetParameterResult } from 'aws-sdk/clients/ssm';
import { AWSError } from 'aws-sdk';
import { PlatformConfig } from "./lti-definitions";

const db = new AWS.DynamoDB.DocumentClient();
const ssm = new AWS.SSM();

const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const STATE_TTL = process.env.STATE_TTL || '';
let API_URL = process.env.API_URL || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.info("EVENT\n" + JSON.stringify(event, null, 2));

  let client_id = event?.queryStringParameters?.client_id;
  let lti_deployment_id = event?.queryStringParameters?.lti_deployment_id;
  let iss = event?.queryStringParameters?.iss;
  let lti_message_hint = event?.queryStringParameters?.lti_message_hint;
  let login_hint = event?.queryStringParameters?.login_hint;
  let target_link_uri = event?.queryStringParameters?.target_link_uri;

  //As per LTI1.3, validate required paramaters
  if(!client_id || !iss || !lti_message_hint ||!login_hint || !target_link_uri){
    return { 
      statusCode: 400, 
      body: JSON.stringify("InvalidParameterException")
    };
  }

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
  
  try {
    let config = (await getPlatformConfig(client_id, iss, lti_deployment_id) as unknown as PlatformConfig);
    let state = (await generateStatePersisted());
    let nonce = uuidv4();
    API_URL = (await ssm.getParameter({ Name: '/anthology/workshop/lti-tooling/api/url' }).promise()).Parameter?.Value ?? ''

    //concatinate OIDC URL for redirect.
    let redirect_url: string = config.auth_login_url +
        '?response_type=id_token' +
        '&scope=openid' +
        '&login_hint=' + login_hint +
        '&lti_message_hint=' + lti_message_hint +
        '&state=' + state +
        '&redirect_uri=' + encodeURIComponent(API_URL) + "lti13"
        '&client_id=' + client_id +
        '&nonce=' + nonce;

    return { 
      statusCode: 302, 
      body: JSON.stringify("Return from OIDC Lambda"),
      multiValueHeaders: {
        "Set-Cookie": [`state=${state}`]
      },
      headers: {
        "Location": redirect_url
      },
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify(error) };
  }
};

async function getPlatformConfig(client_id: string, iss: string, lti_deployment_id?: string): Promise<PlatformConfig | void> {
  const configParams = {
    TableName: TABLE_NAME,
    Key: {
      [PRIMARY_KEY]: `CONFIG#${client_id}#${iss}#${lti_deployment_id}`,
    }
  };
  
  try {
    const response:GetItemOutput = await db.get(configParams).promise();
    if (response.Item) {
      let config: PlatformConfig = JSON.parse(JSON.stringify(response.Item));
      return config;
    } else {
      console.log(`Error locating Platform Configuration for ${client_id}#${iss}#${lti_deployment_id}.`);
      throw new Error(`Error locating Platform Configuration for ${client_id}#${iss}#${lti_deployment_id}.`);
    }
  } catch (error) {
    console.log(`Error retrieving Platform Configuration for ${client_id}#${iss}#${lti_deployment_id}. ${JSON.stringify(error)}`);
    throw new Error(`Error retrieving Platform Configuration for ${client_id}#${iss}#${lti_deployment_id}. ${JSON.stringify(error)}`);
  }
}

async function generateStatePersisted(): Promise<string | void> {
  let state = uuidv4();
  let STATE_ITEM_TTL = (Math.floor(+new Date() / 1000) + +STATE_TTL);
  const stateParams = {
    TableName: TABLE_NAME,
    Item: {
      [PRIMARY_KEY]: `STATE#${state}`,
      ttl: STATE_ITEM_TTL  //this will auto expire the state in DDB
    }
  };
  
  try {
    const response:PutItemOutput = await db.put(stateParams).promise();
    return state;
  } catch (error) {
    throw new Error("Error persisting state. " + JSON.stringify(error));
  }
}