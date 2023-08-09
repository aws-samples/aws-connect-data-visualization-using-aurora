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
import { Construct } from 'constructs';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_ssm as ssm } from 'aws-cdk-lib';
import { aws_events as events } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import {
	SSM_PARAM_AURORA_CLUSTER_ARN,
	SSM_PARAM_AURORA_DB_NAME,
	SSM_PARAM_AURORA_SECRET_ARN,
	SSM_PARAM_COMMON_LIB_LAYER,
	SSM_PARAM_CONNECT_INSTANCE_ARN,
	SSM_PARAM_CONNECT_INSTANCE_ID,
	SSM_PARAM_CONNECT_METRICS_LAYER,
	SSM_PARAM_VPC_ID,
	SSM_PARAM_AURORA_PROXY_ENDPOINT,
	SSM_PARAM_LAMBDA_SEC_GROUP_ID,
	SSM_PARAM_VPC_AURORA_SUBNET_ID_1,
	SSM_PARAM_VPC_AURORA_SUBNET_ID_2,
	SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_1,
	SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_2,
	SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_1,
	SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_2,
	SSM_PARAM_VPC_LAMBDA_SUBNET_ID_1,
	SSM_PARAM_VPC_LAMBDA_SUBNET_ID_2,
	SSM_PARAM_VPC_COMMON_ROUTE_TABLE,
	SSM_PARAM_VPC_LAMBDA_ROUTE_TABLE,
	AURORA_DB_USER_DEFAULT,
	AURORA_MYSQL_PORT,
	SSM_PARAM_EXT_LIB_LAYER
} from '../../util/cdk-utils';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

/**
 * Stack to deploy AWS Connect contact flows
 */
export class ConnectMetaDataStack extends Stack {
	private cwEventScheduleExpressionCurrentUserData = 'rate(15 minutes)';

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

		const pullConnectMetadataLambda = new lambda.Function(
			this,
			'PullConnectMetadataLambda',
			{
				runtime: lambda.Runtime.NODEJS_18_X,
				code: lambda.Code.fromAsset(
					'dist/stack/connect-metadata/lambdas/pull-connect-metadata/'
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
		pullConnectMetadataLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['rds-db:connect'],
				effect: iam.Effect.ALLOW,
				resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/*`]
			})
		);

		// Permission to retrieve user data from connect instance
		pullConnectMetadataLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: [
					'connect:GetCurrentUserData',
					'connect:ListQueues',
					'connect:ListUsers',
					'connect:ListRoutingProfileQueues',
					'connect:ListAgentStatuses',
					'connect:ListRoutingProfiles',
					'connect:ListSecurityProfiles',
					'connect:DescribeUser'
				],
				effect: iam.Effect.ALLOW,
				resources: [connectInstanceArn, connectInstanceArn.concat('/*')]
			})
		);

		// Suppress findings for things automatically added by cdk or that are needed for the workshop
		NagSuppressions.addResourceSuppressions(
			pullConnectMetadataLambda,
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
					reason: 'Suppress AwsSolutions-IAM5 access to connect instance is needed',
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
		/**************************************************************************************/

		const pullConnectMetaDataEventRole = new iam.Role(
			this,
			'PullConnectMetadataLambdaEventRole',
			{
				assumedBy: new iam.ServicePrincipal('events.amazonaws.com')
			}
		);

		pullConnectMetaDataEventRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['lambda:InvokeFunction'],
				effect: iam.Effect.ALLOW,
				resources: [pullConnectMetadataLambda.functionArn]
			})
		);

		// CW Event Rule
		new events.Rule(this, 'TriggerConnectMetaDataCollection', {
			description: 'Scheduled event that triggers connect metadata collection',
			enabled: true,
			ruleName: `${this.stackName}-PullConnectMetaDataRule`,
			schedule: events.Schedule.expression(this.cwEventScheduleExpressionCurrentUserData),
			targets: [new LambdaFunction(pullConnectMetadataLambda)]
		});
		/**************************************************************************************/
		/*********************************** List of Outputs **********************************/

		/************************************* End Outputs ************************************/
	}
}
