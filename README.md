# CashCred360

SME Cashflow & Credit Health Assistant is a banking-aligned web app for monitoring SME income, expenses, receivables, loan obligations, repayment capacity, credit health, alerts, reports, and recommendations.

## Stack

- Frontend: React, TypeScript, Tailwind CSS, Recharts
- Backend: Laravel 8 API, PHP 7.4 compatible
- Database: MySQL/MariaDB through XAMPP
- Auth: HMAC JWT bearer tokens with SME and bank/admin roles

## Demo Users

- SME: `sme.owner@cashcred.test` / `password123`
- Bank admin: `bank.admin@cashcred.test` / `password123`

## XAMPP MySQL Setup

Start XAMPP MySQL from the XAMPP control panel or terminal:

```bash
sudo /opt/lampp/lampp startmysql
```

Create the database:

```bash
/opt/lampp/bin/mysql -uroot -e "CREATE DATABASE IF NOT EXISTS cashcred360 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

The Laravel `.env` is configured for this XAMPP MariaDB instance:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=cashcred360
DB_USERNAME=root
DB_PASSWORD=
```

## Build And Run As One App

Install/build the frontend once, or whenever the React UI changes:

```bash
cd frontend
npm install
npm run build
```

Run the Laravel app from the project root:

```bash
cd /home/maxwell/Projects/CashCred360
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Open `http://127.0.0.1:8000`.

The root `artisan` file delegates to `backend/artisan`, so `php artisan serve` works from the `CashCred360` folder.

## Main API Areas

- `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/cashflow-trends`
- `GET /api/dashboard/expense-breakdown`
- `GET /api/dashboard/income-vs-expenses`
- `GET /api/dashboard/loan-progress`
- CRUD-style endpoints for transactions, invoices, and loans
- Update endpoints for alerts and recommendations
- `GET /api/credit-health`
