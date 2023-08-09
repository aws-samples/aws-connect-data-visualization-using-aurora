'use strict';
import { RdsClient } from './rds-client';

/**
 * Lambda handler
 */
export async function handler(event: any, context: any) {
	const logPrefix = `datacheckhandler >>`;
	console.info(`${logPrefix} Lambda handler start...`);
	console.info(`${logPrefix} ${JSON.stringify(event)}`);
	let responseBody: any;
	try {
		const response: any = {};
		// Fetch data
		const rdsClient = new RdsClient();
		const tables = [
			'connect_metadata',
			'current_metric_data',
			'current_user_data',
			'historical_metric_data'
		];
		for (const table of tables) {
			const info = await rdsClient.getLatestInfo(table);
			response[table] = info;
		}
		responseBody = JSON.stringify(response);
		console.debug(`${logPrefix} response >> ${responseBody}`);
	} catch (ex: any) {
		responseBody = JSON.stringify(ex);
		console.error(responseBody);
	}
	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'application/json'
		},
		body: responseBody
	};
}
