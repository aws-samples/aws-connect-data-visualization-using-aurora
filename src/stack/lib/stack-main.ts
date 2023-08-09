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
import { Stack, StackProps } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_ssm as ssm } from 'aws-cdk-lib';
import {
	SSM_PARAM_COMMON_LIB_LAYER,
	SSM_PARAM_CONNECT_METRICS_LAYER,
	SSM_PARAM_EXT_LIB_LAYER
} from '../../util/cdk-utils';

/**
 * Stack to deploy common components and lambda layers required for the project
 */
export class CommonLibStackMain extends Stack {
	// Base path layers
	private basePathLayers = 'dist/stack/lib/layer';

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);
		this.create();
	}

	private create() {
		/****************************** Create Common Lambda Layer *****************************/
		// Layer with common code
		const commonLayer: lambda.ILayerVersion = new lambda.LayerVersion(
			this,
			'CommonLibLayer',
			{
				code: lambda.Code.fromAsset(this.basePathLayers.concat('/common')),
				compatibleRuntimes: [lambda.Runtime.NODEJS_14_X]
			}
		);
		/***************************************************************************************/

		/****************************** Create Connect Metrics Layer *****************************/
		// Layer for Connect Metrics common code
		const connectMetricsLayer: lambda.ILayerVersion = new lambda.LayerVersion(
			this,
			'ConnectMetricsLayer',
			{
				code: lambda.Code.fromAsset(this.basePathLayers.concat('/connect-metrics')),
				compatibleRuntimes: [lambda.Runtime.NODEJS_14_X]
			}
		);
		/***************************************************************************************/

		/******************** Create Lambda Layer with external libraries **********************/
		// Layer with third party libs
		const externalLibLayer: lambda.ILayerVersion = new lambda.LayerVersion(
			this,
			'ExternalLibLayer',
			{
				code: lambda.Code.fromAsset(this.basePathLayers.concat('/external-lib')),
				compatibleRuntimes: [lambda.Runtime.NODEJS_14_X]
			}
		);
		/****************************************************************************************/

		/************************** List of outputs to parameter store **************************/
		new ssm.StringParameter(this, 'ParamCommonLibLayer', {
			stringValue: commonLayer.layerVersionArn,
			description: 'Layer version arn for common lib layer',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_COMMON_LIB_LAYER,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamConnectMetricsLayer', {
			stringValue: connectMetricsLayer.layerVersionArn,
			description: 'Layer version arn for connect metrics layer',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_CONNECT_METRICS_LAYER,
			simpleName: false
		});

		new ssm.StringParameter(this, 'ParamExtLibLayer', {
			stringValue: externalLibLayer.layerVersionArn,
			description: 'Layer version arn for exteral lib layer',
			dataType: ssm.ParameterDataType.TEXT,
			parameterName: SSM_PARAM_EXT_LIB_LAYER,
			simpleName: false
		});
		/************************************* End outputs **************************************/
	}
}
