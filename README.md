<<<<<<< HEAD
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
=======
# Kish Billing Software 🍽️ — Comprehensive Documentation

---

## Overview

**Kish Billing Software** is a modern, high-performance desktop Point of Sale (POS) and restaurant management application built specifically for Mandhi restaurants, eateries, and food service businesses. It streamlines front-of-house billing operations, kitchen workflow management, token generation, expense tracking, and financial analytics into a fast, reliable desktop interface with multi-device web API capabilities and cloud database sync.

---

## Technologies Used

`Electron 33` `React 18` `TypeScript` `Vite` `Tailwind CSS` `MySQL 8.0` `Zustand` `Node.js` `jsPDF` `Recharts` `Supabase / Cloud Sync` `@tauri-apps/api`

---

## Key Features

- **▸ Fast Billing & POS Interface**: Lightning-fast order creation for **Dine-In**, **Takeaway**, and **Delivery** with multi-portion variants (Quarter / Half / Full), table assignment, and customizable discounts.
- **▸ Live Token System**: Automated queue token generation, itemized token breakdown for kitchen pass display, and live token status tracking.
- **▸ Menu & Category Management**: Dynamic category management, dish configuration with HSN/SAC codes, flexible unit types (Pcs, Kg, Litre, Plate, Box), and portion pricing rules.
- **▸ Advanced Thermal Receipt & Printer Configuration**: Dual thermal printer routing (`printer1` / `printer2` targets for bill vs kitchen token), receipt header/footer note customization, logo printing, GST breakdown, and tax toggle.
- **▸ Pre-Orders & Advance Booking**: Track future orders, log advance payments, manage customer contact records, and convert pre-orders directly into finalized bills.
- **▸ Financial Analytics & P&L Dashboard**: Real-time sales tracking, daily order volume, expense vs. revenue profit & loss summaries, custom date filtering, and graphical charts powered by Recharts.
- **▸ Expense Tracker**: Categorized operational expense logging (Supplies, Utilities, Salaries, Rent) with payment mode records (Cash, UPI, Card, DEO).
- **▸ Multi-User Auth & Role Management**: Secure credentials, role-based controls, restaurant branding customization, and account management.
- **▸ Auto-Database Initialization & Cloud Sync Engine**: Self-healing MySQL schema setup on application launch, background database backup/restore manager, and Supabase/Cloud sync adapter for remote telemetry.
- **▸ Mobile Web Companion App**: Embedded REST API server (`mobile-web-application/api-server.js`) permitting staff to access billing and table status from any mobile browser or tablet on the local network.

---

## 🏗️ System Architecture

