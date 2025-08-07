# MedConnecter AWS Deployment Verification Checklist

This document provides a comprehensive checklist to verify that all endpoints and Swagger documentation are working correctly at the `/medconnecter` context path after AWS deployment.

## Pre-Deployment Checklist

### ✅ Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `SWAGGER_ENABLED=true`
- [ ] `API_URL` is set to the correct load balancer URL
- [ ] `CORS_ORIGIN` is set to the frontend domain
- [ ] `FRONTEND_URL` is set to the frontend domain
- [ ] All required secrets are configured in GitHub Actions

### ✅ Configuration Files
- [ ] `config/production.js` has correct Swagger configuration
- [ ] `config/production.js` includes `./docs/swagger.js` in apis array
- [ ] `.aws/task-definition.json` has correct health check path (`/medconnecter/health`)
- [ ] `Dockerfile` has correct health check path (`/medconnecter/health`)

## Post-Deployment Verification

### 🔗 Base URLs
After deployment, your application will be available at:
- **Load Balancer URL**: `http://med-connecter-alb-{ACCOUNT_ID}.{REGION}.elb.amazonaws.com`
- **API Base**: `http://med-connecter-alb-{ACCOUNT_ID}.{REGION}.elb.amazonaws.com/medconnecter`
- **Swagger Docs**: `http://med-connecter-alb-{ACCOUNT_ID}.{REGION}.elb.amazonaws.com/medconnecter/api-docs`

### 🧪 Automated Testing
The deployment pipeline includes automated endpoint testing. Check the GitHub Actions logs for:
- [ ] All endpoint tests pass
- [ ] Swagger documentation is accessible
- [ ] Health check endpoint responds correctly

### 📋 Manual Verification Checklist

#### 1. Basic Endpoints
- [ ] **Root Endpoint**: `GET /medconnecter/`
  - Should return API information and available endpoints
  - Status: 200 OK

- [ ] **Health Check**: `GET /medconnecter/health`
  - Should return `{"status":"ok","timestamp":"..."}`
  - Status: 200 OK

#### 2. API Documentation
- [ ] **Swagger UI**: `GET /medconnecter/api-docs`
  - Should display the Swagger documentation interface
  - Status: 200 OK

- [ ] **Swagger JSON**: `GET /medconnecter/api-docs.json`
  - Should return the OpenAPI specification
  - Status: 200 OK
  - Content-Type: application/json

- [ ] **API Debug**: `GET /medconnecter/api-docs-debug`
  - Should return debug information about Swagger configuration
  - Status: 200 OK

#### 3. Public API Endpoints
- [ ] **Doctors List**: `GET /medconnecter/api/v1/doctors`
  - Should return list of doctors (may be empty)
  - Status: 200 OK

- [ ] **Common Symptoms**: `GET /medconnecter/api/v1/recommendations/common-symptoms`
  - Should return list of common symptoms
  - Status: 200 OK

- [ ] **Reviews**: `GET /medconnecter/api/v1/reviews`
  - Should return list of reviews (may be empty)
  - Status: 200 OK

#### 4. Protected API Endpoints (Should Return 401 Unauthorized)
- [ ] **User Profile**: `GET /medconnecter/api/v1/users/profile`
  - Should return 401 Unauthorized (no token provided)
  - Status: 401 Unauthorized

- [ ] **Appointments**: `GET /medconnecter/api/v1/appointments`
  - Should return 401 Unauthorized
  - Status: 401 Unauthorized

- [ ] **Notifications**: `GET /medconnecter/api/v1/notifications`
  - Should return 401 Unauthorized
  - Status: 401 Unauthorized

- [ ] **Admin Users**: `GET /medconnecter/api/v1/admin/users`
  - Should return 401 Unauthorized
  - Status: 401 Unauthorized

#### 5. Authentication Endpoints (Should Return 400 Bad Request)
- [ ] **Register**: `POST /medconnecter/api/v1/auth/register`
  - Should return 400 Bad Request (no body provided)
  - Status: 400 Bad Request

- [ ] **Login**: `POST /medconnecter/api/v1/auth/login`
  - Should return 400 Bad Request (no body provided)
  - Status: 400 Bad Request

### 🔧 Testing Commands

#### Using curl
```bash
# Test health check
curl -X GET "http://med-connecter-alb-{ACCOUNT_ID}.{REGION}.elb.amazonaws.com/medconnecter/health"

# Test Swagger docs
curl -X GET "http://med-connecter-alb-{ACCOUNT_ID}.{REGION}.elb.amazonaws.com/medconnecter/api-docs"

# Test API endpoints
curl -X GET "http://med-connecter-alb-{ACCOUNT_ID}.{REGION}.elb.amazonaws.com/medconnecter/api/v1/doctors"
```

#### Using the Test Script
```bash
# Set the base URL and run tests
export TEST_BASE_URL="http://med-connecter-alb-{ACCOUNT_ID}.{REGION}.elb.amazonaws.com"
node test-endpoints.js
```

### 🚨 Common Issues and Solutions

#### Issue: 404 Not Found for `/medconnecter/api-docs`
**Possible Causes:**
- Swagger is disabled (`SWAGGER_ENABLED=false`)
- Swagger configuration is incorrect
- Context path is not properly configured

**Solutions:**
1. Check environment variable `SWAGGER_ENABLED=true`
2. Verify Swagger configuration in `config/production.js`
3. Ensure `./docs/swagger.js` is included in apis array

#### Issue: Health Check Failing
**Possible Causes:**
- Health check path is incorrect
- Application is not starting properly
- Port configuration is wrong

**Solutions:**
1. Verify health check path is `/medconnecter/health`
2. Check application logs in CloudWatch
3. Verify port configuration (should be 8080)

#### Issue: CORS Errors
**Possible Causes:**
- CORS configuration is too restrictive
- Frontend domain not in allowed origins

**Solutions:**
1. Check `CORS_ORIGIN` environment variable
2. Verify frontend domain is in allowed origins
3. Check CORS configuration in `app.js`

### 📊 Monitoring and Logs

#### CloudWatch Logs
Check the following log groups for application logs:
- `/ecs/med-connecter`

#### Key Log Messages to Look For
- ✅ `Server running on port 8080`
- ✅ `Swagger documentation available at http://localhost:8080/medconnecter/api-docs`
- ✅ `Connected to MongoDB`
- ❌ `Swagger documentation is disabled`
- ❌ `MongoDB connection error`

### 🔄 Rollback Plan

If deployment fails or issues are discovered:

1. **Immediate Rollback**: Use previous task definition version
2. **Investigate**: Check CloudWatch logs for errors
3. **Fix Issues**: Update configuration and redeploy
4. **Verify**: Run the test script again

### 📞 Support

If you encounter issues not covered in this checklist:

1. Check the GitHub Actions deployment logs
2. Review CloudWatch application logs
3. Run the test script to identify specific failing endpoints
4. Verify all environment variables are correctly set

---

**Last Updated**: $(date)
**Version**: 1.0.0
