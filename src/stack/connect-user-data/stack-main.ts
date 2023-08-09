/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict';
import {
	Duration,
	Stack,
	StackProps,
	aws_ec2 as ec2,
	aws_events as events,
	aws_iam as iam,
	aws_lambda as lambda,
	aws_logs as logs,
	aws_stepfunctions as sfn,
	aws_ssm as ssm,
	aws_events_targets as targets,
	aws_stepfunctions_tasks as tasks
} from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
	AURORA_DB_USER_DEFAULT,
	AURORA_MYSQL_PORT,
	SSM_PARAM_AURORA_DB_NAME,
	SSM_PARAM_AURORA_PROXY_ENDPOINT,
	SSM_PARAM_AURORA_SECRET_ARN,
	SSM_PARAM_COMMON_LIB_LAYER,
	SSM_PARAM_CONNECT_INSTANCE_ARN,
	SSM_PARAM_CONNECT_INSTANCE_ID,
	SSM_PARAM_CONNECT_METRICS_LAYER,
	SSM_PARAM_EXT_LIB_LAYER,
	SSM_PARAM_LAMBDA_SEC_GROUP_ID,
	SSM_PARAM_VPC_ID,
	SSM_PARAM_VPC_LAMBDA_ROUTE_TABLE,
	SSM_PARAM_VPC_LAMBDA_SUBNET_ID_1,
	SSM_PARAM_VPC_LAMBDA_SUBNET_ID_2
} from '../../util/cdk-utils';

/**
 * Stack to deploy AWS Connect contact flows
 */