```text
Kish Billing Software Architectural Overview
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ELECTRON MAIN PROCESS                              │
│  (main.js / main.ts, preload.js, backupManager.js, syncEngine.js)            │
└───────┬──────────────────────────────┬──────────────────────────────┬───────┘
        │                              │                              │
        ▼                              ▼                              ▼
┌──────────────┐               ┌──────────────┐               ┌──────────────┐
│  IPC BRIDGE  │               │ MYSQL DB     │               │ MOBILE API   │
│  (Context    │ ◄───────────► │ ENGINE       │ ◄───────────► │ REST SERVER  │
│   Bridge)    │               │ (connection. │               │ (Port 3001)  │
└───────┬──────┘               │  js/schema)  │               └──────────────┘
        │                      └──────────────┘
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REACT + TAILWIND FRONTEND                             │
│  (Zustand Stores, POS Billing, Dashboard, Expenses, Pre-Orders, Settings)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database & Data Schemas

### 1. Connection Configuration (`db/connection.js`)
Default database credentials can be updated via the in-app **Database Settings** modal or directly in the configuration file:

| Parameter | Default Value | Description |
| :--- | :--- | :--- |
| **Host** | `localhost` | Local or Remote MySQL Host IP |
| **Port** | `3306` | MySQL Port Number |
| **User** | `root` | MySQL Database User |
| **Password** | `Suriy@24` | MySQL User Password |
| **Database** | `kish_mandhi` | Main Database Name |

### 2. Primary Database Entities

- `users`: User profiles, authentication credentials, roles, and status flags.
- `categories`: Menu categories (e.g., *Mandhi Special*, *Starters*, *Beverages*).
- `dishes`: Menu items, category linkage, unit types, HSN/SAC, and portion prices (`priceQuarter`, `priceHalf`, `priceFull`).
- `orders` & `order_items`: Completed transactions, customer info, table numbers, tax/discount figures, and payment modes (`Cash`, `UPI`, `Card`, `DEO`).
- `preorders` & `preorder_items`: Advance bookings, pickup dates, advance paid amounts, notes, and booking statuses (`Pending`, `Billed`, `Cancelled`).
- `expenses`: Logged expenditures, expense categories, amounts, receiver details, and payment modes.
- `restaurant_details`: Store profile, address, GST details, FSSAI numbers, tax rates, thermal printing toggles, and printer target routes.

---

## 💻 Core Application Modules

### 1. POS & Billing Interface ([`src/components/Billing`](file:///c:/Projects/VsCode/kish%20mandhi/src/components/Billing))
- **Order Types**: Select between **Dine-In** (assign table number), **Takeaway**, or **Delivery**.
- **Cart Management**: Add items with instant portion selection (**Quarter**, **Half**, **Full**), quantity adjustments, item-level notes, and discounts.
- **Payment Modes**: Split or direct settlement via **Cash**, **UPI**, **Card**, or **DEO** (Departmental/Owner Order).
- **One-Click Printing**: Instant receipt printing and token generation powered by `jspdf` / `jspdf-autotable`.

### 2. Dashboard & Analytics ([`src/components/Dashboard`](file:///c:/Projects/VsCode/kish%20mandhi/src/components/Dashboard/DashboardView.tsx))
- Real-time revenue stat cards (Today's Total Sales, Orders Count, Expenses Total, Net Profit).
- Interactive sales performance charts rendered using **Recharts**.
- Quick summary of recent transactions and token statuses.

### 3. Pre-Orders System ([`src/components/PreOrders`](file:///c:/Projects/VsCode/kish%20mandhi/src/components/PreOrders))
- Create advance orders for catering, parties, or bulk pickups.
- Record deposit/advance amounts and automatically compute remaining balance due upon bill finalization.

### 4. Expense Tracker ([`src/components/Expenses`](file:///c:/Projects/VsCode/kish%20mandhi/src/components/Expenses))
- Log operational expenditures with custom categories (e.g., Raw Materials, Salary, Maintenance).
- Filter expenses by date ranges to generate instant Profit & Loss (P&L) breakdown reports.

### 5. Restaurant & Print Settings ([`src/components/Settings`](file:///c:/Projects/VsCode/kish%20mandhi/src/components/Settings))
- **Branding**: Set store name, tagline, logo URL, owner details, GSTIN, and FSSAI license numbers.
- **Print Layout Control**: Select printer resolution, toggle tax breakdowns, round-off display, address visibility, and customize header/footer bill notes.
- **Dual Thermal Printer Setup**: Route primary bill prints to `Printer 1` and kitchen tokens to `Printer 2`.

---

## 📱 Mobile Web Companion Application

The software includes a built-in mobile server ([`mobile-web-application/api-server.js`](file:///c:/Projects/VsCode/kish%20mandhi/mobile-web-application/api-server.js)) that exposes lightweight REST endpoints for mobile order taking:

- **Launch Command**: `npm run mobile-api`
- **Port**: Default HTTP Port `3001`
- **Capabilities**: Fetch active menu categories, check real-time dish availability, submit table orders, and monitor token statuses directly from smartphone or tablet browsers.

---

## 🚀 Setup & Execution Guide

### Prerequisites
1. **Node.js**: v18.x or higher installed.
2. **MySQL Server**: MySQL 8.0+ running locally or on the local network.

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Running in Development Mode
To run the web view in Vite development mode:
>>>>>>> 8519576bc3a9d421935c659c0529facf068b5ed5
```bash
npm run dev
```

<<<<<<< HEAD
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
=======
### Step 3: Running Full Desktop App (Electron)
To compile the UI bundle and launch the native Electron desktop application:
```bash
npm start
```

### Step 4: Packaging Production Executable (.exe)
To package the app into a standalone Windows installer (NSIS) and portable executable:
```bash
npm run dist
```
The output installers will be generated inside the `dist-electron/` directory.

---

## 🔧 Maintenance & Backup Tools

- **Backup Manager**: Database snapshots are saved automatically via `backupManager.js`.
- **Cloud Sync**: Optional cloud syncing available through `syncEngine.js` and `supabaseAdapter.js` to ensure zero data loss during hardware failure.
>>>>>>> 8519576bc3a9d421935c659c0529facf068b5ed5
