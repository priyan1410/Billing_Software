========================================================================
                 KISH MANDHI - DESKTOP BILLING SOFTWARE
========================================================================

A modern, fast, and feature-rich desktop Point of Sale (POS) and Billing 
Application built with Electron, React, TypeScript, Tailwind CSS, and MySQL.

------------------------------------------------------------------------
TABLE OF CONTENTS
------------------------------------------------------------------------
1. Features
2. Prerequisites
3. Database Setup
4. Installation & Setup
5. Running the Application
6. Building Executable / Installer (.exe)
7. Project Structure
8. Troubleshooting


------------------------------------------------------------------------
1. FEATURES
------------------------------------------------------------------------
- Fast Billing & POS Interface: Quick order creation for Dine-in, Takeaway, 
  and Delivery.
- Token System: Automated token generation and token state tracking.
- Menu Management: Easy category and item management with price breakdown 
  (Quarter / Half / Full).
- Dashboard & Analytics: Track daily sales, orders count, and financial overview.
- Expense Management: Track and categorize operational expenses.
- Restaurant & Print Configuration: Customize receipt header, logo, GST details, 
  tax rates, and thermal printer layouts.
- Automatic Database Initialization: Auto-creates `kish_mandhi` database and all 
  required tables on launch.


------------------------------------------------------------------------
2. PREREQUISITES
------------------------------------------------------------------------
Before installing and running the application, make sure you have the following 
installed on your machine:

1. Node.js (v18.x or higher recommended)
   Download: https://nodejs.org/

2. MySQL Server (MySQL 8.0+, MariaDB, or XAMPP)
   Download: https://dev.mysql.com/downloads/installer/


------------------------------------------------------------------------
3. DATABASE SETUP
------------------------------------------------------------------------
The application automatically creates the database (`kish_mandhi`) and required 
tables when launched. However, MySQL service must be running.

Step 1: Ensure MySQL Service is Running
Make sure your MySQL service is started (via MySQL Notifier, Windows Services 
`services.msc`, or XAMPP Control Panel).

Step 2: Default Connection Configuration
By default, the application connects using the following credentials:
  - Host:      localhost
  - Port:      3306
  - User:      root
  - Password:  Suriy@24
  - Database:  kish_mandhi

Step 3: Change MySQL Password or Credentials
If your MySQL password or user differs:
  - You can update the credentials directly inside db/connection.js
  - Or update connection settings using the Database Settings option inside 
    the application interface.


------------------------------------------------------------------------
4. INSTALLATION & SETUP
------------------------------------------------------------------------
1. Clone or Extract the Project:
   cd "kish mandhi"

2. Install Dependencies:
   npm install


------------------------------------------------------------------------
5. RUNNING THE APPLICATION
------------------------------------------------------------------------
Option A: Full Desktop App (Vite + Electron)
Builds the UI assets and launches the native desktop app window:
   npm start

Option B: Web / UI Development Mode (Vite Dev Server)
Runs Vite development server with hot-reload (browser view):
   npm run dev


------------------------------------------------------------------------
6. BUILDING EXECUTABLE / INSTALLER (.EXE)
------------------------------------------------------------------------
To package the application into a standalone Windows installer (NSIS) and a 
portable `.exe`:

   npm run dist

After the build process finishes:
  - Built executables will be generated in the `dist-electron/` folder.
  - You can distribute the setup installer (.exe) to client machines.


------------------------------------------------------------------------
7. PROJECT STRUCTURE
------------------------------------------------------------------------
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


------------------------------------------------------------------------
8. TROUBLESHOOTING
------------------------------------------------------------------------
- Database Connection Error (ECONNREFUSED / Access denied):
  * Verify that your MySQL server service is running.
  * Double check your root password in db/connection.js.
  * Test login manually using MySQL Command Line Client or MySQL Workbench:
    mysql -u root -p

- Blank Screen on App Launch:
  * Make sure `npm run build` or `npm start` ran cleanly without TypeScript 
    or Vite compilation errors.
========================================================================
