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

export class ConnectUserDataClient {
	private connectClient = new ConnectClient({});
	private util = new ConnectClientUtil();

	/**
	 * Returns current metric data from connect instance
	 * @returns
	 */
	async getCurrentUserDataAgents() {
		console.info('Retrieve user data from Connect based on agents...');

		// Get list of queues for which user data is to be pulled
		const agentMetaDataList: Array<ConnectMetaData> = await this.util.getUsersList();
		const agentList: Array<string> = agentMetaDataList.map((agents) => {
			const agentId: string = agents.arn;
			return agentId.substring(agentId.lastIndexOf('/') + 1);
		});
		console.info('Number of agents: ' + agentList.length);

		const groupSize = 100;
		const finalUserDataModelObjList: CurrentUserData[] = [];
		for (
			let sizeTracker = 0;
			sizeTracker < agentList.length && sizeTracker < groupSize;
			sizeTracker = sizeTracker + groupSize
		) {
			const agentSubArray = agentList.slice(sizeTracker, sizeTracker + groupSize);
			console.debug('Pulling user data for: ' + agentSubArray.length + ' agents');
			const interimUserDataModelObjList: CurrentUserData[] =
				await this.pullCurrentUserDataAgentsFilter(agentSubArray);
			finalUserDataModelObjList.push(...interimUserDataModelObjList);
		}

		console.debug('Final dataset: ' + JSON.stringify(finalUserDataModelObjList));
		return finalUserDataModelObjList;
	}
	///------------------------

	/**
	 * Returns current metric data from connect instance
	 * @returns
	 */
	async getCurrentUserData() {
		console.info('Retrieve user data from Connect...');

		// Get list of queues for which user data is to be pulled
		const queueMap: Map<string, ConnectQueue> = await this.util.getQueues();
		console.info('Number of queues: ' + queueMap.size);

		// Pull user data
		// User data can be pulled for max 100 queues at a time.
		// So the queuemap needs to be divided into groups of 100 before pulling user data
		const groupSize = 100;
		const finalUserDataModelObjList: CurrentUserData[] = [];
		do {
			const subQueueMap: Map<string, ConnectQueue> = new Map<string, ConnectQueue>();
			let sizeTracker = 1;
			for (const entry of queueMap.entries()) {
				subQueueMap.set(entry[0], entry[1]);
				queueMap.delete(entry[0]);
				if (groupSize == sizeTracker) {
					break;
				}
				sizeTracker = sizeTracker + 1;
			}
			console.debug('Pulling user data for: ' + subQueueMap.size + ' queues');
			const interimUserDataModelObjList: CurrentUserData[] =
				await this.pullCurrentUserData(subQueueMap);
			finalUserDataModelObjList.push(...interimUserDataModelObjList);
		} while (queueMap.size > 0);

		console.debug('Final dataset: ' + JSON.stringify(finalUserDataModelObjList));
		return finalUserDataModelObjList;
	}

