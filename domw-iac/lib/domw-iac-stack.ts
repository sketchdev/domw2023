import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { Tags } from 'aws-cdk-lib';
import { Cluster, ContainerImage, LogDriver } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import path = require('path');

export class DomwIacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DEVOPS MIDWEST 2023
    //
    // PARTICIPANT TODO:
    //   The following two variables ought to be altered by you before running this IaC stack.
    //
    //   - serviceName:     This should be changed to something more meaningful and unique to you / your application
    //   - useDefaultVpc:   If your AWS account has a default VPC (if you don't know what that means, leave it set to `false`)
    //                      change this to `true` to reduce costs associated with this stack. If you are unsure or would
    //                      prefer more assurance that things will deploy correctly and in a more secure manner, leave it
    //                      set as `false`.
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const serviceName = 'ecs-test';
    const useDefaultVpc = false;


    ////////////////////////////////////////////
    // Set up VPC for ECS Cluster
    ////////////////////////////////////////////
    let vpc;
    if (useDefaultVpc) {
      vpc = ec2.Vpc.fromLookup(this, 'default-vpc', {
        isDefault: true
      });
    } else {
      vpc = new ec2.Vpc(this, 'vpc', {
        ipAddresses: ec2.IpAddresses.cidr('10.210.0.0/24'),
        maxAzs: 2,
        natGateways: 1,
        vpcName: serviceName.toLowerCase(),
        natGatewayProvider: ec2.NatProvider.instance({
          instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3A, ec2.InstanceSize.NANO)
        }),
      });  
    }
    const clusterSubnets = vpc.selectSubnets({
      subnetType: useDefaultVpc ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_WITH_EGRESS,
    });
    
    ////////////////////////////////////////////
    // Set up ECS: Fargate, Cluster, Service
    ////////////////////////////////////////////
    // Create the ECS Cluster (easy-peasy)
    const cluster = new Cluster(this, 'ecs-cluster', { vpc });

    // Create the ECS service running on Fargate in the new cluster
    // (https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedFargateService.html)
    new ApplicationLoadBalancedFargateService(this, 'alb-fargate-service', {
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
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
    });

    // Tag all resources created by this IaC
    Tags.of(this).add('CreatedBy', 'Me');
    Tags.of(this).add('Application', 'DevOps Midwest 2023');
    Tags.of(this).add('Purpose', 'Tutorial');
  }
}
