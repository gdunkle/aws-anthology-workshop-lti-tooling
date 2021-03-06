import * as AWS from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jose from 'jose';
import { LTIPlatform, LTIPlatformStorage } from './lti-platform';
import { APIGatewayProxyHttpHelper } from './lti-http-helper';
import { LTIState, LTIStateStorage } from './lti-state';
import { LTIJwtPayload } from './lti-jwt';

const db = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME || '';
const PARTITION_KEY = process.env.PARTITION_KEY || '';

const stateStorage: LTIStateStorage = {
  PartitionKey: PARTITION_KEY,
  TableName: TABLE_NAME,
  DDBClient: db
};

const platformStorage: LTIPlatformStorage = {
  PartitionKey: PARTITION_KEY,
  TableName: TABLE_NAME,
  DDBClient: db
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.info("EVENT\n" + JSON.stringify(event, null, 2));

  try {
    //Validate the request as per IMS standards: state and id_token
    //ref: https://www.imsglobal.org/spec/security/v1p0/#step-3-authentication-response
    //ref: https://www.imsglobal.org/spec/security/v1p0/#authentication-response-validation 

    //Retrieve the id_token, validate the signature, then validate the elements
    let id_token = APIGatewayProxyHttpHelper.ValueFromRequest(event, "id_token");
    let jwt_request = new LTIJwtPayload(id_token);
    //Load the config for this deployment to pull the public key set.
    let config = (await new LTIPlatform(platformStorage).load(jwt_request.aud, jwt_request.iss, jwt_request.deployment_id));

    //Inject this into the LTIJwtPayload class.
    const JWKS = jose.createRemoteJWKSet(new URL((config as LTIPlatform).key_set_url))

    const { payload, protectedHeader } = await jose.jwtVerify(jwt_request.token, JWKS, {
      issuer: jwt_request.iss,
      audience: jwt_request.aud
    })
    console.log(protectedHeader)
    console.log(payload)


    //State from Cookie
    let request_cookie_state = APIGatewayProxyHttpHelper.ValueFromCookies(event.headers, "state");
    let request_post_state = APIGatewayProxyHttpHelper.ValueFromRequest(event, "state");
    if (request_cookie_state !== request_post_state) {
      return {
        statusCode: 400,
        body: JSON.stringify("InvalidParameterException - State Mismatch")
      };
    }
    
    //pull state from cookie, compare it against known states
    let state = (await new LTIState(stateStorage).load(request_cookie_state));
    //TODO: pull from id_token
    let request_nonce = jwt_request.nonce;
    //Verify nonce hasn't been used again (replay protection)
    if (!await (state as LTIState).validate(request_nonce)) {
      return {
        statusCode: 400,
        body: JSON.stringify("InvalidParameterException - State Mismatch")
      };
    }

    ////LTI 1.3 elements
    //PlatformConfig lookup values
    let client_id = APIGatewayProxyHttpHelper.ValueFromRequest(event, "client_id");
    let lti_deployment_id = APIGatewayProxyHttpHelper.ValueFromRequest(event, "lti_deployment_id");
    let iss = APIGatewayProxyHttpHelper.ValueFromRequest(event, "iss");
    //LTI Message values
    let lti_message_hint = APIGatewayProxyHttpHelper.ValueFromRequest(event, "lti_message_hint");
    let login_hint = APIGatewayProxyHttpHelper.ValueFromRequest(event, "login_hint");
    let target_link_uri = APIGatewayProxyHttpHelper.ValueFromRequest(event, "target_link_uri");

    if (!client_id || !lti_deployment_id || !iss || !lti_message_hint || !login_hint || !target_link_uri) {
      return {
        statusCode: 400,
        body: JSON.stringify("InvalidParameterException")
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify("NotImplemented")
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify((error as Error).message) };
  }
};