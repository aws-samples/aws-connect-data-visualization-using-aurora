#!/usr/bin/env node
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
'use strict';

import { execute } from '/opt/common/common-util';

/**
 * Common utility class for RDS client
 */
export class RdsClientUtil {
	/**
	 * Retrieves list of queues from connect aurora db
	 * @param dbTable
	 * @returns
	 */
	async getListOfQueues(dbTable: string) {
		const logPrefix = 'getListOfQueues >>';
		console.info(`${logPrefix} Get list of queues from db...`);
		const sql = `SELECT queue_arn FROM ${dbTable}`;
		const response = await execute(
			String(process.env['AURORA_PROXY_ENDPOINT']),
			String(process.env['AURORA_USER_NAME']),
			Number(process.env['AURORA_MYSQL_PORT']),
			String(process.env['AURORA_DB_NAME']),
			sql
		);
		console.debug(JSON.stringify(response));
		const queueList = [];
		if (response && response.values()) {
			console.debug(`${logPrefix} response[0] >> ${JSON.stringify(response[0])}`);
			const records = JSON.parse(JSON.stringify(response[0]));
			for (const record of records) {
				console.debug(`${logPrefix} response[0] >> record >> ${JSON.stringify(record)}`);
				queueList.push(record.queue_arn);
			}
		}
		console.debug(`${logPrefix} queueList >> ${JSON.stringify(queueList)}`);
		return queueList;
	}

	/**
	 * Retrieves list of users from connect aurora db
	 * @param dbTable
	 * @returns
	 */
	async getListOfUsers(dbTable: string) {
		const logPrefix = 'getListOfUsers >>';
		console.info(`${logPrefix} Get list of users from db...`);
		const sql = `SELECT user_arn FROM ${dbTable}`;
		const response = await execute(
			String(process.env['AURORA_PROXY_ENDPOINT']),
			String(process.env['AURORA_USER_NAME']),
			Number(process.env['AURORA_MYSQL_PORT']),
			String(process.env['AURORA_DB_NAME']),
			sql
		);
		console.debug(`${logPrefix} response >> ${JSON.stringify(response)}`);
		const userList = [];
		if (response && response.values()) {
			console.debug(`${logPrefix} response[0] >> ${JSON.stringify(response[0])}`);
			const records = JSON.parse(JSON.stringify(response[0]));
			for (const record of records) {
				console.debug(`${logPrefix} response[0] >> record >> ${JSON.stringify(record)}`);
				userList.push(record.user_arn);
			}
		}
		console.debug(`${logPrefix} userList >> ${JSON.stringify(userList)}`);
		return userList;
	}

	/**
	 * Returns Connect Metadata ARN from aurora db.
	 * @param dbTable
	 * @returns
	 */
	async getConnectMetaDataArn(dbTable: string) {
		const logPrefix = 'getConnectMetaDataArn >>';
		console.info(`${logPrefix} Get ARN from db...`);
		const sql = `SELECT arn FROM ${dbTable}`;
		const response = await execute(
			String(process.env['AURORA_PROXY_ENDPOINT']),
			String(process.env['AURORA_USER_NAME']),
			Number(process.env['AURORA_MYSQL_PORT']),
			String(process.env['AURORA_DB_NAME']),
			sql
		);
		console.debug(`${logPrefix} response >> ${JSON.stringify(response)}`);
		const arnList: string[] = [];
		if (response && response.values()) {
			console.debug(`${logPrefix}  response[0] >> ${JSON.stringify(response[0])}`);
			const records = JSON.parse(JSON.stringify(response[0]));
			for (const record of records) {
				console.debug(`${logPrefix} response[0] >> record >> ${JSON.stringify(record)}`);
				arnList.push(record.arn);
			}
		}
		console.debug(`${logPrefix} arnList >> ${JSON.stringify(arnList)}`);
		return arnList;
	}
}
