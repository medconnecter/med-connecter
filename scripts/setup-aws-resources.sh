#!/bin/bash

# AWS ECS Deployment Setup Script
# This script creates all necessary AWS resources for the Med Connecter application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="med-connecter"
CLUSTER_NAME="${PROJECT_NAME}-cluster"
SERVICE_NAME="${PROJECT_NAME}-service"
ECR_REPOSITORY="${PROJECT_NAME}"
LOG_GROUP="/ecs/${PROJECT_NAME}"

echo -e "${BLUE}🚀 Setting up AWS resources for Med Connecter...${NC}"
echo -e "${BLUE}📍 Region: ${REGION}${NC}"
echo ""

# Function to check if AWS CLI is configured
check_aws_cli() {
    echo -e "${YELLOW}🔍 Checking AWS CLI configuration...${NC}"
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ AWS CLI configured${NC}"
    echo ""
}

# Function to get AWS account ID
get_account_id() {
    echo -e "${YELLOW}🔍 Getting AWS Account ID...${NC}"
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ Account ID: ${ACCOUNT_ID}${NC}"
    echo ""
}

# Function to create ECR repository
create_ecr_repository() {
    echo -e "${YELLOW}🔍 Creating ECR repository...${NC}"
    if aws ecr describe-repositories --repository-names "${ECR_REPOSITORY}" --region "${REGION}" &> /dev/null; then
        echo -e "${GREEN}✅ ECR repository already exists${NC}"
    else
        aws ecr create-repository \
            --repository-name "${ECR_REPOSITORY}" \
            --region "${REGION}" \
            --image-scanning-configuration scanOnPush=true
        echo -e "${GREEN}✅ ECR repository created${NC}"
    fi
    echo ""
}

# Function to create CloudWatch log group
create_log_group() {
    echo -e "${YELLOW}🔍 Creating CloudWatch log group...${NC}"
    if aws logs describe-log-groups --log-group-name-prefix "${LOG_GROUP}" --region "${REGION}" | grep -q "${LOG_GROUP}"; then
        echo -e "${GREEN}✅ Log group already exists${NC}"
    else
        aws logs create-log-group --log-group-name "${LOG_GROUP}" --region "${REGION}"
        echo -e "${GREEN}✅ Log group created${NC}"
    fi
    echo ""
}

# Function to create IAM roles
create_iam_roles() {
    echo -e "${YELLOW}🔍 Creating IAM roles...${NC}"
    
    # Create ECS Task Execution Role (Required for ECS)
    if aws iam get-role --role-name ecsTaskExecutionRole &> /dev/null; then
        echo -e "${GREEN}✅ ECS Task Execution Role already exists${NC}"
    else
        echo -e "${YELLOW}Creating ECS Task Execution Role...${NC}"
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
        
        aws iam attach-role-policy \
            --role-name ecsTaskExecutionRole \
            --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
        
        aws iam put-role-policy \
            --role-name ecsTaskExecutionRole \
            --policy-name SecretsManagerAccess \
            --policy-document "{
                \"Version\": \"2012-10-17\",
                \"Statement\": [
                    {
                        \"Effect\": \"Allow\",
                        \"Action\": [
                            \"secretsmanager:GetSecretValue\"
                        ],
                        \"Resource\": [
                            \"arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:${PROJECT_NAME}/*\"
                        ]
                    }
                ]
            }"
        echo -e "${GREEN}✅ ECS Task Execution Role created${NC}"
    fi
    
    # Create ECS Task Role (Required for ECS)
    if aws iam get-role --role-name ecsTaskRole &> /dev/null; then
        echo -e "${GREEN}✅ ECS Task Role already exists${NC}"
    else
        echo -e "${YELLOW}Creating ECS Task Role...${NC}"
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
        
        aws iam put-role-policy \
            --role-name ecsTaskRole \
            --policy-name ApplicationPermissions \
            --policy-document "{
                \"Version\": \"2012-10-17\",
                \"Statement\": [
                    {
                        \"Effect\": \"Allow\",
                        \"Action\": [
                            \"s3:GetObject\",
                            \"s3:PutObject\",
                            \"s3:DeleteObject\"
                        ],
                        \"Resource\": \"arn:aws:s3:::${PROJECT_NAME}-${ACCOUNT_ID}-${REGION}/*\"
                    }
                ]
            }"
        echo -e "${GREEN}✅ ECS Task Role created${NC}"
    fi
    echo ""
}

