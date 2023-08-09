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
	GetCurrentMetricDataCommand,
	GetCurrentMetricDataCommandInput,
	GetCurrentMetricDataCommandOutput,
	CurrentMetricResult
} from '@aws-sdk/client-connect';
import { CurrentConnectMetrics, ConnectQueue } from '/opt/connect-metrics/model';
import { ConnectClientUtil } from '/opt/connect-metrics/connect-util';

export class ConnectMetricClient {
	private connectClient = new ConnectClient({
		region: String(process.env['REGION'])
	});
	private util = new ConnectClientUtil();

	/**
	 * Returns current metric data from connect instance
	 * @returns
	 */
	async getCurrentMetricData() {
		console.info('Retrieve metrics from Connect...');

		// Get list of queues for which metrics are to be pulled
		const queueMap: Map<string, ConnectQueue> = await this.util.getQueues();
		console.info('Number of queues: ' + queueMap.size);

		// Pull metric data
		// Metric data can be pulled for max 100 queues at a time.
		// So the queuemap needs to be divided into groups of 100 before pulling metrics
		const groupSize = 100;
		const finalMetricModelObjList: CurrentConnectMetrics[] = [];
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
			console.debug('Pulling metrics for: ' + subQueueMap.size + ' queues');
			const interimMetricModelObjList: CurrentConnectMetrics[] =
				await this.pullCurrentMetricData(subQueueMap);
			finalMetricModelObjList.push(...interimMetricModelObjList);
		} while (queueMap.size > 0);

		console.debug('Final dataset: ' + JSON.stringify(finalMetricModelObjList));
		return finalMetricModelObjList;
	}

	/**
	 * Retrieves current metric data from Connect instance
	 * @param queueMap
	 * @returns
	 */
	private async pullCurrentMetricData(queueMap: Map<string, ConnectQueue>) {
		console.info('Pull metrics from Connect...');
		const finalMetricModelObjList: CurrentConnectMetrics[] = [];
		const params: GetCurrentMetricDataCommandInput = {
			InstanceId: String(process.env.CONNECT_INSTANCE_ID),
			Filters: {
				Queues: Array.from(queueMap.keys()),
				Channels: ['VOICE']
			},
			CurrentMetrics: [
				{
					Name: 'AGENTS_ONLINE',
					Unit: 'COUNT'
				},
				{
					Name: 'AGENTS_AVAILABLE',
					Unit: 'COUNT'
				},
				{
					Name: 'AGENTS_ON_CALL',
					Unit: 'COUNT'
				},
				{
					Name: 'AGENTS_STAFFED',
					Unit: 'COUNT'
				},
				{
					Name: 'AGENTS_AFTER_CONTACT_WORK',
					Unit: 'COUNT'
				},
				{
					Name: 'AGENTS_NON_PRODUCTIVE',
					Unit: 'COUNT'
				},
				{
					Name: 'AGENTS_ERROR',
					Unit: 'COUNT'
				},
				{
					Name: 'AGENTS_ON_CONTACT',
					Unit: 'COUNT'
				},
				{
					Name: 'CONTACTS_IN_QUEUE',
					Unit: 'COUNT'
				},
				{
					Name: 'OLDEST_CONTACT_AGE',
					Unit: 'SECONDS'
				}, //returned in milliseconds
				{
					Name: 'CONTACTS_SCHEDULED',
					Unit: 'COUNT'
				},
				{
					Name: 'SLOTS_ACTIVE',
					Unit: 'COUNT'
				},
				{
					Name: 'SLOTS_AVAILABLE',
					Unit: 'COUNT'
				}
			],
			Groupings: ['QUEUE']
		};
		console.debug('GetCurrentMetricDataRequest: ' + JSON.stringify(params));
		const command = new GetCurrentMetricDataCommand(params);
		do {
			const response: GetCurrentMetricDataCommandOutput = await this.connectClient.send(
				command
			);
			console.debug('Response: ' + JSON.stringify(response));
			if (response.MetricResults && response.MetricResults.length > 0) {
				// Map the metric data to flattened model object
				const metricModelObjList = await this.mapToConnectMetricsModel(
					response.MetricResults,
					queueMap
				);
				// Merge into final list
				finalMetricModelObjList.push(...metricModelObjList);
			} else {
				console.info('No metric data available');
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
	 * @param metricData
	 * @param queueMap
	 * @returns
	 */
	private async mapToConnectMetricsModel(
		metricResults: CurrentMetricResult[],
		queueMap: Map<string, ConnectQueue>
	) {
		const metricModelObjList: CurrentConnectMetrics[] = [];
		for (const result of metricResults) {
			const currentMetricsObj = new CurrentConnectMetrics();
			currentMetricsObj.queueARN = String(result.Dimensions?.Queue?.Arn);
			currentMetricsObj.queueName = String(
				queueMap.get(currentMetricsObj.queueARN)?.queueName
			);
			if (result.Collections) {
				for (const collection of result.Collections) {
					if (collection.Metric?.Name == 'AGENTS_ONLINE') {
						currentMetricsObj.agentsOnline = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'AGENTS_AVAILABLE') {
						currentMetricsObj.agentsAvailable = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'AGENTS_ON_CALL') {
						currentMetricsObj.agentsOnCall = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'AGENTS_STAFFED') {
						currentMetricsObj.agentsStaffed = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'AGENTS_AFTER_CONTACT_WORK') {
						currentMetricsObj.agentsACW = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'AGENTS_NON_PRODUCTIVE') {
						currentMetricsObj.agentsNPT = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'AGENTS_ERROR') {
						currentMetricsObj.agentsError = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'AGENTS_ON_CONTACT') {
						currentMetricsObj.agentsOnContact = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_IN_QUEUE') {
						currentMetricsObj.inQueue = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'OLDEST_CONTACT_AGE') {
						currentMetricsObj.oldestContact = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_SCHEDULED') {
						currentMetricsObj.scheduled = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'SLOTS_ACTIVE') {
						currentMetricsObj.slotsActive = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'SLOTS_AVAILABLE') {
						currentMetricsObj.slotsAvailable = Number(collection.Value);
					}
				}
			}
			metricModelObjList.push(currentMetricsObj);
		}
		return metricModelObjList;
	}
}
