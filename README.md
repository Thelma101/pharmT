# Pharmacy Store API

A comprehensive RESTful API for a pharmacy store management system built with Node.js, Express.js, and MongoDB. This API provides complete functionality for managing drugs, categories, user authentication, shopping carts, and orders with role-based access control.

## 🚀 Features

### User Roles
- **User (Customer)**: Register, login, browse drugs, manage cart, place orders
- **Admin**: Full access to manage drugs, categories, orders, and users

### Core Functionalities
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Product Management**: CRUD operations for drugs with detailed information
- **Category Management**: Hierarchical category system
- **Shopping Cart**: Add, update, remove items with stock validation
- **Order Management**: Complete order lifecycle from creation to delivery
- **Security**: Rate limiting, CORS, input validation, and security headers
- **File Upload**: Support for drug and category images (local/Cloudinary)
- **Search & Filter**: Advanced filtering and search capabilities

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, bcryptjs, express-rate-limit
- **Validation**: express-validator
- **File Upload**: Multer (local) / Cloudinary (cloud)
- **Documentation**: Swagger/OpenAPI ready

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd pharmacy-store-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGO_URI=mongodb://localhost:27017/pharmacy_store

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional: Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

### 4. Start MongoDB
Make sure MongoDB is running on your system.

### 5. Seed Database (Optional)
```bash
npm run seed
```

### 6. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 🔐 Test Accounts

After running the seeder, you can use these test accounts:

### Admin Account
- **Email**: admin@pharmacy.com
- **Password**: Admin123!

### User Accounts
- **Email**: john.doe@example.com
- **Password**: User123!
- **Email**: jane.smith@example.com
- **Password**: User123!

## 📖 API Endpoints

### Authentication (`/api/auth`)
```http
POST   /register         # Register new user
POST   /login           # Login user
GET    /me              # Get current user profile (Protected)
PUT    /profile         # Update user profile (Protected)
PUT    /change-password # Change password (Protected)
POST   /logout          # Logout user (Protected)
DELETE /deactivate      # Deactivate account (Protected)
```

### Drugs (`/api/drugs`)
```http
GET    /                # Get all drugs (Public, with filters)
GET    /featured        # Get featured drugs (Public)
GET    /:id             # Get single drug (Public)
POST   /                # Create drug (Admin)
PUT    /:id             # Update drug (Admin)
DELETE /:id             # Delete drug (Admin)
PATCH  /:id/stock       # Update stock (Admin)
GET    /admin/low-stock # Get low stock drugs (Admin)
```

### Categories (`/api/categories`)
```http
GET    /                # Get all categories (Public)
GET    /hierarchy       # Get category hierarchy (Public)
GET    /:identifier     # Get category by ID or slug (Public)
POST   /                # Create category (Admin)
PUT    /:id             # Update category (Admin)
DELETE /:id             # Delete category (Admin)
PATCH  /:id/update-count # Update drug count (Admin)
```

### Cart (`/api/cart`)
```http
GET    /                # Get user cart (Protected)
POST   /add             # Add item to cart (Protected)
PUT    /update/:drugId  # Update cart item (Protected)
DELETE /remove/:drugId  # Remove item from cart (Protected)
DELETE /clear           # Clear entire cart (Protected)
POST   /validate        # Validate cart (Protected)
PATCH  /fix             # Fix cart issues (Protected)
```

### Orders (`/api/orders`)
```http
POST   /                # Create order (Protected)
GET    /my-orders       # Get user orders (Protected)
GET    /:id             # Get single order (Protected)
PUT    /:id/cancel      # Cancel order (Protected)
GET    /                # Get all orders (Admin)
PUT    /:id/status      # Update order status (Admin)
GET    /admin/statistics # Get order statistics (Admin)
```

## 🔍 Query Parameters

### Pagination
```
?page=1&limit=10
```

### Drug Filtering
```
?search=ibuprofen
?category=60f7b3b3b3b3b3b3b3b3b3b3
?minPrice=10&maxPrice=50
?prescriptionRequired=false
?sort=-createdAt
?inStock=true
```

### Order Filtering (Admin)
```
?status=pending
?paymentStatus=paid
?startDate=2024-01-01
?endDate=2024-12-31
?search=john
```

## 📝 Request/Response Examples

### Register User
```json
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "phone": "+1-555-0123",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

### Add to Cart
```json
POST /api/cart/add
{
  "drugId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "quantity": 2
}
```

### Create Order
```json
POST /api/orders
{
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "phone": "+1-555-0123"
  },
  "paymentMethod": "credit_card"
}
```

## 🛡️ Security Features

- **Rate Limiting**: Prevents API abuse
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for protection
- **Input Validation**: Comprehensive data validation
- **Password Hashing**: Secure bcrypt hashing
- **JWT Authentication**: Stateless authentication
- **Role-based Access**: User and admin permissions

## 📁 Project Structure

```
pharmacy-store-api/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── cloudinary.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── drugController.js
│   │   ├── categoryController.js
│   │   ├── cartController.js
│   │   └── orderController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── security.js
│   │   ├── validation.js
│   │   └── upload.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Drug.js
│   │   ├── Category.js
│   │   ├── Cart.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── drugRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── cartRoutes.js
│   │   └── orderRoutes.js
│   ├── seeders/
│   │   └── index.js
│   └── utils/
│       ├── jwt.js
│       └── apiResponse.js
├── uploads/
├── .env
├── .gitignore
├── app.js
├── server.js
├── package.json
└── README.md
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/health
```

### API Overview
```bash
curl http://localhost:5000/api
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/pharmacy_store
JWT_SECRET=your_very_secure_jwt_secret_for_production
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, email your-support-email@domain.com or create an issue in the repository.

## 🔮 Future Enhancements

- [ ] Payment gateway integration
- [ ] Email notifications
- [ ] Real-time order tracking
- [ ] Prescription upload and verification
- [ ] Inventory alerts
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app API extensions

---

**Built with ❤️ for the healthcare community**