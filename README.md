# Visualize Amazon Connect API Data Using Aurora and Quicksight Workshop

# Table of Contents
1. [Overview](#Overview)
1. [Solution Architecture](#SolutionArchitecture)
1. [Deployment Steps Overview](#DeploymentStepsOverview)
1. [Solution Testing](#SolutionTesting)

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