export class UserDataStack extends Stack {
	private sfnFreqInSec = 10;
	private cwEventFreqInSec = 60;
	private cwEventScheduleExpressionCurrentUserData = 'rate(1 minute)';

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		/********************************** Stack Parameters ***********************************/
		const commonLibLayer = lambda.LayerVersion.fromLayerVersionArn(
			this,
			'CommonLibLayer',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_COMMON_LIB_LAYER)
		);

		const connectMetricsLayer = lambda.LayerVersion.fromLayerVersionArn(
			this,
			'ConnectMetricsLayer',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_CONNECT_METRICS_LAYER)
		);

		const extLibLayer = lambda.LayerVersion.fromLayerVersionArn(
			this,
			'ExtLibLayer',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_EXT_LIB_LAYER)
		);

		// const dbClusterArn: string = ssm.StringParameter.valueForStringParameter(
		// 	this,
		// 	SSM_PARAM_AURORA_CLUSTER_ARN
		// );

		// const dbClusterSecretArn: string = ssm.StringParameter.valueForStringParameter(
		// 	this,
		// 	SSM_PARAM_AURORA_SECRET_ARN
		// );

		// const connectInstanceId: string = ssm.StringParameter.valueForStringParameter(
		// 	this,
		// 	SSM_PARAM_CONNECT_INSTANCE_ID
		// );

		// const connectInstanceArn: string = ssm.StringParameter.valueForStringParameter(
		// 	this,
		// 	SSM_PARAM_CONNECT_INSTANCE_ARN
		// );

		// const connectDbName: string = ssm.StringParameter.valueForStringParameter(
		// 	this,
		// 	SSM_PARAM_AURORA_DB_NAME
		// );
		// Aurora Proxy Endpoint
		const auroraProxyEndpoint = ssm.StringParameter.valueForStringParameter(
			this,
			SSM_PARAM_AURORA_PROXY_ENDPOINT
		);

		// Aurora Secret Arn
		const auroraSecretArn = ssm.StringParameter.valueForStringParameter(
			this,
			SSM_PARAM_AURORA_SECRET_ARN
		);

		// Aurora Db Name
		const auroraDbName = ssm.StringParameter.valueForStringParameter(
			this,
			SSM_PARAM_AURORA_DB_NAME
		);

		const connectInstanceId: string = ssm.StringParameter.valueForStringParameter(
			this,
			SSM_PARAM_CONNECT_INSTANCE_ID
		);

		const connectInstanceArn: string = ssm.StringParameter.valueForStringParameter(
			this,
			SSM_PARAM_CONNECT_INSTANCE_ARN
		);

		// Lambda subnets
		const lambdaSubnet1 = ec2.Subnet.fromSubnetAttributes(this, 'LambdaSubnet1', {
			subnetId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_LAMBDA_SUBNET_ID_1
			),
			routeTableId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_LAMBDA_ROUTE_TABLE
			)
		});
		const lambdaSubnet2 = ec2.Subnet.fromSubnetAttributes(this, 'LambdaSubnet2', {
			subnetId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_LAMBDA_SUBNET_ID_2
			),
			routeTableId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_LAMBDA_ROUTE_TABLE
			)
		});

		// VPC
		const connectWsVpc = ec2.Vpc.fromVpcAttributes(this, 'ConnectWorkshopVpc', {
			vpcId: ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_VPC_ID),
			availabilityZones: this.availabilityZones,
			privateSubnetIds: [
				// auroraSubnet1.subnetId,
				// auroraSubnet2.subnetId,
				// auroraProxySubnet1.subnetId,
				// auroraProxySubnet2.subnetId,
				// qsSubnet1.subnetId,
				// qsSubnet2.subnetId,
				lambdaSubnet1.subnetId,
				lambdaSubnet2.subnetId
			]
		});

		// Lambda security group
		const lambdaSg = ec2.SecurityGroup.fromSecurityGroupId(
			this,
			'LambdaSecurityGroup',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_LAMBDA_SEC_GROUP_ID)
		);
		/******************************** Current User Data Pull *******************************/
		// Lambda to pull current user data from Connect instance
		const pullCurrentUserDataLambda = new lambda.Function(
			this,
			'PullCurrentUserDataLambda',
			{
				runtime: lambda.Runtime.NODEJS_18_X,
				code: lambda.Code.fromAsset(
					'dist/stack/connect-user-data/lambdas/pull-current-user-data/'
				),
				handler: 'index.handler',
				timeout: Duration.seconds(60),
				environment: {
					ACCOUNT_ID: this.account,
					REGION: this.region,
					AURORA_PROXY_ENDPOINT: auroraProxyEndpoint,
					AURORA_DB_NAME: auroraDbName,
					AURORA_USER_NAME: AURORA_DB_USER_DEFAULT,
					AURORA_MYSQL_PORT: AURORA_MYSQL_PORT,
					CONNECT_INSTANCE_ARN: connectInstanceArn,
					CONNECT_INSTANCE_ID: connectInstanceId
				},
				layers: [commonLibLayer, connectMetricsLayer, extLibLayer],
				vpc: connectWsVpc,
				vpcSubnets: {
					subnets: [lambdaSubnet1, lambdaSubnet2]
				},
				securityGroups: [lambdaSg]
			}
		);

		// Permissions to retrieve secret value
		pullCurrentUserDataLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['rds-db:connect'],
				effect: iam.Effect.ALLOW,
				resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/*`]
			})
		);

		// Permission to retrieve user data from connect instance
		pullCurrentUserDataLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['connect:ListQueues', 'connect:ListUsers'],
				effect: iam.Effect.ALLOW,
				resources: [connectInstanceArn]
			})
		);

		pullCurrentUserDataLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['connect:GetCurrentUserData'],
				effect: iam.Effect.ALLOW,
				resources: [connectInstanceArn, connectInstanceArn.concat('/*')]
			})
		);

		// Suppress findings for things automatically added by cdk or that are needed for the workshop
		NagSuppressions.addResourceSuppressions(
			pullCurrentUserDataLambda,
			[
				{
					id: 'AwsSolutions-IAM4',
					reason: 'Suppress AwsSolutions-IAM4 for AWSLambdaBasicExecutionRole',
					appliesTo: [
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'
					]
				},
				{
					id: 'AwsSolutions-IAM5',
					reason: 'Suppress AwsSolutions-IAM5 as access to connect instance is needed',
					appliesTo: [
						{
							regex:
								'/^Resource::<SsmParameterValueCONNECTWORKSHOPCONNECTINSTANCEARN(.*)\\*$/g'
						}
					]
				},
				{
					id: 'AwsSolutions-IAM5',
					reason:
						'Suppress AwsSolutions-IAM5. Can not find cluster ID in CDK to restrict access',
					appliesTo: [
						{
							regex: '/^Resource::arn:aws:rds-db:(.*):(.*):dbuser:(.*)/(.*)/g'
						}
					]
				}
			],
			true
		);
		/***************************************************************************************/

		/******************************** Job Invocation Lambda *******************************/
		// Lambda to invoke PullCurrentUserData lambda as part of step function
		const jobInvocationLambda = new lambda.Function(this, 'JobInvocationLambda', {
			runtime: lambda.Runtime.NODEJS_18_X,
			code: lambda.Code.fromAsset('dist/stack/connect-user-data/lambdas/job-invocation/'),
			handler: 'index.handler',
			timeout: Duration.seconds(60),
			environment: {
				ACCOUNT_ID: this.account,
				REGION: this.region,
				PULL_CURRENT_USER_DATA_LAMBDA_ARN: pullCurrentUserDataLambda.functionArn
			}
		});

		// Add permission to invoke PullUserData lambdas
		jobInvocationLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['lambda:InvokeFunction'],
				effect: iam.Effect.ALLOW,
				resources: [pullCurrentUserDataLambda.functionArn]
			})
		);

		// Suppress findings for things automatically added by cdk or that are needed for the workshop
		NagSuppressions.addResourceSuppressions(
			jobInvocationLambda,
			[
				{
					id: 'AwsSolutions-IAM4',
					reason: 'Suppress AwsSolutions-IAM4 for AWSLambdaBasicExecutionRole',
					appliesTo: [
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
					]
				}
			],
			true
		);
		/**************************************************************************************/

		/************************* Step Function for Current User Data **************************/
		const maxNumOfRuns = Math.floor(this.cwEventFreqInSec / this.sfnFreqInSec);
		if (maxNumOfRuns < 1) {
			throw new Error(
				'Frequency of lambda invocation in state machine must be greater than or equal to ' +
					'the frequency of cloudwatch event'
			);
		}

		/**
		 * Task to invoke JobInvocationLambda.
		 * Input: { "index": 0, "maxNumOfRuns": 5 }
		 */
		const pullUserDataJobInvokeTask = new tasks.LambdaInvoke(
			this,
			'PullCurentUserDataJobInvocation',
			{
				comment: 'Initiates job to pull user data from Connect instance',
				lambdaFunction: jobInvocationLambda,
				invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
				resultPath: '$.TaskResult',
				outputPath: '$.TaskResult.Payload'
			}
		);

		// Make a decision whether to repeat the user data pull task or end the workflow
		const decisionState = new sfn.Choice(this, 'RepeatUserDataPull', {
			comment: 'Checks if the worflow should repeat job invocation to pull user data'
		});

		// Introduces delay before the next run of the JobInvocation task
		const waitState = new sfn.Wait(this, 'Wait', {
			time: sfn.WaitTime.duration(Duration.seconds(this.sfnFreqInSec)),
			comment: 'Wait for '.concat(String(this.sfnFreqInSec)).concat(' seconds')
		});

		// Define order of the workflow
		pullUserDataJobInvokeTask.next(
			decisionState
				.when(
					sfn.Condition.numberLessThanJsonPath('$.index', '$.maxNumOfRuns'),
					waitState
				)
				.otherwise(new sfn.Pass(this, 'Done'))
		);
		waitState.next(pullUserDataJobInvokeTask);

		// State Machine
		const currentUserDataCollectionStateMachine = new sfn.StateMachine(
			this,
			'UserDataCollectionStepFn',
			{
				definitionBody: sfn.DefinitionBody.fromChainable(
					sfn.Chain.start(pullUserDataJobInvokeTask)
				),
				tracingEnabled: true,
				logs: {
					level: sfn.LogLevel.ALL,
					destination: new logs.LogGroup(this, 'UserDataCollectionStepFnLogGrp')
				}
			}
		);

		currentUserDataCollectionStateMachine.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['lambda:InvokeFunction'],
				effect: iam.Effect.ALLOW,
				resources: [jobInvocationLambda.functionArn]
			})
		);

		// Suppress findings for things automatically added by cdk or that are needed for the workshop
		NagSuppressions.addResourceSuppressions(
			currentUserDataCollectionStateMachine,
			[
				{
					id: 'AwsSolutions-IAM5',
					reason: 'Wildcard automatically added by CDK',
					appliesTo: [
						'Resource::*',
						{
							regex: '/^Resource::<JobInvocationLambda(.*)\\*$/g'
						}
					]
				}
			],
			true
		);

		/**
		 * CW Event Rule for Current User Data
		 * Triggers state machine every minute with below input.
		 * Input: { "index": 0, "maxNumOfRuns": 5 }
		 */

		// CW Event Role to trigger UserDataCollectionStateMachine
		const pullCurrentUserDataEventRole = new iam.Role(
			this,
			'PullCurrentUserDataEventRole',
			{
				assumedBy: new iam.ServicePrincipal('events.amazonaws.com')
			}
		);
		pullCurrentUserDataEventRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['states:StartExecution'],
				effect: iam.Effect.ALLOW,
				resources: [currentUserDataCollectionStateMachine.stateMachineArn]
			})
		);

		// CW Event Rule
		new events.Rule(this, 'TriggerCurrentUserDataCollectionStateMachine', {
			description:
				'Scheduled event that triggers step function to pull Connect user data',
			enabled: true,
			ruleName: `${this.stackName}-PullCurrrentUserDataRule`,
			schedule: events.Schedule.expression(this.cwEventScheduleExpressionCurrentUserData),
			targets: [
				new targets.SfnStateMachine(currentUserDataCollectionStateMachine, {
					input: events.RuleTargetInput.fromObject({
						index: 0,
						maxNumOfRuns: maxNumOfRuns
					}),
					role: pullCurrentUserDataEventRole
				})
			]
		});
		/**************************************************************************************/
		/*********************************** List of Outputs **********************************/

		/************************************* End Outputs ************************************/
	}
}
