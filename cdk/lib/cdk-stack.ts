import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from 'constructs';
import { Distribution, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import * as path from "path";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LTIToolCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const lambda = new NodejsFunction(this, "lti-lambda", {
      memorySize: 256,
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_14_X,
      handler: "handler",
      entry: path.join(__dirname, '/../../lambda/src/index.ts'),
      logRetention: RetentionDays.ONE_MONTH
    });
    new LambdaRestApi(this, "lti-api", {
      handler: lambda,
      proxy: true
    })

    const clientBucket = new Bucket(this, 'clientBucket', {
      accessControl: BucketAccessControl.PRIVATE,
    })

    new BucketDeployment(this, 'BucketDeployment', {
      destinationBucket: clientBucket,
      sources: [Source.asset(path.resolve(__dirname, './../../client/build'))]
    })

    const originAccessIdentity = new OriginAccessIdentity(this, 'OriginAccessIdentity');
    clientBucket.grantRead(originAccessIdentity);

    new Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new S3Origin(clientBucket, {originAccessIdentity}),
      },
    })
  }
}
