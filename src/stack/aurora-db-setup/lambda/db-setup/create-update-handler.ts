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
import * as cfnresponse from 'cfn-response';
import { BaseHandler } from './base-handler';

/**
 * Handler for creating new DB and running setup scripts
 */
export class CreateUpdateHandler extends BaseHandler {
	// Constructor
	constructor(event: any, context: any) {
		super(event, context);
	}

	/**
	 * Processes create resource event
	 */
	async handleRequest() {
		try {
			// Create database if it does not exist
			await this.createDatabase();

			// Run DB Setup Scripts
			await this.setupDB();

			// Build Response
			const data = {
				DbName: this.event.ResourceProperties.DbName
			};
			return {
				PhysicalResourceId: this.event.ResourceProperties.DbName,
				Data: data,
				Status: cfnresponse.SUCCESS
			};
		} catch (ex) {
			console.error(JSON.stringify(ex));
			return {
				PhysicalResourceId: undefined,
				Data: {},
				Status: cfnresponse.FAILED
			};
		}
	}
}
