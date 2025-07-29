# AWS EC2 Deployment Guide for Med Connecter

## Prerequisites

1. **AWS Account** with EC2 access
2. **Domain Name** (optional but recommended)
3. **SSL Certificate** (for HTTPS)
4. **MongoDB Atlas** or self-hosted MongoDB instance

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance
1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Amazon Linux 2023** (recommended)
3. Select **t3.medium** or **t3.large** (minimum 2GB RAM)
4. Configure Security Group:
   - **SSH (22)**: Your IP only
   - **HTTP (80)**: 0.0.0.0/0
   - **HTTPS (443)**: 0.0.0.0/0
   - **Custom TCP (8080)**: 0.0.0.0/0 (for your app)
   - **Custom TCP (8085)**: 0.0.0.0/0 (if using default port)

### 1.2 Connect to Instance
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

## Step 2: Install Dependencies

### 2.1 Update System
```bash
sudo yum update -y
```

### 2.2 Install Node.js 18+
```bash
# Install NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Install Node.js
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.3 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 2.4 Install Nginx (Reverse Proxy)
```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.5 Install Git
```bash
sudo yum install -y git
```

## Step 3: Deploy Application

### 3.1 Clone Repository
```bash
cd /home/ec2-user
git clone <your-repository-url> med-connecter
cd med-connecter
```

### 3.2 Install Dependencies
```bash
npm install --production
```

### 3.3 Create Environment File
```bash
sudo nano .env
```

Add the following environment variables:
```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/med-connecter
JWT_SECRET=your-super-secure-jwt-secret-key
CORS_ORIGIN=https://yourdomain.com
API_URL=https://yourdomain.com
SWAGGER_ENABLED=false
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
AWS_SNS_TOPIC_ARN=your-sns-topic-arn
AWS_SQS_QUEUE_URL=your-sqs-queue-url
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
```

### 3.4 Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

Add the following configuration:
```javascript
module.exports = {
  apps: [{
    name: 'med-connecter',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10
  }]
};
```

### 3.5 Create Logs Directory
```bash
mkdir -p logs
```

## Step 4: Configure Nginx

### 4.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/conf.d/med-connecter.conf
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (add your certificate paths)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### 4.2 Test and Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: Start Application

### 5.1 Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5.2 Verify Application
```bash
# Check if app is running
pm2 status
pm2 logs med-connecter

# Test the application
curl http://localhost:8080/health
```

## Step 6: SSL Certificate (Optional but Recommended)

### 6.1 Install Certbot
```bash
sudo yum install -y certbot python3-certbot-nginx
```

### 6.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 7: Monitoring and Maintenance

### 7.1 PM2 Commands
```bash
# View logs
pm2 logs med-connecter

# Monitor processes
pm2 monit

# Restart application
pm2 restart med-connecter

# Stop application
pm2 stop med-connecter

# Delete application from PM2
pm2 delete med-connecter
```

### 7.2 Nginx Commands
```bash
# Check status
sudo systemctl status nginx

# Restart nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 7.3 System Monitoring
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux | grep node
```

## Step 8: Backup Strategy

### 8.1 Create Backup Script
```bash
nano /home/ec2-user/backup.sh
```

Add the following content:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ec2-user/backups"
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /home/ec2-user/med-connecter

# Backup logs
tar -czf $BACKUP_DIR/logs_backup_$DATE.tar.gz /home/ec2-user/med-connecter/logs

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### 8.2 Make Script Executable and Schedule
```bash
chmod +x /home/ec2-user/backup.sh
crontab -e
```

Add the following line for daily backups at 2 AM:
```
0 2 * * * /home/ec2-user/backup.sh
```

## Step 9: Security Considerations

### 9.1 Firewall Configuration
```bash
# Install and configure firewalld
sudo yum install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow only necessary ports
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 9.2 Regular Updates
```bash
# Create update script
nano /home/ec2-user/update.sh
```

Add the following content:
```bash
#!/bin/bash
sudo yum update -y
sudo yum upgrade -y
pm2 update
```

## Troubleshooting

### Common Issues:

1. **Application not starting:**
   - Check logs: `pm2 logs med-connecter`
   - Verify environment variables
   - Check MongoDB connection

2. **Nginx not serving the application:**
   - Check nginx status: `sudo systemctl status nginx`
   - Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify proxy configuration

3. **High memory usage:**
   - Monitor with: `pm2 monit`
   - Check for memory leaks
   - Consider increasing instance size

4. **SSL certificate issues:**
   - Verify certificate paths in nginx config
   - Check certificate expiration: `sudo certbot certificates`

## Performance Optimization

1. **Enable Nginx caching** for static assets
2. **Use PM2 cluster mode** for load balancing
3. **Implement Redis** for session storage
4. **Use CDN** for static assets
5. **Enable database indexing** for frequently queried fields

## Cost Optimization

1. **Use Spot Instances** for non-critical workloads
2. **Implement auto-scaling** based on CPU/memory usage
3. **Use AWS Reserved Instances** for predictable workloads
4. **Monitor and optimize** database queries
5. **Use AWS CloudWatch** for monitoring and alerting 