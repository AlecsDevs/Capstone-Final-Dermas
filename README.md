# Capstone Final Dermas (Localhost Setup Only)

This repository has two parts:
- client (React + Vite)
- web-server (Laravel API)

This guide is only for localhost setup. No deployment steps are included.

## 1. Requirements

Install these first:
- Node.js 20+
- npm 10+
- PHP 8.2+
- Composer 2+
- MySQL 8+
- Git

## 2. Clone the Repository

```bash
git clone https://github.com/AlecsDevs/Capstone-Final-Dermas.git
cd Capstone-Final-Dermas
```

## 3. Setup Backend (Laravel)

Open terminal 1:

```bash
cd web-server
composer install
```

Create env file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Mac/Linux:

```bash
cp .env.example .env
```

Generate app key:

```bash
php artisan key:generate
```

## 4. Configure Database

Edit web-server/.env and set:

```env
APP_NAME="MDRRMO"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=web_server
DB_USERNAME=root
DB_PASSWORD=
```

Create database in MySQL:

```sql
CREATE DATABASE web_server;
```

Run migrations and seeders:

```bash
php artisan migrate --seed
```

Create storage link:

```bash
php artisan storage:link
```

Run backend:

```bash
php artisan serve
```

Backend URL:
- http://127.0.0.1:8000

## 5. Setup Frontend (React)

Open terminal 2:

```bash
cd client
npm install
```

Create env file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Mac/Linux:

```bash
cp .env.example .env
```

Set API URL in client/.env:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Run frontend:

```bash
npm run dev
```

Frontend URL:
- http://127.0.0.1:5173

## 6. Daily Run Commands

Backend:

```bash
cd web-server
php artisan serve
```

Frontend:

```bash
cd client
npm run dev
```

## 7. Localhost Troubleshooting

If backend changes are not reflecting:

```bash
cd web-server
php artisan optimize:clear
```

If files/images are missing:

```bash
cd web-server
php artisan storage:link
```

If frontend cannot connect to backend:
- Check client/.env has VITE_API_URL=http://127.0.0.1:8000
- Check backend is running on port 8000

## 8. Push to GitHub

From project root:

```bash
git add .
git commit -m "docs: update localhost setup guide"
git push origin main
```

Maintainer: Alecs
