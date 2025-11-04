# Architecture Documentation

## System Overview

The Library Management System is built as a modern web application with a clear separation of concerns and modular architecture. This document outlines the high-level architecture and design decisions.

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────┐     ┌────────────────┐
│    Frontend     │     │    Nginx     │     │    Backend     │
│    (Next.js)    │────▶│  (Reverse   │────▶│    (NestJS)    │
│                 │     │   Proxy)     │     │                │
└─────────────────┘     └──────────────┘     └────────────────┘
                                                     │
                                                     │
                                            ┌────────────────┐
                                            │    SQLite      │
                                            │   Database     │
                                            └────────────────┘

```

## Component Architecture

### 1. Frontend (Next.js + TypeScript)
- **App Router**: Modern Next.js routing system
- **Components**: Reusable UI components
- **Services**: API integration layer
- **Hooks**: Custom React hooks for state management
- **Utils**: Helper functions and utilities
- **Types**: TypeScript type definitions

### 2. Backend (NestJS + TypeScript)
- **Modules**:
  - `Auth`: Handles user authentication and JWTs
  - `Users`: Manages user data and CRUD operations
  - `Groups`: Manages user groups with role-based access and member management
  - `Books`: Manages the book catalog with public access
  - `Loans`: Manages book borrowing and returns
  - `Reservations`: Manages book reservations
  - `Profile`: Manages user profiles
  - `Notifications`: Handles notification CRUD and email notifications
  - `Transactions`: Manages user transactions, including loans and reservations
  - `Search`: Handles global search functionality
  - `Subscriptions`: Manages user subscriptions and free trials
  - `Reviews`: Manages book reviews
  - `Ratings`: Manages book ratings
- **Controllers**: HTTP request handlers with proper validation
- **Services**: Business logic implementation with error handling
- **Models**: TypeORM entities with relationships
- **DTOs**: Data transfer objects with validation decorators
- **Guards**: Authentication (JwtAuthGuard) and authorization (RolesGuard)
- **Interceptors**: Request/Response transformation
- **Middleware**: Request processing pipeline

### 3. Database (SQLite)
- **Models**:
  - `User`: User information, authentication, and relationships (includes phone, DOB, address, etc.)
  - `Group`: User groups for RBAC with permissions array
  - `Book`: Book catalog with status and availability (includes count, status, forSale, price)
  - `Loan`: Active book loans with due dates
  - `Reservation`: Book reservations queue
  - `Subscription`: User subscription tiers and trials
  - `Notification`: User notifications with types and read status
  - `Review`: Book reviews
  - `Rating`: Book ratings

### 4. Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Secure password hashing
- Session management

### 5. Route Protection (Frontend)
The frontend uses Higher-Order Components (HOCs) to protect routes:

- **withAuth**: Protects member-only routes
  - Checks if user is authenticated
  - Redirects to `/login` if not authenticated
  - Used on: books, dashboard, profile, settings, transactions, notifications, reports

- **withAdminAuth**: Protects admin-only routes
  - Checks if user is authenticated AND has admin role
  - Redirects to `/` if not admin
  - Used on: admin, members pages

- **withMemberAuth**: Protects member-specific routes
  - Similar to withAuth with member-specific logic
  - Used on: my-requests, request-book pages

**Authentication Flow**:
```
User Access → HOC Check → AuthContext → Token Validation → Allow/Redirect
```

**Entity Aliases** (Backend Compatibility):
- Created alias files to maintain backward compatibility
- User entity → Member entity (with User alias export)
- Allows gradual migration without breaking existing code
- Files: user.entity.ts, users.service.ts, users.module.ts, user.dto.ts

## Security Measures

1. **API Security**
   - CORS configuration
   - Rate limiting
   - Input validation
   - XSS protection
   - CSRF protection

2. **Data Security**
   - Password hashing
   - Encrypted JWT tokens
   - SQL injection prevention
   - Input sanitization

3. **Infrastructure Security**
   - Nginx reverse proxy
   - Docker container isolation
   - Environment variable protection
   - Regular security updates

## Data Flow

1. **Book Management**
   ```
   User → Frontend → API Gateway → Backend Controller → Service → Database
   ```

2. **Authentication**
   ```
   User → Login Form → Auth API → JWT Generation → Token Storage
   ```

3. **Lending Process**
   ```
   User → Book Selection → Loan Creation → Database Update → Notification
   ```

## Scalability Considerations

1. **Database**
   - Connection pooling
   - Query optimization
   - Index management

2. **API**
   - Caching strategy
   - Request throttling
   - Load balancing ready

3. **Frontend**
   - Code splitting
   - Static generation
   - Image optimization

## Development Workflow

1. **Local Development**
   - Docker Compose for services
   - Hot reload enabled
   - TypeScript compilation
   - ESLint + Prettier

2. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests
   - Test coverage reports

3. **Deployment**
   - Docker-based deployment
   - Environment configuration
   - Health monitoring
