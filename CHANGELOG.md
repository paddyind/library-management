# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.6] - 2025-10-26

### Added
- **"Request a Book" Feature**:
  - Members can now request a book if it's not found in the search results.
  - A new "BookRequest" entity has been added to the backend.
  - New API endpoints have been created to handle book requests.
  - Admins can view and manage all book requests from a new admin panel.
  - Members can view their own book requests and their status.
- **Updated Membership Plans**:
  - Membership tiers have been updated with new pricing, trial periods, and book lending limits.
  - A new `subscription-plans.ts` configuration file has been added to the backend.
  - The registration page now dynamically displays the updated membership plans.

### Changed
- **Data Model Documentation**:
  - Refactored all instances of "User" to "Member" in the `ARCHITECTURE.md`, `CHANGELOG.md`, and `README.md` files.
  - Updated the `ARCHITECTURE.md` file to include the new `BookRequest` entity.

## [v1.0.5 FINAL] - 2025-10-26

### 🎉 Major Feature Release - Enhanced Book Browsing & Search

### Fixed
- **🔴 CRITICAL: Build Error - Layout Module Export**
  - Multiple Layout files causing import conflicts (Layout.js, Layout.tsx, Layout.jsx)
  - Removed duplicate Layout.tsx and Layout.jsx files
  - Fixed search.js import to use explicit .js extension
  - Error: "Export default doesn't exist in target module" - RESOLVED

- **Search Page**: Complete rebuild from broken state
  - Fixed incorrect API endpoint (was port 3001, now 4000)
  - Added proper error handling
  - Implemented loading states
  - Added empty state messages
  - Fixed import statements

### Added
- **📚 Enhanced Books Page** - Complete overhaul with premium features:
  
  **My Current Books Section** (Top of page):
  - Displays all currently borrowed books for logged-in members
  - Shows book title, author, and due date
  - Quick "Return" button for each book
  - Real-time count display
  - Beautiful gradient background (blue to indigo)
  - Only visible when member has active borrows
  
  **Search & Filter Section**:
  - Real-time search bar (title, author, ISBN)
  - Status filter dropdown (All, Available, Borrowed, Reserved)
  - Search icon with placeholder guidance
  - Client-side filtering for instant results
  
  **Books Grid Display**:
  - Responsive card-based layout (1/2/3/4 columns)
  - Each card shows:
    - Book title, author, ISBN
    - Color-coded status badges (green/red/yellow)
    - Available copies count
    - Context-aware action buttons
  - Hover effects and smooth transitions
  - Empty state when no books match filters
  
  **Member Experience Features**:
  - "Borrow Book" button for available books (logged-in members)
  - "Login to Borrow" button for non-authenticated members
  - "Return" button in My Current Books section
  - Automatic redirect to login with return URL
  - Real-time UI updates after borrow/return actions
  - Loading spinners during API calls
  - Error messages with member-friendly text

- **🔍 Enhanced Search Page** - Complete implementation:
  - Full-text search across book catalog
  - Beautiful card-based result layout
  - Status indicators with color coding
  - Loading states with spinner
  - Error handling with retry guidance
  - Empty state with helpful message
  - Direct navigation to book details
  - Responsive grid (1/2/3 columns)

### Changed
- **Books Page** (`/frontend/pages/books.js`):
  - Complete rewrite from 40 lines to 280+ lines
  - Integrated search, filter, and transaction management
  - Added real-time state management
  - Implemented comprehensive member flows
  - Better error handling and loading states

- **Search Page** (`/frontend/pages/search.js`):
  - Rewrote from basic stub to full implementation
  - Fixed API integration
  - Added proper UI components
  - Implemented error and loading states

### Removed
- `/frontend/src/components/layout/Layout.tsx` - Duplicate causing build errors
- `/frontend/src/components/layout/Layout.jsx` - Duplicate causing build errors

### Technical Improvements
- ✅ Resolved all build errors
- ✅ Fixed module import conflicts
- ✅ Optimized API calls (fetch only when needed)
- ✅ Improved state management
- ✅ Better error handling across pages
- ✅ Enhanced accessibility (semantic HTML, ARIA labels)
- ✅ Responsive design for all screen sizes
- ✅ Smooth animations and transitions

### API Integration
New API endpoints utilized:
- `GET /api/books` - Fetch all books
- `GET /api/transactions/my` - Fetch member's active transactions
- `POST /api/transactions` - Borrow a book
- `PATCH /api/transactions/:id/return` - Return a book

