# Visualize Amazon Connect API Data Using Aurora and Quicksight Workshop

## Overview
[Amazon Connect](https://aws.amazon.com/connect/) provides built-in [reports](https://docs.aws.amazon.com/connect/latest/adminguide/amazon-connect-metrics.html), however some customers need more flexibility or need to use a Business Intelligence (BI) tool to visualize Amazon Connect data. Customers may also like to use custom calculations that are defined by their business which are not available in the out-of-the-box Amazon Connect Reports. In this workshop, you will learn how to use Amazon Connect APIs along with other Amazon services like [Amazon Aurora](https://aws.amazon.com/rds/aurora/) and [Amazon QuickSight](https://aws.amazon.com/quicksight/) to store Contact Center data and create visualization.

This workshop uses Amazon Connect APIs as data source to generate meaningful contact center statistics.

### Intended Audience
This workshop is designed for Contact Center Developers, Administrators, and Analysts who want to build dashboards and reports for analyzing contact center performance.

### Solution Approach
In this workshop, you will learn how to use data from Amazon Connect APIs along with other Amazon services like [Amazon Aurora](https://aws.amazon.com/rds/aurora/) and [Amazon QuickSight](https://aws.amazon.com/quicksight/) to store Contact Center data and create visualization. This data can then be used by the external BI tools to create advanced visualizations.
1. Retrieve real-time and historical data from Amazon Connect instance using the Amazon Connect [APIs](https://docs.aws.amazon.com/connect/latest/APIReference/Welcome.html).
1. [Amazon Event Bridge](https://aws.amazon.com/eventbridge/) rule along with [AWS Step Function](https://aws.amazon.com/step-functions/) periodically invokes the Amazon Connect APIs and store the results in an [Amazon Aurora Database](https://aws.amazon.com/rds/aurora/).
1. Amazon Connect APIs used in this workshop:
    - [GetCurrentMetricData](https://docs.aws.amazon.com/connect/latest/APIReference/API_GetCurrentMetricData.html)
    - [GetMetricData](https://docs.aws.amazon.com/connect/latest/APIReference/API_GetMetricData.html)
    - [GetCurrentUserData](https://docs.aws.amazon.com/connect/latest/APIReference/API_GetCurrentUserData.html)
    - [ListQueues](https://docs.aws.amazon.com/connect/latest/APIReference/API_ListQueues.html)
    - [ListRoutingProfiles](https://docs.aws.amazon.com/connect/latest/APIReference/API_ListRoutingProfiles.html)
    - [ListAgentStatuses](https://docs.aws.amazon.com/connect/latest/APIReference/API_ListAgentStatuses.html)
    - [ListUsers](https://docs.aws.amazon.com/connect/latest/APIReference/API_ListUsers.html)
1. Visualize the historical data using Amazon QuickSight .

### Prerequisites
1. You need to have an AWS account with programmatic access
1. An Amazon Connect Instance with Administrator Access
1. A 200 level knowledge of [Amazon Connect](https://aws.amazon.com/connect/)
1. Identity and Access Management [(IAM)](https://aws.amazon.com/iam/) access to create policies and roles to deploy infrastructure as a code using AWS CDK
1. If you do not have an AWS Account and/or an Amazon Connect instance, you may follow this [workshop](https://catalog.workshops.aws/amazon-connect-bootcamp/en-US) to create one.
1. To get the most out of this workshop, we recommend attendees have fundamental knowledge of the following AWS services:
    - [Amazon S3](https://aws.amazon.com/s3/faqs/)
    - [AWS Lambda](https://aws.amazon.com/lambda/faqs/)
    - [Amazon Aurora](https://aws.amazon.com/rds/aurora/faqs/)
    - [Amazon QuickSight](https://aws.amazon.com/quicksight/resources/faqs/)
    - [AWS CLI](https://aws.amazon.com/cli/)
    - [AWS CloudFormation](https://aws.amazon.com/cloudformation/faqs/)
    - [Cloud Development Kit](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
    - [AWS Identity and Access Management (IAM)](https://aws.amazon.com/iam/)
1. Familiarity with the below concepts:
    - [Git Bash](https://git-scm.com/docs/gitfaq) 
    - [TypeScript](https://www.typescriptlang.org/)
1. User must have following software installed:
    - [NodeJS](https://nodejs.org/en/download)
    - [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
    - [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
    - [Git Client](https://git-scm.com/downloads)

### Estimated time required to complete the workshop
5 hours 

### Costs
The estimated cost is $3 or $25 (Amazon QuickSight Enterprise Edition  has a free trial for authors. You will need to pay for Amazon QuickSight if your trial has expired).

### AWS Regions
This workshop can only be run in regions that support Amazon Connect 

### Out of Scope
Any integration with Third Party BI Tool or web interfaces to visualize the data are not discussed as part of this workshop
