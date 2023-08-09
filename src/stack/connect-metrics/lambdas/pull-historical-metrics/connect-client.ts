'use strict';

import {
	ConnectClient,
	GetMetricDataCommand,
	GetMetricDataCommandInput,
	GetMetricDataCommandOutput,
	HistoricalMetricResult
} from '@aws-sdk/client-connect';
import { HistoricalConnectMetrics, ConnectQueue } from '/opt/connect-metrics/model';
import { ConnectClientUtil } from '/opt/connect-metrics/connect-util';

export class ConnectMetricClient {
	private connectClient = new ConnectClient({
		region: String(process.env['REGION'])
	});
	private util = new ConnectClientUtil();

	/**
	 * Returns historical metric data
	 * @returns
	 */
	async getMetricData() {
		console.info('Retrieve historical metrics from Connect...');

		// Get list of queues for which metrics are to be pulled
		const queueMap: Map<string, ConnectQueue> = await this.util.getQueues();
		console.info('Number of queues: ' + queueMap.size);

		// Pull metric data
		// Metric data can be pulled for max 100 queues at a time.
		// So the queuemap needs to be divided into groups of 100 before pulling metrics
		const groupSize = 100;
		const finalMetricModelObjList: HistoricalConnectMetrics[] = [];
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
			const interimMetricModelObjList: HistoricalConnectMetrics[] =
				await this.pullMetricData(subQueueMap);
			finalMetricModelObjList.push(...interimMetricModelObjList);
		} while (queueMap.size > 0);

