'use strict';
import { HistoricalConnectMetrics } from '/opt/connect-metrics/model';
import { query } from '/opt/common/common-util';

export class RdsClient {
	private dbTable = 'historical_metric_data';

	/**
	 * Saves historical data to aurora db
	 * @param metricObjList
	 */
	async saveHistoricalMetricData(metricObjList: HistoricalConnectMetrics[]) {
		const logPefix = 'saveHistoricalMetricData >>';
		console.info(`${logPefix} Saving historical metric data...`);
		await this.saveBatchData(this.getInsertSql(), this.buildParameterSets(metricObjList));
	}

	/**
	 * Saves data in batch mode
	 * @param sql
	 * @param parameterSets
	 */
	private async saveBatchData(sql: string, parameterSets: any) {
		const logPrefix = 'saveBatchData >>';
		console.info(
			`${logPrefix} Execute SQL to batch insert/update historical metric data...`
		);
		console.debug(`${logPrefix} Sql: ${JSON.stringify(sql)}`);
		console.debug(`${logPrefix} Values: ${JSON.stringify(parameterSets)}`);
		// run SQL command
		await query(
			String(process.env['AURORA_PROXY_ENDPOINT']),
			String(process.env['AURORA_USER_NAME']),
			Number(process.env['AURORA_MYSQL_PORT']),
			String(process.env['AURORA_DB_NAME']),
			sql,
			parameterSets
		);
	}

	/**
	 * Insert SQL
	 * @returns
	 */
	private getInsertSql() {
		const columns = [
			'queue_arn',
			'queue_name',
			'start_time',
			'end_time',
			'abandon_time',
			'after_contact_work_time',
			'api_contacts_handled',
			'callback_contacts_handled',
			'contacts_abandoned',
			'contacts_agent_hung_up_first',
			'contacts_consulted',
			'contacts_handled',
			'contacts_handled_incoming',
			'contacts_handled_outbound',
			'contacts_hold_abandons',
			'contacts_missed',
			'contacts_queued',
			'contacts_transferred_in',
			'contacts_transferred_in_from_queue',
			'contacts_transferred_out',
			'contacts_transferred_out_from_queue',
			'handle_time',
			'hold_time',
			'interaction_and_hold_time',
			'interaction_time',
			'occupancy',
			'queue_answer_time',
			'queued_time'
		];

		const sql = `INSERT INTO ${this.dbTable} (${columns.join(',')}) VALUES ? `;
		return sql;
	}

	/**
	 * Builds parameter sets for inserts/updates
	 * @param metricObjList
	 * @returns
	 */
	private buildParameterSets(metricObjList: HistoricalConnectMetrics[]) {
		const parameterSets = [];
		for (const metricObj of metricObjList) {
			const paramSet = [
				metricObj.queueARN,
				metricObj.queueName,
				metricObj.startTime,
				metricObj.endTime,
				metricObj.abandonTime,
				metricObj.afterContactWorkTime,
				metricObj.apiContactsHandled,
				metricObj.callbackContactsHandled,
				metricObj.contactsAbandoned,
				metricObj.contactsAgentHungUpFirst,
				metricObj.contactsConsulted,
				metricObj.contactsHandled,
				metricObj.contactsHandledIncoming,
				metricObj.contactsHandledOutbound,
				metricObj.contactsHoldAbandons,
				metricObj.contactsMissed,
				metricObj.contactsQueued,
				metricObj.contactsTransferedIn,
				metricObj.contactsTransferedInFromQueue,
				metricObj.contactsTransferedOut,
				metricObj.contactsTransferedOutFromQueue,
				metricObj.handleTime,
				metricObj.holdTime,
				metricObj.interationAndHoldTime,
				metricObj.interationTime,
				metricObj.occupancy,
				metricObj.queueAnswerTime,
				metricObj.queuedTime
			];
			// Add to parameter sets
			parameterSets.push(paramSet);
		}
		return parameterSets;
	}
}