	private async pullCurrentUserDataAgentsFilter(userArray: string[]) {
		console.info('Pull user data from Connect using User Array...');
		const finalMetricModelObjList: CurrentUserData[] = [];
		const params: GetCurrentUserDataCommandInput = {
			InstanceId: String(process.env.CONNECT_INSTANCE_ID),
			Filters: {
				Agents: Array.from(userArray)
			}
		};

		console.debug('GetCurrentUserDataCommandInput: ' + JSON.stringify(params));
		do {
			const command = new GetCurrentUserDataCommand(params);
			const response: GetCurrentUserDataCommandOutput = await this.connectClient.send(
				command
			);
			console.debug('Response: ' + JSON.stringify(response));
			if (response.UserDataList && response.UserDataList.length > 0) {
				// Map the user data to flattened model object
				const userDataModelObjList = await this.mapToUserDataModel(response);
				// Merge into final list
				finalMetricModelObjList.push(...userDataModelObjList);
			} else {
				console.info('No user data available');
			}
			// Get remaining data if avaialble
			if (response && response.NextToken) {
				params.NextToken = response.NextToken;
			}
		} while (params.NextToken);
		return finalMetricModelObjList;
	}
	/**
	 * Retrieves current metric data from Connect instance
	 * @param queueMap
	 * @returns
	 */
	private async pullCurrentUserData(queueMap: Map<string, ConnectQueue>) {
		console.info('Pull user data from Connect...');
		const finalMetricModelObjList: CurrentUserData[] = [];
		// const params: GetCurrentUserDataRequest = {
		// 	InstanceId: String(process.env.CONNECT_INSTANCE_ID),
		// 	Filters: {
		// 		Queues: Array.from(queueMap.keys()),
		// 		ContactFilter: {
		// 			ContactStates: [
		// 				'INCOMING',
		// 				'PENDING',
		// 				'CONNECTING',
		// 				'CONNECTED',
		// 				'CONNECTED_ONHOLD',
		// 				'MISSED',
		// 				'ERROR',
		// 				'ENDED',
		// 				'REJECTED'
		// 			]
		// 		}
		// 	}
		// };
		const params: GetCurrentUserDataCommandInput = {
			InstanceId: String(process.env.CONNECT_INSTANCE_ID),
			Filters: {
				Queues: Array.from(queueMap.keys())
				// ContactFilter: {
				// 	ContactStates: [
				// 		'INCOMING',
				// 		'PENDING',
				// 		'CONNECTING',
				// 		'CONNECTED',
				// 		'CONNECTED_ONHOLD',
				// 		'MISSED',
				// 		'ERROR',
				// 		'ENDED',
				// 		'REJECTED'
				// 	]
				// }
			}
		};
		console.debug('GetCurrentUserDataCommandInput: ' + JSON.stringify(params));
		do {
			// const response: GetCurrentUserDataResponse = await this.connectClient
			// 	.getCurrentUserData(params)
			// 	.promise();
			const command = new GetCurrentUserDataCommand(params);
			const response: GetCurrentUserDataCommandOutput = await this.connectClient.send(
				command
			);
			console.debug('Response: ' + JSON.stringify(response));
			if (response.UserDataList && response.UserDataList.length > 0) {
				// Map the user data to flattened model object
				const userDataModelObjList = await this.mapToUserDataModel(response);
				// Merge into final list
				finalMetricModelObjList.push(...userDataModelObjList);
			} else {
				console.info('No user data available');
			}
			// Get remaining data if avaialble
			if (response && response.NextToken) {
				params.NextToken = response.NextToken;
			}
		} while (params.NextToken);
		return finalMetricModelObjList;
	}

	/**
	 * Maps connect api response to model object
	 * @param userData
	 * @param queueMap
	 * @returns
	 */
	private async mapToUserDataModel(userData: GetCurrentUserDataCommandOutput) {
		let userModelObjList: CurrentUserData[] = [];
		if (userData.UserDataList) {
			userModelObjList = await this.mapToModel(userData.UserDataList);
		}
		return userModelObjList;
	}

	private async mapToModel(userDataList: UserData[]) {
		const userDataModelObjList: CurrentUserData[] = [];
		for (const userData of userDataList) {
			const currentUserDataObj = new CurrentUserData();
			currentUserDataObj.userARN = String(userData.User?.Arn);
			currentUserDataObj.userId = String(userData.User?.Id);

			if (userData.RoutingProfile && userData.RoutingProfile.Arn) {
				currentUserDataObj.routingProfileARN = String(userData.RoutingProfile.Arn);
			}

			if (userData.RoutingProfile && userData.RoutingProfile.Id) {
				currentUserDataObj.routingProfileId = String(userData.RoutingProfile.Id);
			}

			if (userData.Status && userData.Status.StatusArn) {
				currentUserDataObj.statusARN = String(userData.Status.StatusArn);
			}

			if (userData.Status && userData.Status.StatusStartTimestamp) {
				currentUserDataObj.statusStartTime = String(userData.Status.StatusStartTimestamp);
			}

			userDataModelObjList.push(currentUserDataObj);
		}
		return userDataModelObjList;
	}
}