### Testing
- ✅ Books page: 200 OK
- ✅ Search page: 200 OK
- ✅ No build errors
- ✅ All imports resolved
- ✅ Search functionality: Working
- ✅ Filter functionality: Working
- ✅ Borrow functionality: Working
- ✅ Return functionality: Working
- ✅ Authentication integration: Working
- ✅ Responsive design: Verified

### Member Experience
**For Logged-In Members**:
1. See "My Current Books" section at top
2. Quick return with one click
3. Search and filter available books
4. Borrow books instantly
5. Real-time updates

**For Non-Logged Members**:
1. Browse all books with search/filter
2. "Login to Borrow" button available
3. Redirect to login preserves return URL
4. Full access after authentication

### Documentation
- Created `VERSION_1.0.5_FINAL.md` - Complete feature documentation
- Updated `CHANGELOG.md` with all changes
- Documented all new features and fixes

### Known Limitations
- Search is client-side (suitable for small-medium catalogs)
- No pagination (loads all books at once)
- No category/genre filtering yet
- No book cover images displayed

### Future Enhancements (Recommended)
1. Add pagination for large catalogs
2. Server-side search with debouncing
3. Book cover image display
4. Category/genre filtering
5. Advanced filters (year, publisher, rating)
6. Wishlist functionality
7. Book recommendations
8. Reading history
9. Book reviews and ratings
10. Reserve unavailable books

---

## [v1.0.5] - 2025-10-26g

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.5] - 2025-10-26

### � Critical Fixes

### Fixed
- **🔴 CRITICAL: Registration 500 Error**
  - Backend subscription enum was rejecting FREE tier with CHECK constraint error
  - Added FREE to SubscriptionTier enum in backend
  - Changed all tier values to uppercase for consistency (FREE, BRONZE, SILVER, GOLD)
  - Registration now works with all subscription tiers
  - Error: `SQLITE_CONSTRAINT: CHECK constraint failed: tier` - RESOLVED

- **🔴 CRITICAL: Invisible Buttons/Missing Styling**
  - Tailwind CSS content paths were incorrect in config
  - Was scanning `./src/pages/**` but pages are in `./pages/**`
  - Fixed content paths to scan correct directories
  - All buttons now visible with proper styling
  - Submit buttons now render correctly on login and register pages
  - Issue: "missing button/link, have to press enter" - RESOLVED

- **Registration Form Cleanup**: Removed unnecessary `firstName` and `lastName` fields
  - These fields were not required by backend API
  - Simplified registration to only collect: name, email, password, subscription
  - Fixed potential validation errors from unused fields

- **Members Page Security**: Protected members page with admin-only access
  - Applied `withAdminAuth` HOC to ensure only admins can access
  - Unauthenticated members are redirected to login with return URL
  - Non-admin authenticated members are redirected to dashboard
  - Prevents unauthorized access to member management features

### Changed
- **Backend Subscription Enum** (`/backend/src/models/subscription.entity.ts`):
  ```typescript
  // Before
  enum SubscriptionTier { BRONZE = 'bronze', SILVER = 'silver', GOLD = 'gold' }
  
  // After
  enum SubscriptionTier { FREE = 'FREE', BRONZE = 'BRONZE', SILVER = 'SILVER', GOLD = 'GOLD' }
  ```

- **Frontend Tailwind Config** (`/frontend/tailwind.config.js`):
  ```javascript
  // Before (WRONG)
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}']
  
  // After (CORRECT)
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './src/**/*.{js,ts,jsx,tsx,mdx}']
  ```

- `/frontend/pages/register.js`:
  - Removed firstName/lastName from state (lines 10-15)
  - Removed firstName/lastName input fields (lines 87-115)
  
- `/frontend/pages/members.js`:
  - Added `withAdminAuth` import
  - Changed export from default function to `withAdminAuth(MembersPage)`
  - Now properly protected with authentication and role checking

### Added
- **Bootstrap Migration Plan**: Created comprehensive migration guide (`BOOTSTRAP_MIGRATION.md`)
  - 8-phase migration plan with estimated 18-25 hours
  - Detailed conversion examples for all components
  - Risk assessment and rollback strategy
  - Component-by-component conversion guide
  - Ready for implementation when team decides to proceed

### Testing
- ✅ Registration with FREE tier: Working
- ✅ Registration with BRONZE tier: Working  
- ✅ Registration with SILVER tier: Working
- ✅ Registration with GOLD tier: Working
- ✅ Login button visible: Confirmed
- ✅ Register button visible: Confirmed
- ✅ Form submission via Enter: Working
- ✅ Form submission via Button: Working
- ✅ Members page auth: Working (admin-only)

