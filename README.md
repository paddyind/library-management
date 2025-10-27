# Library Management System

A modern, full-stack library management system with **anonymous book browsing** and comprehensive administrative features. Built with Next.js, NestJS, and Docker.

[![Version](https://img.shields.io/badge/version-1.0.6-blue.svg)](https://github.com/paddyind/library-management)
[![Frontend](https://img.shields.io/badge/frontend-100%25_complete-success.svg)](https://github.com/paddyind/library-management)
[![Backend](https://img.shields.io/badge/backend-100%25_complete-success.svg)](https://github.com/paddyind/library-management)

> **Latest Release (v1.0.6)**: Added "Request a Book" feature, updated membership plans, and refactored documentation. See [CHANGELOG.md](CHANGELELOG.md) for details.

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
- 🙏 **Request a Book** - Request a book if it's not in the catalog

### For Administrators
- 👥 **Member Management** - Complete CRUD operations for member accounts
- 🏷️ **Group Management** - Create groups and assign permissions
- 📚 **Book Catalog** - Manage the entire book inventory
- 📈 **Analytics** - View library-wide statistics and reports
- 🙏 **Manage Book Requests** - Approve or reject member book requests
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

2. **Start the application**
   ```bash
   docker compose up -d
   ```

3. **Access the application**
   - **Frontend**: http://localhost:3100
   - **Backend API**: http://localhost:4000/api

4. **Create your first account**
   - Click "Register" on the welcome page
   - Fill in your details
   - Start browsing and borrowing books!

### Test Credentials
```
Admin Member:
  Email: admin@library.com
  Password: password
  Role: Admin

Regular Member:
  Email: member@library.com
  Password: password
  Role: Member
```

---

## 📚 Documentation

- **[Architecture](ARCHITECTURE.md)** - System architecture and design decisions
- **[Changelog](CHANGELOG.md)** - Version history and updates

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

### Member Interface
- ✅ **Welcome Page** - Public landing page with book catalog
- ✅ **Dashboard** - Personalized member dashboard
- ✅ **Profile** - Complete profile management
- ✅ **Transactions** - Borrowing history and status
- ✅ **Notifications** - Real-time notification system UI
- ✅ **Settings** - Member preferences and configuration
- ✅ **Reports** - Statistical analysis and insights

### Admin Features
- ✅ **Member Management** - Full CRUD interface
- ✅ **Group Management** - Permission-based groups
- ✅ **Book Management** - Catalog administration
- ✅ **Statistics** - Library-wide analytics
- ✅ **Book Request Management** - Approve/reject book requests

---

## 🔧 Development

### Project Structure
```
library-management/
├── frontend/               # Next.js frontend application
│   ├── pages/             # Page components
│   │   ├── index.js       # Public welcome page
│   │   ├── dashboard.js   # Member dashboard
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
│   │   ├── members/       # Member management
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
- [x] Member dashboard
- [x] Authentication (login/register/logout)
- [x] Profile management
- [x] Transactions page
- [x] Notifications UI
- [x] Member management UI
- [x] Group management UI
- [x] Settings page
- [x] Reports page
- [x] Responsive design
- [x] Error handling
- [x] Loading states
- [x] Book Request Form

### Backend: 100% Complete ✅
- [x] Authentication API (JWT, login, register)
- [x] Member CRUD API
- [x] Books API (public access + CRUD)
- [x] Transactions API
- [x] Notifications API (full CRUD + 8 endpoints)
- [x] Groups API (full CRUD + member management)
- [x] Profile API
- [x] Database seed with demo data
- [x] Email service integration
- [x] Book Request API

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
- Use demo credentials: `admin@library.com` / `password` or `member@library.com` / `password`
- Or register a new account
- Check backend is running: `docker compose logs backend`

**Issue: Changes not reflecting**
- Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Rebuild containers: `docker compose up -d --build`

**Issue: Members page accessible without login**
- Fixed in v1.0.5 with `withAdminAuth` HOC
- Only admin members can access /members page now

### Getting Help
- Check [CHANGELOG.md](CHANGELOG.md) for known issues and fixes
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for system details
- Open an issue on GitHub for new problems

---

## 📊 API Endpoints

### Public Endpoints (No Auth)
```
POST /api/auth/register   - Register new member
POST /api/auth/login      - Login member
GET  /api/books           - List books (with fallback)
GET  /api/subscriptions/plans - Get subscription plans
```

### Protected Endpoints (Auth Required)
```
GET    /api/members/profile         - Get member profile
PUT    /api/members/profile         - Update profile
GET    /api/transactions/my       - Get member transactions
POST   /api/books/:id/borrow      - Borrow book
POST   /api/books/:id/return      - Return book
POST   /api/book-requests         - Create a book request
GET    /api/book-requests/mine    - Get my book requests
```

### Admin Endpoints (Admin Role Required)
```
GET    /api/members                 - List all members
POST   /api/members                 - Create member
PUT    /api/members/:id             - Update member
DELETE /api/members/:id             - Delete member
GET    /api/groups                - List all groups
POST   /api/groups                - Create group
PUT    /api/groups/:id            - Update group
DELETE /api/groups/:id            - Delete group
POST   /api/groups/:id/members    - Add member to group
DELETE /api/groups/:id/members/:memberId - Remove member
GET    /api/book-requests         - Get all book requests
PATCH  /api/book-requests/:id     - Update a book request status
```

### Notifications Endpoints (Authenticated)
```
GET    /api/notifications         - Get member notifications
GET    /api/notifications/unread-count - Get unread count
POST   /api/notifications/:id/mark-read - Mark as read
POST   /api/notifications/mark-all-read - Mark all as read
DELETE /api/notifications/:id     - Delete notification
DELETE /api/notifications         - Delete all notifications
```

---

## 🗄️ Database Seed

The application comes with pre-seeded demo data for testing:

**Run the seed script:**
```bash
docker compose exec backend npm run seed
```

**Seeded Data Includes:**
- 2 Demo Members (admin & member)
- 3 Groups (Administrators, Librarians, Members)
- 12 Classic Books (with covers and various statuses)
- 4 Sample Notifications

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

**Version**: 1.0.6
**Last Updated**: October 26, 2025  
**Status**: Production Ready ✅ | Frontend Complete ✅ | Backend Complete ✅
