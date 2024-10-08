# Visualize Amazon Connect API Data Using Aurora and Quicksight Workshop

# Table of Contents
1. [Overview](#Overview)
1. [Solution Architecture](#SolutionArchitecture)
1. [Deployment Steps Overview](#DeploymentStepsOverview)
1. [Solution Testing](#SolutionTesting)
1. [Data Visualization of the Metrics](#DataVisualizationMetrics)
1. [Cleanup Steps](#CleanupSteps)
1. [Additional Resources](#AdditionalResources)
1. [Contributors](#Contributors)

<a id="Overview"></a>
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

<a id="SolutionArchitecture"></a>
## Solution Architecture
- The solution utilizes two types of data:
  - **Metadata**    : Data describes various contact center configuration. 
  - **Metric Data** : Real time and historical data for your contact center metrics.    
![Architecture](images/Architecture.jpg)

### Solution Flow
1. An [Amazon Event Bridge](https://aws.amazon.com/eventbridge/) rule runs every 15 minutes to invoke an AWS Lambda function.
1. The lambda function invokes [ListQueues](https://docs.aws.amazon.com/connect/latest/APIReference/API_ListQueues.html), [ListRoutingProfiles](https://docs.aws.amazon.com/connect/latest/APIReference/API_ListRoutingProfiles.html), [ListAgentStatuses](https://docs.aws.amazon.com/connect/latest/APIReference/API_ListAgentStatuses.html), and [ListUsers](https://docs.aws.amazon.com/connect/latest/APIReference/API_ListUsers.html) API's to get the ARN, Name of the connect resource (e.g., queue, agent status, routing profiles).
1. The data is then stored in an Aurora Database table.
1. Three different [Amazon Event Bridge](https://aws.amazon.com/eventbridge/) rule invoke three different step functions every one minute.
1. Each step function invokes a corresponding lambda functions every 10 seconds(6 times in one minute).
1. Each lambda function invokes the respective metrics related API's to fetch data from Amazon Connect instance.  Exponential Backoff is implemented in the lambda functions to avoid [API throttling](https://docs.aws.amazon.com/connect/latest/adminguide/amazon-connect-service-limits.html#connect-api-quotas). The API response are then saved into Aurora database in different tables.
1. Amazon Quicksight is used to visualize the historical data.

>>Note : You can change the frequency of the Step Function according to your need but make sure you do not hit the API threshold limit. 

### Solution Test Flow
1. A user can invoke an API gateway endpoint to check that the data is getting updated in the database.
1. The endpoint sends the request to an [Amazon API Gateway](https://aws.amazon.com/api-gateway/).
1. The API Gateway in turn sends the request to checkDataLoad lambda function which queries the database for updates and return the results.

### Amazon Connect API Usage 
This workshop utilizes the Amazon Connect API's programmatically using AWS SDK for JavaScript:

1. **GetMetricData API** retrieves the historical metrics for Amazon Connect instance. More Details of the API usage is described [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Connect.html#getMetricData-property). The data retrieved is stored is stored in the Aurora Database.
    - Some metrics report the average value but do not provide the count that was used to create the average value.  HOLD_TIME is one example.  The API does not report the number of contacts put on hold.  This prevents us from performing a weighted average across intervals.  If weighted averages are important, then you need to use contact trace record data.  Contact trace records provide details about each call (e.g., NumberOfHolds, CustomerHoldDuration). Refer [this workshop](https://studio.us-east-1.prod.workshops.aws/preview/607718a8-cddd-416a-97b4-4fc9dc93ff7a/builds/4b6cffd2-a4f3-49f5-b2d2-70eadada9e95/en-US).
    - The average metrics from this API are good for histograms, which show general distributional features of dataset variables. You can see where the peaks of the distribution are, whether the distribution is skewed or symmetric, and if there are any outliers.
    - 5 minute intervals are the shortest period supported by the API and was selected to provide the highest resolution.  
    - The API can only query the past 24 hours, which is why we are saving the data.

1. **GetCurrentMetricData API** retrieves the metrics in real time from the Amazon Connect instance. More details of the API usage are described [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Connect.html#getCurrentMetricData-property). A new set of data is is received every 10 seconds. 

1. **GetCurrentUserData API** retrieves the agent related information in real time from the Amazon Connect instance. More details of the API usage are described [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Connect.html#getCurrentUserData-property).

1. **ListQueues API** retrieves the list of the standard queues from the Amazon Connect instance. This data is considered as part of Metadata for Amazon Connect in this workshop. More details of the API usage are described [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Connect.html#listQueues-property).

1. **ListRoutingProfiles API** retrieves the list of the routing profile configured in the Amazon Connect instance. This data is considered as part of Metadata for Amazon Connect in this workshop. More details of the API usage are described [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Connect.html#listRoutingProfiles-property).

1. **ListAgentStatuses API** retrieve the list of the Agent Status's configured in the Amazon Connect instance. This data is considered as part of Metadata for Amazon Connect in this workshop. More details of the API usage are described [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Connect.html#listAgentStatuses-property).

1. **ListUsers API** retrieves the list of users from the Amazon Connect instance. This data is considered as part of Metadata for Amazon Connect in this workshop. More details of the API usage are described [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Connect.html#listUsers-property).

<a id="DeploymentStepsOverview"></a>
## Deployment Steps Overview
We will follow below steps to set up our workshop: 
1. Setup sample Contact Center configuration
1. Setup an [AWS Cloud 9](https://aws.amazon.com/cloud9/) Environment
1. Deploy the Solution

### Deployment Steps
In this section we will build a sample configuration in Amazon Connect for the solution to produce data for visualization purpose.  We will be following below steps to create the required Amazon Connect Resources: 
1. Create two Amazon Connect Queues named **Sales** and **Tech Support**. For more information follow [ Amazon Connect Queues](https://docs.aws.amazon.com/connect/latest/adminguide/create-queue.html).
1. Download the [Connect flow provided](https://github.com/aws-samples/aws-connect-data-visualization-using-aurora/tree/main/src/connect-flows) and save it in your local directory.
1. Import the Amazon Connect Flow in your Connect instance following the steps mentioned [here](https://docs.aws.amazon.com/connect/latest/adminguide/contact-flow-import-export.html).
1. Once imported, open the Connect flow and choose the *Set working queue* block to set the **Sales** and **Tech Support** queues in their respective blocks. Choose **Save** and **Publish** to make the Connect flow changes effective.
1. Associate a Phone number to your Connect flow following these [steps](https://docs.aws.amazon.com/connect/latest/adminguide/tutorial1-assign-contact-flow-to-number.html) and assign it to the Connect flow imported in previous step.
1. Create a **Routing profile** with the queues created in first step. For more details see how to [create routing profile](https://docs.aws.amazon.com/connect/latest/adminguide/routing-profiles.html).
1. Create a User with **Routing profile** created above and **Agent** Security Profile. For more details see [Security Profiles](https://docs.aws.amazon.com/connect/latest/adminguide/connect-security-profiles.html).

### Create Cloud 9 Environment
You will create, launch, and configure an [AWS Cloud9](https://aws.amazon.com/cloud9/) environment. To begin the workshop, you will set up a development environment using AWS Cloud9.  The below [AWS CloudFormation](https://aws.amazon.com/cloudformation/) template will configure AWS Cloud9 in an [Amazon Virtual Private Cloud (Amazon VPC)](https://aws.amazon.com/vpc/) with a public subnet.  These are the steps: 
1. Copy the below template to a file on your local computer (e.g. `cloud9.yaml`)
1. Sign in to your AWS account
1. Select the AWS CloudFormation service
1. Create stack, with new resources
1. Upload a new template file
1. Choose the file that you created
1. Select the *Next* button
1. Enter `Connect-API-Visualization` for the stack name
1. Optionally, change the VpcCIDR
1. Select the *Next* button
1. Select the *Next* button
1. Select the *Submit* button
1. Wait for the stack to finish

![Create AWS Cloud9](images/10_Create.gif) 

```yaml
Description: This template deploys a VPC with a public subnet.  It will them launch another AWS Cloudformation stack that creates the Cloud9 IDE

Parameters:       
    VpcCIDR:
        Description: Please enter the IP range (CIDR notation) for this VPC
        Type: String
        Default: 10.0.0.0/24

Resources:
    VPC:
        Type: AWS::EC2::VPC
        Properties:
            CidrBlock: !Ref VpcCIDR
            EnableDnsSupport: true
            EnableDnsHostnames: true
    
    InternetGateway:
        Type: AWS::EC2::InternetGateway
    
    InternetGatewayAttachment:
        Type: AWS::EC2::VPCGatewayAttachment
        Properties:
            InternetGatewayId: !Ref InternetGateway
            VpcId: !Ref VPC
            
    PublicSubnet:
        Type: AWS::EC2::Subnet
        Properties:
            VpcId: !Ref VPC
            AvailabilityZone: !Select [ 0, !GetAZs '' ]
            CidrBlock: !Ref VpcCIDR
            MapPublicIpOnLaunch: false
                
    PublicRouteTable:
        Type: AWS::EC2::RouteTable
        Properties:
            VpcId: !Ref VPC
                
    DefaultPublicRoute:
        Type: AWS::EC2::Route
        DependsOn: InternetGatewayAttachment
        Properties:
            RouteTableId: !Ref PublicRouteTable
            DestinationCidrBlock: 0.0.0.0/0
            GatewayId: !Ref InternetGateway
            
    PublicSubnetRouteTableAssociation:
        Type: AWS::EC2::SubnetRouteTableAssociation
        Properties:
            RouteTableId: !Ref PublicRouteTable
            SubnetId: !Ref PublicSubnet
            
    IDE:
        DependsOn: PublicSubnet
        Type: AWS::Cloud9::EnvironmentEC2
        Properties:
            AutomaticStopTimeMinutes: 60
            ConnectionType: CONNECT_SSH
            InstanceType: t2.medium
            Name: Connect-API-Visualization
            SubnetId: !Ref PublicSubnet
            
Outputs:
    VPC:
        Description: A reference to the created VPC
        Value: !Ref VPC
    
    PublicSubnet:
        Description: A reference to the created public subnet
        Value: !Ref PublicSubnet
        
    Cloud9IDE:
        Description: A reference to the created Cloud9 environment
        Value: !Ref IDE
```
### Launch Cloud 9
Now, launch the new AWS Cloud9 instance:
1. Select the AWS Cloud9 service
1. Select the *Connect-API-Visualization* instance
1. Select the *Open in Cloud9* IDE button

### Deploy Solution
1. Open a new terminal in your Cloud 9 IDE
2. `cd ~/environment/`
3. Download the code from Git repository
```
git clone https://github.com/aws-samples/aws-connect-data-visualization-using-aurora.git
```
4. Modify File
    - Retrieve your Amazon Connect Instance Id and ARN as shown [here](https://docs.aws.amazon.com/connect/latest/adminguide/find-instance-arn.html)
    - Navigate to stack-main.ts file (*/src/stack/infra/stack-main.ts*) and edit it to have the correct Amazon Connect instance ID and instance ARN.

    ```
    export class InfraStackMain extends Stack {
        constructor(scope: Construct, id: string, props?: StackProps) {
            super(scope, id, props);
            // Add your existing connect instance id & arn below
            const CONNECT_INSTANCE_ID = '<ADD-CONNECT-INSTANCE-ID-HERE>';
            const CONNECT_INSTANCE_ARN = '<ADD-CONNECT-INSTANCE-ARN-HERE>';
            // Availability zones available in the current AWS environment
    ```
5.  Create all the Cloudformation Stack required for the workshop
    ```
    cd aws-connect-data-visualization-using-aurora

    chmod 744 script-deploy.sh script-package-lib.sh script-synth.sh script-undeploy.sh

    ./script-deploy.sh 
    ```

*Please note that deploying the code may take about an hour to complete*

<a id="SolutionTesting"></a>
## Solution Testing
1. Make test calls using the phone number claimed during contact center setup.
1. Ensure the user is logged into [Contact Control Panel](https://docs.aws.amazon.com/connect/latest/adminguide/launch-ccp.html) to receive calls.
1. Ensure you are able to see the data in out of the box Amazon Connect real time reports.
1. Follow below steps to check the data is getting inserted into Amazon Aurora:
    - Launch Amazon API Gateway from AWS management console
    - In the *find API* search bar type *CheckDataloadApi*
    - Select *CheckDataloadApi--> Stages--> prod*
    
    ![](/images/testing.jpg)
    - Click on the value of Invoke URL 
    - Accessing the URL should provide the results:
        - Name of the table
        - Row count
        - Last updated timestamp
1. [Add a new agent](https://docs.aws.amazon.com/connect/latest/adminguide/user-management.html) and login to Contact control panel using new agent's credential.
    - Invoke the testing URL to ensure  **current_user_data** table is getting updated. 
1. Continue to make test calls on the phone number claimed and validate that **current_metric_data** and **historical_metric_data** are getting updated.
1. For **current_metric_data** the number of rows may remain same if agent is logging-on to the same queue, but you should see an updated lastUpdated timestamp for **current_user_data**, **current_metric_data**, and **historical_metric_data**.
1. To ensure the **connect_metadata** table is getting updated. 
    - Create two new [ Amazon Connect Queues](https://docs.aws.amazon.com/connect/latest/adminguide/create-queue.html) from Amazon Connect Console.
    - Invoke the testing URL after 15 minutes, to ensure the rowCount value has increased by 2.  

<a id="DataVisualizationMetrics"></a>
## Data Visualization of the Metrics
In this section we will configure Amazon QuickSight to visualize historical metrics data.We will also discuss briefly, how you can visualize real time metrics data.  To visualize Amazon Connect historical API Data we will follow below steps:
1. Setup QuickSight and integrate it with Aurora Serverless v2.
1. Build visualization for historical data using QuickSight. The Workshop walk you through on how to create a simple QuickSight view. However, you can create complex and detailed views based on your contact center requirements.

### Setup Quicksight
1. Open AWS Management Console and Launch Amazon Identity and Access Management (IAM).
1. From the left hand menu under **Access Management** choose **Policies**.
1. On the left hand side, click on **Create Policy** button.
1. Choose the **JSON** at the top right and paste the following policy statement in the Policy Editor and Choose **Next**:

	```
	{
	    "Version": "2012-10-17",
	    "Statement": [
	        {
	            "Effect": "Allow",
	            "Action": [
	                "ec2:CreateNetworkInterface",
	                "ec2:ModifyNetworkInterfaceAttribute",
	                "ec2:DeleteNetworkInterface",
	                "ec2:DescribeSubnets",
	                "ec2:DescribeSecurityGroups"
	            ],
	            "Resource": "*"
	        }
	    ]
	}
	```
 
1. Give *workshop-quicksight-vpc-policy* as the name  in the Policy Name field.
1. Once the policy is created from the left hand menu under **Access Management** select **Roles**.
1. Click on **Create Role** at the top right corner.
1. From the list of options select **Custom Trust Policy**. Paste the following statements in the editor.

	```
	{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": {
					"Service": "quicksight.amazonaws.com"
				},
				"Action": "sts:AssumeRole"
			}
		]
	}
	```
 
    ![QuickSight Role](/images/quicksight-role.jpg) 
1. Click on **Next**. In the Permission Policies attach the policy created in the above step  named *workshop-quicksight-vpc-policy*.
1. Click on **Next**. In the Role Name field give *workshop-quicksight-exec-role* to create the QuickSight execution role.
1. Launch Amazon QuickSight from AWS Management Console.  [Follow these steps](https://catalog.workshops.aws/quicksight/en-US/author-workshop/0-prerequisites) if you have not signed up for QuickSight.
1. Select the QuickSight region same as the region you chose for the workshop.
  ![QuickSight Region](/images/quicksight-region.jpg) 
1. Click on your profile at top right corner and choose **Manage Quicksight**. From the side menu choose **Manage VPC connections** and click on **Add VPC Connection**. Please note that you should be a QuickSight administrator to be able to add a VPC. 
1. In the VPC connection name enter a name e.g. *Connect-workshop-vpc*.
1. Open another window for AWS Management Console, go to AWS Systems Manager > Parameter store , and retrieve the value of VPC ID from /CONNECT_WORKSHOP/VPC/ID system parameter.
    ![QuickSight System Parameters](/images/System-Params-QuickSight.jpg) 
1. Similarly, extract information for Subnets, Security Group created for QuickSight from AWS System Manager Parameter Store and add the VPC connection.You may leave the optional DNS resolver endpoints to blank.
   ![QuickSight Add VPC](/images/quicksight-add-vpc.jpg) 
1. Before proceeding to the next steps ensure the VPC connection is in Available state as shown:
    ![QuickSight Add VPC](/images/quicksight-vpc-status.jpg) 

### Aurora QuickSight Integration
1. Before we integrate Quicksight with Aurora we will need the credential to connect to Aurora.
1. Open AWS Management Console and Launch **AWS Secrets Manager**.
1. Open the secret created by the workshop.
1. Click on **Retrieve secret value** as show below:
![Retrieve Secret](/images/aurora-secrets.jpg) 
1. Note down the values of the secret key/value pair because these values will be used in QuickSight to set up the connection:
    - host
    - port
    - dbname
    - engine
    - username
    - password

![Secret Value](/images/secret-values.jpg)

### Historical Metric View
In this section we will visualize historical metrics extracted from Amazon Connect API:
1. From AWS Management Console and Launch Amazon QuickSight.
1. From the left-hand sidebar  select **Datasets** and then click **New dataset** from the top left corner.
1. From the list of data sources select **Aurora**.
1. Give Data source a name e.g. Historical Data Visualization
![QuickSight Param](/images/quicksight.jpg) 
1. Select the VPC added as part of the QuickSight setup.
1. In the Database Connector choose **MySQL**.
1. Enter Database Server (Aurora host), port, Database name, Username, Password captured from the AWS Secret manager, and click on **Validate connection**.
1. Once **Validated** click on **Create data source**.
1. Choose **historical_metric_data** table and click **Edit/Preview Data**
![Table](/images/choose-table.jpg) 
1. Once preview opens, click on the **+** icon at the top to add two calculated fields start_date and end_date as shown:
![Add calculated fields](/images/add_calculated_field.jpg) 
1. start_date and end_date should look like:
![Formula](/images/formula.jpg)
1. If you scroll to the end you should be able to see the two new fields added.
1. Click on **Publish & Visualize** to create a visualization.
![Publish & Visualize](/images/publish_visualize.jpg) 
1. Click on **Create** to create a new sheet.
1. Choose **Vertical Bar Chart**.Drag and drop end_date field for X axis and a few metrics in the value box as shown in the picture:
![Visualize](/images/visualization.jpg) 

### Realtime Metrics Visualization
Once confirmed that contact center data is getting stored in Amazon Aurora, you can choose BI tool of your choice to build real time visualization which support automatic refresh.

QuickSight is not a good fit for real time dashboards:
    - SPICE (Enterprise edition only) supports hourly refresh.
    - SPICE supports manually refresh (https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CreateIngestion.html) but you are limited to 32 times in a 24 hour period.  If your contact center is open 8 hours per day, then you can get a 15 minute refresh rate.

Our recommendation is to build a front-end web application to show real-time metrics data.

<a id="CleanupSteps"></a>
## Cleanup Steps
Follow these steps to remove the resources created during this workshop:
1. If you are using Amazon QuickSight in your account you can cleanup following below steps:
    - Launch Amazon QuickSight.
    - From the left hand sidebar menu choose **Datasets**.
    - Click on three dots (...) against the dataset created as part of this workshop (historical_metric_data) and click on **Delete**.
    - From the left hand sidebar menu choose **Analyses**.
    - Click on three dots (...) against the analysis created as part of this workshop (historical_metric_data_analysis) and click on **Delete**.
    - Select User Icon at the top left corner.
    - Select Manage QuickSight.
    - Select Manage VPC connections.
    - Delete the VPC connection (Connect-workshop-vpc) added as part of this workshop.
1. If you subscribed to QuickSight only for this workshop you can delete QuickSight following these steps:
    - Launch Amazon QuickSight from AWS management console.
    - Select User Icon at the top left.
    - Select Manage QuickSight.
    - Select Account settings.
    - Select Manage under Account termination.
    - Turn off Account termination protection.
    - Enter confirm.
    - Select Delete account.
1. Delete following Cloudformation Stack from the Cloudformation service in AWS management console.
    - Connect-API-Visualization.  This will also delete aws-cloud9-Connect-API-Visualization-XXX
    - aws-connect-workshop-check-dataload
    - aws-connect-workshop-user-data
    - aws-connect-workshop-connect-metrics
    - aws-connect-workshop-connect-metadata
    - aws-connect-workshop-aurora-db-setup
    - aws-connect-workshop-aurora.  This will also delete aws-connect-workshop-aurora-AuroraServerlessClusterRotationSingleUserXXX
    - aws-connect-workshop-infra.  This will fail because the S3 bucket is not empty.  Delete it again but retain VpcFlowlogBucketXXX.  This will be deleted in the next section
    - aws-connect-workshop-common-lib
    - CDKToolkit
1. Remove Amazon Connect if you created a new instance
1. Delete S3 buckets
    - aws-connect-workshop-inf-vpcflowlogbuccketXXX
        - You need to disable server access logging first to prevent the creation of new files     
    - cdk-hnb659fds-assets-{AWS account number}-{AWS region}
    - S3 bucket associated with the Amazon Connect instance.  See step 4
1.  Delete Amazon CloudWatch log groups
    - /aws/apigateway/welcome
    - /aws/lambda/ServerlessStackAuroraServerlessClusterRotationSingleUserXXX
    - /aws/lambda/aws-connect-workshop-auro-AuroraDbSetUpLambdaXXX
    - /aws/lambda/aws-connect-workshop-chec-CheckDataloadLambdaXXX
    - /aws/lambda/aws-connect-workshop-conn-JobInvocationLambdaXXX
    - /aws/lambda/aws-connect-workshop-conn-PullConnectMetadataLamba-XXX
    - /aws/lambda/aws-connect-workshop-conn-PullCurrentMetricsLambda-XXX
    - /aws/lambda/aws-connect-workshop-conn-PullHistoricalMetricsLam-XXX
    - /aws/lambda/aws-connect-workshop-user-JobInvocationLambdaXXX
    - /aws/lambda/aws-connect-workshop-user-PullCurrentUserDataLambd-XXX
    - /aws/rds/proxy/auroraproxy
    - aws-connect-workshop-check-dataload-ApiGatewayAccessLogsXXX
    - aws-connect-workshop-connect-metrics-MetricCollectionStepFnLogGrpXXX
    - aws-connect-workshop-user-data-UserDataCollectionStepFnLogGrpXXX
    - Log group associated with the Amazon Connect instance.  See step 4
1. Delete the RDS snapshot
    - aws-connect-workshop-aurora-snapshot-auroraserverlessclusterXXX

<a id="AdditionalResources"></a>
## Additional Resources
1. If you do not have an AWS Account and/or an Amazon Connect instance, you may follow this [workshop](https://catalog.workshops.aws/amazon-connect-bootcamp/en-US)  to create one.
1. You can follow [Module 1 of the Amazon Connect Bootcamp workshop](https://catalog.workshops.aws/amazon-connect-bootcamp/en-US/module1) to create a basic flow. The workshop details step by step on how to claim a phone number, create Queues, Routing Profile to set up a basic Amazon Connect flow.
1. Details about various Amazon Connect data sources can be found in our [Visualize Amazon Connect Contact Trace Records Using Amazon QuickSight](https://catalog.workshops.aws/amazon-connect-visualization/en-US#amazon-connect-data-sources) workshop.
1. If you require to observe each and every event from your Amazon Connect instance, then look at the [Visualize Amazon Connect Contact Trace Records Using Amazon QuickSight](https://catalog.workshops.aws/amazon-connect-visualization/en-US) workshop.
1. To know availability of Amazon Connect services by region follow [Amazon Connect services by region](https://docs.aws.amazon.com/connect/latest/adminguide/regions.html).

<a id="Contributors"></a>
## Contributors
- Troy Evarts - Senior Consultant, Amazon Connect
- Damodar Shenvi Wagle -  Senior Cloud Application Architect
- Harshvardhan Bhatt - Consultant, Amazon Connect
