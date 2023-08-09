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
	Aspects,
	Duration,
	Stack,
	StackProps,
	aws_ec2 as ec2,
	aws_iam as iam,
	aws_lambda as lambda,
	aws_rds as rds,
	aws_ssm as ssm
} from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
	AURORA_DB_NAME,
	AURORA_DB_USER_DEFAULT,
	SSM_PARAM_AURORA_DB_NAME,
	SSM_PARAM_AURORA_PROXY_ENDPOINT,
	SSM_PARAM_AURORA_PROXY_SEC_GROUP_ID,
	SSM_PARAM_AURORA_SECRET_ARN,
	SSM_PARAM_AURORA_SEC_GROUP_ID,
	SSM_PARAM_COMMON_LIB_LAYER,
	SSM_PARAM_EXT_LIB_LAYER,
	SSM_PARAM_LAMBDA_SEC_GROUP_ID,
	SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_1,
	SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_2,
	SSM_PARAM_VPC_AURORA_SUBNET_ID_1,
	SSM_PARAM_VPC_AURORA_SUBNET_ID_2,
	SSM_PARAM_VPC_COMMON_ROUTE_TABLE,
	SSM_PARAM_VPC_ID,
	SSM_PARAM_VPC_LAMBDA_SUBNET_ID_1,
	SSM_PARAM_VPC_LAMBDA_SUBNET_ID_2,
	SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_1,
	SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_2
} from '../../util/cdk-utils';

/**
 * Stack to deploy Aurora Serverless Cluster
 */
export class AuroraStackMain extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Setup configuration json
		const SETUP_SCRIPT_PATH = 'src/stack/aurora/setup-script';

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
				SSM_PARAM_VPC_COMMON_ROUTE_TABLE
			)
		});
		const lambdaSubnet2 = ec2.Subnet.fromSubnetAttributes(this, 'LambdaSubnet2', {
			subnetId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_LAMBDA_SUBNET_ID_2
			),
			routeTableId: ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_VPC_COMMON_ROUTE_TABLE
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

		// Aurora security group
		const auroraSg = ec2.SecurityGroup.fromSecurityGroupId(
			this,
			'AuroraSecurityGroup',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_AURORA_SEC_GROUP_ID)
		);

		// Aurora security group
		const auroraProxySg = ec2.SecurityGroup.fromSecurityGroupId(
			this,
			'AuroraProxySecurityGroup',
			ssm.StringParameter.valueForStringParameter(
				this,
				SSM_PARAM_AURORA_PROXY_SEC_GROUP_ID
			)
		);

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

		/****************************** Aurora Serverless Cluster *****************************/
		const auroraCluster = new rds.DatabaseCluster(this, 'AuroraServerlessCluster', {
			engine: rds.DatabaseClusterEngine.auroraMysql({
				version: rds.AuroraMysqlEngineVersion.VER_3_02_1
			}),
			// Serveless writer instance
			writer: rds.ClusterInstance.serverlessV2('writer'),
			readers: [
				// Serveless reader instance
				rds.ClusterInstance.serverlessV2('reader')
			],
			iamAuthentication: true,
			backtrackWindow: Duration.days(1),
			defaultDatabaseName: AURORA_DB_NAME,
			storageEncrypted: true,
			vpc: connectWsVpc,
			vpcSubnets: {
				subnets: [auroraSubnet1, auroraSubnet2]
			},
			securityGroups: [auroraSg]
		});
		Aspects.of(auroraCluster).add({
			visit(node) {
				if (node instanceof rds.CfnDBCluster) {
					node.serverlessV2ScalingConfiguration = {
						minCapacity: 0.5, // min capacity is 0.5 vCPU
						maxCapacity: 1 // max capacity is 1 vCPU (default)
					};
				}
			}
		});
		// Automatic password rotation
		auroraCluster.addRotationSingleUser();
		// IAM Role for RDS Proxy
		const auroraProxyRole = new iam.Role(this, 'AuroraProxyRole', {
			assumedBy: new iam.ServicePrincipal('rds.amazonaws.com')
		});
		// Permissions for RDS proxy to read DB credentials from Secrets Manager
		auroraProxyRole.addToPolicy(
			new iam.PolicyStatement({
				actions: [
					'secretsmanager:GetResourcePolicy',
					'secretsmanager:GetSecretValue',
					'secretsmanager:DescribeSecret',
					'secretsmanager:ListSecretVersionIds'
				],
				effect: iam.Effect.ALLOW,
				resources: [String(auroraCluster.secret?.secretArn)]
			})
		);
		auroraProxyRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['secretsmanager:GetRandomPassword', 'secretsmanager:ListSecrets'],
				effect: iam.Effect.ALLOW,
				resources: ['*']
			})
		);
		// RDS proxy definition
		const auroraProxy = auroraCluster.addProxy('AuroraProxy', {
			secrets: [auroraCluster.secret!],
			vpc: connectWsVpc,
			vpcSubnets: {
				subnets: [auroraProxySubnet1, auroraProxySubnet2]
			},
			securityGroups: [auroraProxySg],
			iamAuth: true
		});
		auroraProxy.grantConnect(auroraProxyRole, AURORA_DB_USER_DEFAULT);

		NagSuppressions.addStackSuppressions(this, [
			{
				id: 'AwsSolutions-IAM5',
				reason: 'ListSecrets is not restricted to a single secret resource',
				appliesTo: ['Resource::*']
			}
		]);

		// Suppress rules for RDS Serverless V2
		NagSuppressions.addResourceSuppressions(
			auroraCluster,
			[
				{
					id: 'AwsSolutions-RDS6',
					reason:
						'Suppress AwsSolutions-RDS6 as IAM Database Authentication is not supported in Serverless V1'
				},
				{
					id: 'AwsSolutions-RDS10',
					reason:
						'Suppress AwsSolutions-RDS10 as we need to clean up the DB after workshop'
				},
				{
					id: 'AwsSolutions-RDS11',
					reason: 'Suppress AwsSolutions-RDS11 as 3306 is the only allowed port for MySQL'
				},
				{
					id: 'AwsSolutions-RDS14',
					reason:
						'Suppress AwsSolutions-RDS14 as backtracking not supported in Serverless V1'
				},
				{
					id: 'AwsSolutions-RDS16',
					reason:
						'Suppress AwsSolutions-RDS16 as log exports not supported in Serverless V1',
					appliesTo: [
						'LogExport::audit',
						'LogExport::error',
						'LogExport::general',
						'LogExport::slowquery'
					]
				}
			],
			true
		);
		/**************************************************************************************/

		/*********************************** List of Outputs **********************************/
		new ssm.StringParameter(this, 'ParamAuroraProxyEndpoint', {
			stringValue: auroraProxy.endpoint,
			description: 'Aurora proxy endpoint',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_AURORA_PROXY_ENDPOINT,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamAuroraSecretArn', {
			stringValue: auroraCluster.secret!.secretArn,
			description: 'Aurora secret arn',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_AURORA_SECRET_ARN,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamAuroraDbName', {
			stringValue: AURORA_DB_NAME,
			description: 'Layer version arn for exteral lib layer',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_AURORA_DB_NAME,
			simpleName: false
		});
		/************************************* End Outputs ************************************/
	}
}
