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
  - `Auth`: Handles user authentication and JWTs.
  - `Users`: Manages user data.
  - `Groups`: Manages user groups for role-based access.
  - `Books`: Manages the book catalog.
  - `Reservations`: Manages book reservations.
  - `Profile`: Manages user profiles.
  - `Notifications`: Handles sending notifications (e.g., email).
- **Controllers**: HTTP request handlers
- **Services**: Business logic implementation
- **Models**: Data models and DTOs
- **Guards**: Authentication and authorization (including a `RolesGuard` for RBAC).
- **Interceptors**: Request/Response transformation
- **Middleware**: Request processing pipeline

### 3. Database (SQLite)
- **Models**:
  - `User`: Stores user information and relationships.
  - `Group`: Stores user groups for RBAC.
  - `Book`: Stores information about books in the library.
  - `Loan`: Tracks books that are currently lent out.
  - `Reservation`: Stores book reservations made by users.

### 4. Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Secure password hashing
- Session management

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
