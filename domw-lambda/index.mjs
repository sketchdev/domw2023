import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm"; // ES Modules import

export async function handler(event, context) {
  const {awsRequestId = 'noRequestId'} = context;
  const {queryStringParameters = {}, body = '{}'} = event;
  const parsedBody = JSON.parse(body);
  const sleep = parseInt(queryStringParameters.sleep || parsedBody.sleep || 10, 10);
  console.log('awsRequestId', awsRequestId);
  console.log('sleep', sleep);
  const awsConfig = { region: "us-east-1" };
  const ssmClient = new SSMClient(awsConfig);
  const parameterCommandOutput = await ssmClient.send(new GetParameterCommand({ // GetParameterRequest
    Name: "EcsDomw2023BatchRunConfig", // required
  }));
  const runTaskConfigStr = parameterCommandOutput?.Parameter?.Value;
  console.log('runTaskConfigStr', runTaskConfigStr);
  const {  
    cluster,
    subnets,
    taskDefinition,
    containerName
  } = JSON.parse(runTaskConfigStr);

  const ecsClient = new ECSClient(awsConfig);
  const ecsCommandInput = { // RunTaskRequest
    cluster,
    count: 1,
    launchType: "FARGATE", // "EC2" || "FARGATE" || "EXTERNAL",
    networkConfiguration: { // NetworkConfiguration
      awsvpcConfiguration: { // AwsVpcConfiguration
        subnets,
        assignPublicIp: "DISABLED", // "ENABLED" || "DISABLED",
      },
    },
    overrides: { // TaskOverride
      containerOverrides: [ // ContainerOverrides
        { // ContainerOverride
          name: containerName,
          command: [
            "sh",
            "batch.sh",
            `${sleep}`,
            awsRequestId
          ]
        }
      ]
    },
    taskDefinition
  };
  const ecsResponse = await ecsClient.send(new RunTaskCommand(ecsCommandInput));
  console.log(ecsResponse);
  return {
    body: JSON.stringify(ecsResponse),
    statusCode: 200
  }
}