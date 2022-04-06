import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { Distribution, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import * as path from "path";

export class LTIToolCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lambdaOIDC = new NodejsFunction(this, "lti-oidc", {
      memorySize: 256,
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_14_X,
      handler: "handler",
      entry: path.join(__dirname, "/../../lambdas/src/lti-oidc.ts"),
      logRetention: RetentionDays.ONE_MONTH
    });

    const lambdaLTILaunch = new NodejsFunction(this, "lti-launch", {
      memorySize: 256,
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_14_X,
      handler: "handler",
      entry: path.join(__dirname, "/../../lambdas/src/lti-launch.ts"),
      logRetention: RetentionDays.ONE_MONTH
    });

    const apiLTI = new LambdaRestApi(this, "lti-api", {
      handler: lambdaLTILaunch,
      proxy: false
    });

    apiLTI.root.addCorsPreflight({
      allowOrigins: [ "*" ],
      allowMethods: [ "GET", "PUT" ]
    });

    apiLTI.root.addResource("oidc")
      .addMethod("POST", new LambdaIntegration(lambdaOIDC));
    
    apiLTI.root.addResource("lti13")
      .addMethod("POST", new LambdaIntegration(lambdaLTILaunch));



    const clientBucket = new Bucket(this, "clientBucket", {
      accessControl: BucketAccessControl.PRIVATE,
    })

    new BucketDeployment(this, "BucketDeployment", {
      destinationBucket: clientBucket,
      sources: [Source.asset(path.resolve(__dirname, "./../../client/build"))]
    })

    const originAccessIdentity = new OriginAccessIdentity(this, "OriginAccessIdentity");
    clientBucket.grantRead(originAccessIdentity);

    new Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: new S3Origin(clientBucket, {originAccessIdentity}),
      },
    })
  }
}
