'use strict';
import { ConnectMetricClient } from './connect-client';
import { RdsClient } from './rds-client';
import { HistoricalConnectMetrics } from '/opt/connect-metrics/model';

/**
 * Lambda handler
 */
export async function handler(event: any, context: any) {
	console.info('Lambda handler start...');
	console.info(JSON.stringify(event));
	// Fetch metric data
	const connectClient = new ConnectMetricClient();
	const finalMetricModelObjList: HistoricalConnectMetrics[] =
		await connectClient.getMetricData();

	if (finalMetricModelObjList && finalMetricModelObjList.length > 0) {
		// Save metric data
		const rdsClient = new RdsClient();
		await rdsClient.saveHistoricalMetricData(finalMetricModelObjList);
	}
}
