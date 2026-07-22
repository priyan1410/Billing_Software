# Kish Mandhi - Desktop Billing Software 🍽️

A modern, fast, and feature-rich desktop Point of Sale (POS) and Billing Application built with **Electron**, **React**, **TypeScript**, **Tailwind CSS**, and **MySQL**.

---

## 📋 Table of Contents
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Database Setup](#-database-setup)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [Building Executable / Installer](#-building-executable--installer)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

- 🧾 **Fast Billing & POS Interface**: Quick order creation for Dine-in, Takeaway, and Delivery.
- 🎟️ **Token System**: Automated token generation and token state tracking.
- 🍔 **Menu Management**: Easy category and item management with price breakdown (Quarter / Half / Full).
- 📊 **Dashboard & Analytics**: Track daily sales, orders count, and financial overview.
- 💰 **Expense Management**: Track and categorize operational expenses.
- ⚙️ **Restaurant & Print Configuration**: Customize receipt header, logo, GST details, tax rates, and thermal printer layouts.
- 🗄️ **Automatic Database Initialization**: Auto-creates `kish_mandhi` database and all required tables on launch.

---

## 🛠️ Prerequisites

Before installing and running the application, make sure you have the following installed on your machine:

1. **Node.js** (v18.x or higher recommended)  
   [Download Node.js](https://nodejs.org/)
2. **MySQL Server** (MySQL 8.0+, MariaDB, or XAMPP)  
   [Download MySQL Server](https://dev.mysql.com/downloads/installer/)

---

## 🗄️ Database Setup

The application automatically creates the database (`kish_mandhi`) and required tables when launched. However, MySQL service must be running.

### 1. Ensure MySQL Service is Running
Make sure your MySQL service is started (via MySQL Notifier, Windows Services `services.msc`, or XAMPP Control Panel).

### 2. Default Connection Configuration
By default, the application connects using the following credentials (configured in [`db/connection.js`](file:///c:/Projects/VsCode/kish%20mandhi/db/connection.js)):

| Parameter | Default Value |
| :--- | :--- |
| **Host** | `localhost` |
| **Port** | `3306` |
| **User** | `root` |
| **Password** | `Suriy@24` |
| **Database** | `kish_mandhi` |

### 3. Change MySQL Password or Credentials
If your MySQL password or user differs:
- You can update the credentials directly inside [`db/connection.js`](file:///c:/Projects/VsCode/kish%20mandhi/db/connection.js#L12-L19)
- Or update connection settings using the Database Settings option inside the application interface.

---

## 🚀 Installation & Setup

1. **Clone or Extract the Project:**
   ```bash
   git clone <repository-url>
   cd "kish mandhi"
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

---

## 💻 Running the Application

### Option 1: Full Desktop App (Vite + Electron)
Builds the UI assets and launches the native desktop app window:
```bash
npm start
```

### Option 2: Web / UI Development Mode (Vite Dev Server)
Runs Vite development server with hot-reload (browser view):
```bash
npm run dev
```

---

## 📦 Building Executable / Installer (.exe)

To package the application into a standalone Windows installer (NSIS) and a portable `.exe`:

```bash
npm run dist
```

After the build process finishes:
- Built executables will be generated in the `dist-electron/` folder.
- You can distribute the setup installer (`.exe`) to client machines.

---

## 📁 Project Structure

```text
kish-mandhi/
├── db/                     # MySQL Connection & Schema Initialization
│   ├── connection.js       # Database connection pool & configuration
│   └── schema.js           # Auto table creation & migrations
├── electron/               # Electron backend modules & token utilities
├── src/                    # React Frontend Source
│   ├── components/         # Modular React UI Components (Billing, Expenses, Menu, Reports)
│   ├── store/              # Zustand state management
│   └── js/                 # Additional renderer scripts
├── main.js                 # Electron Main Process
├── preload.js              # Secure IPC Bridge between Main & Renderer
├── index.html              # Main HTML entry point
├── vite.config.ts          # Vite Configuration
└── package.json            # Scripts & Dependencies
```

---

## 🔍 Troubleshooting

- **Database Connection Error (`ECONNREFUSED` / `Access denied`):**
  - Verify that your MySQL server service is running.
  - Double check your root password in [`db/connection.js`](file:///c:/Projects/VsCode/kish%20mandhi/db/connection.js#L16).
  - Test login manually using MySQL Command Line Client or MySQL Workbench:
    ```sql
    mysql -u root -p
    ```
- **Blank Screen on App Launch:**
  - Make sure `npm run build` or `npm start` ran cleanly without TypeScript or Vite errors.
