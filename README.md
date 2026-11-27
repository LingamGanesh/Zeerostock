# Zeerostock — Production Inventory Management System

Zeerostock is a full-stack inventory management application built with React + Vite and an Express + MongoDB API.

## Features

- Secure login and registration with email verification, resend verification, forgot-password OTP and password reset
- Access tokens with rotating, HttpOnly refresh-token cookies and server-side session revocation
- Inventory catalogue: create, search, update, archive, paginate and filter products
- Supplier management with validation and protection against archiving suppliers linked to active products
- Audited stock adjustments (stock in, stock out and set balance)
- Dashboard with stock KPIs, category valuation, recent movements and purchase analytics
- Purchase orders: create, approve, partially receive and complete orders
- Stock valuation and inventory movement reports
- Role-protected APIs, request validation, security middleware and structured logging
- CI checks for backend syntax/tests/dependency audit and frontend production build

## Repository layout

```text
Zeerostock/
├── client/                 # React + Vite frontend
│   ├── src/App.jsx
│   ├── src/lib/api.js
│   └── package.json
├── server/                 # Express + Mongoose backend
│   ├── src/                # App, routes, controllers, services, models
│   ├── models/             # Inventory and Supplier models
│   ├── controllers/        # Supplier and legacy inventory controllers
│   ├── data/               # Initial admin and sample data scripts
│   ├── test/
│   ├── .env.example
│   └── package.json
└── .github/workflows/      # GitHub Actions CI
```

## Requirements

- Node.js 20 or newer (npm included)
- MongoDB 7+ running as a replica set, or MongoDB Atlas
- Git

> **Important:** Stock adjustments and purchase-order receiving use MongoDB transactions. A standalone local MongoDB server will not support these operations. Use MongoDB Atlas or start a local single-node replica set as shown below.

## 1. Clone the project

```powershell
git clone https://github.com/LingamGanesh/Zeerostock.git
cd Zeerostock
git switch feat/production-inventory-platform
```

The production-inventory work is currently on `feat/production-inventory-platform`. The `main` branch is kept separate.

## 2. Start local MongoDB (Windows / Docker)

If Docker Desktop is installed, run these commands in PowerShell:

```powershell
docker run -d --name zeerostock-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
docker exec zeerostock-mongo mongosh --eval "rs.initiate({_id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }]})"
```

Wait a few seconds for the replica set to elect its primary. If the container already exists, start it with `docker start zeerostock-mongo` and run the `rs.initiate()` command only if the replica set has not already been initialized.

Alternatively, create a MongoDB Atlas cluster and use its connection string.

## 3. Configure the backend

Open a new PowerShell terminal from the repository root:

```powershell
cd server
Copy-Item .env.example .env
```

Edit `server/.env`. At minimum set:

```dotenv
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/zeerostock?replicaSet=rs0
JWT_ACCESS_SECRET=replace_with_a_random_secret_at_least_32_characters
JWT_REFRESH_SECRET=replace_with_a_different_random_secret_at_least_32_characters
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
LOG_LEVEL=info
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=Zeerostock <onboarding@resend.dev>
```

Use two different random secrets of at least 32 characters. For Atlas, replace `MONGO_URI` with your Atlas URI and make sure the database user and network access are configured. Never commit your real `.env` file.

Email delivery is used for registration verification and password recovery. Create a Resend account, add/verify a sender domain for production, and set `RESEND_API_KEY` plus `EMAIL_FROM` in `server/.env`. The Resend onboarding sender is suitable only for limited testing and may restrict recipient addresses. Never put the email API key in the React client.

Install dependencies:

```powershell
npm install
```

## 4. Create the first administrator

In `server/.env`, uncomment and set these values with your own details:

```dotenv
ADMIN_NAME=Your Admin Name
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use_a_unique_password_at_least_12_characters
```

Then, from the `server` directory:

```powershell
npm run admin:create
```

The bootstrap command refuses to create another administrator if an active administrator already exists. After successful setup, remove the three ADMIN_* values from `.env`.

## 5. Run the backend

From the `server` directory:

```powershell
npm run dev
```

API: http://localhost:5000  
Health check: http://localhost:5000/health

Keep this terminal open.

## 6. Run the frontend

Open a second PowerShell terminal at the repository root:

```powershell
cd client
Copy-Item .env.example .env
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally http://localhost:5173). The development proxy forwards `/api` requests to the backend at `http://localhost:5000`, so leave `VITE_API_URL` empty for local development.

Sign in using the administrator email and password created in step 4.

## 7. Run checks

Backend (from `server`):

```powershell
npm run check
npm test
npm audit --audit-level=high
```

Frontend production build (from `client`):

```powershell
npm run build
```

CI runs the backend checks and frontend build automatically on pushes to `main` and `feat/production-inventory-platform`, and on pull requests targeting `main`.

## API overview

All authenticated management routes require an administrator or manager account.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register and send email verification link |
| POST | `/api/auth/verify-email` | Verify email using one-time link token |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/login` | Sign in (verified email required) |
| POST | `/api/auth/forgot-password` | Send six-digit password reset code |
| POST | `/api/auth/verify-reset-otp` | Verify reset code and issue short-lived reset token |
| POST | `/api/auth/reset-password` | Set new password and revoke active sessions |
| POST | `/api/auth/refresh` | Refresh session |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current account |
| GET/POST | `/api/v2/inventory` | List / create inventory |
| GET/PATCH/DELETE | `/api/v2/inventory/:id` | View / update / archive inventory |
| POST | `/api/v2/inventory/:id/adjustments` | Audited stock adjustment |
| GET | `/api/v2/inventory/:id/movements` | Product movement history |
| GET | `/api/v2/dashboard/summary` | Dashboard analytics |
| GET/POST | `/api/v2/purchase-orders` | List / create purchase orders |
| POST | `/api/v2/purchase-orders/:id/approve` | Approve a purchase order |
| POST | `/api/v2/purchase-orders/:id/receive` | Receive stock against an order |
| GET | `/api/v2/reports/stock` | Stock valuation report |
| GET | `/api/v2/reports/movements` | Movement report |
| GET/POST | `/api/suppliers` | List / create suppliers |
| PATCH/DELETE | `/api/suppliers/:id` | Update / archive suppliers |

## Troubleshooting

- **MongoDB connection refused:** confirm MongoDB/Docker is running and that `MONGO_URI` points to the correct host and port.
- **Transaction / replica-set error:** use MongoDB Atlas or initialize the local replica set using step 2.
- **CORS error:** keep `CLIENT_URL=http://localhost:5173` and open the frontend at that exact origin.
- **401 Unauthorized:** sign in again; the API requires a valid session for management endpoints.
- **Port already in use:** change `PORT` in `server/.env` or stop the process using that port.

## Production deployment notes

Deploy the client and server separately. Configure `VITE_API_URL` to the public API origin at client build time. Set the backend environment variables in the hosting provider, use MongoDB Atlas, set `NODE_ENV=production`, and set `CLIENT_URL` to the exact frontend origin. Configure HTTPS so secure refresh-token cookies work. Do not expose JWT secrets or database credentials in the frontend.

## Current verification boundary

The GitHub Actions workflow validates JavaScript syntax, backend tests, high/critical dependency audit, and the React production build. It does not run a full browser-based end-to-end test suite or exercise MongoDB transaction flows against a live database. Run the project locally with a replica set or Atlas and verify the critical workflows before production release.