# Function to create ECS cluster
create_ecs_cluster() {
    echo -e "${YELLOW}🔍 Creating ECS cluster...${NC}"
    if aws ecs describe-clusters --clusters "${CLUSTER_NAME}" --region "${REGION}" | grep -q "ACTIVE"; then
        echo -e "${GREEN}✅ ECS cluster already exists${NC}"
    else
        aws ecs create-cluster --cluster-name "${CLUSTER_NAME}" --region "${REGION}"
        echo -e "${GREEN}✅ ECS cluster created${NC}"
    fi
    echo ""
}

# Function to create default VPC if needed
setup_networking() {
    echo -e "${YELLOW}🔍 Setting up networking...${NC}"
    
    # Get default VPC
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region "${REGION}")
    
    if [ "$VPC_ID" = "None" ]; then
        echo -e "${RED}❌ No default VPC found. Please create a VPC manually.${NC}"
        exit 1
    fi
    
    # Get default subnets
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[*].SubnetId' --output text --region "${REGION}")
    
    # Get default security group
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text --region "${REGION}")
    
    echo -e "${GREEN}✅ VPC: ${VPC_ID}${NC}"
    echo -e "${GREEN}✅ Subnets: ${SUBNET_IDS}${NC}"
    echo -e "${GREEN}✅ Security Group: ${SECURITY_GROUP_ID}${NC}"
    echo ""
    
    # Create security group rule for port 8080
    echo -e "${YELLOW}Adding security group rule for port 8080...${NC}"
    aws ec2 authorize-security-group-ingress \
        --group-id "${SECURITY_GROUP_ID}" \
        --protocol tcp \
        --port 8080 \
        --cidr 0.0.0.0/0 \
        --region "${REGION}" 2>/dev/null || echo -e "${GREEN}✅ Security group rule already exists${NC}"
    echo ""
}

# Function to create secrets in AWS Secrets Manager
create_secrets() {
    echo -e "${YELLOW}🔍 Creating secrets in AWS Secrets Manager...${NC}"
    echo -e "${YELLOW}⚠️  You'll need to update these secrets with actual values later${NC}"
    
    # List of secrets to create
    declare -a secrets=(
        "mongodb-uri"
        "jwt-secret"
        "email-user"
        "email-pass"
        "sms-api-key"
        "big-register-api-key"
        "aws-access-key-id"
        "aws-secret-access-key"
        "aws-s3-bucket-name"
        # "aws-sqs-queue-url"  # Commented out - not used in current code
        # "aws-sns-topic-arn"  # Commented out - not used in current code
        "video-call-api-key"
        "video-call-api-secret"
        "admin-email"
        "admin-password"
        "cloud-storage-bucket"
    )
    
    for secret in "${secrets[@]}"; do
        secret_name="${PROJECT_NAME}/${secret}"
        if aws secretsmanager describe-secret --secret-id "${secret_name}" --region "${REGION}" &> /dev/null; then
            echo -e "${GREEN}✅ Secret ${secret_name} already exists${NC}"
        else
            aws secretsmanager create-secret \
                --name "${secret_name}" \
                --description "${secret} for ${PROJECT_NAME}" \
                --secret-string "REPLACE_WITH_ACTUAL_VALUE" \
                --region "${REGION}"
            echo -e "${GREEN}✅ Secret ${secret_name} created${NC}"
        fi
    done
    echo ""
}

# Function to create S3 bucket
create_s3_bucket() {
    echo -e "${YELLOW}🔍 Creating S3 bucket...${NC}"
    BUCKET_NAME="${PROJECT_NAME}-${ACCOUNT_ID}-${REGION}"
    
    if aws s3api head-bucket --bucket "${BUCKET_NAME}" --region "${REGION}" 2>/dev/null; then
        echo -e "${GREEN}✅ S3 bucket already exists${NC}"
    else
        aws s3api create-bucket \
            --bucket "${BUCKET_NAME}" \
            --region "${REGION}" \
            --create-bucket-configuration LocationConstraint="${REGION}"
        echo -e "${GREEN}✅ S3 bucket created: ${BUCKET_NAME}${NC}"
    fi
    echo ""
}

