'use strict';

import { execute } from '/opt/common/common-util';

export class RdsClient {
	async getLatestInfo(dbTable: string) {
		const logPrefix = `getLatestInfo >> ${dbTable} >>`;
		console.info(`${logPrefix} Get latest info...`);
		// Get row count
		const rowCount = await this.getRowCount(dbTable);
		// Get last updated date
		const lastUpdated = await this.getLastUpdatedDateTime(dbTable);
		return {
			rowCount: rowCount,
			lastUpdated: lastUpdated
		};
	}

	/**
	 * Get number of rows in specified table
	 * @param dbTable
	 */
	private async getRowCount(dbTable: string) {
		const logPrefix = `getRowCount >> ${dbTable} >>`;
		const sql = `SELECT COUNT(*) as row_count FROM ${dbTable}`;
		console.debug(`${logPrefix} sql >> ${sql}`);
		const response = await execute(
			String(process.env['AURORA_PROXY_ENDPOINT']),
			String(process.env['AURORA_USER_NAME']),
			Number(process.env['AURORA_MYSQL_PORT']),
			String(process.env['AURORA_DB_NAME']),
			sql
		);
		console.debug(`${logPrefix} response >> ${JSON.stringify(response)}`);
		let rowCount = 0;
		if (response && response.values()) {
			console.debug(`${logPrefix}  response[0] >> ${JSON.stringify(response[0])}`);
			const records = JSON.parse(JSON.stringify(response[0]));
			rowCount = records[0].row_count;
		}
		console.debug(`${logPrefix} rowCount >> ${JSON.stringify(rowCount)}`);
		return rowCount;
	}

	/**
	 * Get datetime when the specified table was last updated
	 * @param dbTable
	 */
	private async getLastUpdatedDateTime(dbTable: string) {
		const logPrefix = `getRowCount >> ${dbTable} >>`;
		const sql = `SELECT MAX(last_updated_at) as last_updated FROM ${dbTable}`;
		console.debug(`${logPrefix} sql >> ${sql}`);
		const response = await execute(
			String(process.env['AURORA_PROXY_ENDPOINT']),
			String(process.env['AURORA_USER_NAME']),
			Number(process.env['AURORA_MYSQL_PORT']),
			String(process.env['AURORA_DB_NAME']),
			sql
		);
		console.debug(`${logPrefix} response >> ${JSON.stringify(response)}`);
		let lastUpdated = '';
		if (response && response.values()) {
			console.debug(`${logPrefix} response[0] >> ${JSON.stringify(response[0])}`);
			const records = JSON.parse(JSON.stringify(response[0]));
			lastUpdated = records[0].last_updated;
		}
		console.debug(`${logPrefix} lastUpdated >> ${JSON.stringify(lastUpdated)}`);
		return lastUpdated;
	}
}
