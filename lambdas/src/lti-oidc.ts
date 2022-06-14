import * as AWS from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AWSError } from 'aws-sdk';
import { LTIPlatform, LTIPlatformConfig, LTIPlatformStorage } from "./lti-platform";
import { LTIState, LTIStateStorage } from "./lti-state";
import { APIGatewayProxyHttpHelper } from './lti-http-helper';

const db = new AWS.DynamoDB.DocumentClient();
const ssm = new AWS.SSM();

const TABLE_NAME = process.env.TABLE_NAME || '';
const PARTITION_KEY = process.env.PARTITION_KEY || '';
const STATE_TTL = process.env.STATE_TTL || '';
let API_URL = process.env.API_URL || '';

const stateStorage: LTIStateStorage = {
  PartitionKey: PARTITION_KEY,
  TableName: TABLE_NAME,
  TTL: +STATE_TTL,
  DDBClient: db
};
const platformStorage: LTIPlatformStorage = {
  PartitionKey: PARTITION_KEY,
  TableName: TABLE_NAME,
  DDBClient: db
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.info("EVENT\n" + JSON.stringify(event, null, 2));
  
  let client_id = APIGatewayProxyHttpHelper.ValueFromRequest(event, "client_id");
  let lti_deployment_id = APIGatewayProxyHttpHelper.ValueFromRequest(event, "lti_deployment_id");
  let iss = APIGatewayProxyHttpHelper.ValueFromRequest(event, "iss");
  let lti_message_hint = APIGatewayProxyHttpHelper.ValueFromRequest(event, "lti_message_hint");
  let login_hint = APIGatewayProxyHttpHelper.ValueFromRequest(event, "login_hint");
  let target_link_uri = APIGatewayProxyHttpHelper.ValueFromRequest(event, "target_link_uri");

  //As per LTI1.3, validate required paramaters
  if(!client_id || !iss || !lti_message_hint ||!login_hint || !target_link_uri){
    console.log(`client_id=${client_id},lti_message_hint=${lti_message_hint},iss=${iss},login_hint=${login_hint},target_link_uri=${target_link_uri}`)

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
    //Load the platform configuration
    let config = (await new LTIPlatform(platformStorage).load(client_id, iss, lti_deployment_id));

    //Initialize a new state for this request, and persist it to storage
    let state = (await new LTIState(stateStorage).save());

    API_URL = (await ssm.getParameter({ Name: '/anthology/workshop/lti-tooling/api/url' }).promise()).Parameter?.Value ?? ''

    //concatinate OIDC URL for redirect.
    let redirect_url: string = config?.auth_login_url +
        '?response_type=id_token' +
        '&scope=openid' +
        '&login_hint=' + login_hint +
        '&lti_message_hint=' + lti_message_hint +
        '&state=' + state?.id +
        '&redirect_uri=' + encodeURIComponent(API_URL) + 'lti13' +
        '&client_id=' + client_id +
        '&nonce=' + state?.nonce;

    return { 
      statusCode: 302, 
      body: JSON.stringify("Return from OIDC Lambda"),
      multiValueHeaders: {
        "Set-Cookie": [`state=${state?.id}; SameSite=None; Secure; HttpOnly`]
      },
      headers: {
        "Location": redirect_url
      },
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify((error as Error).message) };
  }
};