# Function to create SQS queue (Commented out - not used in current code)
# create_sqs_queue() {
#     echo -e "${YELLOW}🔍 Creating SQS queue...${NC}"
#     QUEUE_NAME="${PROJECT_NAME}-queue"
#     
#     if aws sqs get-queue-url --queue-name "${QUEUE_NAME}" --region "${REGION}" &> /dev/null; then
#         echo -e "${GREEN}✅ SQS queue already exists${NC}"
#     else
#         QUEUE_URL=$(aws sqs create-queue \
#             --queue-name "${QUEUE_NAME}" \
#             --region "${REGION}" \
#             --query 'QueueUrl' \
#             --output text)
#         echo -e "${GREEN}✅ SQS queue created: ${QUEUE_URL}${NC}"
#     fi
#     echo ""
# }

# Function to create SNS topic (Commented out - not used in current code)
# create_sns_topic() {
#     echo -e "${YELLOW}🔍 Creating SNS topic...${NC}"
#     TOPIC_NAME="${PROJECT_NAME}-topic"
#     
#     if aws sns list-topics --region "${REGION}" | grep -q "${TOPIC_NAME}"; then
#         echo -e "${GREEN}✅ SNS topic already exists${NC}"
#     else
#         TOPIC_ARN=$(aws sns create-topic \
#             --name "${TOPIC_NAME}" \
#             --region "${REGION}" \
#             --query 'TopicArn' \
#             --output text)
#         echo -e "${GREEN}✅ SNS topic created: ${TOPIC_ARN}${NC}"
#     fi
#     echo ""
# }

# Function to update task definition with account ID
update_task_definition() {
    echo -e "${YELLOW}🔍 Updating task definition with account ID...${NC}"
    
    # Create backup
    cp .aws/task-definition.json .aws/task-definition.json.backup
    
    # Replace placeholders
    sed -i.bak "s/{{AWS_ACCOUNT_ID}}/${ACCOUNT_ID}/g" .aws/task-definition.json
    sed -i.bak "s/{{AWS_REGION}}/${REGION}/g" .aws/task-definition.json
    
    echo -e "${GREEN}✅ Task definition updated${NC}"
    echo ""
}

# Function to display next steps
display_next_steps() {
    echo -e "${BLUE}🎉 AWS resources setup completed!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Update secrets in AWS Secrets Manager with actual values"
    echo "2. Update domain URLs in .aws/task-definition.json:"
    echo "   - FRONTEND_URL"
    echo "   - API_URL"
    echo "   - CORS_ORIGIN"
    echo "3. Create ECS service manually (not automated for safety)"
    echo "4. Push to main branch to trigger deployment"
    echo ""
    echo -e "${YELLOW}🔧 Manual ECS Service Creation:${NC}"
    echo "aws ecs create-service \\"
    echo "  --cluster ${CLUSTER_NAME} \\"
    echo "  --service-name ${SERVICE_NAME} \\"
    echo "  --task-definition ${PROJECT_NAME}:1 \\"
    echo "  --desired-count 2 \\"
    echo "  --launch-type FARGATE \\"
    echo "  --network-configuration \"awsvpcConfiguration={subnets=[SUBNET_IDS],securityGroups=[SECURITY_GROUP_ID],assignPublicIp=ENABLED}\" \\"
    echo "  --region ${REGION}"
    echo ""
    echo -e "${GREEN}✅ Setup complete!${NC}"
}

# Main execution
main() {
    check_aws_cli
    get_account_id
    create_ecr_repository
    create_log_group
    create_iam_roles
    create_ecs_cluster
    setup_networking
    create_secrets
    create_s3_bucket
    # create_sqs_queue  # Commented out - not used in current code
    # create_sns_topic  # Commented out - not used in current code
    update_task_definition
    display_next_steps
}

# Run main function
main "$@" 