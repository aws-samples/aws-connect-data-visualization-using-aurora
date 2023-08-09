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
export class ConnectMetricsStack extends Stack {
	private sfnFreqInSec = 10;
	private cwEventFreqInSec = 60;
	private cwEventScheduleExpressionCurrentMetrics = 'rate(1 minute)';
	private cwEventScheduleExpressionHistMetrics = 'rate(5 minutes)';

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		/********************************** Stack Parameters ***********************************/
		// Aurora Subnets
		// const auroraSubnet1 = ec2.Subnet.fromSubnetAttributes(this, 'AuroraSubnet1', {
		// 	subnetId: ssm.StringParameter.valueForStringParameter(
		// 		this,
		// 		SSM_PARAM_VPC_AURORA_SUBNET_ID_1
		// 	),
		// 	routeTableId: ssm.StringParameter.valueForStringParameter(
		// 		this,
		// 		SSM_PARAM_VPC_COMMON_ROUTE_TABLE
		// 	)
		// });
		// const auroraSubnet2 = ec2.Subnet.fromSubnetAttributes(this, 'AuroraSubnet2', {
		// 	subnetId: ssm.StringParameter.valueForStringParameter(
		// 		this,
		// 		SSM_PARAM_VPC_AURORA_SUBNET_ID_2
		// 	),
		// 	routeTableId: ssm.StringParameter.valueForStringParameter(
		// 		this,
		// 		SSM_PARAM_VPC_COMMON_ROUTE_TABLE
		// 	)
		// });

		// // Aurora Proxy Subnets
		// const auroraProxySubnet1 = ec2.Subnet.fromSubnetAttributes(
		// 	this,
		// 	'AuroraProxySubnet1',
		// 	{
		// 		subnetId: ssm.StringParameter.valueForStringParameter(
		// 			this,
		// 			SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_1
		// 		),
		// 		routeTableId: ssm.StringParameter.valueForStringParameter(
		// 			this,
		// 			SSM_PARAM_VPC_COMMON_ROUTE_TABLE
		// 		)
		// 	}
		// );
		// const auroraProxySubnet2 = ec2.Subnet.fromSubnetAttributes(
		// 	this,
		// 	'AuroraProxySubnet2',
		// 	{
		// 		subnetId: ssm.StringParameter.valueForStringParameter(
		// 			this,
		// 			SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_2
		// 		),
		// 		routeTableId: ssm.StringParameter.valueForStringParameter(
		// 			this,
		// 			SSM_PARAM_VPC_COMMON_ROUTE_TABLE
		// 		)
		// 	}
		// );

		// // Quicksight subnets
		// const qsSubnet1 = ec2.Subnet.fromSubnetAttributes(this, 'QuicksightSubnet1', {
		// 	subnetId: ssm.StringParameter.valueForStringParameter(
		// 		this,
		// 		SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_1
		// 	),
		// 	routeTableId: ssm.StringParameter.valueForStringParameter(
		// 		this,
		// 		SSM_PARAM_VPC_COMMON_ROUTE_TABLE
		// 	)
		// });
		// const qsSubnet2 = ec2.Subnet.fromSubnetAttributes(this, 'QuicksightSubnet2', {
		// 	subnetId: ssm.StringParameter.valueForStringParameter(
		// 		this,
		// 		SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_2
		// 	),
		// 	routeTableId: ssm.StringParameter.valueForStringParameter(
		// 		this,
		// 		SSM_PARAM_VPC_COMMON_ROUTE_TABLE
		// 	)
		// });

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

