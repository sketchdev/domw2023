import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from 'path';

export class DomwIacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DEVOPS MIDWEST 2023
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const stack = this;

    ////////////////////////////////////////////
    // Add our app docker image to ECR
    ////////////////////////////////////////////
    const appImage = new DockerImageAsset(stack, 'MyAppImage', {
      directory: path.join(__dirname, '../../domw-app'),
    });

    ////////////////////////////////////////////
    // Set up AWS App Runner
    ////////////////////////////////////////////
    // Create an AWS App Runner from our image
    const appRunnerRole = createAppRunnerRole(stack);
    const appRunnerService = new apprunner.CfnService(
      stack,
      `${stack.stackName}-apprunner-service`,
      {
        serviceName: `${stack.stackName}App`,
        sourceConfiguration: {
          authenticationConfiguration: {
            accessRoleArn: appRunnerRole.roleArn,
          },
          imageRepository: {
            imageIdentifier: appImage.imageUri,
            imageRepositoryType: "ECR",
            imageConfiguration: {
              port: "3000",
            },
          },
        },
        instanceConfiguration: {
          cpu: "1024",
          memory: "2048",
        },
        healthCheckConfiguration: {
          path: "/status",
        },
      }
    );
    new cdk.CfnOutput(stack, "AppRunnerServiceUrl", {
      value: appRunnerService.attrServiceUrl,
      exportName: "serviceUrl",
    });


    ////////////////////////////////////////////
    // Set up VPC for ECS Cluster
    ////////////////////////////////////////////
    const vpc = createVPC(stack, 'Domw2023VPC', { cidr: '10.230.0.0/16' });

    ////////////////////////////////////////////
    // Set up ECS: Fargate, Cluster, Service
    ////////////////////////////////////////////
    // Create a batch cluster for running our ECS Tasks
    const batchCluster = new ecs.Cluster(stack, "BatchCluster", { vpc });

    const fargateTaskDefinition = new ecs.FargateTaskDefinition(stack, 'BatchTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });
    const batchContainer = fargateTaskDefinition.addContainer("BatchContainer", {
      image: ecs.ContainerImage.fromAsset("../domw-batch"),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'EcsDomwBatch',
        logRetention: RetentionDays.THREE_MONTHS,
      }),
    });

    const batchRunLambdaFunction = new lambda.Function(stack, 'batch-run-lambda', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      memorySize: 512, // MB
      timeout: cdk.Duration.minutes(5), // max of 15m
      code: lambda.Code.fromAsset(path.join(__dirname, '../../domw-lambda')),
    });
    const batchRunLambdaURL = batchRunLambdaFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    new cdk.CfnOutput(stack, 'batchRunLambdaName', { value: batchRunLambdaFunction.functionName });
    new cdk.CfnOutput(stack, 'batchRunLambdaURL', { value: batchRunLambdaURL.url });
    fargateTaskDefinition.grantRun(batchRunLambdaFunction);

    const ecsBatchRunTaskConfig = {
      cluster: batchCluster.clusterArn,
      subnets: vpc.privateSubnets.map(({ subnetId }) => subnetId),
      taskDefinition: fargateTaskDefinition.taskDefinitionArn,
      containerName: batchContainer.containerName
    };
    const ecsBatchRunTaskConfigSSMParam = new ssm.StringParameter(stack, 'Domw2023BatchRunConfig', {
      parameterName: 'Domw2023BatchRunConfig',
      stringValue: JSON.stringify(ecsBatchRunTaskConfig, null, 2),
    });
    ecsBatchRunTaskConfigSSMParam.grantRead(batchRunLambdaFunction);


    ////////////////////////////////////////////
    // Set up ECS: Fargate, Cluster, Service
    ////////////////////////////////////////////
    // Create a load-balanced Fargate service and make it public
    const serviceCluster = new ecs.Cluster(stack, "ServiceCluster", { vpc });
    const loadBalancedFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(stack, "MyFargateService", {
      cluster: serviceCluster, // Required
      cpu: 512, // Default is 256
      desiredCount: 1, // Default is 1
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset("../domw-app", {}),
        containerPort: 3000,
        enableLogging: true,
        logDriver: ecs.LogDriver.awsLogs({
          streamPrefix: 'EcsDomwApp',
          logRetention: RetentionDays.THREE_MONTHS,
        }),
      },
      memoryLimitMiB: 2048, // Default is 512
      publicLoadBalancer: true // Default is true
    });
    const scalableTarget = loadBalancedFargateService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 5,
    });
    scalableTarget.scaleOnRequestCount(id, {
      requestsPerTarget: 10000, // requests/server/minute
      targetGroup: loadBalancedFargateService.targetGroup,
      scaleInCooldown: cdk.Duration.seconds(0),
      scaleOutCooldown: cdk.Duration.seconds(0)
    });
    // scalableTarget.scaleOnCpuUtilization('CpuScaling', { // alternate scaling based on avg cpu
    //   targetUtilizationPercent: 80, // set this to CPU percentage to scale up at
    // });

    // Tag all resources created by this IaC
    cdk.Tags.of(stack).add('CreatedBy', 'Me');
    cdk.Tags.of(stack).add('Application', 'DevOps Midwest 2023');
    cdk.Tags.of(stack).add('Purpose', 'Tutorial');

  }
}

function createVPC(stack: cdk.Stack, vpcName: string, { cidr }: { cidr: string }) {
  return new ec2.Vpc(stack, vpcName, {
    ipAddresses: ec2.IpAddresses.cidr(cidr),
    maxAzs: 2, // Default is all AZs in region
    natGateways: 1,
    natGatewayProvider: ec2.NatProvider.instance({
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3A, ec2.InstanceSize.NANO)
    }),
    subnetConfiguration: [
      {
        name: 'public',
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: 24,
      },
      {
        name: 'private',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        cidrMask: 24,
      },
    ]
  });
}

function createAppRunnerRole(stack: cdk.Stack) {
  return new iam.Role(
    stack,
    `${stack.stackName}-apprunner-role`,
    {
      assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
      description: `${stack.stackName}-apprunner-role`,
      inlinePolicies: {
        "apprunner-policy": new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["ecr:GetAuthorizationToken"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:GetRepositoryPolicy",
                "ecr:DescribeRepositories",
                "ecr:ListImages",
                "ecr:DescribeImages",
                "ecr:BatchGetImage",
                "ecr:GetLifecyclePolicy",
                "ecr:GetLifecyclePolicyPreview",
                "ecr:ListTagsForResource",
                "ecr:DescribeImageScanFindings",
              ],
              resources: [
                "arn:aws:ecr:" +
                stack.region +
                ":" +
                stack.account +
                ":repository/*",
              ],
            }),
          ],
        }),
      },
    }
  );
}
