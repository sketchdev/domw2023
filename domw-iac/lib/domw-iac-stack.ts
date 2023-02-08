import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { Tags } from 'aws-cdk-lib';
import { Cluster, ContainerImage, LogDriver } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import path = require('path');

export class DomwIacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // define the name of this service (probably ought to be in context file or props input)
    const serviceName = 'ecs-test';

    ///////////////////////////////////////
    //
    // Set up ECS
    //   - Fargate, Cluster, Service
    //
    ///////////////////////////////////////
    // Lookup the VPC that the ECS cluster will be deployed into
    //   (the VPC Id should be defined in cdk[.ENVIRONMENT].json as "vpcId-REGION" (i.e., "vpcId-us-east-1"))
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {vpcId: this.node.tryGetContext(`vpcId-${this.region}`)});
    const clusterSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    });

    // Lookup the Route53 Hosted Zone for use later in SSL cert creation and service registry
    const domainName = this.node.tryGetContext('hosted-zone-name');
    const hostedZone = HostedZone.fromLookup(this, 'service-hosted-zone', {
      domainName,
    });
    
    // Create the ECS Cluster (easy-peasy)
    const cluster = new Cluster(this, 'ecs-cluster', { vpc });

    // Create the ECS service running on Fargate in the new cluster
    // (https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedFargateService.html)
    new ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      memoryLimitMiB: 512,
      desiredCount: 1,
      cpu: 256,
      serviceName,
      targetProtocol: elbv2.ApplicationProtocol.HTTP,
      taskImageOptions: {
        image: ContainerImage.fromAsset(path.join(__dirname, '..', '..', 'domw-app')),
        containerPort: 3000,
        enableLogging: true,
        logDriver: LogDriver.awsLogs({
          streamPrefix: serviceName,
          logRetention: RetentionDays.THREE_MONTHS,
        }),
        // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedTaskImageOptions.html
        // environment: ,
        // secrets: ,
        // taskRole: ,
      },
      taskSubnets: {
        subnets: clusterSubnets.subnets,
      },
      loadBalancerName: `${id}-domw-ecs-alb`,
      publicLoadBalancer: true,
      domainName: `${serviceName}.${domainName}`,
      domainZone: hostedZone,
      // certificate: , (*** created automatically if domainName & domainZone & https protocol are specified =D ***)
      protocol: elbv2.ApplicationProtocol.HTTPS,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      sslPolicy: elbv2.SslPolicy.FORWARD_SECRECY_TLS12_RES_GCM,
      redirectHTTP: true,
      //
      //// extras for fun:
      // securityGroups: ,
      // cloudMapOptions: (service discovery),
      // deploymentController: (blue-green enabled via CODE_DEPLOY),
    });

    // Tag all resources created by this "template"
    Tags.of(this).add('CreatedBy', 'Me');
    Tags.of(this).add('Application', 'DevOps Midwest 2023');
    Tags.of(this).add('Purpose', 'Tutorial');
  }
}