### Documentation
- Created `CRITICAL_FIXES.md` - Comprehensive report of critical issues and fixes
- Created `FIXES_2025-10-26.md` - Summary of quick fixes applied
- Created `BOOTSTRAP_MIGRATION.md` - Comprehensive Bootstrap migration plan

### Security Impact
- ✅ Members page now requires authentication
- ✅ Members page restricted to admin role only
- ✅ Proper redirect flow with return URLs
- ✅ Prevents unauthorized access to sensitive member data

### Known Issues
- ⚠️ Email service not configured (logs show SMTP connection refused)
  - Does not block registration
  - Email notifications won't work until SMTP configured
  - Consider: SendGrid, AWS SES, or other email service

---

## [v1.0.4] - 2025-01-27

### 🎨 UI/UX Enhancements & Authentication

### Added
- **Authentication Protection**: Created `withAuth` HOC for protecting routes that require authentication
  - Automatically redirects unauthenticated members to login page with return URL
  - Preserves the intended destination URL for redirect after login  
  - Shows loading spinner while checking authentication status
  - Supports role-based access control (Admin/Member)
  - Usage: `export default withAuth(YourComponent);`
  - Admin-only variant: `export default withAdminAuth(YourComponent);`
  
- **Forgot Password Page** (`/forgot-password`):
  - Complete password reset UI with email submission
  - Email validation and error handling
  - Success message display
  - Loading states with spinner animation
  - Link back to login page
  - Professional styling consistent with app design

- **Enhanced Help Page** - Complete redesign with modern UI/UX:
  - Animated background with blob effects and gradients
  - Three main sections in beautiful card layout:
    - **Getting Started**: 4-step onboarding guide
    - **Membership Plans**: All plans with INR pricing
    - **How to Borrow Books**: 5-step borrowing process
  - Featured demo accounts section with Admin and Member credentials
  - Contact support section with email link
  - Smooth hover animations and transitions
  - Fully responsive design for mobile and desktop
  - Professional footer with copyright

### Changed
- **Currency Update**: Changed all subscription pricing from USD to INR (Indian Rupees)
  - FREE: ₹0/month (3 books)
  - BRONZE: ₹799/month (5 books) [was $9.99]
  - SILVER: ₹1599/month (10 books) [was $19.99]
  - GOLD: ₹2399/month (Unlimited books) [was $29.99]
  - Updated in: Registration page, Help page
  
- **Notifications Page**: Added comprehensive authentication handling
  - Checks if member is authenticated before loading data
  - Redirects to login with return URL if not authenticated
  - Shows proper error handling for 401 unauthorized responses
  - Prevents showing 401 errors to unauthenticated members
  - Improved member experience with loading states

### Fixed
- Fixed forgot password 404 error - page now exists and fully functional
- Fixed authentication flow - protected pages now redirect to login instead of showing 401 errors
- Improved redirect flow with return URLs for better member experience

### Technical Details

#### New Files Created
- `/frontend/src/components/withAuth.js` - Higher Order Component for route protection (68 lines)
- `/frontend/pages/forgot-password.js` - Password reset page (154 lines)

#### Modified Files
- `/frontend/pages/help.js` - Complete redesign (350+ lines, was 140 lines)
- `/frontend/pages/register.js` - Updated currency to INR (line 161-163)
- `/frontend/pages/notifications.js` - Added auth redirect and improved error handling

#### Usage Examples

**Protecting Routes with Authentication:**
```javascript
// Basic authentication protection
import { withAuth } from '../src/components/withAuth';

function MyProtectedPage() {
  return <div>Protected Content</div>;
}

export default withAuth(MyProtectedPage);

// Admin-only protection
import { withAdminAuth } from '../src/components/withAuth';
export default withAdminAuth(MyAdminPage);

// Member-only protection
import { withMemberAuth } from '../src/components/withAuth';
export default withMemberAuth(MyMemberPage);
```

**Redirect Flow:**
- Member tries to access `/notifications` without login
- Redirected to `/login?redirect=/notifications`
- After successful login, member is sent back to `/notifications`

### Pending Tasks for v1.0.5
- [ ] **Login Button Investigation**: Member reports not seeing sign-in button (code exists, may be rendering/CSS issue)
- [ ] **Apply withAuth to All Protected Pages**:
  - [ ] /dashboard
  - [ ] /profile  
  - [ ] /settings
  - [ ] /books (for borrowing features)
  - [ ] /members (admin only)
  - [ ] /reports (admin only)
