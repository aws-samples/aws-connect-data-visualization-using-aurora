'use strict';
import {
	LambdaClient,
	InvokeCommand,
	InvokeCommandInput,
	InvokeCommandOutput
} from '@aws-sdk/client-lambda';

/**
 * Lambda handler
 */
export async function handler(event: any, context: any) {
	console.info('Lambda handler start...');
	console.info('Event: ' + JSON.stringify(event));

	// Invoke PullCurrentMetrics Lambda
	await invokeLambda(String(process.env.PULL_CURRENT_METRICS_LAMBDA_ARN));

	// Invoke PullHistoricalMetrics Lambda
	// await invokeLambda(String(process.env.PULL_HISTORICAL_METRICS_LAMBDA_ARN));

	// Send the response back with incremented iteration index
	const response = {
		index: Number(event.index) + 1,
		maxNumOfRuns: event.maxNumOfRuns
	};
	console.info('Response: ' + JSON.stringify(response));
	return response;
}

async function invokeLambda(functionArn: string) {
	// Lambda Client
	const client = new LambdaClient({
		region: String(process.env['REGION'])
	});

	// Invoke Lambda
	const params: InvokeCommandInput = {
		FunctionName: functionArn,
		InvocationType: 'Event'
	};
	const command = new InvokeCommand(params);
	const resp: InvokeCommandOutput = await client.send(command);
	console.info('Invocation Response: ' + JSON.stringify(resp));
}
