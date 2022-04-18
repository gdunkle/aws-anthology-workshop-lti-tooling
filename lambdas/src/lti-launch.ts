import * as AWS from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult } from "aws-lambda";
import { JwtRsaVerifier } from 'aws-jwt-verify';
import { LTIPlatform, LTIPlatformConfig, LTIPlatformStorage } from './lti-platform';
import { APIGatewayProxyHttpHelper } from './lti-http-helper';
import { LTIState, LTIStateStorage } from './lti-state';

const db = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

const stateStorage: LTIStateStorage = {
  PrimaryKey: PRIMARY_KEY,
  TableName: TABLE_NAME,
  DDBClient: db
};

const platformStorage: LTIPlatformStorage = {
  PrimaryKey: PRIMARY_KEY,
  TableName: TABLE_NAME,
  DDBClient: db
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.info("EVENT\n" + JSON.stringify(event, null, 2));

  ////LTI 1.3 elements
  //PlatformConfig lookup values
  let client_id = APIGatewayProxyHttpHelper.ValueFromRequest(event, "client_id");
  let lti_deployment_id = APIGatewayProxyHttpHelper.ValueFromRequest(event, "lti_deployment_id");
  let iss = APIGatewayProxyHttpHelper.ValueFromRequest(event, "iss");
  //LTI Message values
  let lti_message_hint = APIGatewayProxyHttpHelper.ValueFromRequest(event, "lti_message_hint");
  let login_hint = APIGatewayProxyHttpHelper.ValueFromRequest(event, "login_hint");
  let target_link_uri = APIGatewayProxyHttpHelper.ValueFromRequest(event, "target_link_uri");
  let request_state = APIGatewayProxyHttpHelper.ValueFromCookies(event.headers, "state");

  if (!client_id || !lti_deployment_id || !iss || !lti_message_hint || !login_hint || !target_link_uri || !request_state) {
    return {
      statusCode: 400,
      body: JSON.stringify("InvalidParameterException")
    };
  }

  try {
    
    //Validate the request as per IMS standards: state and id_token
    //ref: https://www.imsglobal.org/spec/security/v1p0/#step-3-authentication-response
    //ref: https://www.imsglobal.org/spec/security/v1p0/#authentication-response-validation 

    //pull state from cookie, compare it against known states
    let state: LTIState = new LTIState(stateStorage, request_state)
    if (!await state.validate()){
      return { 
        statusCode: 400, 
        body: JSON.stringify("InvalidParameterException - State Mismatch")
      };
    }

    //id_token
    //TODO: Verify nonce hasn't been used again (replay protection)

    let platform = new LTIPlatform(platformStorage);
    let config = (await platform.load(client_id, iss, lti_deployment_id) as unknown as LTIPlatformConfig);
    



  } catch (error) {
    return { statusCode: 500, body: JSON.stringify(error) };
  }

  


  

  

  const verifier = JwtRsaVerifier.create({
    issuer: "https://example.com/", // set this to the expected "iss" claim on your JWTs
    audience: "<audience>", // set this to the expected "aud" claim on your JWTs
    jwksUri: "https://example.com/.well-known/jwks.json", // set this to the JWKS uri from your OpenID configuration
  });
  
  try {
    const payload = await verifier.verify("eyJraWQeyJhdF9oYXNoIjoidk...");
    console.log("Token is valid. Payload:", payload);
  } catch {
    console.log("Token not valid!");
  }

  return { statusCode: 200, body: JSON.stringify("Return from LTI Launch Lambda") };

};