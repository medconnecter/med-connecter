# Med Connecter

A healthcare platform connecting patients with doctors, built with Node.js, Express, and MongoDB.

## Features

- 🔐 Secure authentication and authorization
- 👥 User and doctor profile management
- 📅 Appointment scheduling and management
- 💬 Real-time chat between patients and doctors
- 📹 Video consultations
- 💳 Secure payment processing
- ⭐ Doctor reviews and ratings
- 🔍 Smart doctor recommendations
- 📱 Real-time notifications
- 👨‍💼 Admin dashboard

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT
- **Real-time Communication**: Socket.IO
- **Payment Processing**: Stripe
- **Email Service**: AWS SNS
- **API Documentation**: Swagger/OpenAPI
- **Video Calls**: WebRTC

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- AWS Account (for SNS)
- Stripe Account (for payments)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/zorgconnect

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# AWS Configuration
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SNS_TOPIC_ARN=your_sns_topic_arn

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/med-connecter.git
   cd med-connecter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

The API documentation is available at `http://localhost:8080/api-docs` when the server is running. The documentation includes:

- Authentication endpoints
- User management
- Doctor profiles and availability
- Appointment scheduling
- Payment processing
- Reviews and ratings
- Doctor recommendations
- Real-time chat
- Video consultations
- Notifications
- Admin operations

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-email` - Verify user email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Doctors
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/{id}` - Get doctor by ID
- `POST /api/doctors/profile` - Create/update doctor profile
- `POST /api/doctors/availability` - Update doctor availability

### Appointments
- `POST /api/appointments` - Create a new appointment
- `GET /api/appointments` - Get user appointments

### Reviews
- `POST /api/reviews` - Create a new review
- `PUT /api/reviews/{reviewId}` - Update a review
- `DELETE /api/reviews/{reviewId}` - Delete a review
- `GET /api/reviews/doctor/{doctorId}` - Get doctor reviews
- `GET /api/reviews/me` - Get user reviews

### Recommendations
- `POST /api/recommendations/help-me-choose` - Get doctor recommendations
- `GET /api/recommendations/common-symptoms` - Get common symptoms

### Payments
- `POST /api/payments/create-intent` - Create payment intent

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications` - Mark notifications as read

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/doctors` - Get all doctors
- `POST /api/admin/verify-doctor/{doctorId}` - Verify doctor

## Real-time Features

### Chat
- Real-time messaging between patients and doctors
- Message history storage
- Read receipts
- Typing indicators

### Video Consultations
- WebRTC-based video calls
- Screen sharing
- Chat during video calls
- Recording capabilities

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- XSS protection
- SQL injection prevention

## Error Handling

The API uses a standardized error response format:

```json
{
  "status": "error",
  "message": "Error message"
}
```

## Pagination

List endpoints support pagination with the following query parameters:
- `page` (default: 1)
- `limit` (default: 10)

Response includes pagination metadata:
```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@medconnecter.com or create an issue in the repository.