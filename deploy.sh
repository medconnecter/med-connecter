#!/bin/bash

# Med Connecter AWS EC2 Deployment Script
# Usage: ./deploy.sh [instance-ip] [key-file]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required arguments are provided
if [ $# -lt 2 ]; then
    print_error "Usage: $0 <instance-ip> <key-file>"
    print_error "Example: $0 52.23.45.67 ~/.ssh/my-key.pem"
    exit 1
fi

INSTANCE_IP=$1
KEY_FILE=$2
REMOTE_USER="ec2-user"
APP_NAME="med-connecter"

print_status "Starting deployment to EC2 instance: $INSTANCE_IP"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    print_error "Key file not found: $KEY_FILE"
    exit 1
fi

# Function to execute remote commands
remote_exec() {
    ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$REMOTE_USER@$INSTANCE_IP" "$1"
}

# Function to copy files
remote_copy() {
    scp -i "$KEY_FILE" -o StrictHostKeyChecking=no "$1" "$REMOTE_USER@$INSTANCE_IP:$2"
}

print_status "Step 1: Checking connection to EC2 instance..."
if ! remote_exec "echo 'Connection successful'" > /dev/null 2>&1; then
    print_error "Cannot connect to EC2 instance. Please check your IP and key file."
    exit 1
fi

print_status "Step 2: Updating system packages..."
remote_exec "sudo yum update -y"

print_status "Step 3: Installing Node.js 18..."
remote_exec "curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -"
remote_exec "sudo yum install -y nodejs"

print_status "Step 4: Installing PM2..."
remote_exec "sudo npm install -g pm2"

print_status "Step 5: Installing Nginx..."
remote_exec "sudo yum install -y nginx"
remote_exec "sudo systemctl start nginx"
remote_exec "sudo systemctl enable nginx"

print_status "Step 6: Installing Git..."
remote_exec "sudo yum install -y git"

print_status "Step 7: Creating application directory..."
remote_exec "mkdir -p /home/$REMOTE_USER/$APP_NAME"

print_status "Step 8: Copying application files..."
# Create a temporary tar file of the current directory
tar --exclude='node_modules' --exclude='.git' --exclude='logs' -czf /tmp/app.tar.gz .

# Copy the tar file to the server
remote_copy "/tmp/app.tar.gz" "/home/$REMOTE_USER/"

# Extract the tar file on the server
remote_exec "cd /home/$REMOTE_USER && tar -xzf app.tar.gz -C $APP_NAME --strip-components=0"
remote_exec "rm /home/$REMOTE_USER/app.tar.gz"

# Clean up local tar file
rm /tmp/app.tar.gz

print_status "Step 9: Installing application dependencies..."
remote_exec "cd /home/$REMOTE_USER/$APP_NAME && npm install --production"

print_status "Step 10: Creating logs directory..."
remote_exec "cd /home/$REMOTE_USER/$APP_NAME && mkdir -p logs"

print_status "Step 11: Setting up environment file..."
print_warning "Please create a .env file with your production environment variables."
print_warning "You can copy your existing .env file or create a new one manually."
print_warning "The .env file should be placed in: /home/$REMOTE_USER/$APP_NAME/.env"

print_status "Step 12: Starting application with PM2..."
remote_exec "cd /home/$REMOTE_USER/$APP_NAME && pm2 start ecosystem.config.js"
remote_exec "pm2 save"
remote_exec "pm2 startup"

print_status "Step 13: Setting up Nginx configuration..."
# Create nginx configuration
cat > /tmp/nginx.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

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
EOF

# Copy nginx configuration
remote_copy "/tmp/nginx.conf" "/tmp/"
remote_exec "sudo mv /tmp/nginx.conf /etc/nginx/conf.d/$APP_NAME.conf"

# Test and reload nginx
remote_exec "sudo nginx -t && sudo systemctl reload nginx"

# Clean up
rm /tmp/nginx.conf

print_status "Step 14: Setting up firewall..."
remote_exec "sudo yum install -y firewalld"
remote_exec "sudo systemctl start firewalld"
remote_exec "sudo systemctl enable firewalld"
remote_exec "sudo firewall-cmd --permanent --add-service=ssh"
remote_exec "sudo firewall-cmd --permanent --add-service=http"
remote_exec "sudo firewall-cmd --permanent --add-service=https"
remote_exec "sudo firewall-cmd --reload"

print_status "Step 15: Creating backup script..."
cat > /tmp/backup.sh << 'EOF'
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
EOF

remote_copy "/tmp/backup.sh" "/home/$REMOTE_USER/"
remote_exec "chmod +x /home/$REMOTE_USER/backup.sh"

# Clean up
rm /tmp/backup.sh

print_status "Step 16: Setting up daily backup cron job..."
remote_exec "echo '0 2 * * * /home/$REMOTE_USER/backup.sh' | crontab -"

print_status "Step 17: Verifying deployment..."
# Check if application is running
if remote_exec "pm2 status" | grep -q "med-connecter.*online"; then
    print_status "Application is running successfully!"
else
    print_error "Application failed to start. Check logs with: ssh -i $KEY_FILE $REMOTE_USER@$INSTANCE_IP 'pm2 logs med-connecter'"
    exit 1
fi

# Check if nginx is running
if remote_exec "sudo systemctl is-active nginx" | grep -q "active"; then
    print_status "Nginx is running successfully!"
else
    print_error "Nginx failed to start."
    exit 1
fi

print_status "Deployment completed successfully!"
print_status "Your application should now be accessible at: http://$INSTANCE_IP"
print_status ""
print_warning "Next steps:"
print_warning "1. Create a .env file with your production environment variables"
print_warning "2. Set up SSL certificate using Let's Encrypt (recommended)"
print_warning "3. Configure your domain name to point to this IP"
print_warning "4. Set up monitoring and alerting"
print_status ""
print_status "Useful commands:"
print_status "  View logs: ssh -i $KEY_FILE $REMOTE_USER@$INSTANCE_IP 'pm2 logs med-connecter'"
print_status "  Monitor app: ssh -i $KEY_FILE $REMOTE_USER@$INSTANCE_IP 'pm2 monit'"
print_status "  Restart app: ssh -i $KEY_FILE $REMOTE_USER@$INSTANCE_IP 'pm2 restart med-connecter'"
print_status "  Check nginx: ssh -i $KEY_FILE $REMOTE_USER@$INSTANCE_IP 'sudo systemctl status nginx'" 