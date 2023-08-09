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
import { Stack, StackProps, Duration, CustomResource, Aspects } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_ssm as ssm } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import * as fs from 'fs';
import {
	SSM_PARAM_AURORA_DB_NAME,
	SSM_PARAM_VPC_ID,
	SSM_PARAM_AURORA_PROXY_ENDPOINT,
	SSM_PARAM_AURORA_SECRET_ARN,
	SSM_PARAM_COMMON_LIB_LAYER,
	getNormalizedResourceName,
	SSM_PARAM_EXT_LIB_LAYER,
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
	AURORA_MYSQL_PORT
} from '../../util/cdk-utils';

/**
 * Stack to deploy Aurora Serverless Cluster
 */
export class AuroraDbSetupStackMain extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Setup configuration json
		const SETUP_SCRIPT_PATH = 'src/stack/aurora-db-setup/setup-script';

		// Aurora Subnets
		const auroraSubnet1 = ec2.Subnet.fromSubnetAttributes(this, 'AuroraSubnet1', {
			subnetId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_AURORA_SUBNET_ID_1
			),
			routeTableId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_COMMON_ROUTE_TABLE
			)
		});
		const auroraSubnet2 = ec2.Subnet.fromSubnetAttributes(this, 'AuroraSubnet2', {
			subnetId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_AURORA_SUBNET_ID_2
			),
			routeTableId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_COMMON_ROUTE_TABLE
			)
		});

		// Aurora Proxy Subnets
		const auroraProxySubnet1 = ec2.Subnet.fromSubnetAttributes(
			this,
			'AuroraProxySubnet1',
			{
				subnetId: ssm.StringParameter.valueForStringParameter(
					this,
					SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_1
				),
				routeTableId: ssm.StringParameter.valueForStringParameter(
					this,
					SSM_PARAM_VPC_COMMON_ROUTE_TABLE
				)
			}
		);
		const auroraProxySubnet2 = ec2.Subnet.fromSubnetAttributes(
			this,
			'AuroraProxySubnet2',
			{
				subnetId: ssm.StringParameter.valueForStringParameter(
					this,
					SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_2
				),
				routeTableId: ssm.StringParameter.valueForStringParameter(
					this,
					SSM_PARAM_VPC_COMMON_ROUTE_TABLE
				)
			}
		);

		// Quicksight subnets
		const qsSubnet1 = ec2.Subnet.fromSubnetAttributes(this, 'QuicksightSubnet1', {
			subnetId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_1
			),
			routeTableId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_COMMON_ROUTE_TABLE
			)
		});
		const qsSubnet2 = ec2.Subnet.fromSubnetAttributes(this, 'QuicksightSubnet2', {
			subnetId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_2
			),
			routeTableId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_COMMON_ROUTE_TABLE
			)
		});

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
				auroraSubnet1.subnetId,
				auroraSubnet2.subnetId,
				auroraProxySubnet1.subnetId,
				auroraProxySubnet2.subnetId,
				qsSubnet1.subnetId,
				qsSubnet2.subnetId,
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

		// Lambda Layer for common code
		const commonLibLayer = lambda.LayerVersion.fromLayerVersionArn(
			this,
			'CommonLibLayer',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_COMMON_LIB_LAYER)
		);

		// Lamba Layer for external libs
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

		/*********************************** Aurora DB Setup **********************************/
		// Slot Type Provider Lambda Definition
		const auroraDbSetUpLambda = new lambda.Function(this, 'AuroraDbSetUpLambda', {
			runtime: lambda.Runtime.NODEJS_18_X,
			code: lambda.Code.fromAsset('dist/stack/aurora-db-setup/lambda/db-setup/'),
			handler: 'index.handler',
			timeout: Duration.seconds(60),
			environment: {
				ACCOUNT_ID: this.account,
				REGION: this.region,
				AURORA_PROXY_ENDPOINT: auroraProxyEndpoint,
				AURORA_DB_NAME: auroraDbName,
				AURORA_USER_NAME: AURORA_DB_USER_DEFAULT,
				AURORA_MYSQL_PORT: AURORA_MYSQL_PORT
			},
			layers: [commonLibLayer, extLibLayer],
			vpc: connectWsVpc,
			vpcSubnets: {
				subnets: [lambdaSubnet1, lambdaSubnet2]
			},
			securityGroups: [lambdaSg]
		});

		// Permission to carry out IAM auth when connecting to Aurora
		auroraDbSetUpLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['rds-db:connect'],
				effect: iam.Effect.ALLOW,
				resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/*`]
			})
		);

		// Suppress rule for AWSLambdaBasicExecutionRole
		NagSuppressions.addResourceSuppressions(
			auroraDbSetUpLambda,
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
							regex: '/^Resource::arn:aws:rds-db:(.*):(.*):dbuser:(.*)/(.*)/g'
						}
					]
				}
			],
			true
		);
		/**************************************************************************************/

		// Read setup-scripts folder and generate a list of script files
		const listOfScripts: string[] = [];
		if (fs.existsSync(SETUP_SCRIPT_PATH)) {
			const fileList: string[] = fs.readdirSync(SETUP_SCRIPT_PATH);
			for (const file of fileList.sort()) {
				const path: string = SETUP_SCRIPT_PATH.concat('/').concat(file);
				const scriptString: string = fs.readFileSync(path, {
					encoding: 'utf-8',
					flag: 'r'
				});
				listOfScripts.push(scriptString);
			}
		}

		// Custom resource for Aurora DB setup
		new CustomResource(this, getNormalizedResourceName('AuroraDbSetup'), {
			serviceToken: auroraDbSetUpLambda.functionArn,
			properties: {
				SetupScriptJson: JSON.stringify(listOfScripts),
				Timestamp: new Date().getTime()
			}
		});
		/**************************************************************************************/
	}
}
