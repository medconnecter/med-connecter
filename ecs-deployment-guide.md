# AWS ECS Deployment Guide for Med Connecter

## Prerequisites

1. **AWS Account** with ECS, ECR, and IAM access
2. **AWS CLI** configured with appropriate permissions
3. **GitHub repository** with the Med Connecter code
4. **MongoDB Atlas** or self-hosted MongoDB instance

## Step 1: Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name med-connecter \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true

# Get the repository URI
aws ecr describe-repositories \
  --repository-names med-connecter \
  --region us-east-1 \
  --query 'repositories[0].repositoryUri' \
  --output text
```

## Step 2: Create IAM Roles

### Create ECS Task Execution Role

```bash
# Create the role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach the AWS managed policy for ECS task execution
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Add permissions for Secrets Manager
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name SecretsManagerAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Resource": [
          "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:med-connecter/*"
        ]
      }
    ]
  }'
```

### Create ECS Task Role

```bash
# Create the role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Add permissions for AWS services used by the application
aws iam put-role-policy \
  --role-name ecsTaskRole \
  --policy-name ApplicationPermissions \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ],
        "Resource": "arn:aws:s3:::YOUR_S3_BUCKET/*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "sns:Publish"
        ],
        "Resource": "arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage"
        ],
        "Resource": "arn:aws:sqs:us-east-1:YOUR_ACCOUNT_ID:*"
      }
    ]
  }'
```

## Step 3: Create Secrets in AWS Secrets Manager

```bash
# Create secrets for your application
aws secretsmanager create-secret \
  --name med-connecter/mongodb-uri \
  --description "MongoDB connection string" \
  --secret-string "mongodb+srv://username:password@cluster.mongodb.net/med-connecter"

aws secretsmanager create-secret \
  --name med-connecter/jwt-secret \
  --description "JWT secret key" \
  --secret-string "your-super-secure-jwt-secret-key"

aws secretsmanager create-secret \
  --name med-connecter/email-user \
  --description "Email username" \
  --secret-string "your-email@gmail.com"

aws secretsmanager create-secret \
  --name med-connecter/email-pass \
  --description "Email password" \
  --secret-string "your-email-password"

aws secretsmanager create-secret \
  --name med-connecter/sms-api-key \
  --description "SMS API Key (Twilio)" \
  --secret-string "YOUR_SMS_API_KEY"

aws secretsmanager create-secret \
  --name med-connecter/big-register-api-key \
  --description "BIG Register API Key" \
  --secret-string "YOUR_BIG_REGISTER_API_KEY"

aws secretsmanager create-secret \
  --name med-connecter/aws-access-key-id \
  --description "AWS Access Key ID" \
  --secret-string "YOUR_AWS_ACCESS_KEY_ID"

aws secretsmanager create-secret \
  --name med-connecter/aws-secret-access-key \
  --description "AWS Secret Access Key" \
  --secret-string "YOUR_AWS_SECRET_ACCESS_KEY"

aws secretsmanager create-secret \
  --name med-connecter/aws-s3-bucket-name \
  --description "AWS S3 Bucket Name" \
  --secret-string "your-s3-bucket-name"

aws secretsmanager create-secret \
  --name med-connecter/aws-sqs-queue-url \
  --description "AWS SQS Queue URL" \
  --secret-string "https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT_ID/your-queue-name"

aws secretsmanager create-secret \
  --name med-connecter/aws-sns-topic-arn \
  --description "AWS SNS Topic ARN" \
  --secret-string "arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:your-topic-name"

aws secretsmanager create-secret \
  --name med-connecter/video-call-api-key \
  --description "Video Call API Key (Twilio)" \
  --secret-string "YOUR_VIDEO_CALL_API_KEY"

aws secretsmanager create-secret \
  --name med-connecter/video-call-api-secret \
  --description "Video Call API Secret (Twilio)" \
  --secret-string "YOUR_VIDEO_CALL_API_SECRET"

aws secretsmanager create-secret \
  --name med-connecter/admin-email \
  --description "Admin Email" \
  --secret-string "admin@medconnecter.com"

aws secretsmanager create-secret \
  --name med-connecter/admin-password \
  --description "Admin Password" \
  --secret-string "your-secure-admin-password"

