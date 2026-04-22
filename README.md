# Disaster Relief Resource Management System

A role-based disaster relief management web application built with `Node.js`, `Express`, `MySQL`, and static HTML/Tailwind pages.

This project helps coordinate relief operations across:
- `Admin`
- `Camp Manager`
- `Inventory Manager`
- `Supplier`

It supports camp requests, inventory dispatch, supplier order handling, stock visibility, and an admin activity overview.

## Overview

The system models a relief workflow where camps raise resource requests, inventories fulfill them based on available stock, and suppliers replenish inventories when needed. Admins can monitor the system and open read-only views of camps, inventories, and suppliers.

## Key Features

### Admin
- View a role-wise dashboard of today's activity
- Open camps, inventories, and suppliers in `read-only` mode
- Monitor requests, dispatches, supplier orders, and deliveries

### Camp Manager
- View camp details and current camp stock
- Raise resource requests with priority
- Track request fulfillment status
- View supplies received history
- Dispatch camp stock and view dispatch history

### Inventory Manager
- View inventory details and stock levels
- Fulfill pending and partial camp requests
- Track completed camp requests
- Raise supplier orders with priority
- Monitor supplier order status and dispatch activity

### Supplier
- View incoming supplier requests
- Approve and complete supply orders
- Track completed deliveries
- View supplier-specific read-only pages from admin mode

## Tech Stack

- `Frontend`: HTML, Tailwind CSS, vanilla JavaScript
- `Backend`: Node.js, Express
- `Database`: MySQL
- `Packages`: `express`, `cors`, `mysql2`

## Project Structure

```text
Disaster_Management_DBMS_Mini/
├── Backend/
│   ├── package.json
│   └── server.js
├── Frontend/
│   ├── admin.html
│   ├── camp_manager.html
│   ├── inventory_manager.html
│   ├── login.html
│   ├── resource_management.html
│   └── supplier.html
├── Final_DisasterDatabase.md
└── README.md
```

## Database Design

The schema is based on the entities below:
- `disaster`
- `affected_area`
- `central_inventory`
- `relief_camp`
- `resource`
- `supplier`
- `inventory_stock`
- `camp_stock`
- `supply`
- `resource_request`
- `request_fulfillment`
- `camp_dispatch_history`

The detailed SQL creation/insertion notes are available in [Final_DisasterDatabase.md](/c:/Users/shara/Desktop/Disaster_Management_DBMS_Mini/Final_DisasterDatabase.md).

## Prerequisites

Before running the project, make sure you have:
- `Node.js` installed
- `MySQL 8+` installed and running
- a MySQL database created for this project

## Installation

### 1. Clone or open the project

```powershell
cd C:\Users\shara\Desktop\Disaster_Management_DBMS_Mini
```

### 2. Install backend dependencies

```powershell
cd Backend
npm install
```

### 3. Configure the database connection

The backend reads these environment variables:
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `PORT`

You can either:
- keep the defaults in your local environment, or
- set your own environment variables before starting the server

Example in PowerShell:

```powershell
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="your_password"
$env:DB_NAME="disaster_relief_db_final"
$env:PORT="5000"
```

## Running the Application

From the `Backend` folder:

```powershell
npm start
```

The server will start on:

```text
http://localhost:5000
```

Open this in your browser:

```text
http://localhost:5000
```

## Default Flow

1. Open `login.html`
2. Choose a role and sign in
3. Use the role-specific page:
   - `Admin` -> `admin.html`
   - `Camp Manager` -> `camp_manager.html`
   - `Inventory Manager` -> `inventory_manager.html`
   - `Supplier` -> `supplier.html`

## Important Notes

### Role access
- The app uses frontend role checks via `localStorage`
- Admin can open camp, inventory, and supplier pages in read-only mode
- Role labels in the header/sidebar stay consistent during admin read-only navigation

### Dynamic views
- Camp pages support `camp_id`
- Inventory pages support `inventory_id`
- Supplier pages support `supplier_id`

Examples:

```text
camp_manager.html?camp_id=4&readOnly=true
inventory_manager.html?inventory_id=1&readOnly=true
supplier.html?supplier_id=1&readOnly=true
```

### Backend compatibility helpers

The server includes small schema-safety helpers that create or add missing pieces when needed, such as:
- `supply.status`
- `supply.priority_level`
- `camp_dispatch_history`

## Example Data Already Reflected in the Project

From the provided database notes, the sample setup includes:
- `Pune Relief Hub` as a central inventory
- `Birla Relief Supplies` as a supplier
- `Ambegoan_Flood` as a relief camp
- resources like:
  - `Water Bottles`
  - `Meal Kits`
  - `First Aid Kits`
  - `Thermal Blankets`
  - `LED Torches`
  - `Wheelchairs`

## Available Backend Script

From [Backend/package.json](/c:/Users/shara/Desktop/Disaster_Management_DBMS_Mini/Backend/package.json):

```powershell
npm start
```

## Current Status

The application currently includes:
- polished role-based pages for admin, camp, inventory, and supplier
- admin read-only viewing across operational pages
- camp request and dispatch tracking
- inventory dispatch and supplier order flow
- supplier completion flow
- admin daily activity overview

## Future Improvements

- stronger authentication instead of local role simulation
- `.env` support for database configuration
- seed SQL script for one-click setup
- automated tests for API routes
- better validation and error messaging
- deployment-ready production configuration

## Authoring Note

This README reflects the current working version of the project in this repository and is intended to make local setup, understanding, and demo use much smoother.
