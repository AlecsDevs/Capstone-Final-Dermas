# MDRRMO Backend (Laravel)

Backend API for the MDRRMO report management system.

## Requirements

- PHP 8.2+
- Composer 2+
- MySQL 8+

## Install

```bash
composer install
cp .env.example .env
php artisan key:generate
```

## Configure .env

Update database values in `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=web_server
DB_USERNAME=root
DB_PASSWORD=
```

## Database Setup

Create database:

```sql
CREATE DATABASE web_server;
```

Run migrations and seeders:

```bash
php artisan migrate --seed
```

Create storage symlink:

```bash
php artisan storage:link
```

## Run

```bash
php artisan serve
```

Backend URL:
- `http://127.0.0.1:8000`

## Useful Commands

```bash
php artisan optimize:clear
php artisan test
```

For full project setup (frontend + backend), see root [README.md](../README.md).
