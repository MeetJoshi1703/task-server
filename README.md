# TaskFlow Backend API

A robust Node.js/Express REST API providing comprehensive project management functionality with real-time collaboration capabilities and enterprise-grade security.

## 🎯 Project Overview

The TaskFlow Backend API serves as the core engine powering the TaskFlow project management platform. Built with modern Node.js practices, this RESTful service handles user authentication, project management, real-time collaboration, and secure data persistence. The API is designed to support high-traffic scenarios while maintaining data consistency, security, and optimal performance.

## ✨ Core Features

### API Functionality
- **RESTful Architecture** - Complete CRUD operations following REST principles
- **Real-time Communication** - WebSocket integration using Socket.IO for live collaboration
- **Authentication & Authorization** - JWT-based authentication with role-based access control
- **Database Integration** - PostgreSQL database management through Supabase
- **File Upload Support** - Secure file handling for avatars and attachments
- **Input Validation** - Comprehensive request validation using Joi schemas

### Security & Performance
- **Enterprise Security** - Helmet.js, CORS, rate limiting, and input sanitization
- **Error Handling** - Centralized error management with detailed logging
- **Request Logging** - Comprehensive request/response logging with Morgan
- **Data Validation** - Multi-layer validation for data integrity
- **Session Management** - Secure JWT token handling with refresh capabilities

## 🛠️ Technology Stack

### Backend Framework & Runtime
- **Node.js 18.x LTS** - JavaScript runtime environment with optimal performance
- **Express.js 5.1.0** - Fast, unopinionated web framework for Node.js
- **JavaScript ES6+** - Modern JavaScript features with async/await support

### Database & Storage
- **PostgreSQL 15+** - Advanced relational database with ACID compliance
- **Supabase 2.50.0** - Backend-as-a-Service platform with real-time capabilities
- **Supabase Auth** - Integrated authentication and user management system

### Authentication & Security
- **JSON Web Tokens (JWT 9.0.2)** - Stateless authentication with secure token management
- **bcryptjs 3.0.2** - Password hashing with salt for enhanced security
- **Helmet 8.1.0** - Security headers and protection against common vulnerabilities
- **CORS 2.8.5** - Cross-Origin Resource Sharing configuration

### Real-time & Communication
- **Socket.IO 4.8.1** - Real-time bidirectional event-based communication
- **WebSocket Support** - Native WebSocket protocol support for live updates
- **Event-driven Architecture** - Asynchronous event handling for real-time features

### Validation & File Processing
- **Joi 17.13.3** - Powerful schema description language and data validator
- **Multer 2.0.1** - Middleware for handling multipart/form-data file uploads
- **Express-Fileupload 1.5.1** - Simple express middleware for uploading files
- **UUID 11.1.0** - RFC4122 (v1, v4, and v5) UUIDs generation

### Development & Monitoring
- **Morgan 1.10.0** - HTTP request logger middleware for debugging and monitoring
- **Nodemon 3.1.10** - Development utility for automatic server restart
- **dotenv 16.5.0** - Environment variable management from .env files

## 🏗️ System Architecture

### Architectural Pattern
The backend follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│  (React Frontend, Mobile Apps, Third-party Services)       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway Layer                        │
│     (Rate Limiting, CORS, Security Headers)                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Express.js Application                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│  Controllers │  Middleware  │   Services   │    Routes     │
└──────────────┴──────────────┴──────────────┴───────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                              │
│        PostgreSQL (Supabase) + File Storage                │
└─────────────────────────────────────────────────────────────┘
```

### Design Patterns
- **MVC Pattern** - Model-View-Controller separation for maintainable code
- **Service Layer Pattern** - Business logic encapsulation in dedicated services
- **Repository Pattern** - Data access abstraction for database operations
- **Observer Pattern** - Event-driven real-time updates using Socket.IO
- **Middleware Pattern** - Request/response processing pipeline

## 🗄️ Database Design

### Core Database Schema

#### User Management
```sql
-- User profiles and authentication
profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  avatar_url TEXT,
  role VARCHAR DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Project Management
```sql
-- Project boards
boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  priority VARCHAR DEFAULT 'medium',
  color VARCHAR DEFAULT '#3B82F6',
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Board columns
columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  position INTEGER NOT NULL,
  color VARCHAR DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks
tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'todo',
  priority VARCHAR DEFAULT 'medium',
  position INTEGER NOT NULL,
  due_date TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Collaboration Features
```sql
-- Board memberships
board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Task assignments
task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Notifications
notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  message TEXT,
  type VARCHAR DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Installation & Setup

### Prerequisites
```bash
Node.js >= 18.0.0
npm >= 9.0.0
Supabase Account
PostgreSQL 15+ (via Supabase)
```

### Installation Steps
```bash
# Clone the repository
git clone <repository-url>
cd taskflow-backend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
```

### Environment Configuration
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
JWT_SECRET=your_secure_jwt_secret_key_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:5173

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads
```

### Development Server
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Server running at: http://localhost:5000
```

## 📁 Project Structure