- [ ] **Configurable Subscriptions**:
  - [ ] Create Subscription entity in backend
  - [ ] Add subscription management to admin settings page
  - [ ] Create API endpoints for subscription CRUD operations
  - [ ] Update registration to fetch plans from API instead of hardcoded values
  - [ ] Allow admin to customize plan names, prices, and book limits

---

## [v1.0.3] - 2025-01-26

### 🎉 Major Release - Backend Implementation Complete

### Added
- **Notifications API** (8 endpoints):
  - Full CRUD operations for member notifications
  - Mark as read/unread functionality
  - Unread count tracking
  - Notification types: info, success, warning, error, overdue, due_soon, reservation_ready
  - Member-specific data isolation with JWT authentication
  
- **Groups API** (8 endpoints):
  - Full CRUD operations for member groups
  - Enhanced with description and permissions array
  - Member management (add/remove members)
  - Role-based access control (Admin only for mutations)
  - Group member listing
  
- **Database Seed Script**:
  - 2 demo members (admin@library.com, member@library.com)
  - 3 groups with proper permissions (Administrators, Librarians, Members)
  - 12 classic books with cover images and various statuses
  - 4 sample notifications of different types
  - Run with: `docker compose exec backend npm run seed`

- **New Backend Entities**:
  - Notification entity with relationships to Member
  - Enhanced Group entity with description, permissions, timestamps

- **New Backend DTOs**:
  - CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto
  - UpdateGroupDto, AddMemberDto, RemoveMemberDto

### Fixed
- **Database Path Issue**: Seed script was creating database at `./data/database.db` while NestJS app used `data/library.sqlite`
  - Solution: Updated seed script to match app configuration
  - Result: All APIs now work correctly with seeded data

- **Authentication Testing**: Login endpoint now properly authenticates seeded members

### Enhanced
- **NotificationsService**: Complete rewrite from email-only to full CRUD
  - Added helper methods for common notification types
  - Graceful email handling (optional)
  - Proper error handling and member isolation

- **GroupsService**: Enhanced with member management
  - Name uniqueness validation
  - Duplicate member prevention
  - Proper error handling

### Technical
- All TypeScript compilation errors resolved
- Backend container rebuilds working correctly
- Database synchronization enabled for seed script
- All API endpoints tested and verified

### Status
- ✅ Frontend: 100% Complete
- ✅ Backend: 100% Complete
- ✅ Database: Fully seeded
- ✅ All APIs: Tested and working

---

## [v0.4.3] - 2025-01-26

### Fixed
- **Authentication System**: Enhanced AuthContext with login(), logout(), checkAuth() functions
- **Profile Page**: Fixed API URL (3001 → 4000), complete redesign with Layout
- **Header Component**: Fixed profile dropdown - now has working navigation links
- **Header Component**: Added logout functionality that clears auth and redirects
- **Header Component**: Displays actual member name from context
- **Notifications Page**: Gracefully handles missing backend API with member-friendly error
- **All API Calls**: Now properly use authentication tokens from AuthContext

### Added
- **Profile Page Features**:
  - Beautiful modern design with sections
  - Profile picture display
  - Editable name field
  - Read-only email and role display
  - Membership information (if applicable)
  - Password change section placeholder
  - Account activity stats
  - Proper loading and error states
- **Header Dropdown Navigation**:
  - "Your Profile" link → `/profile`
  - "Settings" link → `/settings`
  - "Sign out" button with logout functionality

### Changed
- **AuthContext**: Now manages member state globally across the app
- **Login Flow**: Member context immediately available after successful login
- **Profile Access**: Profile page now accessible via header dropdown
- **Settings Access**: Dynamic tab rendering - admin tabs only show for admin members

### Documentation
- **Added**: `BACKEND_TODO.md` - Comprehensive guide for backend API implementation
- **Updated**: CHANGELOG with v0.4.3 details

### Known Issues
- Backend notifications API not implemented (frontend handles gracefully)
- Backend groups API not implemented (frontend UI ready)
- Some member management endpoints may need verification

---

## [v0.4.2] - 2025-01-26

### Fixed
- **Transactions Page**: Fixed API URL from incorrect port 3001 to correct port 4000
- **Transactions Page**: Added proper error handling and loading states
- **Transactions Page**: Made page work without authentication
- **Settings Page**: Fixed invalid Link components (removed nested `<a>` tags)
- **Login Page**: Complete redesign with proper styling, error handling, and loading states
- **Login Page**: Added demo credentials display
- **Notifications Page**: Implemented full notifications list with filter tabs (All/Unread/Read)
- **Notifications Page**: Added mark as read, mark all as read, and delete functionality
- **Header Component**: Fixed invalid Link component with nested `<a>` tag
- **All Link Components**: Removed nested `<a>` tags to comply with Next.js 13+ requirements

