#!/usr/bin/env node
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
import { App, Aspects, Tags } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import 'source-map-support/register';
import { AuroraDbSetupStackMain } from './stack/aurora-db-setup/stack-main';
import { AuroraStackMain } from './stack/aurora/stack-main';
import { ConnectMetaDataStack } from './stack/connect-metadata/stack-main';
import { ConnectMetricsStack } from './stack/connect-metrics/stack-main';
import { UserDataStack } from './stack/connect-user-data/stack-main';
import { CheckDataLoadStack } from './stack/dataload-check/stack-main';
import { InfraStackMain } from './stack/infra/stack-main';
import { CommonLibStackMain } from './stack/lib/stack-main';

const app = new App();
const appName = app.node.tryGetContext('appName');
const stackPrefix: string = appName ? `${appName}` : 'aws-connect-workshop';

new CommonLibStackMain(app, 'CommonLibStack', {
	stackName: `${stackPrefix}-common-lib`,
	description: 'Deploys common libaries and components'
});

new InfraStackMain(app, 'InfraStack', {
	stackName: `${stackPrefix}-infra`,
	description: 'Deploys VPC and associated infrastructure for the workshop'
});

new AuroraStackMain(app, 'AuroraServerlessStack', {
	stackName: `${stackPrefix}-aurora`,
	description: 'Deploys Aurora serverless cluster'
});

new AuroraDbSetupStackMain(app, 'AuroraDbSetupStack', {
	stackName: `${stackPrefix}-aurora-db-setup`,
	description: 'Deploys custom resource for setting up Aurora db'
});

new ConnectMetaDataStack(app, 'ConnectMetaDataStack', {
	stackName: `${stackPrefix}-connect-metadata`,
	description: 'Deploys metadata from connect instance.'
});

new ConnectMetricsStack(app, 'ConnectMetricsStack', {
	stackName: `${stackPrefix}-connect-metrics`,
	description:
		'Deploys workflow to pull current and historical metrics from connect instance.'
});

new UserDataStack(app, 'UserDataStack', {
	stackName: `${stackPrefix}-user-data`,
	description: 'Deploys workflow to pull user data from connect instance.'
});

new CheckDataLoadStack(app, 'CheckDataLoadStack', {
	stackName: `${stackPrefix}-check-dataload`,
	description: 'Checks to see if dataload is happening without issues.'
});

// Tag the stack
Tags.of(app).add('appName', app.node.tryGetContext('appName'));

// Integrate cdk-nag for compliance
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