```
taskflow-backend/
├── src/
│   ├── controllers/           # Request handlers and business logic
│   │   ├── authController.js      # User authentication operations
│   │   ├── boardController.js     # Board management functionality
│   │   ├── columnController.js    # Column operations
│   │   ├── taskController.js      # Task management features
│   │   ├── memberController.js    # Team member operations
│   │   └── notificationController.js # Notification handling
│   ├── middleware/            # Custom middleware functions
│   │   ├── auth.js               # JWT authentication middleware
│   │   ├── validation.js         # Request validation using Joi
│   │   ├── errorHandler.js       # Centralized error handling
│   │   └── rateLimiter.js        # API rate limiting protection
│   ├── routes/               # API route definitions
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── boardRoutes.js       # Board management routes
│   │   ├── columnRoute.js       # Column operation routes
│   │   ├── taskRoutes.js        # Task management routes
│   │   ├── memberRoute.js       # Member management routes
│   │   └── notificationRoutes.js # Notification routes
│   ├── config/               # Configuration files
│   │   └── supabase.js          # Supabase client configuration
│   ├── utils/                # Utility functions and helpers
│   │   ├── validators.js        # Input validation schemas
│   │   ├── helpers.js           # Common helper functions
│   │   └── constants.js         # Application constants
│   └── services/             # Business logic services
│       ├── authService.js       # Authentication business logic
│       ├── boardService.js      # Board management services
│       └── socketService.js     # Real-time communication logic
├── uploads/                  # File upload directory
├── package.json             # Dependencies and npm scripts
├── .env.example            # Environment variables template
└── index.js               # Application entry point
```

## 🛡️ API Endpoints

### Authentication Endpoints
```http
POST   /api/auth/register        # User registration
POST   /api/auth/login           # User authentication
POST   /api/auth/logout          # User logout
POST   /api/auth/refresh         # Token refresh
GET    /api/auth/profile         # Get user profile
PUT    /api/auth/profile         # Update user profile
```

### Board Management
```http
GET    /api/boards               # Get user boards
POST   /api/boards               # Create new board
GET    /api/boards/:id           # Get specific board
PUT    /api/boards/:id           # Update board details
DELETE /api/boards/:id           # Delete board
POST   /api/boards/:id/star      # Toggle board star status
```

### Column Operations
```http
GET    /api/columns/:boardId     # Get board columns
POST   /api/columns              # Create new column
PUT    /api/columns/:id          # Update column
DELETE /api/columns/:id          # Delete column
PUT    /api/columns/reorder      # Reorder columns
```

### Task Management
```http
GET    /api/tasks/:boardId       # Get board tasks
POST   /api/tasks                # Create new task
GET    /api/tasks/task/:id       # Get specific task
PUT    /api/tasks/:id            # Update task
DELETE /api/tasks/:id            # Delete task
PUT    /api/tasks/move           # Move task between columns
```

### Team Management
```http
GET    /api/members/:boardId     # Get board members
POST   /api/members              # Add board member
DELETE /api/members/:boardId/:userId  # Remove member
PUT    /api/members/:boardId/:userId  # Update member role
```

### Notifications
```http
GET    /api/notifications        # Get user notifications
PUT    /api/notifications/:id/read    # Mark notification as read
DELETE /api/notifications/:id    # Delete notification
```

## 🔐 Authentication & Security

### JWT Authentication Flow
1. **User Registration/Login** - Returns access and refresh tokens
2. **Token Validation** - Middleware validates JWT on protected routes
3. **Token Refresh** - Automatic token renewal using refresh tokens
4. **Session Management** - Secure token storage and validation

### Security Measures
- **Password Hashing** - bcryptjs with salt rounds for secure password storage
- **Input Validation** - Joi schemas for comprehensive request validation
- **SQL Injection Prevention** - Parameterized queries and ORM protection
- **XSS Protection** - Input sanitization and output encoding
- **Rate Limiting** - API endpoint protection against abuse
- **CORS Configuration** - Cross-origin request security

### Request Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## 🔄 Real-time Features

### Socket.IO Integration
The API implements WebSocket communication for real-time collaboration:

### Real-time Events
```javascript
// Board updates
socket.emit('board:updated', boardData);
socket.emit('board:member_joined', memberData);

// Task operations
socket.emit('task:created', taskData);
socket.emit('task:updated', taskData);
socket.emit('task:moved', moveData);

// Notifications
socket.emit('notification:new', notificationData);
```

### Socket Authentication
```javascript
// Authenticate socket connections
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

## 📊 Error Handling

### Standardized Error Responses
```json
{
  "success": false,
  "error": "Descriptive error message",
  "statusCode": 400,
  "timestamp": "2025-01-20T10:30:00.000Z",
  "path": "/api/boards"
}
```

### HTTP Status Codes
- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **409** - Conflict
- **422** - Unprocessable Entity
- **500** - Internal Server Error

### Error Middleware
```javascript
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorResponse = {
    success: false,
    error: err.message || 'Internal server error',
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path
  };
  
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
};
```

## ⚡ Performance & Optimization

### Database Optimization
- **Indexing Strategy** - Strategic indexes on frequently queried columns
- **Query Optimization** - Efficient SQL queries with proper joins and filtering
- **Connection Pooling** - Supabase managed connection pooling for scalability
- **Database Transactions** - ACID compliance for data consistency

### API Performance
- **Request Caching** - Strategic caching for frequently accessed data
- **Pagination** - Efficient data pagination for large datasets
- **Response Compression** - Gzip compression for reduced bandwidth
- **Rate Limiting** - Protection against API abuse and DoS attacks

###
