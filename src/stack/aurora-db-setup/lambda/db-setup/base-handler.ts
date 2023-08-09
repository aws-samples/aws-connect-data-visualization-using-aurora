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
 * Handler super class
 */
export class BaseHandler {
	// Declare variables
	protected event: any;
	protected context: any;

	// Constructor
	constructor(event: any, context: any) {
		this.event = event;
		this.context = context;
	}

	protected async createDatabase() {
		console.info('Creating database...');
		const sql = `CREATE DATABASE IF NOT EXISTS ${String(process.env['AURORA_DB_NAME'])};`;
		await execute(
			String(process.env['AURORA_PROXY_ENDPOINT']),
			String(process.env['AURORA_USER_NAME']),
			Number(process.env['AURORA_MYSQL_PORT']),
			String(process.env['AURORA_DB_NAME']),
			sql
		);
	}

	protected async setupDB() {
		console.info('Running ddl scripts...');
		const scriptsJson = JSON.parse(this.event.ResourceProperties.SetupScriptJson);
		for (const script of scriptsJson) {
			await execute(
				String(process.env['AURORA_PROXY_ENDPOINT']),
				String(process.env['AURORA_USER_NAME']),
				Number(process.env['AURORA_MYSQL_PORT']),
				String(process.env['AURORA_DB_NAME']),
				script
			);
		}
	}
}
