

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");

const suppliers = [
  {
    name: "Nexora Electronics",
    contactEmail: "supply@nexora.com",
    phone: "+91-9876543210",
    address: "12, Tech Park, Bengaluru – 560001",
    country: "India",
  },
  {
    name: "LuxeGoods Import Co.",
    contactEmail: "orders@luxegoods.in",
    phone: "+91-9123456789",
    address: "47B, Trade Center, Mumbai – 400001",
    country: "India",
  },
  {
    name: "Globalink Supply Chain",
    contactEmail: "partner@globalink.io",
    phone: "+1-800-555-0199",
    address: "Suite 300, 5th Ave, New York, NY 10001",
    country: "USA",
  },
];


const buildInventory = (supplierIds) => [
  // Nexora Electronics items
  {
    product_name: "Sony WH-1000XM5 Headphones",
    sku: "SNY-WH1000XM5-BLK",
    category: "Audio",
    quantity: 40,
    price: 24999,
    supplier: supplierIds[0],
    description: "Industry-leading noise cancelling wireless headphones",
  },
  {
    product_name: "Samsung 65-inch QLED TV",
    sku: "SAM-Q65-QLED-2024",
    category: "Television",
    quantity: 15,
    price: 89999,
    supplier: supplierIds[0],
    description: "4K QLED Smart TV with 120Hz refresh rate",
  },
  {
    product_name: "Apple MacBook Air M3",
    sku: "APL-MBA-M3-256",
    category: "Laptops",
    quantity: 25,
    price: 114900,
    supplier: supplierIds[0],
    description: "13-inch MacBook Air with M3 chip",
  },
  {
    product_name: "Logitech MX Master 3S Mouse",
    sku: "LGT-MXM3S-GRY",
    category: "Peripherals",
    quantity: 80,
    price: 9995,
    supplier: supplierIds[0],
    description: "Advanced wireless mouse for professionals",
  },
  // LuxeGoods items
  {
    product_name: "Dyson V15 Detect Vacuum",
    sku: "DYS-V15-DETECT-NI",
    category: "Home Appliances",
    quantity: 20,
    price: 54900,
    supplier: supplierIds[1],
    description: "Laser-guided cordless vacuum cleaner",
  },
  {
    product_name: "Nespresso Vertuo Next Coffee Machine",
    sku: "NSP-VTNXT-BLK",
    category: "Kitchen",
    quantity: 35,
    price: 14999,
    supplier: supplierIds[1],
    description: "Premium single-serve coffee machine",
  },
  {
    product_name: "Bose SoundLink Flex Speaker",
    sku: "BSE-SLF-SLVR",
    category: "Audio",
    quantity: 60,
    price: 11900,
    supplier: supplierIds[1],
    description: "Waterproof portable Bluetooth speaker",
  },
  // Globalink items
  {
    product_name: "Dell XPS 15 Laptop",
    sku: "DLL-XPS15-I9-1TB",
    category: "Laptops",
    quantity: 18,
    price: 179000,
    supplier: supplierIds[2],
    description: "Intel Core i9, 32GB RAM, 1TB SSD, OLED display",
  },
  {
    product_name: "DJI Mini 4 Pro Drone",
    sku: "DJI-MINI4P-RC2",
    category: "Drones",
    quantity: 12,
    price: 74999,
    supplier: supplierIds[2],
    description: "4K/60fps obstacle sensing professional drone",
  },
  {
    product_name: "Herman Miller Aeron Chair",
    sku: "HM-AERON-SZ-B",
    category: "Furniture",
    quantity: 10,
    price: 129000,
    supplier: supplierIds[2],
    description: "Ergonomic office chair, Size B, Graphite",
  },
];

// ── Seed Function ─────────────────────────────
const seed = async () => {
  await connectDB();

  console.log("🧹  Clearing existing data...");
  await Inventory.deleteMany({});
  await Supplier.deleteMany({});

  console.log("Inserting suppliers...");
  const insertedSuppliers = await Supplier.insertMany(suppliers);
  const supplierIds = insertedSuppliers.map((s) => s._id);
  console.log(`   ✔  ${insertedSuppliers.length} suppliers inserted`);

  console.log("Inserting inventory...");
  const inventoryItems = buildInventory(supplierIds);
  const insertedItems = await Inventory.insertMany(inventoryItems);
  console.log(`   ✔  ${insertedItems.length} inventory items inserted`);

  console.log("\n Database seeded successfully!");
  mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
