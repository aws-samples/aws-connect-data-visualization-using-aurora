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
export function getNormalizedResourceName(...names: string[]) {
	return names.join('').trim().replace(/ /g, '').replace(/\./g, '').replace(/-/g, '');
}

export function getNormalizedCfnExportedName(...names: string[]) {
	return names
		.join('-')
		.trim()
		.toUpperCase()
		.replace(/ /g, '-')
		.replace(/\./g, '-')
		.replace(/_/g, '-');
}

export const VPC_CIDR = '10.1.0.0/16';
export const AURORA_SUBNET1_CIDR = '10.1.0.0/24';
export const AURORA_SUBNET2_CIDR = '10.1.1.0/24';
export const AURORA_PROXY_SUBNET1_CIDR = '10.1.2.0/24';
export const AURORA_PROXY_SUBNET2_CIDR = '10.1.3.0/24';
export const QUICKSIGHT_SUBNET1_CIDR = '10.1.4.0/24';
export const QUICKSIGHT_SUBNET2_CIDR = '10.1.5.0/24';
export const LAMBDA_SUBNET1_CIDR = '10.1.6.0/24';
export const LAMBDA_SUBNET2_CIDR = '10.1.7.0/24';
export const NAT_SUBNET_CIDR = '10.1.8.0/24';
export const AURORA_DB_NAME = 'aws_connect_data';
export const AURORA_DB_USER_DEFAULT = 'admin';
export const AURORA_MYSQL_PORT = '3306';

export const SSM_PARAM_PREFIX = '/CONNECT_WORKSHOP';
export const SSM_PARAM_COMMON_LIB_LAYER = SSM_PARAM_PREFIX.concat(
	'/LAYER/COMMON_LIB_LAYER_ARN'
);
export const SSM_PARAM_CONNECT_METRICS_LAYER = SSM_PARAM_PREFIX.concat(
	'/LAYER/CONNECT_METRICS_LAYER_ARN'
);
export const SSM_PARAM_EXT_LIB_LAYER = SSM_PARAM_PREFIX.concat(
	'/LAYER/EXT_LIB_LAYER_ARN'
);
export const SSM_PARAM_VPC_CIDR = SSM_PARAM_PREFIX.concat('/VPC/CIDR');
export const SSM_PARAM_VPC_ID = SSM_PARAM_PREFIX.concat('/VPC/ID');
export const SSM_PARAM_VPC_AURORA_SUBNET_ID_1 = SSM_PARAM_PREFIX.concat(
	'/VPC/SUBNET/ID/AURORA/1'
);
export const SSM_PARAM_VPC_AURORA_SUBNET_ID_2 = SSM_PARAM_PREFIX.concat(
	'/VPC/SUBNET/ID/AURORA/2'
);
export const SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_1 = SSM_PARAM_PREFIX.concat(
	'/VPC/SUBNET/ID/AURORA/PROXY/1'
);
export const SSM_PARAM_VPC_AURORA_PROXY_SUBNET_ID_2 = SSM_PARAM_PREFIX.concat(
	'/VPC/SUBNET/ID/AURORA/PROXY/2'
);
export const SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_1 = SSM_PARAM_PREFIX.concat(
	'/VPC/SUBNET/ID/QUICKSIGHT/1'
);
export const SSM_PARAM_VPC_QUICKSIGHT_SUBNET_ID_2 = SSM_PARAM_PREFIX.concat(
	'/VPC/SUBNET/ID/QUICKSIGHT/2'
);
export const SSM_PARAM_VPC_LAMBDA_SUBNET_ID_1 = SSM_PARAM_PREFIX.concat(
	'/VPC/SUBNET/ID/LAMBDA/1'
);
export const SSM_PARAM_VPC_LAMBDA_SUBNET_ID_2 = SSM_PARAM_PREFIX.concat(
	'/VPC/SUBNET/ID/LAMBDA/2'
);
export const SSM_PARAM_VPC_NAT_SUBNET_ID = SSM_PARAM_PREFIX.concat('/VPC/SUBNET/ID/NAT');
export const SSM_PARAM_VPC_COMMON_ROUTE_TABLE = SSM_PARAM_PREFIX.concat(
	'/VPC/ROUTE_TABLE/COMMON'
);
export const SSM_PARAM_VPC_LAMBDA_ROUTE_TABLE = SSM_PARAM_PREFIX.concat(
	'/VPC/ROUTE_TABLE/LAMBDA'
);
export const SSM_PARAM_VPC_AVAIL_ZONE_LIST =
	SSM_PARAM_PREFIX.concat('/VPC/AVAIL_ZONE_LIST');
export const SSM_PARAM_AURORA_SEC_GROUP_ID = SSM_PARAM_PREFIX.concat('/VPC/SG/ID/AURORA');
export const SSM_PARAM_AURORA_PROXY_SEC_GROUP_ID = SSM_PARAM_PREFIX.concat(
	'/VPC/SG/ID/AURORA/PROXY'
);
export const SSM_PARAM_QUICKSIGHT_SEC_GROUP_ID = SSM_PARAM_PREFIX.concat(
	'/VPC/SG/ID/QUICKSIGHT'
);
export const SSM_PARAM_LAMBDA_SEC_GROUP_ID = SSM_PARAM_PREFIX.concat('/VPC/SG/ID/LAMBDA');
export const SSM_PARAM_AURORA_DB_NAME = SSM_PARAM_PREFIX.concat('/AURORA/DB_NAME');
export const SSM_PARAM_AURORA_CLUSTER_ARN =
	SSM_PARAM_PREFIX.concat('/AURORA/CLUSTER_ARN');
export const SSM_PARAM_AURORA_PROXY_ENDPOINT = SSM_PARAM_PREFIX.concat(
	'/AURORA/PROXY_ENDPOINT'
);
export const SSM_PARAM_AURORA_SECRET_ARN = SSM_PARAM_PREFIX.concat('/AURORA/SECRET_ARN');
export const SSM_PARAM_CONNECT_INSTANCE_ID =
	SSM_PARAM_PREFIX.concat('/CONNECT/INSTANCE_ID');
export const SSM_PARAM_CONNECT_INSTANCE_ARN = SSM_PARAM_PREFIX.concat(
	'/CONNECT/INSTANCE_ARN'
);
