# 🔐 GitHub Secrets Usage Guide

## 📋 Required GitHub Secrets

### **Core AWS Credentials**
| Secret Name | Usage | Required |
|-------------|-------|----------|
| `AWS_ACCESS_KEY_ID` | AWS authentication for ECR/ECS operations | ✅ Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS authentication for ECR/ECS operations | ✅ Yes |
| `AWS_REGION` | AWS region for all operations | ✅ Yes |

### **Application Configuration**
| Secret Name | Usage | Required |
|-------------|-------|----------|
| `AWS_S3_BUCKET_NAME` | S3 bucket for file storage | ✅ Yes |
| `SMTP_PASS` | Email service password | ✅ Yes |
| `MONGODB_URI_TEST` | Test database connection | ⚠️ Optional |

## 🔍 Where Secrets Are Used

### **1. Test Environment (`.github/workflows/aws.yml`)**
```yaml
env:
  # Line 76: MongoDB connection for tests
  MONGODB_URI: ${{ secrets.MONGODB_URI_TEST || 'mongodb://localhost:27017/med-connecter-test' }}
  
  # Line 86: Email password for tests
  SMTP_PASS: ${{ secrets.SMTP_PASS }}
  
  # Lines 93-96: AWS credentials for tests
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_REGION: ${{ secrets.AWS_REGION }}
  AWS_S3_BUCKET_NAME: ${{ secrets.AWS_S3_BUCKET_NAME }}
  
  # Lines 105-106: Cloud storage configuration
  CLOUD_STORAGE_BUCKET: ${{ secrets.AWS_S3_BUCKET_NAME }}
  CLOUD_STORAGE_REGION: ${{ secrets.AWS_REGION }}
  
  # Line 111: Alternative MongoDB URI
  MONGO_URI: ${{ secrets.MONGODB_URI_TEST || 'mongodb://localhost:27017/med-connecter-test' }}
```

### **2. Deployment Environment (`.github/workflows/aws.yml`)**
```yaml
# Lines 127-128: AWS credentials for deployment
aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

# Line 175: AWS region for task definition
AWS_REGION=${{ secrets.AWS_REGION }}
```

### **3. Environment Variables (`.github/workflows/aws.yml`)**
```yaml
# Line 38: Global AWS region
AWS_REGION: ${{ secrets.AWS_REGION }}
```

## 🚀 Automated vs Manual Setup

### **✅ Fully Automated (via script)**
- ECR Repository
- ECS Cluster
- CloudWatch Log Group
- IAM Roles (ecsTaskExecutionRole, ecsTaskRole)
- AWS Secrets Manager (with placeholder values)
- S3 Bucket
- SQS Queue
- SNS Topic
- Security Group Rules
- Task Definition Updates

### **⚠️ Manual Setup Required**
- **ECS Service**: Created manually for safety
- **Secrets Values**: Update placeholder values in AWS Secrets Manager
- **Domain URLs**: Update in task definition
- **Load Balancer**: Optional, created manually if needed

## 🔧 Setup Commands

### **1. Run Automated Setup**
```bash
# Make script executable
chmod +x scripts/setup-aws-resources.sh

# Run setup (uses AWS_REGION from environment or defaults to us-east-1)
./scripts/setup-aws-resources.sh
```

### **2. Create ECS Service Manually**
```bash
# Get your subnet and security group IDs from the setup output
aws ecs create-service \
  --cluster med-connecter-cluster \
  --service-name med-connecter-service \
  --task-definition med-connecter:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678,subnet-87654321],securityGroups=[sg-12345678],assignPublicIp=ENABLED}" \
  --region us-east-1
```

### **3. Update Secrets in AWS Secrets Manager**
```bash
# Example: Update MongoDB URI
aws secretsmanager update-secret \
  --secret-id med-connecter/mongodb-uri \
  --secret-string "mongodb+srv://username:password@cluster.mongodb.net/med-connecter" \
  --region us-east-1
```

## 📝 Secret Management Best Practices

### **✅ Do's**
- Use AWS Secrets Manager for production secrets
- Rotate secrets regularly
- Use least privilege IAM policies
- Monitor secret access

### **❌ Don'ts**
- Don't commit secrets to git
- Don't use hardcoded values
- Don't share secrets in logs
- Don't use the same secrets across environments

## 🔍 Troubleshooting

### **Common Issues**
1. **Missing Secrets**: Check GitHub repository settings
2. **Invalid Credentials**: Verify AWS access key/secret
3. **Region Mismatch**: Ensure AWS_REGION matches your resources
4. **Permission Denied**: Check IAM roles and policies

### **Verification Commands**
```bash
# Test AWS credentials
aws sts get-caller-identity

# List ECR repositories
aws ecr describe-repositories --region us-east-1

# List ECS clusters
aws ecs list-clusters --region us-east-1

# List secrets
aws secretsmanager list-secrets --region us-east-1
```

---

**Last Updated**: $(date)
**Status**: ✅ Production Ready 