aws secretsmanager create-secret \
  --name med-connecter/cloud-storage-bucket \
  --description "Cloud Storage Bucket Name" \
  --secret-string "your-cloud-storage-bucket"
```

## Step 4: Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/med-connecter \
  --region us-east-1
```

## Step 5: Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name med-connecter-cluster \
  --region us-east-1
```

## Step 6: Create Application Load Balancer (Optional)

If you want to use an Application Load Balancer:

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name med-connecter-alb \
  --subnets subnet-12345678 subnet-87654321 \
  --security-groups sg-12345678 \
  --region us-east-1

# Create target group
aws elbv2 create-target-group \
  --name med-connecter-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id vpc-12345678 \
  --target-type ip \
  --health-check-path /health \
  --region us-east-1

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:YOUR_ACCOUNT_ID:loadbalancer/app/med-connecter-alb/1234567890abcdef \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:YOUR_ACCOUNT_ID:targetgroup/med-connecter-tg/1234567890abcdef \
  --region us-east-1
```

## Step 7: Create ECS Service

```bash
# Create service
aws ecs create-service \
  --cluster med-connecter-cluster \
  --service-name med-connecter-service \
  --task-definition med-connecter:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678,subnet-87654321],securityGroups=[sg-12345678],assignPublicIp=ENABLED}" \
  --region us-east-1
```

## Step 8: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `MONGODB_URI_TEST`: Test MongoDB connection string

**Note**: The test environment uses mock values for most environment variables to ensure tests can run without external dependencies. Only `MONGODB_URI_TEST` needs to be a real test database connection string.

## Step 9: Update Task Definition

Update the `.aws/task-definition.json` file:

1. Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID
2. Update the image URI with your ECR repository URI
3. Update the ARNs for IAM roles

## Step 10: Deploy

Push to the main branch to trigger the deployment:

```bash
git add .
git commit -m "Add ECS deployment configuration"
git push origin main
```

## Monitoring and Troubleshooting

### View Service Logs

```bash
# Get log streams
aws logs describe-log-streams \
  --log-group-name /ecs/med-connecter \
  --region us-east-1

# Get log events
aws logs get-log-events \
  --log-group-name /ecs/med-connecter \
  --log-stream-name ecs/med-connecter/1234567890abcdef \
  --region us-east-1
```

### Check Service Status

```bash
# Describe service
aws ecs describe-services \
  --cluster med-connecter-cluster \
  --services med-connecter-service \
  --region us-east-1

# List tasks
aws ecs list-tasks \
  --cluster med-connecter-cluster \
  --service-name med-connecter-service \
  --region us-east-1
```

### Scale Service

```bash
# Update service to scale
aws ecs update-service \
  --cluster med-connecter-cluster \
  --service med-connecter-service \
  --desired-count 3 \
  --region us-east-1
```

## Security Considerations

1. **Use VPC**: Deploy in a private subnet with NAT gateway
2. **Security Groups**: Restrict access to necessary ports only
3. **IAM Roles**: Use least privilege principle
4. **Secrets**: Store sensitive data in AWS Secrets Manager
5. **HTTPS**: Use Application Load Balancer with SSL certificate

## Cost Optimization

1. **Spot Instances**: Use Fargate Spot for non-critical workloads
2. **Auto Scaling**: Implement auto-scaling based on CPU/memory usage
3. **Reserved Capacity**: Use reserved capacity for predictable workloads
4. **Monitoring**: Use CloudWatch to monitor and optimize resource usage

## Cleanup

To clean up resources:

```bash
# Delete service
aws ecs update-service \
  --cluster med-connecter-cluster \
  --service med-connecter-service \
  --desired-count 0 \
  --region us-east-1

aws ecs delete-service \
  --cluster med-connecter-cluster \
  --service med-connecter-service \
  --region us-east-1

# Delete cluster
aws ecs delete-cluster \
  --cluster med-connecter-cluster \
  --region us-east-1

# Delete ECR repository
aws ecr delete-repository \
  --repository-name med-connecter \
  --force \
  --region us-east-1

# Delete secrets
aws secretsmanager delete-secret \
  --secret-id med-connecter/mongodb-uri \
  --force-delete-without-recovery \
  --region us-east-1

# Delete log group
aws logs delete-log-group \
  --log-group-name /ecs/med-connecter \
  --region us-east-1
``` 