		/******************************** Current Metric Pull *******************************/
		// Lambda to pull current metrics from Connect instance
		const pullCurrentMetricsLambda = new lambda.Function(
			this,
			'PullCurrentMetricsLambda',
			{
				runtime: lambda.Runtime.NODEJS_18_X,
				code: lambda.Code.fromAsset(
					'dist/stack/connect-metrics/lambdas/pull-current-metrics/'
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

		// Permission to carry out IAM auth when connecting to Aurora
		pullCurrentMetricsLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['rds-db:connect'],
				effect: iam.Effect.ALLOW,
				resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/*`]
			})
		);

		// Permission to carry out IAM auth when connecting to Aurora
		pullCurrentMetricsLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: [
					'connect:GetCurrentMetricData',
					'connect:GetMetricData',
					'connect:ListQueues'
				],
				effect: iam.Effect.ALLOW,
				resources: [connectInstanceArn.concat('/*')]
			})
		);
		// Suppress findings for things automatically added by cdk or that are needed for the workshop
		NagSuppressions.addResourceSuppressions(
			pullCurrentMetricsLambda,
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
		// Lambda to invoke PullCurrentMetrics lambda as part of step function
		const jobInvocationLambda = new lambda.Function(this, 'JobInvocationLambda', {
			runtime: lambda.Runtime.NODEJS_18_X,
			code: lambda.Code.fromAsset('dist/stack/connect-metrics/lambdas/job-invocation/'),
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
				CONNECT_INSTANCE_ID: connectInstanceId,
				PULL_CURRENT_METRICS_LAMBDA_ARN: pullCurrentMetricsLambda.functionArn
			},
			layers: [commonLibLayer, connectMetricsLayer, extLibLayer],
			vpc: connectWsVpc,
			vpcSubnets: {
				subnets: [lambdaSubnet1, lambdaSubnet2]
			},
			securityGroups: [lambdaSg]
		});

		// Add permission to invoke PullConnectMetrics lambdas
		jobInvocationLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['lambda:InvokeFunction'],
				effect: iam.Effect.ALLOW,
				resources: [
					pullCurrentMetricsLambda.functionArn
					// pullHistoricalMetricsLambda.functionArn
				]
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
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'
					]
				}
			],
			true
		);
		/**************************************************************************************/

		/************************* Step Function for Current Metrics **************************/
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
		const pullMetricsJobInvokeTask = new tasks.LambdaInvoke(
			this,
			'PullCurentMetricsJobInvocation',
			{
				comment: 'Initiates job to pull metrics from Connect instance',
				lambdaFunction: jobInvocationLambda,
				invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
				resultPath: '$.TaskResult',
				outputPath: '$.TaskResult.Payload'
			}
		);

		// Make a decision whether to repeat the metric pull task or end the workflow
		const decisionState = new sfn.Choice(this, 'RepeatMetricPull', {
			comment: 'Checks if the worflow should repeat job invocation to pull metrics'
		});

		// Introduces delay before the next run of the JobInvocation task
		const waitState = new sfn.Wait(this, 'Wait', {
			time: sfn.WaitTime.duration(Duration.seconds(this.sfnFreqInSec)),
			comment: 'Wait for '.concat(String(this.sfnFreqInSec)).concat(' seconds')
		});

		// Define order of the workflow
		pullMetricsJobInvokeTask.next(
			decisionState
				.when(
					sfn.Condition.numberLessThanJsonPath('$.index', '$.maxNumOfRuns'),
					waitState
				)
				.otherwise(new sfn.Pass(this, 'Done'))
		);
		waitState.next(pullMetricsJobInvokeTask);

		// State Machine
		const currentMetricCollectionStateMachine = new sfn.StateMachine(
			this,
			'MetricCollectionStepFn',
			{
				definitionBody: sfn.DefinitionBody.fromChainable(
					sfn.Chain.start(pullMetricsJobInvokeTask)
				),
				tracingEnabled: true,
				logs: {
					level: sfn.LogLevel.ALL,
					destination: new logs.LogGroup(this, 'MetricCollectionStepFnLogGrp')
				}
			}
		);

		currentMetricCollectionStateMachine.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['lambda:InvokeFunction'],
				effect: iam.Effect.ALLOW,
				resources: [jobInvocationLambda.functionArn]
			})
		);