		console.debug('Final dataset: ' + JSON.stringify(finalMetricModelObjList));
		return finalMetricModelObjList;
	}

	/**
	 * Retrieves historical metric data from Connect instance
	 * @param queueMap
	 * @returns
	 */
	private async pullMetricData(queueMap: Map<string, ConnectQueue>) {
		console.info('Pull historical metrics from Connect...');
		const finalMetricModelObjList: HistoricalConnectMetrics[] = [];
		const endTime: Date = this.getEndTime();
		const params: GetMetricDataCommandInput = {
			InstanceId: String(process.env.CONNECT_INSTANCE_ID),
			Filters: {
				Queues: Array.from(queueMap.keys()),
				Channels: ['VOICE']
			},
			StartTime: this.getStartTime(endTime),
			EndTime: endTime,
			Groupings: ['QUEUE'],
			HistoricalMetrics: [
				{
					Name: 'ABANDON_TIME',
					Unit: 'SECONDS',
					Statistic: 'AVG'
				},
				{
					Name: 'AFTER_CONTACT_WORK_TIME',
					Unit: 'SECONDS',
					Statistic: 'AVG'
				},
				{
					Name: 'API_CONTACTS_HANDLED',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CALLBACK_CONTACTS_HANDLED',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_ABANDONED',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_AGENT_HUNG_UP_FIRST',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_CONSULTED',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_HANDLED',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_HANDLED_INCOMING',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_HANDLED_OUTBOUND',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_HOLD_ABANDONS',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_MISSED',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_QUEUED',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_TRANSFERRED_IN',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_TRANSFERRED_IN_FROM_QUEUE',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_TRANSFERRED_OUT',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'CONTACTS_TRANSFERRED_OUT_FROM_QUEUE',
					Unit: 'COUNT',
					Statistic: 'SUM'
				},
				{
					Name: 'HANDLE_TIME',
					Unit: 'SECONDS',
					Statistic: 'AVG'
				},
				{
					Name: 'HOLD_TIME',
					Unit: 'SECONDS',
					Statistic: 'AVG'
				},
				{
					Name: 'INTERACTION_AND_HOLD_TIME',
					Unit: 'SECONDS',
					Statistic: 'AVG'
				},
				{
					Name: 'INTERACTION_TIME',
					Unit: 'SECONDS',
					Statistic: 'AVG'
				},
				{
					Name: 'OCCUPANCY',
					Unit: 'PERCENT',
					Statistic: 'AVG'
				},
				{
					Name: 'QUEUE_ANSWER_TIME',
					Unit: 'SECONDS',
					Statistic: 'AVG'
				},
				{
					Name: 'QUEUED_TIME',
					Unit: 'SECONDS',
					Statistic: 'MAX'
				}
			]
		};
		console.debug('GetMetricDataCommandInput: ' + JSON.stringify(params));
		const command = new GetMetricDataCommand(params);
		do {
			const response: GetMetricDataCommandOutput = await this.connectClient.send(command);
			console.debug('Response: ' + JSON.stringify(response));
			if (response.MetricResults && response.MetricResults.length > 0) {
				// Map the metric data to flattened model object
				const metricModelObjList = await this.mapToConnectMetricsModel(
					params,
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
	 * Calculates end time to be passed in the connect api request.
	 * Minutes in the end time should be multiples of 5. e.g. 10:05, 10:20 etc
	 * Seconds/milliseconds should be zero
	 * @returns
	 */
	private getEndTime() {
		const currentDate: Date = new Date();
		// const remainderMin = 5 - (currentDate.getMinutes() % 5);
		const remainderMin = currentDate.getMinutes() % 5;
		const remainderSec = currentDate.getSeconds();
		const remainderMillis = currentDate.getMilliseconds();
		return new Date(
			// currentDate.getTime() + remainderMin * 60000 - remainderSec * 1000 - remainderMillis
			currentDate.getTime() - remainderMin * 60000 - remainderSec * 1000 - remainderMillis
		);
	}

	/**
	 * Calculates start time based o reporting interval.
	 * E.g. if reporting interval is 30 min then start time is 30 min behind end time
	 * @param endTime
	 * @returns
	 */
	private getStartTime(endTime: Date) {
		const reportingIntervalMinutes = Number(process.env.REPORTING_INTERVAL_IN_MINUTES);
		return new Date(endTime.getTime() - reportingIntervalMinutes * 60000);
	}

	/**
	 * Maps individual metric result to a Model Object
	 * @param metricResults
	 * @param queueMap
	 * @returns
	 */
	private async mapToConnectMetricsModel(
		params: GetMetricDataCommandInput,
		metricResult: HistoricalMetricResult[],
		queueMap: Map<string, ConnectQueue>
	) {
		const metricModelObjList: HistoricalConnectMetrics[] = [];
		for (const result of metricResult) {
			const currentMetricsObj = new HistoricalConnectMetrics();
			currentMetricsObj.queueARN = String(result.Dimensions?.Queue?.Arn);
			currentMetricsObj.queueName = String(
				queueMap.get(currentMetricsObj.queueARN)?.queueName
			);
			currentMetricsObj.startTime = Number(params.StartTime?.getTime());
			currentMetricsObj.endTime = Number(params.EndTime?.getTime());
			if (result.Collections) {
				for (const collection of result.Collections) {
					if (collection.Metric?.Name == 'ABANDON_TIME') {
						currentMetricsObj.abandonTime = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'AFTER_CONTACT_WORK_TIME') {
						currentMetricsObj.afterContactWorkTime = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'API_CONTACTS_HANDLED') {
						currentMetricsObj.apiContactsHandled = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CALLBACK_CONTACTS_HANDLED') {
						currentMetricsObj.callbackContactsHandled = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_ABANDONED') {
						currentMetricsObj.contactsAbandoned = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_AGENT_HUNG_UP_FIRST') {
						currentMetricsObj.contactsAgentHungUpFirst = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_CONSULTED') {
						currentMetricsObj.contactsConsulted = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_HANDLED') {
						currentMetricsObj.contactsHandled = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_HANDLED_INCOMING') {
						currentMetricsObj.contactsHandledIncoming = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_HANDLED_OUTBOUND') {
						currentMetricsObj.contactsHandledOutbound = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_HOLD_ABANDONS') {
						currentMetricsObj.contactsHoldAbandons = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_MISSED') {
						currentMetricsObj.contactsMissed = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_QUEUED') {
						currentMetricsObj.contactsQueued = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_TRANSFERRED_IN') {
						currentMetricsObj.contactsTransferedIn = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_TRANSFERRED_IN_FROM_QUEUE') {
						currentMetricsObj.contactsTransferedInFromQueue = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_TRANSFERRED_OUT') {
						currentMetricsObj.contactsTransferedOut = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'CONTACTS_TRANSFERRED_OUT_FROM_QUEUE') {
						currentMetricsObj.contactsTransferedOutFromQueue = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'HANDLE_TIME') {
						currentMetricsObj.handleTime = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'HOLD_TIME') {
						currentMetricsObj.holdTime = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'INTERACTION_AND_HOLD_TIME') {
						currentMetricsObj.interationAndHoldTime = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'INTERACTION_TIME') {
						currentMetricsObj.interationTime = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'OCCUPANCY') {
						currentMetricsObj.occupancy = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'QUEUE_ANSWER_TIME') {
						currentMetricsObj.queueAnswerTime = Number(collection.Value);
					}
					if (collection.Metric?.Name == 'QUEUED_TIME') {
						currentMetricsObj.queuedTime = Number(collection.Value);
					}
				}
			}
			metricModelObjList.push(currentMetricsObj);
		}
		return metricModelObjList;
	}
}
