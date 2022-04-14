import { IRole, Policy, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { Distribution, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Table, AttributeType, StreamViewType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { ParameterType, StringParameter } from "aws-cdk-lib/aws-ssm";
import * as path from "path";


export class LTIToolCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    //#region LTI Ingress 
    const dynamoTable = new Table(this, 'LTITable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",

      // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
      // the new table, and it will remain in your account until manually deleted. By setting the policy to
      // DESTROY, cdk destroy will delete the table (even if it has data in it)
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const lambdaOIDC = new NodejsFunction(this, "lti-oidc", {
      memorySize: 256,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_14_X,

      handler: "handler",
      entry: path.join(__dirname, "/../../lambdas/src/lti-oidc.ts"),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        PRIMARY_KEY: 'PK',
        TABLE_NAME: dynamoTable.tableName,
        STATE_TTL: Duration.hours(2).toSeconds().toString(), // Auto expire STATE records after two hours
      },
    });

    const lambdaLTILaunch = new NodejsFunction(this, "lti-launch", {
      memorySize: 256,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_14_X,
      handler: "handler",
      entry: path.join(__dirname, "/../../lambdas/src/lti-launch.ts"),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        PRIMARY_KEY: 'PK',
        TABLE_NAME: dynamoTable.tableName,
      },
    });

    const lambdaPlatformRegister = new NodejsFunction(this, "lti-platform-register", {
      memorySize: 256,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_14_X,
      handler: "handler",
      entry: path.join(__dirname, "/../../lambdas/src/lti-platform-register.ts"),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        PRIMARY_KEY: 'PK',
        TABLE_NAME: dynamoTable.tableName,
      },
    });

    const apiLTI = new LambdaRestApi(this, "lti-api", {
      handler: lambdaLTILaunch,
      proxy: false
    });

    apiLTI.root.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["GET", "PUT"]
    });

    apiLTI.root.addResource("login")
      .addMethod("POST", new LambdaIntegration(lambdaOIDC));

    apiLTI.root.addResource("lti13")
      .addMethod("POST", new LambdaIntegration(lambdaLTILaunch));
    
    apiLTI.root.addResource("platform")
      .addMethod("POST", new LambdaIntegration(lambdaPlatformRegister));

    const paramAPIURL = new StringParameter(this, "lti_tooling_api_url", {
      type: ParameterType.STRING,
      parameterName: "/anthology/workshop/lti-tooling/api/url",
      stringValue: apiLTI.url
    });

    //permissions
    dynamoTable.grantReadWriteData(lambdaOIDC);
    dynamoTable.grantWriteData(lambdaPlatformRegister);
    //Causes Circular Dependency, manually construct an inline policy and attach it to the execution role.
    //paramAPIURL.grantRead(lambdaOIDC);

    const policy = new Policy(this, "lti_tool_lambda_read_ssm", {
      policyName: "lti_tool_lambda_read_ssm",
      statements: [
        new PolicyStatement({
          actions: ['ssm:GetParameter'],
          resources: [ paramAPIURL.parameterArn ]
        })
      ]
    });
    
    policy.attachToRole(<IRole>lambdaOIDC.role);
    //#endregion


    //TODO: configure S3 and CF permissions
    //ref: https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/static-site/static-site.ts#L57
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
        origin: new S3Origin(clientBucket, { originAccessIdentity }),
      },
    })
  }
}
