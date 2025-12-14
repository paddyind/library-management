# Library Management System

A modern, full-stack library management system with **anonymous book browsing** and comprehensive administrative features. Built with Next.js, NestJS, and Docker.

[![Version](https://img.shields.io/badge/version-1.0.10-blue.svg)](https://github.com/paddyind/library-management)
[![Frontend](https://img.shields.io/badge/frontend-100%25_complete-success.svg)](https://github.com/paddyind/library-management)
[![Backend](https://img.shields.io/badge/backend-100%25_complete-success.svg)](https://github.com/paddyind/library-management)

> **Latest Release (v1.0.10)**: Settings page reorganization with integrated Users, Groups, and Book Management tabs. Reviews and Ratings fully functional with dual-database support. See [CHANGELOG.md](CHANGELOG.md) for details.

---

## 🌟 Key Features

### For Everyone (No Login Required)
- 🔓 **Anonymous Book Browsing** - Browse the complete book catalog without creating an account
- 🔍 **Advanced Search** - Search books by title, author, or ISBN in real-time
- 📚 **Book Availability** - See which books are currently available for borrowing
- 🎨 **Modern UI** - Responsive design that works on all devices

### For Members
- 👤 **Personal Dashboard** - View your borrowing statistics and quick actions
- 📖 **Book Borrowing & Returns** - Borrow books with one click, return with ease
- 📚 **My Current Books** - See all your borrowed books with due dates at a glance
- 🔍 **Search & Filter** - Find books by title, author, or ISBN with real-time search
- 🔔 **Notifications** - Stay updated with due dates and library news
- ⚙️ **Profile Management** - Update your information and preferences
- 📊 **Transaction History** - View your complete borrowing history
- ⭐ **Reviews and Ratings** - Submit reviews and ratings for books (with average rating display)

### For Administrators
- 👥 **User Management** - Complete CRUD operations for user accounts
- 🏷️ **Group Management** - Create groups and assign permissions
- 📚 **Book Catalog** - Manage the entire book inventory (including books for sale)
- 📈 **Analytics** - View library-wide statistics and reports
- 🔐 **Role-Based Access** - Fine-grained permission control

---

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Ports 3100 (frontend) and 4000 (backend) available

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/paddyind/library-management.git
   cd library-management
   ```

2. **Set up environment variables**
   
   Create a `.env` file in the project root (same directory as `docker-compose.yml`):
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your Supabase credentials (if using Supabase):
   ```bash
   # Get these from: https://supabase.com/dashboard → Your Project → Settings → API
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # Storage mode: auto (default), supabase, or sqlite
   AUTH_STORAGE=auto
   ```
   
   **Note**: The `.env` file is automatically gitignored and will not be committed to version control.
   
   **About authentication storage modes**:
   - **Auto mode (default)**: Performs health check at startup
     - If Supabase works → Uses Supabase for entire session
     - If Supabase fails → Uses SQLite for entire session
     - **One decision at startup, no repeated checks**
   - **Supabase mode**: Force use of Supabase only (set `AUTH_STORAGE=supabase`)
   - **SQLite mode**: Force use of SQLite only (set `AUTH_STORAGE=sqlite`)
   
   **Important**: Health check is performed once at server startup. If Supabase fails the health check, the system switches to SQLite for the entire session. Restart the server after fixing network issues to retest Supabase.
   
   See [DATABASE_SETUP_INSTRUCTIONS.md](DATABASE_SETUP_INSTRUCTIONS.md) for detailed database setup and sync instructions.

3. **Initialize databases** (Choose one method)
   
   **Method 1: Single Script (Recommended)**
   
   **Unix/Linux/Mac:**
   ```bash
   cd library-management
   ./data/scripts/setup-database.sh
   ```
   
   **Windows:**
   ```cmd
   cd library-management
   data\scripts\setup-database.bat
   ```
   
   **Or via Docker:**
   ```bash
   docker compose exec backend npm run db:init
   ```
   
   This single script:
   - ✅ Checks Docker is running
   - ✅ Runs migrations (creates tables if missing)
   - ✅ Restores from backup if available, OR seeds with demo data
   - ✅ Optionally sets up Supabase if configured
   - ✅ Offers dual-seed for both databases
   
   **For clean start (fresh setup):**
   ```bash
   # Unix/Linux/Mac
   ./data/scripts/setup-database.sh --clean-all --force
   
   # Windows
   data\scripts\setup-database.bat --clean-all --force
   ```
   
   **Method 2: Manual Docker Commands**
   
   ```bash
   # For SQLite: Smart init (migrate + restore/seed)
   docker compose exec backend npm run db:init
   
   # For Supabase: Automated migration (recommended)
   # Add SUPABASE_DB_PASSWORD to .env first (get from Supabase Dashboard)
   docker compose exec backend npm run supabase:migrate
   
   # OR manual approach:
   docker compose exec backend npm run supabase:sql
   # Copy SQL from data/backups/supabase-migration-combined.sql
   # Paste in Supabase Dashboard → SQL Editor → Run
   
   # Then seed both databases
   docker compose exec backend npm run db:sync
   ```
   
   See [DATABASE_SETUP_INSTRUCTIONS.md](DATABASE_SETUP_INSTRUCTIONS.md) for complete setup guide with all options.

4. **Start the application**
   ```bash
   docker compose up -d
   ```

5. **Access the application**
   - **Frontend**: http://localhost:3100
   - **Backend API**: http://localhost:4000/api
   - **Swagger API Docs**: http://localhost:4000/api-docs

6. **Create your first account**
   - Click "Register" on the welcome page
   - Fill in your details
   - Start browsing and borrowing books!

> **Note**: The application will automatically use SQLite database for user authentication if Supabase is not configured or unavailable. Users are stored persistently in the SQLite database located at `data/library.sqlite`.

---

## 🔒 Route Protection

The application uses a role-based access control system with Higher-Order Components (HOCs) to protect routes.

### Public Routes (No Authentication Required)
- `/` - Home page with book search and catalog
- `/login` - User login
- `/register` - User registration
- `/forgot-password` - Password recovery
- `/help` - Help and documentation
- `/search` - Book search

### Protected Routes (Authentication Required)
All member-only routes automatically redirect unauthenticated users to `/login`:
- `/books` - Book browsing and borrowing (Members)
- `/dashboard` - Personal dashboard (Members)
- `/profile` - Profile management (Members)
- `/settings` - User settings (Members)
- `/transactions` - Borrowing history (Members)
- `/notifications` - User notifications (Members)
- `/reports` - Personal reports (Members)
- `/my-requests` - Book requests (Members)
- `/request-book` - Request new books (Members)

### Admin-Only Routes (Admin Role Required)
These routes require admin role and redirect non-admins to home page:
- `/admin` - Admin dashboard (Admins)
- `/members` - Member management (Admins)

### Authentication Flow
1. Unauthenticated users trying to access protected routes → Redirected to `/login`
2. "Browse without account" links → Redirect to `/` (public home page)
3. After successful login → Redirected to `/dashboard`
4. After logout → Redirected to `/`

---

## 📚 Documentation

- **[Architecture](ARCHITECTURE.md)** - System architecture and design decisions
- **[Database Modeling](DATABASE_MODELING.md)** - Complete database schema and modeling documentation
- **[Changelog](CHANGELOG.md)** - Version history and updates
- **[API Documentation](http://localhost:4000/api-docs)** - Interactive Swagger/OpenAPI documentation (when server is running)

### API Documentation

The backend provides comprehensive API documentation via Swagger UI. After starting the application, visit:
- **Swagger UI**: http://localhost:4000/api-docs

Features:
- Interactive API explorer
- Request/response schemas
- Authentication testing (Bearer token)
- Detailed endpoint descriptions
- Try-it-out functionality

Key API Endpoints:
- **Authentication**: `/api/auth/login`, `/api/auth/register`
- **Books**: `/api/books` (public access for GET, requires auth for POST/PUT/DELETE)
- **Members**: `/api/members` (admin only)
- **Transactions**: `/api/transactions` (member and admin access)
- **Notifications**: `/api/notifications` (authenticated users)

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 16.0.0 |
| **UI Framework** | React | 18.3.1 |
| **Styling** | Tailwind CSS | 3.4.1 |
| **Backend** | NestJS | 10.x |
| **ORM** | TypeORM | 0.3.x |
| **Database** | SQLite | 3.x |
| **Authentication** | JWT | - |
| **Containerization** | Docker | - |

---

## 📱 Features Overview

### Authentication System
- ✅ JWT-based authentication
- ✅ Secure password hashing (bcrypt)
- ✅ Automatic token expiration handling
- ✅ Protected routes with role-based access
- ✅ Persistent login sessions

### User Interface
- ✅ **Welcome Page** - Public landing page with book catalog
- ✅ **Dashboard** - Personalized user dashboard
- ✅ **Profile** - Complete profile management
- ✅ **Transactions** - Borrowing history and status
- ✅ **Notifications** - Real-time notification system UI
- ✅ **Settings** - User preferences and configuration
- ✅ **Reports** - Statistical analysis and insights

### Admin Features
- ✅ **User Management** - Full CRUD interface
- ✅ **Group Management** - Permission-based groups
- ✅ **Book Management** - Catalog administration
- ✅ **Statistics** - Library-wide analytics

---

## 🔧 Development

### Project Structure
```
library-management/
├── frontend/               # Next.js frontend application
│   ├── pages/             # Page components
│   │   ├── index.js       # Public welcome page
│   │   ├── dashboard.js   # User dashboard
│   │   ├── login.js       # Authentication
│   │   ├── profile.js     # Profile management
│   │   └── admin/         # Admin pages
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   └── services/      # API services
│   └── public/            # Static assets
├── backend/               # NestJS backend application
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # User management
│   │   ├── books/         # Book management
│   │   ├── models/        # TypeORM entities
│   │   └── dto/           # Data transfer objects
│   └── database.db        # SQLite database
├── docker-compose.yml     # Container orchestration
└── docs/                  # Documentation
```

### Local Development

**Frontend**
```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:3000
```

**Backend**
```bash
cd backend
npm install
npm run start:dev
# API available on http://localhost:4000
```

### Docker Commands
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Restart a service
docker compose restart frontend

# Stop all services
docker compose down

# Rebuild after changes
docker compose up -d --build
```

---

## 🎯 Implementation Status

### Frontend: 100% Complete ✅
- [x] Welcome page (anonymous access)
- [x] User dashboard
- [x] Authentication (login/register/logout)
- [x] Profile management
- [x] Transactions page
- [x] Notifications UI
- [x] User management UI
- [x] Group management UI
- [x] Settings page
- [x] Reports page
- [x] Responsive design
- [x] Error handling
- [x] Loading states

### Backend: 100% Complete ✅
- [x] Authentication API (JWT, login, register)
- [x] User CRUD API
- [x] Books API (public access + CRUD)
- [x] Transactions API
- [x] Notifications API (full CRUD + 8 endpoints)
- [x] Groups API (full CRUD + member management)
- [x] Profile API
- [x] Database seed with demo data
- [x] Email service integration

---

## 🐛 Troubleshooting

### Common Issues

**Issue: Build Error - "Export default doesn't exist in target module"**
- This was fixed in v1.0.5 by removing duplicate Layout files
- If you encounter this, ensure you have only one Layout.js file
- Run: `docker compose up -d --build`

**Issue: Registration fails with 500 error**
- Ensure subscription tier values match backend enum (FREE, BRONZE, SILVER, GOLD)
- Check backend logs: `docker compose logs backend --tail=50`
- Fixed in v1.0.5 with proper enum values

**Issue: Buttons not visible on login/register pages**
- This was a Tailwind CSS configuration issue (fixed in v1.0.5)
- Ensure tailwind.config.js has correct content paths
- Hard refresh browser: Ctrl+Shift+R or Cmd+Shift+R

**Issue: Cannot access the application**
```bash
# Check if containers are running
docker compose ps

# Check logs for errors
docker compose logs

# Restart containers
docker compose restart
```

**Issue: "Invalid credentials" on login**
- Register a new account to get started
- Check backend is running: `docker compose logs backend`
- If you see "Member with ID 'user-X' not found", log out and log in again (old session token)

**Issue: Changes not reflecting**
- Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Rebuild containers: `docker compose up -d --build`

**Issue: Members page accessible without login**
- Fixed in v1.0.5 with `withAdminAuth` HOC
- Only admin users can access /members page now

### Getting Help
- Check [CHANGELOG.md](CHANGELOG.md) for known issues and fixes
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for system details
- Open an issue on GitHub for new problems

---

## 📊 API Endpoints

### Public Endpoints (No Auth)
```
POST /api/auth/register   - Register new user
POST /api/auth/login      - Login user
GET  /api/books           - List books (with fallback)
```

### Protected Endpoints (Auth Required)
```
GET    /api/users/profile         - Get user profile
PUT    /api/users/profile         - Update profile
GET    /api/transactions/my       - Get user transactions
POST   /api/books/:id/borrow      - Borrow book
POST   /api/books/:id/return      - Return book
```

### Admin Endpoints (Admin Role Required)
```
GET    /api/users                 - List all users
POST   /api/users                 - Create user
PUT    /api/users/:id             - Update user
DELETE /api/users/:id             - Delete user
GET    /api/groups                - List all groups
POST   /api/groups                - Create group
PUT    /api/groups/:id            - Update group
DELETE /api/groups/:id            - Delete group
POST   /api/groups/:id/members    - Add member to group
DELETE /api/groups/:id/members/:userId - Remove member
```

### Notifications Endpoints (Authenticated)
```
GET    /api/notifications         - Get user notifications
GET    /api/notifications/unread-count - Get unread count
POST   /api/notifications/:id/mark-read - Mark as read
POST   /api/notifications/mark-all-read - Mark all as read
DELETE /api/notifications/:id     - Delete notification
DELETE /api/notifications         - Delete all notifications
```

---

## 🗄️ Database Seed

The application comes with a seed script that supports both **Supabase** and **SQLite** databases:

**Run the seed script:**
```bash
# In Docker (will auto-detect Supabase or SQLite based on AUTH_STORAGE)
docker compose exec backend npm run seed

# Force SQLite mode
AUTH_STORAGE=sqlite docker compose exec backend npm run seed

# Force Supabase mode
AUTH_STORAGE=supabase docker compose exec backend npm run seed
```

**Seeded Data Includes:**
- 3 Demo Users:
  - `demo_admin@library.com` (Admin role) - Password: `password`
  - `demo_librarian@library.com` (Librarian role) - Password: `password`
  - `demo_member@library.com` (Member role) - Password: `password`
- 8 Sample Books (The Great Gatsby, To Kill a Mockingbird, 1984, Pride and Prejudice, The Catcher in the Rye, The Hobbit, Harry Potter, The Da Vinci Code)
- 3 Groups (Administrators, Librarians, Members) with user-group relationships

**Note:** The seed script automatically detects which database to use based on:
- `AUTH_STORAGE` environment variable (`auto`, `sqlite`, or `supabase`)
- Availability of Supabase credentials (if `auto` mode)

If Supabase is not configured, it will automatically seed SQLite instead.

---

## 💾 Database Backup Best Practices

### Backup Strategy

**Location**: Backups are stored in `backend/backups/` directory:
- `backend/backups/supabase/` - Supabase backups
- `backend/backups/sqlite/` - SQLite backups

**Demo Users**: Demo users (`demo_admin@library.com`, etc.) are **excluded from backups** automatically. They can be recreated via seeding, so there's no need to backup them.

**Real Users**: Only real user accounts (where `is_demo = false`) are included in backups to protect actual user data.

### Creating Backups

```bash
# Backup current database (auto-detects storage type)
docker compose exec backend npm run db:backup

# Backup creates timestamped JSON file:
# backend/backups/supabase/supabase-backup-2025-10-31T12-00-00-000Z.json
# backend/backups/sqlite/sqlite-backup-2025-10-31T12-00-00-000Z.json
```

### Restoring from Backup

```bash
# List available backups
ls backend/backups/supabase/
ls backend/backups/sqlite/

# Restore from specific backup (use --confirm flag)
docker compose exec backend npm run db:restore backend/backups/sqlite/sqlite-backup-*.json --confirm
```

### Scrap and Recreate Workflow

For complete database reset with data restoration:

```bash
# 1. Create backup first (always!)
docker compose exec backend npm run db:backup

# 2. Run reset (this will: backup → migrate → restore)
docker compose exec backend npm run db:reset

# OR manually:
# docker compose exec backend npm run db:migrate  # Recreate schema
# docker compose exec backend npm run db:restore <backup-file> --confirm  # Restore data
```

### Best Practices

1. **Always backup before migrations or major changes**
2. **Regular backups**: Schedule daily/weekly backups for production
3. **Backup verification**: Test restore process periodically
4. **Version control**: Keep backup files organized with timestamps
5. **Demo vs Real**: Demo users are automatically excluded - they're recreated on seed

### What Gets Backed Up

- ✅ **Real users** (is_demo = false) - Protected user accounts
- ✅ **Books** - All book catalog data
- ✅ **Groups** - User groups and permissions
- ✅ **Transactions** - Borrowing history
- ✅ **Reservations** - Book reservations
- ✅ **Notifications** - User notifications

- ❌ **Demo users** (is_demo = true) - Excluded (can be recreated)

**See**: [DATABASE_MODELING.md](DATABASE_MODELING.md) for complete schema documentation.

---

## 🧪 Testing

### Sanity Test Suite

The application includes a basic sanity test suite to verify core functionality:

**Run tests in Docker:**
```bash
docker compose exec backend npm run test:sanity
# OR
docker compose exec backend node scripts/sanity-test.js
```

**Run tests locally (if backend is running):**
```bash
cd backend
npm run test:sanity
# OR
node scripts/sanity-test.js
```

**What it tests:**
- ✅ API connectivity and health
- ✅ Database connectivity (SQLite/Supabase)
- ✅ Public endpoints (books)
- ✅ Authentication flow (register/login)
- ✅ Protected endpoints (profile)
- ✅ Basic CRUD operations (create/get books)
- ✅ Search functionality

**Test results:**
- Tests pass: Exit code 0
- Tests fail: Exit code 1 with detailed error messages

The test suite is designed to be run as part of CI/CD pipelines or manually after deployments.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Next.js team for the amazing React framework
- NestJS team for the powerful backend framework
- Tailwind CSS for the utility-first CSS framework
- All contributors who have helped improve this project

---

## 🎨 Technology Decisions

### Why Tailwind CSS?
The project uses **Tailwind CSS** (not Bootstrap) for several reasons:
- ✅ Smaller bundle size (~10-20KB vs 150KB+)
- ✅ Better for future mobile app development (React Native via nativewind)
- ✅ Utility-first approach for faster development
- ✅ Highly customizable without overriding defaults
- ✅ Better tree-shaking and purging of unused styles

### Current State
- All pages are fully responsive (mobile, tablet, desktop)
- Consistent design system with reusable components
- Production-ready styling with no known issues

---

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

**Version**: 1.0.5  
**Last Updated**: October 26, 2025  
**Status**: Production Ready ✅ | Frontend Complete ✅ | Backend Complete ✅

