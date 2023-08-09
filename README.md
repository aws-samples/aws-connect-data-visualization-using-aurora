# AWS Connect Data Visualization Using Aurora

The code is for a workshop that demonstrates how you can visualize realtime and historical metric data and agent events using Aurora Serverless and Quicksight.

## Stack Operations
Below are the resources created by their respective stacks
1. `src/stack/lib` defines stack to deploy common code used in lambdas. Code is deployed as a lambda layer. Three layers are deployed `External Lib` containing third party libraries, `Common Lib` containing utility code such as exponential backoff applicable to all other lambdas and `Connect Metrics` containing common code used across lambdas that work with metric data.  
2. `src/stack/infra` defines stack to deploy infrastructure required for Aurora (MySQL) Serverless RDS cluster and enabling its connectivity to QuickSight. This includes a VPC and its associated infrastructure, an Aurora security group that allows inbound access to port `3306` from anywhere with in the VPC, and a QuickSight security group allowing connectivity to and from Aurora. Important ARN's and values are exported to parameter store including `CONNECT INSTANCE ID and ARN`
3. `src/aurora` defines stack to deploy Aurora (MySQL) Serverless RDS cluster in a VPC with 2 private subnets. A custom resource is created to set up a database for the workshop. This includes creating new database and tables required for the workshop. Important ARN's and values are exported to parameter store.
4. `src/connect-metrics` defines stack to deploy workflow that pulls connect metrics data and pushes it to Aurora.

## Prerequisites
Before proceeding any further, you need to identify and designate an AWS account required for the solution to work. You also need to create an AWS account profile in ~/.aws/credentials for the designated AWS account, if you don’t already have one. The profile needs to have sufficient permissions to run an [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) (AWS CDK) stack. It should be your private profile and only be used during the course of this blog. So, it should be fine if you want to use admin privileges. Don’t share the profile details, especially if it has admin privileges. I recommend removing the profile when you’re finished with the testing. For more information about creating an AWS account profile, see [Configuring the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html).

This workshop also requires you to have an exiting connect instance running in your environment.
Note the Instance ID of your existing connect instance and add that to line 51 `src/stack/infra/stack-main.ts`.

## Deployment instructions
Use below script to deploy the app. Make sure you have permissions to execute the script.
Script deploys all the stacks in an order such that the least dependent stacks are deployed before most dependent stacks. 
Run script-deploy.sh as shown below by passing the name of the AWS profile you created in the prerequisites section above. If no profile name is passed then default profile will be used.

```sh
./script-deploy.sh <AWS-ACCOUNT-PROFILE-NAME>
```
