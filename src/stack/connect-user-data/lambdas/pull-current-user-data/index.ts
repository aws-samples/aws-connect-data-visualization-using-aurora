'use strict';
import { ConnectUserDataClient } from './connect-client';
import { RdsClient } from './rds-client';
import { CurrentUserData } from '/opt/connect-metrics/model';

/**
 * Lambda handler
 */
export async function handler(event: any, context: any) {
	console.info('Lambda handler start...');
	console.info(JSON.stringify(event));
	// Fetch metric data
	const connectClient = new ConnectUserDataClient();
	// const finalMetricModelObjList: CurrentUserData[] =
	// 	await connectClient.getCurrentUserData();

	const finalMetricModelObjList: CurrentUserData[] =
		await connectClient.getCurrentUserDataAgents();

	if (finalMetricModelObjList && finalMetricModelObjList.length > 0) {
		// Save metric data
		const rdsClient = new RdsClient();
		await rdsClient.saveCurrentUserData(finalMetricModelObjList);
	}
}
