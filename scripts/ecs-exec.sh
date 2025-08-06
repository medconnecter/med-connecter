#!/bin/bash

# ECS Exec Helper Script
# This script helps you execute commands on your ECS tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="med-connecter-cluster"
SERVICE_NAME="med-connecter-service"
CONTAINER_NAME="med-connecter"
REGION="${AWS_REGION:-eu-north-1}"

echo -e "${BLUE}🔧 ECS Exec Helper Script${NC}"
echo ""

# Function to list tasks
list_tasks() {
    echo -e "${YELLOW}📋 Listing ECS tasks...${NC}"
    TASKS=$(aws ecs list-tasks \
        --cluster "${CLUSTER_NAME}" \
        --service-name "${SERVICE_NAME}" \
        --region "${REGION}" \
        --query 'taskArns' \
        --output text)
    
    if [ -z "$TASKS" ]; then
        echo -e "${RED}❌ No tasks found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Found tasks:${NC}"
    for task in $TASKS; do
        TASK_ID=$(echo "$task" | cut -d'/' -f3)
        echo "  - $TASK_ID"
    done
    echo ""
}

# Function to execute command
execute_command() {
    local task_id="$1"
    local command="${2:-/bin/sh}"
    
    echo -e "${YELLOW}🚀 Executing command on task: $task_id${NC}"
    echo -e "${YELLOW}Command: $command${NC}"
    echo ""
    
    aws ecs execute-command \
        --cluster "${CLUSTER_NAME}" \
        --task "$task_id" \
        --container "${CONTAINER_NAME}" \
        --interactive \
        --command "$command" \
        --region "${REGION}"
}

# Function to run one-time command
run_one_time_command() {
    local command="$1"
    
    echo -e "${YELLOW}🚀 Running one-time command: $command${NC}"
    echo ""
    
    # Get subnet and security group info
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region "${REGION}")
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[*].SubnetId' --output text --region "${REGION}" | tr '\t' ',' | sed 's/,$//')
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text --region "${REGION}")
    
    aws ecs run-task \
        --cluster "${CLUSTER_NAME}" \
        --task-definition "${CLUSTER_NAME%-cluster}:latest" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SECURITY_GROUP_ID}],assignPublicIp=ENABLED}" \
        --overrides "{\"containerOverrides\":[{\"name\":\"${CONTAINER_NAME}\",\"command\":[\"sh\",\"-c\",\"${command}\"]}]}" \
        --region "${REGION}"
}

# Function to check environment variables
check_env() {
    local task_id="$1"
    
    echo -e "${YELLOW}🔍 Checking environment variables for task: $task_id${NC}"
    echo ""
    
    aws ecs execute-command \
        --cluster "${CLUSTER_NAME}" \
        --task "$task_id" \
        --container "${CONTAINER_NAME}" \
        --interactive \
        --command "env | sort" \
        --region "${REGION}"
}

# Function to check logs
check_logs() {
    local task_id="$1"
    local lines="${2:-50}"
    
    echo -e "${YELLOW}📋 Checking logs for task: $task_id (last $lines lines)${NC}"
    echo ""
    
    aws logs tail "/ecs/med-connecter" \
        --follow \
        --since 1h \
        --region "${REGION}" | head -n "$lines"
}

# Function to show help
show_help() {
    echo -e "${BLUE}Usage: $0 [COMMAND] [OPTIONS]${NC}"
    echo ""
    echo "Commands:"
    echo "  list                    - List all running tasks"
    echo "  exec [TASK_ID]          - Execute interactive shell on task"
    echo "  run [COMMAND]           - Run one-time command"
    echo "  env [TASK_ID]           - Check environment variables"
    echo "  logs [TASK_ID] [LINES]  - Check task logs"
    echo "  help                    - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 exec abc123"
    echo "  $0 run 'node -e \"console.log(process.env)\"'"
    echo "  $0 env abc123"
    echo "  $0 logs abc123 100"
    echo ""
}

# Main script logic
case "${1:-help}" in
    "list")
        list_tasks
        ;;
    "exec")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Task ID required${NC}"
            echo "Usage: $0 exec TASK_ID"
            exit 1
        fi
        execute_command "$2"
        ;;
    "run")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Command required${NC}"
            echo "Usage: $0 run 'COMMAND'"
            exit 1
        fi
        run_one_time_command "$2"
        ;;
    "env")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Task ID required${NC}"
            echo "Usage: $0 env TASK_ID"
            exit 1
        fi
        check_env "$2"
        ;;
    "logs")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Task ID required${NC}"
            echo "Usage: $0 logs TASK_ID [LINES]"
            exit 1
        fi
        check_logs "$2" "$3"
        ;;
    "help"|*)
        show_help
        ;;
esac 