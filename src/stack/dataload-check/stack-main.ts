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
	aws_apigateway as apigw,
	aws_ec2 as ec2,
	aws_iam as iam,
	aws_lambda as lambda,
	aws_ssm as ssm
} from 'aws-cdk-lib';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
	AURORA_DB_USER_DEFAULT,
	AURORA_MYSQL_PORT,
	SSM_PARAM_AURORA_DB_NAME,
	SSM_PARAM_AURORA_PROXY_ENDPOINT,
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
export class CheckDataLoadStack extends Stack {
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

		// Aurora Proxy Endpoint
		const auroraProxyEndpoint = ssm.StringParameter.valueForStringParameter(
			this,
			SSM_PARAM_AURORA_PROXY_ENDPOINT
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
			privateSubnetIds: [lambdaSubnet1.subnetId, lambdaSubnet2.subnetId]
		});

		// Lambda security group
		const lambdaSg = ec2.SecurityGroup.fromSecurityGroupId(
			this,
			'LambdaSecurityGroup',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_LAMBDA_SEC_GROUP_ID)
		);

		const checkDataloadLambda = new lambda.Function(this, 'CheckDataloadLambda', {
			runtime: lambda.Runtime.NODEJS_18_X,
			code: lambda.Code.fromAsset('dist/stack/dataload-check/lambdas/check-dataload'),
			handler: 'index.handler',
			timeout: Duration.seconds(5),
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
		});

		// Permission to carry out IAM auth when connecting to Aurora
		checkDataloadLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['rds-db:connect'],
				effect: iam.Effect.ALLOW,
				resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/*`]
			})
		);

		const logGroup = new LogGroup(this, 'ApiGatewayAccessLogs');

		const checkDataLoadApi: apigw.LambdaRestApi = new apigw.LambdaRestApi(
			this,
			'CheckDataloadApi',
			{
				handler: checkDataloadLambda,
				deployOptions: {
					accessLogDestination: new apigw.LogGroupLogDestination(logGroup),
					accessLogFormat: apigw.AccessLogFormat.clf()
				}
			}
		);

		NagSuppressions.addResourceSuppressions(
			checkDataLoadApi,
			[
				{
					id: 'AwsSolutions-APIG3',
					reason: 'Suppress AwsSolutions-APIG3 for CheckDataloadApi.No WAF or ACL needed'
				},
				{
					id: 'AwsSolutions-COG4',
					reason: 'Suppress AwsSolutions-COG4. Test API to validate no user pool required'
				},
				{
					id: 'AwsSolutions-APIG4',
					reason:
						'Suppress AwsSolutions-APIG4.Policy getting attached by CDK internally ',
					appliesTo: [
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs'
					]
				},
				{
					id: 'AwsSolutions-APIG6',
					reason:
						'Suppress AwsSolutions-APIG6.Only GET method is used to test , rest HTTP methods are not used.'
				},

				{
					id: 'AwsSolutions-APIG2',
					reason:
						'Suppress AwsSolutions-APIG2.Only GET method is used for testing no input validation required.No input is passed'
				},
				{
					id: 'AwsSolutions-APIG4',
					reason: 'Suppress AwsSolutions-APIG4.Authorization not required'
				},
				{
					id: 'AwsSolutions-IAM4',
					reason: 'Managed policy used internaly by CheckDataloadApi CDK resource',
					appliesTo: [
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs'
					]
				}
			],
			true
		);

		// Suppress findings for things automatically added by cdk or that are needed for the workshop
		NagSuppressions.addResourceSuppressions(
			checkDataloadLambda,
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
	}
}
