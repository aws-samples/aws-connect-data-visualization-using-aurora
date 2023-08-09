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
	RemovalPolicy,
	Stack,
	StackProps,
	aws_ec2 as ec2,
	aws_s3 as s3,
	aws_ssm as ssm
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
	AURORA_PROXY_SUBNET1_CIDR,
	AURORA_PROXY_SUBNET2_CIDR,
	AURORA_SUBNET1_CIDR,
	AURORA_SUBNET2_CIDR,
	LAMBDA_SUBNET1_CIDR,
	LAMBDA_SUBNET2_CIDR,
	NAT_SUBNET_CIDR,
	QUICKSIGHT_SUBNET1_CIDR,
	QUICKSIGHT_SUBNET2_CIDR,
	SSM_PARAM_AURORA_PROXY_SEC_GROUP_ID,
	SSM_PARAM_AURORA_SEC_GROUP_ID,
	SSM_PARAM_CONNECT_INSTANCE_ARN,
	SSM_PARAM_CONNECT_INSTANCE_ID,
	SSM_PARAM_LAMBDA_SEC_GROUP_ID,
	SSM_PARAM_QUICKSIGHT_SEC_GROUP_ID,
	SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_1,
	SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_2,
	SSM_PARAM_VPC_AURORA_SUBNET_ID_1,
	SSM_PARAM_VPC_AURORA_SUBNET_ID_2,
	SSM_PARAM_VPC_AVAIL_ZONE_LIST,
	SSM_PARAM_VPC_CIDR,
	SSM_PARAM_VPC_COMMON_ROUTE_TABLE,
	SSM_PARAM_VPC_ID,
	SSM_PARAM_VPC_LAMBDA_ROUTE_TABLE,
	SSM_PARAM_VPC_LAMBDA_SUBNET_ID_1,
	SSM_PARAM_VPC_LAMBDA_SUBNET_ID_2,
	SSM_PARAM_VPC_NAT_SUBNET_ID,
	SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_1,
	SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_2,
	VPC_CIDR
} from '../../util/cdk-utils';

/**
 * Stack to deploy VPC and associated infrastructure for the workshop.
 */
