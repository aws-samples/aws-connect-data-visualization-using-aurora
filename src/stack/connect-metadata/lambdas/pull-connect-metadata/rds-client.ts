'use strict';

import { execute, query } from '/opt/common/common-util';
import { ConnectMetaData } from '/opt/connect-metrics/model';
import { RdsClientUtil } from '/opt/connect-metrics/rds-util';

export class RdsClient {
	// private rdsDataService = new AWS.RDSDataService();
	private util = new RdsClientUtil();
	private dbTable = 'connect_metadata';

	async saveConnectMetaData(connectArnList: ConnectMetaData[]) {
		const logPrefix = 'saveConnectMetaData >>';
		console.info(`${logPrefix} Saving connect meta data...`);
		// Get the list of routing profiles
		const connectResourceArn: string[] = await this.util.getConnectMetaDataArn(
			this.dbTable
		);
		// Segregate Inserts and Updates
		const insertList: ConnectMetaData[] = [];
		const updateList: ConnectMetaData[] = [];
		for (const connectArnObj of connectArnList) {
			if (connectResourceArn.includes(connectArnObj.arn)) {
				updateList.push(connectArnObj);
			} else {
				insertList.push(connectArnObj);
			}
		}
		// Process Batch Updates
		if (updateList.length > 0) {
			console.info(`${logPrefix} Processing batch updates...`);
			await this.updateBatchData(updateList);
		}

		// Process Batch Inserts
		if (insertList.length > 0) {
			console.info(`${logPrefix} Processing batch inserts...`);
			await this.saveBatchData(
				this.getInsertSql(),
				this.buildInsertParameterSets(insertList)
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
		// prepare SQL command
		console.debug(`${logPrefix} Sql: ${JSON.stringify(sql)}`);
		console.debug(`${logPrefix} Values: ${JSON.stringify(parameterSets)}`);
		// run SQL command
		let response: any = null;
		response = await query(
			String(process.env['AURORA_PROXY_ENDPOINT']),
			String(process.env['AURORA_USER_NAME']),
			Number(process.env['AURORA_MYSQL_PORT']),
			String(process.env['AURORA_DB_NAME']),
			sql,
			parameterSets
		);
		console.debug(`${logPrefix} Response: ${JSON.stringify(response)}`);
	}

	/**
	 * Insert SQL
	 * @returns
	 */
	private getInsertSql() {
		const logPrefix = 'getInsertSql >>';
		console.debug(`${logPrefix} Build insert SQL...`);
		const columns = ['arn', 'name', 'arn_type'];
		const sql = `INSERT INTO ${this.dbTable} (` + columns.join(',') + ') VALUES ? ';
		console.debug(`${logPrefix} SQL: ${sql}`);
		return sql;
	}

	/**
	 * Save data in batch mode
	 * @param sql
	 * @param parameterSets
	 */
	private async updateBatchData(metadata: ConnectMetaData[]) {
		const logPrefix = 'updateBatchData >>';
		console.info(`${logPrefix} Execute SQL update connect meta data...`);

		for (const data of metadata) {
			const values = [data.name, data.arn_type, data.arn];
			const query = this.getUpdateSql();
			// run SQL command
			await execute(
				String(process.env['AURORA_PROXY_ENDPOINT']),
				String(process.env['AURORA_USER_NAME']),
				Number(process.env['AURORA_MYSQL_PORT']),
				String(process.env['AURORA_DB_NAME']),
				query,
				values
			);
		}
	}

	/**
	 * Update SQL
	 * @returns
	 */
	private getUpdateSql() {
		const logPrefix = 'getUpdateSql >>';
		console.debug(`${logPrefix} Build update SQL...`);
		const sql = `UPDATE ${this.dbTable} SET name = ?, arn_type = ? WHERE arn = ?`;
		console.debug(`${logPrefix} SQL: ${sql}`);
		return sql;
	}

	/**
	 * Builds parameters sets for batch insert
	 * @param userObjList
	 * @returns
	 */
	private buildInsertParameterSets(ConnectResourceArnObjList: ConnectMetaData[]) {
		const parameterSets: string[][] = [];
		let paramSet: string[] = [];
		for (const arnObj of ConnectResourceArnObjList) {
			paramSet = [arnObj.arn, arnObj.name, arnObj.arn_type];
			parameterSets.push(paramSet);
		}
		return parameterSets;
	}

	/**
	 * Builds parameters sets for batch update
	 * @param userObjList
	 * @returns
	 */
	private buildUpdateParameterSets(ConnectResourceArnObjList: ConnectMetaData[]) {
		const parameterSets: any[] = [];
		let paramSet = {};
		for (const arnObj of ConnectResourceArnObjList) {
			paramSet = { name: arnObj.name, arn_type: arnObj.arn_type, arn: arnObj.arn };
			parameterSets.push(paramSet);
		}
		return parameterSets;
	}
}
