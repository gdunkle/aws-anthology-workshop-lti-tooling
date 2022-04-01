import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LTIToolCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const lambda = new NodejsFunction(this, "lti-lambda", {
      memorySize: 256,
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_14_X,
      handler: "handler",
      entry: path.join(__dirname, `/../../lambda/src/index.ts`),
      logRetention: RetentionDays.ONE_MONTH
    });
    new LambdaRestApi(this, "lti-api", {
      handler: lambda,
      proxy: true
    })
    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
