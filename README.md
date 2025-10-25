# Library Management System

This is a full-stack library management system built with a Next.js frontend and a NestJS backend.

## Features

*   **User Management:** Admins can manage users and groups, with support for multiple Admins.
*   **Book Management:** Admins can manage the book catalog.
*   **Role-Based Access Control:** Users can be assigned to groups with different permissions (e.g., "Admin", "Member").
*   **User Registration:** New users can register with a free trial and choose from tiered subscription plans (Bronze, Silver, Gold).
*   **Book Reservations and Loans:** Users can reserve and borrow books.
*   **Transactions:** Users can view their own transaction history, while Admins can view all transactions.
*   **Global Search:** All users can search for books, and Admins can also search for members.
*   **User Profiles:** Users can manage their own profiles and notification preferences.
*   **Notifications:** Users receive notifications for important events, with a dedicated page to view all notifications.

## Tech Stack

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
*   **Backend:** NestJS, TypeScript, TypeORM
*   **Database:** SQLite
*   **Authentication:** JWT
*   **Containerization:** Docker

## Getting Started

To get started with the project, you will need to have Docker and Docker Compose installed.

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/library-management.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd library-management
    ```
3.  Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    ```
4.  Build and run the application with Docker Compose:
    ```bash
    docker-compose up --build
    ```

The application will be available at `http://localhost:3000`.
