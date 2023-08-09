'use strict';

import { execute, query } from '/opt/common/common-util';
import { CurrentConnectMetrics } from '/opt/connect-metrics/model';
import { RdsClientUtil } from '/opt/connect-metrics/rds-util';

export class RdsClient {
	private util = new RdsClientUtil();
	private dbTable = 'current_metric_data';

	async saveCurrentMetricData(metricObjList: CurrentConnectMetrics[]) {
		const logPefix = 'saveCurrentUserData >>';
		console.info(`${logPefix} Saving current metric data...`);

		// Get the list of queues in db
		const queueArns: string[] = await this.util.getListOfQueues(this.dbTable);

		// Segregate Inserts and Updates
		const insertList: CurrentConnectMetrics[] = [];
		const updateList: CurrentConnectMetrics[] = [];
		for (const metricObj of metricObjList) {
			if (queueArns.includes(metricObj.queueARN)) {
				updateList.push(metricObj);
			} else {
				insertList.push(metricObj);
			}
		}

		// Process Batch Updates
		if (updateList.length > 0) {
			console.info('Processing batch updates...');
			await this.updateBatchData(updateList);
		}

		// Process Batch Inserts
		if (insertList.length > 0) {
			console.info('Processing batch inserts...');
			await this.saveBatchData(this.getInsertSql(), this.buildParameterSets(insertList));
		}
	}
	/**
	 * Save data in batch mode
	 * @param sql
	 * @param parameterSets
	 */
	private async updateBatchData(updatedCurrentMetric: CurrentConnectMetrics[]) {
		const logPrefix = 'updateBatchData >>';
		console.info(`${logPrefix} Execute SQL update current metric data...`);
		for (const metric of updatedCurrentMetric) {
			const values = [
				metric.queueName,
				metric.agentsOnline,
				metric.agentsAvailable,
				metric.agentsOnCall,
				metric.agentsStaffed,
				metric.agentsACW,
				metric.agentsNPT,
				metric.agentsError,
				metric.agentsOnContact,
				metric.inQueue,
				metric.oldestContact,
				metric.scheduled,
				metric.slotsActive,
				metric.slotsAvailable,
				metric.queueARN
			];
			const sql = this.getUpdateSql();
			// run SQL command
			await execute(
				String(process.env['AURORA_PROXY_ENDPOINT']),
				String(process.env['AURORA_USER_NAME']),
				Number(process.env['AURORA_MYSQL_PORT']),
				String(process.env['AURORA_DB_NAME']),
				sql,
				values
			);
		}
	}

	/**
	 * Save data in batch mode
	 * @param sql
	 * @param parameterSets
	 */
	private async saveBatchData(sql: string, parameterSets?: any) {
		const logPrefix = 'saveBatchData >>';
		console.info(
			`${logPrefix} Execute SQL to batch insert/update current metric data...`
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
		return;
	}

	/**
	 * Insert SQL
	 * @returns
	 */
	private getInsertSql() {
		const logPrefix = 'getInsertSql >>';
		console.debug(`${logPrefix} Build insert SQL...`);
		const columns = [
			'queue_arn',
			'queue_name',
			'agents_online',
			'agents_available',
			'agents_on_call',
			'agents_staffed',
			'agents_acw',
			'agents_npt',
			'agents_error',
			'agents_on_contact',
			'in_queue',
			'oldest_contact',
			'scheduled',
			'slots_active',
			'slots_available'
		];
		const sql = `INSERT INTO ${this.dbTable} (${columns.join(',')}) VALUES ? `;
		console.debug(`${logPrefix} SQL: ${sql}`);
		return sql;
	}

	/**
	 * Update SQL
	 * @returns
	 */
	private getUpdateSql() {
		const logPrefix = 'getUpdateSql >>';
		console.debug(`${logPrefix} Build update SQL...`);
		const sql = `UPDATE ${this.dbTable} SET
			queue_name = ?,
			agents_online = ?,
			agents_available = ?,
			agents_on_call = ?,
			agents_staffed = ?,
			agents_acw = ?,
			agents_npt = ?,
			agents_error = ?,
			agents_on_contact = ?,
			in_queue = ?,
			oldest_contact = ?,
			scheduled = ?,
			slots_active = ?,
			slots_available = ?
			WHERE queue_arn = ? `;
		return sql;
	}

	/**
	 * Builds parameters sets for batch insert
	 * @param metricObjList
	 * @returns
	 */
	private buildParameterSets(metricObjList: CurrentConnectMetrics[]) {
		const parameterSets = [];
		for (const metricObj of metricObjList) {
			const paramSet = [
				metricObj.queueARN,
				metricObj.queueName,
				metricObj.agentsOnline,
				metricObj.agentsAvailable,
				metricObj.agentsOnCall,
				metricObj.agentsStaffed,
				metricObj.agentsACW,
				metricObj.agentsNPT,
				metricObj.agentsError,
				metricObj.agentsOnContact,
				metricObj.inQueue,
				metricObj.oldestContact,
				metricObj.scheduled,
				metricObj.slotsActive,
				metricObj.slotsAvailable
			];
			// Add to parameter sets
			parameterSets.push(paramSet);
		}
		return parameterSets;
	}
}
