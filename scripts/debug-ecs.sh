#!/bin/bash

# Debug script for ECS container and routing issues
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Med Connecter ECS Debug Script${NC}"
echo "=================================="

# Get AWS region from environment or default
AWS_REGION=${AWS_REGION:-eu-north-1}
CLUSTER_NAME="med-connecter-cluster"
SERVICE_NAME="med-connecter-service"

echo -e "${YELLOW}📋 Checking ECS Service Status...${NC}"
echo "----------------------------------------"

# Check if service exists
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "NONEXISTENT")

echo "Service Status: $SERVICE_STATUS"

if [ "$SERVICE_STATUS" = "NONEXISTENT" ]; then
    echo -e "${RED}❌ Service does not exist!${NC}"
    exit 1
fi

# Get running tasks
echo -e "\n${YELLOW}📦 Checking Running Tasks...${NC}"
echo "--------------------------------"

TASKS=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'taskArns' \
  --output text)

if [ -z "$TASKS" ]; then
    echo -e "${RED}❌ No running tasks found!${NC}"
    exit 1
fi

echo "Running Tasks:"
for TASK in $TASKS; do
    echo "  - $TASK"
done

# Get task details
echo -e "\n${YELLOW}🔍 Task Details...${NC}"
echo "------------------------"

TASK_ARN=$(echo $TASKS | cut -d' ' -f1)
TASK_DETAILS=$(aws ecs describe-tasks \
  --cluster $CLUSTER_NAME \
  --tasks $TASK_ARN \
  --region $AWS_REGION)

echo "Task ARN: $TASK_ARN"
echo "Task Status: $(echo $TASK_DETAILS | jq -r '.tasks[0].lastStatus')"
echo "Desired Status: $(echo $TASK_DETAILS | jq -r '.tasks[0].desiredStatus')"

# Check container health
echo -e "\n${YELLOW}🏥 Container Health...${NC}"
echo "---------------------------"

CONTAINER_NAME=$(echo $TASK_DETAILS | jq -r '.tasks[0].containers[0].name')
echo "Container Name: $CONTAINER_NAME"

HEALTH_STATUS=$(echo $TASK_DETAILS | jq -r '.tasks[0].containers[0].healthStatus // "UNKNOWN"')
echo "Health Status: $HEALTH_STATUS"

# Check load balancer
echo -e "\n${YELLOW}⚖️ Load Balancer Status...${NC}"
echo "----------------------------"

ALB_ARN=$(aws elbv2 describe-load-balancers \
  --region $AWS_REGION \
  --query 'LoadBalancers[?contains(LoadBalancerName, `med-connecter-alb`)].LoadBalancerArn' \
  --output text)

if [ ! -z "$ALB_ARN" ]; then
    echo "ALB ARN: $ALB_ARN"
    
    # Get target group
    TG_ARN=$(aws elbv2 describe-target-groups \
      --region $AWS_REGION \
      --query 'TargetGroups[?contains(TargetGroupName, `med-connecter`)].TargetGroupArn' \
      --output text)
    
    if [ ! -z "$TG_ARN" ]; then
        echo "Target Group ARN: $TG_ARN"
        
        # Check target health
        TARGET_HEALTH=$(aws elbv2 describe-target-health \
          --target-group-arn $TG_ARN \
          --region $AWS_REGION)
        
        echo "Target Health:"
        echo "$TARGET_HEALTH" | jq -r '.TargetHealthDescriptions[] | "  - \(.Target.Id): \(.TargetHealth.State)"'
    fi
else
    echo -e "${RED}❌ Load balancer not found!${NC}"
fi

# Check logs
echo -e "\n${YELLOW}📝 Recent Logs...${NC}"
echo "-------------------"

LOG_GROUP="/ecs/med-connecter"
LOG_STREAMS=$(aws logs describe-log-streams \
  --log-group-name $LOG_GROUP \
  --region $AWS_REGION \
  --order-by LastEventTime \
  --descending \
  --max-items 1 \
  --query 'logStreams[0].logStreamName' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$LOG_STREAMS" ] && [ "$LOG_STREAMS" != "None" ]; then
    echo "Latest Log Stream: $LOG_STREAMS"
    echo "Recent Logs:"
    aws logs get-log-events \
      --log-group-name $LOG_GROUP \
      --log-stream-name "$LOG_STREAMS" \
      --region $AWS_REGION \
      --start-time $(date -d '10 minutes ago' +%s)000 \
      --query 'events[*].message' \
      --output text | tail -20
else
    echo -e "${RED}❌ No logs found!${NC}"
fi

# Test endpoints
echo -e "\n${YELLOW}🌐 Testing Endpoints...${NC}"
echo "------------------------"

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --region $AWS_REGION \
  --query 'LoadBalancers[?contains(LoadBalancerName, `med-connecter-alb`)].DNSName' \
  --output text)

if [ ! -z "$ALB_DNS" ]; then
    echo "ALB DNS: $ALB_DNS"
    
    # Test legacy endpoint (should not work)
    echo -e "\n${BLUE}Testing legacy endpoint (should fail):${NC}"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "http://$ALB_DNS/api-docs" || echo "Connection failed"
    
    # Test new endpoint (should work)
    echo -e "\n${BLUE}Testing new endpoint (should work):${NC}"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "http://$ALB_DNS/medconnecter/api-docs" || echo "Connection failed"
    
    # Test health endpoint
    echo -e "\n${BLUE}Testing health endpoint:${NC}"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "http://$ALB_DNS/medconnecter/health" || echo "Connection failed"
else
    echo -e "${RED}❌ Could not get ALB DNS!${NC}"
fi

echo -e "\n${GREEN}✅ Debug script completed!${NC}"
