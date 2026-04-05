# Capstone Final Dermas

Unified repository containing:
- `client` (React + Vite frontend)
- `web-server` (Laravel API/backend)

This guide shows exactly how to install, configure, run, and deploy both parts.

## 1) Prerequisites

Install these first:
- Node.js 20+
- npm 10+
- PHP 8.2+
- Composer 2+
- MySQL 8+
- Git

## 2) Clone Repository

```bash
git clone https://github.com/AlecsDevs/Capstone-Final-Dermas.git
cd Capstone-Final-Dermas
```

## 3) Backend Setup (Laravel)

Open terminal 1:

```bash
cd web-server
composer install
cp .env.example .env
php artisan key:generate
```

### 3.1 Configure Database in .env

Edit `web-server/.env`:

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

Create the database in MySQL:

```sql
CREATE DATABASE web_server;
```

Run migrations and seeders:

```bash
php artisan migrate --seed
```

If your app uses Laravel storage links for files/documents:

```bash
php artisan storage:link
```

Start backend server:

```bash
php artisan serve
```

Backend runs at:
- `http://127.0.0.1:8000`

## 4) Frontend Setup (React + Vite)

Open terminal 2:

```bash
cd client
npm install
cp .env.example .env
```

Edit `client/.env` if needed:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start frontend:

```bash
npm run dev
```

Frontend runs at:
- `http://127.0.0.1:5173`

## 5) Daily Development Commands

### Backend

```bash
cd web-server
php artisan serve
```

### Frontend

```bash
cd client
npm run dev
```

## 6) Build Commands

### Frontend production build

```bash
cd client
npm run build
```

### Laravel optimize (optional for production)

```bash
cd web-server
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 7) Push Your Code to GitHub

From repository root (`Capstone-Final-Dermas`):

```bash
git add .
git commit -m "docs: add full setup and run guide"
git push origin main
```

If this is your first push from this machine:

```bash
git remote -v
```

If no origin exists:

```bash
git remote add origin https://github.com/AlecsDevs/Capstone-Final-Dermas.git
git branch -M main
git push -u origin main
```

## 8) Production Procedure (DigitalOcean + Nginx)

1. Pull latest code on server:

```bash
cd /var/www/Capstone-Final-Dermas
git pull origin main
```

2. Install/update backend dependencies:

```bash
cd web-server
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

3. Build frontend:

```bash
cd ../client
npm ci
npm run build
```

4. Serve frontend `client/dist` with Nginx and proxy API requests to Laravel public entrypoint.

5. Restart services:

```bash
sudo systemctl restart php8.2-fpm
sudo systemctl reload nginx
```

## 9) Common Fixes

### CORS error
- Check `web-server/config/cors.php`
- Ensure frontend URL is allowed

### 419/CSRF or auth issues
- Confirm `APP_URL` and frontend `VITE_API_URL`
- Clear Laravel caches:

```bash
cd web-server
php artisan optimize:clear
```

### Missing file/image from storage

```bash
cd web-server
php artisan storage:link
```

---

Maintainer: Alecs
