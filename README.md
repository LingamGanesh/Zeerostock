# Zeerostock — Inventory Management System

A full-stack inventory management application built with **Node.js + Express + MongoDB** (backend) and **React + Vite + Tailwind CSS** (frontend).

---

##  Project Structure

```
zeerostock/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection via Mongoose
│   ├── controllers/
│   │   ├── inventoryController.js # All inventory API logic
│   │   └── supplierController.js  # Supplier creation logic
│   ├── data/
│   │   └── seed.js                # Sample data seeder script
│   ├── models/
│   │   ├── Inventory.js           # Mongoose Inventory schema
│   │   └── Supplier.js            # Mongoose Supplier schema
│   ├── routes/
│   │   ├── inventoryRoutes.js     # /inventory route definitions
│   │   └── supplierRoutes.js      # /supplier route definitions
│   ├── .env.example               # Environment variable template
│   ├── package.json
│   └── server.js                  # Express app entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── GroupedView.jsx    # Supplier aggregation view
    │   │   ├── InventoryCard.jsx  # Single product card
    │   │   ├── SearchBar.jsx      # Search + filter UI
    │   │   └── Spinner.jsx        # Loading indicator
    │   ├── App.jsx                # Root component with all tabs
    │   ├── index.css              # Tailwind + custom styles
    │   └── main.jsx               # React DOM entry point
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    └── vite.config.js
```

---

##  Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** — either local or [MongoDB Atlas](https://cloud.mongodb.com)
- **npm** v9+

---

### 1. Clone / Download the Project

```bash
# If using git
git clone <your-repo-url>
cd zeerostock
```

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Edit `.env` with your values:

```
MONGO_URI=mongodb://localhost:27017/zeerostock
PORT=5000
```

> **MongoDB Atlas URI example:**  
> `MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/zeerostock`

#### Start the backend server

```bash
# Development (auto-restart with nodemon)
npm run dev

# Production
npm start
```

The API will run at: **http://localhost:5000**

#### Seed sample data (optional but recommended)

```bash
npm run seed
```

This inserts 3 suppliers and 10 inventory items so you can explore the UI immediately.

---

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The React app will run at: **http://localhost:5173**

> The Vite dev server automatically proxies `/inventory` and `/supplier` API calls to the backend on port 5000 — no CORS configuration needed during development.

---

## 🔌 API Reference

| Method | Endpoint                  | Description                                      |
|--------|---------------------------|--------------------------------------------------|
| POST   | `/supplier`               | Create a new supplier                            |
| POST   | `/inventory`              | Create a new inventory item                      |
| GET    | `/inventory`              | List all inventory items (with supplier info)    |
| GET    | `/inventory/grouped`      | Total stock value grouped by supplier, desc.     |
| GET    | `/inventory/search`       | Search by name, min/max price (all optional)     |

### Search Query Parameters

```
GET /inventory/search?product_name=macbook&minPrice=50000&maxPrice=200000
```

| Parameter    | Type   | Description                        |
|-------------|--------|------------------------------------|
| product_name | string | Case-insensitive partial match     |
| minPrice     | number | Minimum price filter               |
| maxPrice     | number | Maximum price filter               |

### Example Request: Create Supplier

```bash
curl -X POST http://localhost:5000/supplier \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TechNova Pvt. Ltd.",
    "contactEmail": "info@technova.in",
    "phone": "+91-9999888877",
    "address": "Hitech City, Hyderabad – 500081",
    "country": "India"
  }'
```

### Example Request: Create Inventory Item

```bash
curl -X POST http://localhost:5000/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "iPad Air M2",
    "sku": "APL-IPADAIR-M2-BLU",
    "category": "Tablets",
    "quantity": 30,
    "price": 59900,
    "supplier": "<supplier_id_here>",
    "description": "Apple iPad Air with M2 chip, 11-inch"
  }'
```

---

## Frontend Features

| Feature           | Description                                           |
|-------------------|-------------------------------------------------------|
| **All Inventory** | Card grid showing all products with live stats bar    |
| **Search**        | Name + price range filters; "No results" empty state  |
| **By Supplier**   | Ranked list of suppliers by total portfolio value     |
| Loading Spinner   | Animated concentric-ring spinner during API calls     |
| Stock Badges      | Colour-coded: In Stock / Low Stock / Out of Stock     |
| Luxury Dark UI    | Indigo/slate palette, Playfair Display + DM Sans fonts|
| Responsive        | Adapts from mobile to large desktop screens           |

---

## 🛠 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS        |
| Fonts     | Playfair Display, DM Sans (Google)  |
| Backend   | Node.js, Express 4                  |
| Database  | MongoDB, Mongoose 8                 |
| Dev Tools | nodemon, dotenv, cors               |

---

## Notes

- All monetary values are in **Indian Rupees (₹)**.
- The `sku` field is **unique** — duplicate SKUs will be rejected.
- The `/inventory/grouped` endpoint uses a MongoDB **aggregation pipeline**.
- Validation errors return a `400` response with an array of error messages.

---

##  Author

**Zeerostock Assignment** — submitted as a company evaluation project.

## Live Demo

Frontend: https://your-frontend-link  
Backend: https://zeerostock-backend-g14t.onrender.com
