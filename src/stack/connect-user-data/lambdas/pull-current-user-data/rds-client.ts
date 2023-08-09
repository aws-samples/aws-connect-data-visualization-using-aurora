'use strict';

import { execute, query } from '/opt/common/common-util';
import { CurrentUserData } from '/opt/connect-metrics/model';
import { RdsClientUtil } from '/opt/connect-metrics/rds-util';

export class RdsClient {
	//private rdsDataService = new AWS.RDSDataService();
	private util = new RdsClientUtil();
	private dbTable = 'current_user_data';
	private dbMDTable = 'connect_metadata';

	async saveCurrentUserData(userObjList: CurrentUserData[]) {
		const logPefix = 'saveCurrentUserData >>';
		console.info(`${logPefix} Saving current user data...`);

		// Get the list of users in db
		const userArns: string[] = await this.util.getListOfUsers(this.dbTable);

		// Segregate Inserts and Updates
		const insertList: CurrentUserData[] = [];
		const updateList: CurrentUserData[] = [];
		for (const userObj of userObjList) {
			if (userArns.includes(userObj.userARN)) {
				updateList.push(userObj);
			} else {
				insertList.push(userObj);
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
			await this.saveBatchData(
				this.getInsertSql(),
				await this.buildParameterSets(insertList)
			);
		}
	}

	private async updateBatchData(updatedUserDataList: CurrentUserData[]) {
		const logPrefix = 'updateBatchData >>';
		console.info(`${logPrefix} Execute SQL update current user data...`);
		for (const userData of updatedUserDataList) {
			const userName = await this.getMetadataByArnAndType(userData.userARN, 'users');
			const rpName = await this.getMetadataByArnAndType(
				userData.routingProfileARN,
				'routing profile'
			);
			const statusName = await this.getMetadataByArnAndType(
				userData.statusARN,
				'agent status'
			);

			const values = [
				userName,
				userData.routingProfileARN,
				rpName,
				userData.statusStartTime,
				statusName,
				userData.userARN
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
		// prepare SQL command
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
			'user_arn',
			'user_name',
			'routing_profile_arn',
			'routing_profile_name',
			'status_start_time',
			'status_name'
		];
		const sql = `INSERT INTO ${this.dbTable} (${columns.join(',')}) VALUES ? `;
		console.debug(`${logPrefix} SQL: ${sql}`);
		return sql;
	}

	/**
	 * Update SQL
	 * @param userDataList
	 * @returns
	 */
	private getUpdateSql() {
		const logPrefix = 'getUpdateSql >>';
		console.debug(`${logPrefix} Build update SQL...`);
		const sql = `UPDATE ${this.dbTable} SET user_name = ?,routing_profile_arn = ?, routing_profile_name = ?, status_start_time = ?, status_name = ? WHERE user_arn = ?`;
		return sql;
	}

	/**
	 * Get metadata name by ARN and type of metadata
	 * @param arn
	 * @param arn_type
	 * @returns
	 */
	private async getMetadataByArnAndType(arn: string, arn_type: string) {
		const logPrefix = 'getMetadataByArnAndType >>';
		const paramSet = [arn, arn_type];
		const sql = `SELECT name FROM ${this.dbMDTable} WHERE arn=? AND arn_type=?`;
		console.info(`${logPrefix} Execute SQL to retrieve metadata by arn and type...`);
		// prepare SQL command
		console.debug(`Sql: ${JSON.stringify(sql)}`);
		console.debug(`Values: ${JSON.stringify(paramSet)}`);
		// run SQL command
		const response: any = await execute(
			String(process.env['AURORA_PROXY_ENDPOINT']),
			String(process.env['AURORA_USER_NAME']),
			Number(process.env['AURORA_MYSQL_PORT']),
			String(process.env['AURORA_DB_NAME']),
			sql,
			paramSet
		);
		console.debug(`${logPrefix} response >> ${JSON.stringify(response)}`);
		let mdName = 'NA';
		if (response && response.values()) {
			console.debug(`${logPrefix} response[0] >> ${JSON.stringify(response[0])}`);
			const records = JSON.parse(JSON.stringify(response[0]));
			mdName = records[0].name;
			console.debug(
				`${logPrefix} response[0] >> name >> ${JSON.stringify(records[0].name)}`
			);
		}
		return mdName;
	}

	/**
	 * Builds parameters sets for batch insert/updates
	 * @param userObjList
	 * @returns
	 */
	private async buildParameterSets(userObjList: CurrentUserData[]) {
		const logPrefix = 'buildParameterSets >>';
		console.info(`${logPrefix} Build parameter set for insert/update user data`);
		const parameterSets: any = [];
		for (const userObj of userObjList) {
			const userName = await this.getMetadataByArnAndType(userObj.userARN, 'users');
			const routingProfileName = await this.getMetadataByArnAndType(
				userObj.routingProfileARN,
				'routing profile'
			);
			const agentStatus = await this.getMetadataByArnAndType(
				userObj.statusARN,
				'agent status'
			);
			const paramSet: any = [
				userObj.userARN,
				userName,
				userObj.routingProfileARN,
				routingProfileName,
				agentStatus,
				userObj.statusStartTime
			];
			// Add to parameter sets
			parameterSets.push(paramSet);
		}
		return parameterSets;
	}
}
