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

import {
	ConnectClient,
	ListQueuesCommand,
	ListQueuesCommandInput,
	ListQueuesCommandOutput,
	ListRoutingProfilesCommand,
	ListRoutingProfilesCommandInput,
	ListRoutingProfilesCommandOutput,
	ListAgentStatusesCommand,
	ListAgentStatusesCommandInput,
	ListAgentStatusesCommandOutput,
	ListUsersCommand,
	ListUsersCommandInput,
	ListUsersCommandOutput
} from '@aws-sdk/client-connect';
import { ConnectQueue, ConnectMetaData } from './model';
import { exponentialBackoffDelay } from '/opt/common/common-util';

/**
 * Common utility class for Connect client
 */
export class ConnectClientUtil {
	private connectClient = new ConnectClient({
		region: String(process.env['REGION'])
	});
	private maxRetryAttempts = 1;

	/**
	 * Retrieves list of queues from connect instance
	 * @returns
	 */
	async getQueues() {
		console.info('Fetch queue arns from Connect...');
		const queueMap: Map<string, ConnectQueue> = new Map<string, ConnectQueue>();
		const params: ListQueuesCommandInput = {
			InstanceId: String(process.env.CONNECT_INSTANCE_ID),
			QueueTypes: ['STANDARD']
		};
		const command = new ListQueuesCommand(params);
		let attempt = 0;
		let retry = false;
		do {
			try {
				const response: ListQueuesCommandOutput = await this.connectClient.send(command);
				console.debug(JSON.stringify(response));
				retry = false;
				// Add to list of queues
				if (response && response.QueueSummaryList) {
					for (const queue of response.QueueSummaryList) {
						const connectQueue = new ConnectQueue();
						connectQueue.queueARN = String(queue.Arn);
						connectQueue.queueName = String(queue.Name);
						queueMap.set(connectQueue.queueARN, connectQueue);
					}
				}
				// Get remaining data if avaialble
				if (response && response.NextToken) {
					params.NextToken = response.NextToken;
				}
			} catch (ex: any) {
				if (ex.retryable && attempt < this.maxRetryAttempts) {
					console.error(JSON.stringify(ex));
					retry = true;
					attempt = attempt + 1;
					await exponentialBackoffDelay(attempt, 2000);
				} else {
					retry = false;
					throw ex;
				}
			}
		} while (retry || params.NextToken);
		return queueMap;
	}

	//
	async getRoutingProfiles() {
		console.info('Fetch routing profiles arns from Connect...');
		const routingProfilesList: Array<ConnectMetaData> = new Array<ConnectMetaData>();
		const params: ListRoutingProfilesCommandInput = {
			InstanceId: String(process.env.CONNECT_INSTANCE_ID)
		};
		const command = new ListRoutingProfilesCommand(params);
		let attempt = 0;
		let retry = false;
		do {
			try {
				const response: ListRoutingProfilesCommandOutput = await this.connectClient.send(
					command
				);
				console.debug(JSON.stringify(response));
				retry = false;
				// Add to list of routing profiles
				if (response && response.RoutingProfileSummaryList) {
					for (const rp of response.RoutingProfileSummaryList) {
						const routingProfileMetaData = new ConnectMetaData();
						routingProfileMetaData.arn = String(rp.Arn);
						routingProfileMetaData.name = String(rp.Name);
						routingProfileMetaData.arn_type = 'routing profile';
						routingProfilesList.push(routingProfileMetaData);
					}
				}
				// Get remaining data if avaialble
				if (response && response.NextToken) {
					params.NextToken = response.NextToken;
				}
			} catch (ex: any) {
				if (ex.retryable && attempt < this.maxRetryAttempts) {
					console.error(JSON.stringify(ex));
					retry = true;
					attempt = attempt + 1;
					await exponentialBackoffDelay(attempt, 2000);
				} else {
					retry = false;
					throw ex;
				}
			}
		} while (retry || params.NextToken);
		return routingProfilesList;
	}

