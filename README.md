# Server Uptime Monitor

A simple uptime monitoring system that checks websites periodically and sends **email alerts** when a site goes **DOWN** or **recovers**.

---

## What This Project Does

* Add websites (endpoints) to monitor
* Periodically checks:
  * DNS
  * SSL
  * HTTP availability
* Stores results in PostgreSQL
* Sends **email alerts** on:
  * Downtime
  * Recovery

---

## Architecture (Important to Understand)

This project has **two running processes**:

1. **API Server**
   * Handles HTTP requests
   * Lets you add/view endpoints

2. **Worker**
   * Runs background checks
   * Sends emails
   * Updates incident states

⚠️ **Both must be running**, otherwise monitoring will NOT work.

---

## Requirements

You must have these installed **before starting**:

* Node.js (v18+)
* npm
* Git
* PostgreSQL
* A Gmail account with **2-Factor Authentication enabled**

---

## Step 1: Install Node.js

```bash
node -v
npm -v
```

Download if missing: https://nodejs.org (LTS)

---

## Step 2: Install PostgreSQL

### Linux
```bash
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
```

### macOS
```bash
brew install postgresql
brew services start postgresql
```

### Windows
Download: https://www.postgresql.org/download/

---

## Step 3: Create Database

```bash
psql
```

```sql
CREATE DATABASE uptime_monitor;
```

```sql
\q
```

---

## Step 4: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Server-Uptime-Monitor.git
cd Server-Uptime-Monitor
npm install
```

---

## Step 5: Create .env File

```env
DATABASE_URL=postgresql://YOUR_DB_USER@localhost:5432/uptime_monitor

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Uptime Monitor <your_email@gmail.com>
```

⚠️ Use Gmail **App Password**, not your real password.

---

## Step 6: Gmail App Password

1. Enable 2FA: https://myaccount.google.com/security
2. App passwords → Type 'Mail' → `UptimeMonitor`
3. Copy 16‑char password into `.env`

---

## Step 7: Initialize Prisma

```bash
npx prisma migrate dev --name init
```

Optional:
```bash
npx prisma studio
```

---

## Step 8: Start API Server

```bash
npm run dev
```

API runs on:
```
http://localhost:3000
```

---

## Step 9: Start Worker

```bash
npm run worker
```

⚠️ Required for checks & emails.

---

## Step 10: Add Endpoint (Thunder Client)

POST `http://localhost:3000/endpoints`

```json
{
  "url": "https://example.com",
  "intervalSeconds": 30,
  "email": "your_email@gmail.com"
}
```

---

## Step 11: Test Alerts

Use fake URL:
```json
{
  "url": "https://doesnotexist12345.com",
  "intervalSeconds": 30,
  "email": "your_email@gmail.com"
}
```

After 3 failures → DOWN email  
On recovery → RECOVERY email

---

## Logs

```bash
npm run dev
npm run worker
npx prisma studio
```

---

## Common Issues

* DB not running
* Wrong DATABASE_URL
* App password incorrect
* Worker not running

---

## Summary

Run **Postgres → API → Worker**  
Add endpoints → Alerts work automatically
