'use strict';
import { ConnectMetricClient } from './connect-client';
import { RdsClient } from './rds-client';
import { CurrentConnectMetrics } from '/opt/connect-metrics/model';

/**
 * Lambda handler
 */
export async function handler(event: any, context: any) {
	console.info('Lambda handler start...');
	console.info(JSON.stringify(event));
	// Fetch metric data
	const connectClient = new ConnectMetricClient();
	const finalMetricModelObjList: CurrentConnectMetrics[] =
		await connectClient.getCurrentMetricData();

	if (finalMetricModelObjList && finalMetricModelObjList.length > 0) {
		// Save metric data
		const rdsClient = new RdsClient();
		await rdsClient.saveCurrentMetricData(finalMetricModelObjList);
	}
}