export class InfraStackMain extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);
		// Add your existing connect instance id & ARN below
		const CONNECT_INSTANCE_ID = '<ADD-CONNECT-INSTANCE-ID-HERE>';
		const CONNECT_INSTANCE_ARN = `<ADD-CONNECT-INSTANCE-ARN-HERE>`;
		// Availability zones available in the current AWS environment
		const availZones = this.availabilityZones;
		/********************************** VPC for Workshop ***********************************/
		const cfnVpc = new ec2.CfnVPC(this, 'ConnectWorkshopVpc', {
			cidrBlock: VPC_CIDR,
			enableDnsHostnames: true,
			enableDnsSupport: true
		});
		const vpcFlowlogBucket = new s3.Bucket(this, 'VpcFlowlogBucket', {
			encryption: s3.BucketEncryption.S3_MANAGED,
			removalPolicy: RemovalPolicy.DESTROY,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			enforceSSL: true,
			serverAccessLogsPrefix: `access-logs`
		});
		new ec2.CfnFlowLog(this, 'ConnectWorkshopVpcFlowLog', {
			resourceId: cfnVpc.attrVpcId,
			resourceType: 'VPC',
			logDestinationType: 's3',
			logDestination: vpcFlowlogBucket.bucketArn,
			trafficType: 'ALL'
		});
		/**************************************************************************************/
		/************************************* Subnets ****************************************/
		const cfnAuroraSubnet1 = new ec2.CfnSubnet(this, 'AuroraPrivateSubnet1', {
			availabilityZone: availZones[0],
			cidrBlock: AURORA_SUBNET1_CIDR,
			vpcId: cfnVpc.ref
		});
		const cfnAuroraSubnet2 = new ec2.CfnSubnet(this, 'AuroraPrivateSubnet2', {
			availabilityZone: availZones[1],
			cidrBlock: AURORA_SUBNET2_CIDR,
			vpcId: cfnVpc.ref
		});
		const cfnAuroraProxySubnet1 = new ec2.CfnSubnet(this, 'AuroraProxyPrivateSubnet1', {
			availabilityZone: availZones[0],
			cidrBlock: AURORA_PROXY_SUBNET1_CIDR,
			vpcId: cfnVpc.ref
		});
		const cfnAuroraProxySubnet2 = new ec2.CfnSubnet(this, 'AuroraProxyPrivateSubnet2', {
			availabilityZone: availZones[1],
			cidrBlock: AURORA_PROXY_SUBNET2_CIDR,
			vpcId: cfnVpc.ref
		});
		const cfnQsSubnet1 = new ec2.CfnSubnet(this, 'QuicksightPrivateSubnet1', {
			availabilityZone: availZones[0],
			cidrBlock: QUICKSIGHT_SUBNET1_CIDR,
			vpcId: cfnVpc.ref
		});
		const cfnQsSubnet2 = new ec2.CfnSubnet(this, 'QuicksightPrivateSubnet2', {
			availabilityZone: availZones[1],
			cidrBlock: QUICKSIGHT_SUBNET2_CIDR,
			vpcId: cfnVpc.ref
		});
		const cfnLambdaSubnet1 = new ec2.CfnSubnet(this, 'LambdaPrivateSubnet1', {
			availabilityZone: availZones[0],
			cidrBlock: LAMBDA_SUBNET1_CIDR,
			vpcId: cfnVpc.ref
		});
		const cfnLambdaSubnet2 = new ec2.CfnSubnet(this, 'LambdaPrivateSubnet2', {
			availabilityZone: availZones[1],
			cidrBlock: LAMBDA_SUBNET2_CIDR,
			vpcId: cfnVpc.ref
		});
		const natSubnet = new ec2.PublicSubnet(this, 'NatSubnet', {
			availabilityZone: availZones[0],
			cidrBlock: NAT_SUBNET_CIDR,
			vpcId: cfnVpc.ref
		});
		/**************************************************************************************/

		/*********************************** Route Table **************************************/
		const cfnCommonRouteTable = new ec2.CfnRouteTable(this, 'CommonRouteTable', {
			vpcId: cfnVpc.ref
		});
		const cfnLambdaRouteTable = new ec2.CfnRouteTable(this, 'LambdaRouteTable', {
			vpcId: cfnVpc.ref
		});
		new ec2.CfnSubnetRouteTableAssociation(this, 'AuroraSubnetAssoc1', {
			routeTableId: cfnCommonRouteTable.attrRouteTableId,
			subnetId: cfnAuroraSubnet1.ref
		});
		new ec2.CfnSubnetRouteTableAssociation(this, 'AuroraSubnetAssoc2', {
			routeTableId: cfnCommonRouteTable.attrRouteTableId,
			subnetId: cfnAuroraSubnet2.ref
		});
		new ec2.CfnSubnetRouteTableAssociation(this, 'AuroraProxySubnetAssoc1', {
			routeTableId: cfnCommonRouteTable.attrRouteTableId,
			subnetId: cfnAuroraProxySubnet1.ref
		});
		new ec2.CfnSubnetRouteTableAssociation(this, 'AuroraProxySubnetAssoc2', {
			routeTableId: cfnCommonRouteTable.attrRouteTableId,
			subnetId: cfnAuroraProxySubnet2.ref
		});
		new ec2.CfnSubnetRouteTableAssociation(this, 'QuicksightSubnetAssoc1', {
			routeTableId: cfnCommonRouteTable.attrRouteTableId,
			subnetId: cfnQsSubnet1.ref
		});
		new ec2.CfnSubnetRouteTableAssociation(this, 'QuicksightSubnetAssoc2', {
			routeTableId: cfnCommonRouteTable.attrRouteTableId,
			subnetId: cfnQsSubnet2.ref
		});
		new ec2.CfnSubnetRouteTableAssociation(this, 'LambdaSubnetAssoc1', {
			routeTableId: cfnLambdaRouteTable.attrRouteTableId,
			subnetId: cfnLambdaSubnet1.ref
		});
		new ec2.CfnSubnetRouteTableAssociation(this, 'LambdaSubnetAssoc2', {
			routeTableId: cfnLambdaRouteTable.attrRouteTableId,
			subnetId: cfnLambdaSubnet2.ref
		});
		/**************************************************************************************/
		/*********************************** NAT Gateway **************************************/
		const cfnIgw = new ec2.CfnInternetGateway(this, 'CfnIgw');
		const cfnVpcIgwAttach = new ec2.CfnVPCGatewayAttachment(this, 'CfnVpcIgwAttachment', {
			vpcId: cfnVpc.attrVpcId,
			internetGatewayId: cfnIgw.attrInternetGatewayId
		});
		natSubnet.addDefaultInternetRoute(cfnIgw.attrInternetGatewayId, cfnVpcIgwAttach);
		const natGw = natSubnet.addNatGateway();
		// Add route out to internet for lambda route tables
		new ec2.CfnRoute(this, 'NatRoute', {
			routeTableId: cfnLambdaRouteTable.attrRouteTableId,
			natGatewayId: natGw.ref,
			destinationCidrBlock: '0.0.0.0/0'
		});
		/**************************************************************************************/
		/**************************************************************************************/
		// Higher level VPC/Subnet construct required for other higher level constructs such as Security Groups
		const connWsVpc = ec2.Vpc.fromVpcAttributes(this, 'ConnectWorkshopVpcObj', {
			availabilityZones: availZones,
			vpcId: cfnVpc.ref,
			privateSubnetIds: [
				cfnAuroraSubnet1.ref,
				cfnAuroraSubnet2.ref,
				cfnAuroraProxySubnet1.ref,
				cfnAuroraProxySubnet2.ref,
				cfnQsSubnet1.ref,
				cfnQsSubnet2.ref,
				cfnLambdaSubnet1.ref,
				cfnLambdaSubnet2.ref
			],
			vpcCidrBlock: cfnVpc.attrCidrBlock,
			privateSubnetRouteTableIds: [
				cfnCommonRouteTable.attrRouteTableId,
				cfnCommonRouteTable.attrRouteTableId,
				cfnCommonRouteTable.attrRouteTableId,
				cfnCommonRouteTable.attrRouteTableId,
				cfnCommonRouteTable.attrRouteTableId,
				cfnCommonRouteTable.attrRouteTableId,
				cfnLambdaRouteTable.attrRouteTableId,
				cfnLambdaRouteTable.attrRouteTableId
			]
		});
		const lambdaSubnet1 = ec2.Subnet.fromSubnetAttributes(this, 'LambdaSubnet1', {
			subnetId: cfnLambdaSubnet1.ref,
			routeTableId: cfnLambdaRouteTable.attrRouteTableId
		});
		const lambdaSubnet2 = ec2.Subnet.fromSubnetAttributes(this, 'LambdaSubnet2', {
			subnetId: cfnLambdaSubnet2.ref,
			routeTableId: cfnLambdaRouteTable.attrRouteTableId
		});
		/**************************************************************************************/
		/**************************** Aurora Cluster Security Group ***************************/
		const auroraSg = new ec2.SecurityGroup(this, 'AuroraSecurityGroup', {
			vpc: connWsVpc,
			description: 'Security group for Aurora cluster',
			allowAllOutbound: false
		});
		auroraSg.addIngressRule(
			ec2.Peer.ipv4(cfnVpc.attrCidrBlock),
			ec2.Port.tcp(3306),
			'Allow inboud access on 3306 from within VPC'
		);
		/**************************************************************************************/
		/**************************** Aurora Cluster Proxy Security Group ***************************/
		const auroraProxySg = new ec2.SecurityGroup(this, 'AuroraProxySecurityGroup', {
			vpc: connWsVpc,
			description: 'Security group for Aurora cluster proxy',
			allowAllOutbound: false
		});
		auroraProxySg.addIngressRule(
			ec2.Peer.ipv4(cfnVpc.attrCidrBlock),
			ec2.Port.tcp(3306),
			'Allow inboud access on 3306 from within VPC'
		);
		auroraProxySg.addEgressRule(
			ec2.Peer.securityGroupId(auroraSg.securityGroupId),
			ec2.Port.tcp(3306),
			'Allow outboud access to Aurora sg on port 3306'
		);
		/**************************************************************************************/
		/****************************** Quicksight Security Group *****************************/
		const quicksightSg = new ec2.SecurityGroup(this, 'QuicksightSecurityGroup', {
			vpc: connWsVpc,
			description: 'Security group for Quicksight',
			allowAllOutbound: false
		});
		quicksightSg.addIngressRule(
			ec2.Peer.securityGroupId(auroraSg.securityGroupId),
			ec2.Port.allTraffic(),
			'Allow inboud access from Aurora sg'
		);
		quicksightSg.addEgressRule(
			ec2.Peer.securityGroupId(auroraSg.securityGroupId),
			ec2.Port.tcp(3306),
			'Allow outboud access to Aurora sg on port 3306'
		);
		/**************************************************************************************/
		/****************************** Lambda Security Group *****************************/
		const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
			vpc: connWsVpc,
			description: 'Security group for Lambdas',
			allowAllOutbound: true
		});
		/**************************************************************************************/
		/********************** VPC Endpoints for outbond connectivity ************************/
		// S3 Endpoint
		connWsVpc.addGatewayEndpoint('s3VpcEndpoint', {
			service: ec2.GatewayVpcEndpointAwsService.S3
		});
		/**************************************************************************************/
		/*********************************** List of Outputs **********************************/
		new ssm.StringParameter(this, 'ParamConnectInstanceId', {
			stringValue: CONNECT_INSTANCE_ID,
			description: 'Connect instance id for workshop',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_CONNECT_INSTANCE_ID,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamConnectInstanceArn', {
			stringValue: CONNECT_INSTANCE_ARN,
			description: 'Connect instance arn for workshop',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_CONNECT_INSTANCE_ARN,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamVpcCidr', {
			stringValue: cfnVpc.attrCidrBlock,
			description: 'Connect workshop VPC CIDR',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_VPC_CIDR,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamVpcId', {
			stringValue: connWsVpc.vpcId,
			description: 'Connect workshop VPC Id',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_VPC_ID,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamAuroraSubnet1Id', {
			stringValue: cfnAuroraSubnet1.ref,
			description: 'Connect workshop VPC Aurora Subnet1 id',
			parameterName: SSM_PARAM_VPC_AURORA_SUBNET_ID_1,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamAuroraSubnet2Id', {
			stringValue: cfnAuroraSubnet2.ref,
			description: 'Connect workshop VPC Aurora Subnet2 id',
			parameterName: SSM_PARAM_VPC_AURORA_SUBNET_ID_2,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamAuroraProxySubnet1Id', {
			stringValue: cfnAuroraProxySubnet1.ref,
			description: 'Connect workshop VPC Aurora Proxy Subnet1 id',
			parameterName: SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_1,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamAuroraProxySubnet2Id', {
			stringValue: cfnAuroraProxySubnet2.ref,
			description: 'Connect workshop VPC Aurora Proxy Subnet2 id',
			parameterName: SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_2,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamQuickSightSubnet1Id', {
			stringValue: cfnQsSubnet1.ref,
			description: 'Connect workshop VPC QuickSight Subnet1 id',
			parameterName: SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_1,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamQuickSightSubnet2Id', {
			stringValue: cfnQsSubnet2.ref,
			description: 'Connect workshop VPC QuickSight Subnet2 id',
			parameterName: SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_2,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamLambdaSubnet1Id', {
			stringValue: cfnLambdaSubnet1.ref,
			description: 'Connect workshop VPC Lambda Subnet1 id',
			parameterName: SSM_PARAM_VPC_LAMBDA_SUBNET_ID_1,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamLambdaSubnet2Id', {
			stringValue: cfnLambdaSubnet2.ref,
			description: 'Connect workshop VPC Lambda Subnet2 id',
			parameterName: SSM_PARAM_VPC_LAMBDA_SUBNET_ID_2,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamNatSubnetId', {
			stringValue: natSubnet.subnetId,
			description: 'Connect workshop VPC NAT Subnet id',
			parameterName: SSM_PARAM_VPC_NAT_SUBNET_ID,
			simpleName: false
		});

		new ssm.StringListParameter(this, 'ParamVpcAvailZoneList', {
			stringListValue: connWsVpc.availabilityZones,
			description: 'Connect workshop VPC Availability Zones',
			parameterName: SSM_PARAM_VPC_AVAIL_ZONE_LIST,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamAuroraSg', {
			stringValue: auroraSg.securityGroupId,
			description: 'Connect workshop Aurora security group Id',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_AURORA_SEC_GROUP_ID,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamAuroraProxySg', {
			stringValue: auroraProxySg.securityGroupId,
			description: 'Connect workshop Aurora proxy security group Id',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_AURORA_PROXY_SEC_GROUP_ID,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamQuicksightSg', {
			stringValue: quicksightSg.securityGroupId,
			description: 'Connect workshop Qucksight security group Id',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_QUICKSIGHT_SEC_GROUP_ID,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamLambdaSg', {
			stringValue: lambdaSg.securityGroupId,
			description: 'Connect workshop lambda security group Id',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_LAMBDA_SEC_GROUP_ID,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamCommonRouteTable', {
			stringValue: cfnCommonRouteTable.ref,
			description: 'Connect workshop VPC common route table',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_VPC_COMMON_ROUTE_TABLE,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamLambdaRouteTable', {
			stringValue: cfnLambdaRouteTable.ref,
			description: 'Connect workshop VPC lambda route table',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_VPC_LAMBDA_ROUTE_TABLE,
			simpleName: false
		});
		/************************************* End Outputs ************************************/
	}
}