		// Suppress findings for things automatically added by cdk or that are needed for the workshop
		NagSuppressions.addResourceSuppressions(
			currentMetricCollectionStateMachine,
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
		 * CW Event Rule for Current Metrics
		 * Triggers state machine every minute with below input.
		 * Input: { "index": 0, "maxNumOfRuns": 5 }
		 */

		// CW Event Role to trigger MetricCollectionStateMachine
		const pullCurrentMetricsEventRole = new iam.Role(
			this,
			'PullCurrentMetricsEventRole',
			{
				assumedBy: new iam.ServicePrincipal('events.amazonaws.com')
			}
		);
		pullCurrentMetricsEventRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['states:StartExecution'],
				effect: iam.Effect.ALLOW,
				resources: [currentMetricCollectionStateMachine.stateMachineArn]
			})
		);

		// CW Event Rule
		new events.Rule(this, 'TriggerCurrentMetricCollectionStateMachine', {
			description: 'Scheduled event that triggers step function to pull Connect metrics',
			enabled: true,
			ruleName: `${this.stackName}-PullCurrrentMetricsRule`,
			schedule: events.Schedule.expression(this.cwEventScheduleExpressionCurrentMetrics),
			targets: [
				new targets.SfnStateMachine(currentMetricCollectionStateMachine, {
					input: events.RuleTargetInput.fromObject({
						index: 0,
						maxNumOfRuns: maxNumOfRuns
					}),
					role: pullCurrentMetricsEventRole
				})
			]
		});
		/**************************************************************************************/

		/******************************* Historical Metric Pull *******************************/
		const reportingIntervalInMin = 5;
		// Reporting interval must be interval of 5
		if (reportingIntervalInMin % 5 != 0) {
			throw Error('Reporting interval must be multiple of 5');
		}

		// Lambda to pull historical metrics from Connect instance
		const pullHistoricalMetricsLambda = new lambda.Function(
			this,
			'PullHistoricalMetricsLambda',
			{
				runtime: lambda.Runtime.NODEJS_18_X,
				code: lambda.Code.fromAsset(
					'dist/stack/connect-metrics/lambdas/pull-historical-metrics/'
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
					CONNECT_INSTANCE_ID: connectInstanceId,
					REPORTING_INTERVAL_IN_MINUTES: String(reportingIntervalInMin)
				},
				layers: [commonLibLayer, connectMetricsLayer, extLibLayer],
				vpc: connectWsVpc,
				vpcSubnets: {
					subnets: [lambdaSubnet1, lambdaSubnet2]
				},
				securityGroups: [lambdaSg]
			}
		);

		// Permission to carry out IAM auth when connecting to Aurora
		pullHistoricalMetricsLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['rds-db:connect'],
				effect: iam.Effect.ALLOW,
				resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/*`]
			})
		);

		// Permission to retrieve metrics from connect instance
		pullHistoricalMetricsLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: [
					'connect:GetCurrentMetricData',
					'connect:GetMetricData',
					'connect:ListQueues'
				],
				effect: iam.Effect.ALLOW,
				resources: [connectInstanceArn.concat('/*')]
			})
		);

		// Suppress findings for things automatically added by cdk or that are needed for the workshop
		NagSuppressions.addResourceSuppressions(
			pullHistoricalMetricsLambda,
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

		/**
		 * CW Event Rule for Historical Metrics
		 * Triggers historical metric pull lambda every 5 minutes.
		 */

		// CW Event Role to trigger Historical Metric Collection lambda
		const pullHistoricalMetricsEventRole = new iam.Role(
			this,
			'PullHistoricalMetricsEventRole',
			{
				assumedBy: new iam.ServicePrincipal('events.amazonaws.com')
			}
		);
		pullHistoricalMetricsEventRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['lambda:InvokeFunction'],
				effect: iam.Effect.ALLOW,
				resources: [pullHistoricalMetricsLambda.functionArn]
			})
		);

		// CW Event Rule
		new events.Rule(this, 'TriggerHistoricalMetricPullLambda', {
			description: 'Scheduled event that triggers lambda to pull historical metrics',
			enabled: true,
			ruleName: `${this.stackName}-PullHistoricalMetricsRule`,
			schedule: events.Schedule.expression(this.cwEventScheduleExpressionHistMetrics),
			targets: [new targets.LambdaFunction(pullHistoricalMetricsLambda)]
		});
		/**************************************************************************************/
		/*********************************** List of Outputs **********************************/

		/************************************* End Outputs ************************************/
	}
}
