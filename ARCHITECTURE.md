# Architecture Documentation

## System Overview

The Library Management System is a full-stack application built with modern web technologies, supporting both Supabase (PostgreSQL) and SQLite databases with automatic fallback.

## Technology Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Authentication**: JWT tokens stored in localStorage

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Databases**: 
  - Supabase (PostgreSQL) - Primary
  - SQLite - Fallback
- **Authentication**: JWT with bcrypt password hashing
- **API Documentation**: Swagger/OpenAPI
- **Email**: Nodemailer (SMTP)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (optional)
- **Process Management**: PM2 (production)

## System Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│   Port: 3100    │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│   Backend       │
│   (NestJS)      │
│   Port: 4000    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│Supabase│ │SQLite │
│(Primary)│ │(Fallback)│
└───────┘ └───────┘
```

## Module Structure

### Backend Modules

#### Core Modules
- **AuthModule**: Authentication and authorization
- **MembersModule**: User/member management
- **BooksModule**: Book catalog management
- **TransactionsModule**: Borrow/return transactions
- **RatingsModule**: Book ratings (published immediately, no approval)
- **ReviewsModule**: Book reviews with admin approval workflow

#### Supporting Modules
- **ConfigModule**: Database configuration (Supabase/SQLite)
- **EmailModule**: Email notification service
- **NotificationsModule**: In-app notifications
- **SearchModule**: Full-text search capabilities

### Frontend Pages

#### Public Pages
- `/` - Welcome/Landing page
- `/books` - Book catalog (browsable without login)
- `/books/[id]` - Book details
- `/search` - Search page

#### Member Pages
- `/dashboard` - Member dashboard
- `/transactions` - Transaction history
- `/settings` - Profile settings

#### Admin Pages
- `/admin/approvals` - Pending reviews approval (ratings are immediate)
- `/settings` - Admin settings (with additional tabs)

## Data Flow

### Rating/Review Submission Flow

```
1. Member returns book
   ↓
2. Admin approves return (transaction status → 'completed')
   ↓
3. Member sees rating/review prompt
   ↓
4. Member submits rating/review
   ↓
5. Rating/review status → 'pending'
   ↓
6. Admin reviews pending reviews on /admin/approvals (ratings are immediate)
   ↓
7. Admin approves/rejects
   ↓
8. Email notification sent to member
   ↓
9. If approved: Rating/review visible to all users
```

### Authentication Flow

```
1. User submits credentials
   ↓
2. Backend validates (Supabase or SQLite)
   ↓
3. JWT token generated
   ↓
4. Token stored in localStorage
   ↓
5. Token sent with all API requests
   ↓
6. JwtAuthGuard validates token
   ↓
7. Request processed with user context
```

## Database Strategy

### Dual Database Support

The system supports both Supabase and SQLite with automatic selection:

1. **Configuration Priority**:
   - If `AUTH_STORAGE=supabase` → Use Supabase
   - If `AUTH_STORAGE=sqlite` → Use SQLite
   - If `AUTH_STORAGE=auto` → Auto-detect (prefer Supabase if available)

2. **Fallback Mechanism**:
   - If Supabase connection fails → Fallback to SQLite
   - All operations support both databases
   - Schema is kept in sync

3. **Health Checks**:
   - Supabase health check on startup
   - Automatic fallback on connection errors
   - Graceful degradation

## Security Architecture

### Authentication
- JWT tokens with configurable expiration
- Password hashing with bcrypt (10 rounds)
- Token validation on every protected endpoint

### Authorization
- Role-based access control (RBAC)
- Three roles: Admin, Librarian, Member
- Route guards for protected endpoints
- Frontend route protection with `withAuth` HOC

### Data Protection
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization)
- CORS configuration
- Rate limiting (recommended for production)

## API Architecture

### RESTful Design
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- Resource-based URLs
- Consistent error responses
- Swagger documentation

### Endpoints Structure

```
/api/auth/*          - Authentication
/api/members/*       - User management
/api/books/*         - Book catalog
/api/transactions/*  - Borrow/return
/api/ratings/*       - Ratings (published immediately)
/api/reviews/*      - Reviews (require admin approval)
/api/search/*        - Search functionality
```

### New Endpoints (v2.0.0)

```
GET  /api/reviews/pending        - Get pending reviews (Admin only)
PATCH /api/reviews/:id/approve   - Approve review (Admin only)
PATCH /api/reviews/:id/reject    - Reject review with reason (Admin only)
```

## Email Service Architecture

### Configuration
- SMTP settings via environment variables
- Optional service (gracefully degrades if not configured)
- HTML email templates

### Email Types
- Review approval notifications (ratings are immediate, no approval needed)
- Review rejection notifications (with reason)

## Frontend Architecture

### Component Structure
```
pages/
  ├── index.js              - Landing page
  ├── books/
  │   └── [id].js          - Book details
  ├── admin/
  │   └── approvals.js     - Admin approvals page
  └── transactions.js      - Transaction history

src/
  ├── components/
  │   ├── layout/          - Layout components
  │   └── ...
  ├── contexts/            - React contexts
  ├── utils/               - Utility functions
  └── ...
```

### State Management
- React Context for authentication
- Local component state for UI
- Server state via API calls

## Deployment Architecture

### Docker Compose Structure
```
services:
  frontend:
    - Next.js application
    - Port: 3100
  backend:
    - NestJS application
    - Port: 4000
    - Environment variables
    - Volume mounts for SQLite
```

### Environment Configuration
- `.env` files for configuration
- Docker secrets for sensitive data
- Environment-specific settings

## Performance Considerations

### Database
- Indexed foreign keys
- Query optimization
- Connection pooling (Supabase)

### Frontend
- Code splitting
- Lazy loading
- Optimized images
- Caching strategies

### Backend
- Efficient database queries
- Caching where appropriate
- Async operations
- Error handling and logging

## Scalability

### Horizontal Scaling
- Stateless backend (can scale horizontally)
- Database connection pooling
- Load balancer ready

### Vertical Scaling
- Optimized queries
- Efficient data structures
- Resource monitoring

## Monitoring and Logging

### Logging
- Console logging for development
- Structured logging recommended for production
- Error tracking

### Monitoring
- Health check endpoints
- Database connection monitoring
- Performance metrics

## Future Enhancements

### Planned Features
- Real-time notifications (WebSockets)
- Advanced analytics dashboard
- Mobile app (React Native)
- Integration with external library systems
- Automated email reminders
- Fine calculation system
- Reservation system enhancements