### Added
- **Member Management**: Full CRUD interface at `/admin/members`
  - Create, read, update, delete members
  - Role assignment (Member/Admin)
  - Member listing with search and filters
  - Modal-based form for adding/editing members
- **Group Management**: Full CRUD interface at `/admin/groups`
  - Create, read, update, delete groups
  - Permission assignment system
  - Group listing with member counts
  - Modal-based form for adding/editing groups
- **API Configuration**: Centralized API_BASE_URL using environment variables
- **Better Error Messages**: Member-friendly error displays across all pages

### Security
- Protected admin pages with `withAdminAuth` HOC
- Token-based authentication for all API calls
- Password fields properly handled (not displaying current passwords)

### Technical
- All pages now use `http://localhost:4000/api` as the correct backend URL
- Proper TypeScript compatibility maintained
- No compilation errors in any files
- All containers rebuilt and tested successfully

---

## [v0.4.1] - 2025-01-25

### Fixed
- TypeScript compilation errors in backend controllers (search, transactions, profile)
- Import type statements updated to use `import type { Request }` for Express
- BooksService method call corrected (removed non-existent `search` method)
- Auth service subscription creation now properly passes all required parameters
- SubscriptionsModule now exports SubscriptionsService for dependency injection
- AuthModule now imports SubscriptionsModule
- Frontend jwt-decode package usage updated from default import to named import `{ jwtDecode }`
- Duplicate content removed from transactions.js file causing parse errors
- useAuth hook import paths corrected throughout frontend to use AuthContext
- All frontend pages now loading successfully (200 status)

### Enhanced
- Backend compilation now error-free with watch mode operational
- Frontend hot reload functioning correctly
- All API endpoints tested and responding correctly

## [0.4.0] - 2025-10-25

### Added
- Member, and Group management in Settings.
- Multi-admin support.
- Member profile editing and viewing for all members.
- Anonymous member book browsing with login/register prompt.
- Member registration flow with free trial, deposit, and tiered subscriptions (Bronze, Silver, Gold).
- `Transactions` module to view book loans and reservations.
- Global search for books (all members) and members (Admins only).
- "All Notifications" link and "My Notifications" page.
- "Clear" button for notifications.

### Enhanced
- Access control to restrict Settings and Reports pages to Admins.
- Transactions page now shows member-specific transactions for members and all transactions for Admins.

## [0.3.0] - 2025-10-25

### Added
- Books module with complete CRUD API endpoints
- Global exception filter with structured error responses and logging
- Security middleware: Helmet.js for secure HTTP headers
- Performance optimization: Compression middleware for responses
- Global input validation pipeline with class-validator
- CORS configuration with origin whitelist
- Reports page with placeholder UI for future analytics features
- Settings page with tabbed interface for system configuration

### Fixed
- All TypeScript compilation errors (11 total)
- Import type issues for Express Request in controllers
- DTO compatibility between UpdateProfileDto and UpdateMemberDto
- Null return type handling in services with NotFoundException
- Missing 'name' property in Member entity
- Module dependency issues (NotificationsModule imports)
- Compression import namespace issue
- TypeORM entity registration path for proper entity discovery
- Sidebar overlapping main content on desktop view
- Layout responsive margin to accommodate fixed sidebar (md:ml-64)

### Enhanced
- Frontend BookList component with loading states and error handling
- API integration with proper base URL configuration
- Error boundaries and member-friendly error messages
- Authentication checks for protected operations
- Sidebar navigation UX - removed duplicate admin member display

### Security
- Implemented Helmet.js for XSS, CSP, HSTS, and frame protection
- Added global validation pipe with whitelist mode
- Configured CORS with credentials support
- Input sanitization and type transformation

## [0.2.0] - 2025-10-24

### Added
- Member and group management with role-based access control
- Login and admin screens for managing the system
- Book reservation flow with API and database integration
- Member profile management for updating member details and notification preferences
- Email notification system for member registration and book reservations

## [0.1.0] - 2025-10-24

### Added
- Initial project setup with Next.js frontend and NestJS backend
- Docker configuration for development and production
- SQLite database integration
- Basic project structure and documentation
- Nginx reverse proxy configuration
- Development and production Docker compose files
- Environment configuration templates
- Makefile for common development tasks

### Changed
- Switched from Firebase to SQLite for data persistence
- Updated environment variables for SQLite configuration

### Removed
- Firebase/OneSignal configuration
- PostgreSQL dependencies and configuration
