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
	ConnectClient,
	GetCurrentUserDataCommand,
	GetCurrentUserDataCommandInput,
	GetCurrentUserDataCommandOutput,
	GetCurrentUserDataRequest,
	GetCurrentUserDataResponse,
	UserData
} from '@aws-sdk/client-connect';
import {
	CurrentUserData,
	ConnectQueue,
	ConnectMetaData
} from '/opt/connect-metrics/model';

import { ConnectClientUtil } from '/opt/connect-metrics/connect-util';

export class ConnectMetaDataClient {
	private connectClient = new ConnectClient({});
	private util = new ConnectClientUtil();

	async getRoutingProfiles() {
		console.info('Retrieve routing profiles from Connect...');
		const routingProfilesList: Array<ConnectMetaData> =
			await this.util.getRoutingProfiles();
		console.info('Number of routing profiles: ' + routingProfilesList.length);
		console.debug('Final dataset: ' + JSON.stringify(routingProfilesList));
		return routingProfilesList;
	}

	async getAgentStatus() {
		console.info('Retrieve agent status from Connect...');
		const agentStatusList: Array<ConnectMetaData> = await this.util.getAgentStatus();
		console.info('Number of agent status: ' + agentStatusList.length);
		console.debug('Final dataset: ' + JSON.stringify(agentStatusList));
		return agentStatusList;
	}

	async getUsers() {
		console.info('Retrieve users list from Connect...');
		const usersList: Array<ConnectMetaData> = await this.util.getUsersList();
		console.info('Number of users: ' + usersList.length);
		console.debug('Final dataset: ' + JSON.stringify(usersList));
		return usersList;
	}

	async getQueueList() {
		console.info('Retrieve queues list from Connect...');
		const queuesList: Array<ConnectMetaData> = await this.util.getQueuesList();
		console.info('Number of queues: ' + queuesList.length);
		console.debug('Final dataset: ' + JSON.stringify(queuesList));
		return queuesList;
	}
}