	//
	async getAgentStatus() {
		console.info('Fetch agent status arns from Connect...');
		const agentStatesList: Array<ConnectMetaData> = new Array<ConnectMetaData>();
		const params: ListAgentStatusesCommandInput = {
			InstanceId: String(process.env.CONNECT_INSTANCE_ID),
			AgentStatusTypes: ['ROUTABLE', 'CUSTOM', 'OFFLINE']
		};
		const command = new ListAgentStatusesCommand(params);
		let attempt = 0;
		let retry = false;
		do {
			try {
				const response: ListAgentStatusesCommandOutput = await this.connectClient.send(
					command
				);
				console.debug(JSON.stringify(response));
				retry = false;
				// Add to list of routing profiles
				if (response && response.AgentStatusSummaryList) {
					for (const as of response.AgentStatusSummaryList) {
						const agentStatusMetaData = new ConnectMetaData();
						agentStatusMetaData.arn = String(as.Arn);
						agentStatusMetaData.name = String(as.Name);
						agentStatusMetaData.arn_type = 'agent status';
						agentStatesList.push(agentStatusMetaData);
					}
				}
				// Get remaining data if avaialble
				if (response && response.NextToken) {
					params.NextToken = response.NextToken;
				}
			} catch (ex: any) {
				if (ex.retryable && attempt < this.maxRetryAttempts) {
					console.error(JSON.stringify(ex));
					retry = true;
					attempt = attempt + 1;
					await exponentialBackoffDelay(attempt, 2000);
				} else {
					retry = false;
					throw ex;
				}
			}
		} while (retry || params.NextToken);
		return agentStatesList;
	}

	//
	async getUsersList() {
		console.info('Fetch users list arns from Connect...');
		const usersList: Array<ConnectMetaData> = new Array<ConnectMetaData>();
		const params: ListUsersCommandInput = {
			InstanceId: String(process.env.CONNECT_INSTANCE_ID)
		};
		const command = new ListUsersCommand(params);
		let attempt = 0;
		let retry = false;
		do {
			try {
				const response: ListUsersCommandOutput = await this.connectClient.send(command);
				console.debug(JSON.stringify(response));
				retry = false;
				// Add to list of routing profiles
				if (response && response.UserSummaryList) {
					for (const ul of response.UserSummaryList) {
						const usersMetaData = new ConnectMetaData();
						usersMetaData.arn = String(ul.Arn);
						usersMetaData.name = String(ul.Username);
						usersMetaData.arn_type = 'users';
						usersList.push(usersMetaData);
					}
				}
				// Get remaining data if avaialble
				if (response && response.NextToken) {
					params.NextToken = response.NextToken;
				}
			} catch (ex: any) {
				if (ex.retryable && attempt < this.maxRetryAttempts) {
					console.error(JSON.stringify(ex));
					retry = true;
					attempt = attempt + 1;
					await exponentialBackoffDelay(attempt, 2000);
				} else {
					retry = false;
					throw ex;
				}
			}
		} while (retry || params.NextToken);
		return usersList;
	}

	//
	async getQueuesList() {
		console.info('Fetch queue list arns from Connect...');
		const queuesList: Array<ConnectMetaData> = new Array<ConnectMetaData>();
		const params: ListQueuesCommandInput = {
			InstanceId: String(process.env.CONNECT_INSTANCE_ID),
			QueueTypes: ['STANDARD']
		};
		const command = new ListQueuesCommand(params);
		let attempt = 0;
		let retry = false;
		do {
			try {
				const response: ListQueuesCommandOutput = await this.connectClient.send(command);
				console.debug(JSON.stringify(response));
				retry = false;
				// Add to list of routing profiles
				if (response && response.QueueSummaryList) {
					for (const ql of response.QueueSummaryList) {
						const queuesMetaData = new ConnectMetaData();
						queuesMetaData.arn = String(ql.Arn);
						queuesMetaData.name = String(ql.Name);
						queuesMetaData.arn_type = 'queue';
						queuesList.push(queuesMetaData);
					}
				}
				// Get remaining data if avaialble
				if (response && response.NextToken) {
					params.NextToken = response.NextToken;
				}
			} catch (ex: any) {
				if (ex.retryable && attempt < this.maxRetryAttempts) {
					console.error(JSON.stringify(ex));
					retry = true;
					attempt = attempt + 1;
					await exponentialBackoffDelay(attempt, 2000);
				} else {
					retry = false;
					throw ex;
				}
			}
		} while (retry || params.NextToken);
		return queuesList;
	}
}
