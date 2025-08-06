# 🚀 Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### GitHub Secrets (Required)
- [x] `AWS_ACCESS_KEY_ID` - Your AWS access key
- [x] `AWS_SECRET_ACCESS_KEY` - Your AWS secret key  
- [x] `AWS_REGION` - Your AWS region (e.g., us-east-1)
- [x] `AWS_S3_BUCKET_NAME` - Your S3 bucket name
- [x] `SMTP_PASS` - Your email password
- [ ] `MONGODB_URI_TEST` - Test MongoDB connection string (optional, has fallback)

### AWS Resources (Required)
- [ ] **ECR Repository**: `med-connecter` (✅ Automated)
- [ ] **ECS Cluster**: `med-connecter-cluster` (✅ Automated)
- [ ] **ECS Service**: `med-connecter-service` (⚠️ Manual - for safety)
- [ ] **IAM Roles**: `ecsTaskExecutionRole` and `ecsTaskRole` (✅ Automated)
- [ ] **CloudWatch Log Group**: `/ecs/med-connecter` (✅ Automated)
- [ ] **Secrets Manager**: All application secrets (✅ Automated - with placeholders)
- [ ] **S3 Bucket**: `med-connecter-{account}-{region}` (✅ Automated)
- [ ] **SQS Queue**: `med-connecter-queue` (✅ Automated)
- [ ] **SNS Topic**: `med-connecter-topic` (✅ Automated)

### AWS Secrets Manager (Required)
- [ ] `med-connecter/mongodb-uri`
- [ ] `med-connecter/jwt-secret`
- [ ] `med-connecter/email-user`
- [ ] `med-connecter/email-pass`
- [ ] `med-connecter/sms-api-key`
- [ ] `med-connecter/big-register-api-key`
- [ ] `med-connecter/aws-access-key-id`
- [ ] `med-connecter/aws-secret-access-key`
- [ ] `med-connecter/aws-s3-bucket-name`
- [ ] `med-connecter/aws-sqs-queue-url`
- [ ] `med-connecter/aws-sns-topic-arn`
- [ ] `med-connecter/video-call-api-key`
- [ ] `med-connecter/video-call-api-secret`
- [ ] `med-connecter/admin-email`
- [ ] `med-connecter/admin-password`
- [ ] `med-connecter/cloud-storage-bucket`

### Application Configuration
- [ ] Update domain URLs in task definition:
  - [ ] `FRONTEND_URL`: `https://your-frontend-domain.com`
  - [ ] `API_URL`: `https://your-api-domain.com`
  - [ ] `CORS_ORIGIN`: `https://your-frontend-domain.com`

## 🔧 Workflow Features

### ✅ Production-Ready Features
- [x] **Concurrency Control**: Prevents multiple deployments
- [x] **Timeout Protection**: 30-minute deployment timeout
- [x] **Environment Protection**: Production environment required
- [x] **Validation**: Task definition validation
- [x] **Health Checks**: Container health monitoring
- [x] **Service Stability**: Waits for service stability
- [x] **Deployment Verification**: Post-deployment status check
- [x] **Security**: Non-root user in container
- [x] **Secrets Management**: AWS Secrets Manager integration
- [x] **Logging**: CloudWatch integration

### ✅ Testing & Quality
- [x] **Linting**: ESLint validation
- [x] **Testing**: Jest unit tests
- [x] **Dependency Caching**: npm cache optimization
- [x] **Image Optimization**: Alpine-based Docker image

## 🚨 Deployment Process

### 1. Setup AWS Resources (One-time)
```bash
# Run automated setup script
chmod +x scripts/setup-aws-resources.sh
./scripts/setup-aws-resources.sh

# Create ECS service manually (for safety)
aws ecs create-service \
  --cluster med-connecter-cluster \
  --service-name med-connecter-service \
  --task-definition med-connecter:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_IDS],securityGroups=[SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
  --region us-east-1
```

### 2. Update Secrets and Configuration
- Update secrets in AWS Secrets Manager with actual values
- Update domain URLs in `.aws/task-definition.json`

### 3. Trigger Deployment
```bash
git push origin main
```

### 2. Monitor Deployment
- Watch GitHub Actions workflow
- Check ECS service status
- Monitor CloudWatch logs

### 3. Verify Deployment
- Health check endpoint: `https://your-api-domain.com/health`
- API documentation: `https://your-api-domain.com/api-docs`

## 🔍 Troubleshooting

### Common Issues
1. **IAM Permissions**: Ensure roles have proper permissions
2. **Secrets Not Found**: Verify all secrets exist in AWS Secrets Manager
3. **Network Issues**: Check VPC and security group configuration
4. **Resource Limits**: Ensure sufficient CPU/memory allocation

### Rollback Strategy
- ECS maintains previous task definition versions
- Manual rollback: Update service to use previous task definition
- Automatic rollback: Configure service with rollback triggers

## 📊 Monitoring

### CloudWatch Metrics
- CPU utilization
- Memory utilization
- Network I/O
- Application logs

### Health Checks
- Container health: Every 30 seconds
- Application health: `/health` endpoint
- Service stability: Monitored during deployment

## 🔐 Security

### Best Practices
- ✅ Non-root container user
- ✅ Secrets in AWS Secrets Manager
- ✅ IAM roles with least privilege
- ✅ VPC network isolation
- ✅ Security groups for port restrictions

## 📈 Scaling

### Auto Scaling
- Configure ECS service auto-scaling
- Set CPU/memory thresholds
- Define min/max task counts

### Manual Scaling
```bash
aws ecs update-service \
  --cluster med-connecter-cluster \
  --service med-connecter-service \
  --desired-count 3
```

## 💰 Cost Optimization

### Recommendations
- Use Fargate Spot for non-critical workloads
- Monitor resource utilization
- Set up billing alerts
- Optimize container resource allocation

---

**Last Updated**: $(date)
**Status**: ✅ Production Ready 