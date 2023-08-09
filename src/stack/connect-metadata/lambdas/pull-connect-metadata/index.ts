'use strict';
import { ConnectMetaDataClient } from './connect-client';
import { RdsClient } from './rds-client';
import { ConnectMetaData } from '/opt/connect-metrics/model';

/**
 * Lambda handler
 */
export async function handler(event: any, context: any) {
	console.info('Lambda handler start...');
	console.info(JSON.stringify(event));
	/// Fetch metric data
	const connectClient = new ConnectMetaDataClient();
	const finalMetaDataObjList: ConnectMetaData[] =
		await connectClient.getRoutingProfiles();

	if (finalMetaDataObjList && finalMetaDataObjList.length > 0) {
		// Save metric data
		const rdsClient = new RdsClient();
		await rdsClient.saveConnectMetaData(finalMetaDataObjList);
	}

	const finalAgentStatusMetaDataObjList: ConnectMetaData[] =
		await connectClient.getAgentStatus();

	if (finalAgentStatusMetaDataObjList && finalAgentStatusMetaDataObjList.length > 0) {
		// Save metric data
		const rdsClient = new RdsClient();
		await rdsClient.saveConnectMetaData(finalAgentStatusMetaDataObjList);
	}

	const finalUsersMetaDataObjList: ConnectMetaData[] = await connectClient.getUsers();

	if (finalUsersMetaDataObjList && finalUsersMetaDataObjList.length > 0) {
		// Save metric data
		const rdsClient = new RdsClient();
		await rdsClient.saveConnectMetaData(finalUsersMetaDataObjList);
	}

	const finalQueueMetaDataObjList: ConnectMetaData[] = await connectClient.getQueueList();

	if (finalQueueMetaDataObjList && finalQueueMetaDataObjList.length > 0) {
		// Save metric data
		const rdsClient = new RdsClient();
		await rdsClient.saveConnectMetaData(finalQueueMetaDataObjList);
	}
}
