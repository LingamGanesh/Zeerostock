require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const connectDB = require("../src/config/db");
const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");
const suppliers = [
  { name: "Nexora Electronics", contactEmail: "supply@nexora.com", phone: "+91-9876543210", address: "12, Tech Park, Bengaluru – 560001", country: "India" },
  { name: "LuxeGoods Import Co.", contactEmail: "orders@luxegoods.in", phone: "+91-9123456789", address: "47B, Trade Center, Mumbai – 400001", country: "India" },
  { name: "Globalink Supply Chain", contactEmail: "partner@globalink.io", phone: "+1-800-555-0199", address: "Suite 300, 5th Ave, New York, NY 10001", country: "USA" },
];
const productData = [
  ["Sony WH-1000XM5 Headphones","SNY-WH1000XM5-BLK","Audio",40,24999,0,"Industry-leading noise cancelling wireless headphones"],
  ["Samsung 65-inch QLED TV","SAM-Q65-QLED-2024","Television",15,89999,0,"4K QLED Smart TV with 120Hz refresh rate"],
  ["Apple MacBook Air M3","APL-MBA-M3-256","Laptops",25,114900,0,"13-inch MacBook Air with M3 chip"],
  ["Logitech MX Master 3S Mouse","LGT-MXM3S-GRY","Peripherals",80,9995,0,"Advanced wireless mouse for professionals"],
  ["Dyson V15 Detect Vacuum","DYS-V15-DETECT-NI","Home Appliances",20,54900,1,"Laser-guided cordless vacuum cleaner"],
  ["Nespresso Vertuo Next Coffee Machine","NSP-VTNXT-BLK","Kitchen",35,14999,1,"Premium single-serve coffee machine"],
  ["Bose SoundLink Flex Speaker","BSE-SLF-SLVR","Audio",60,11900,1,"Waterproof portable Bluetooth speaker"],
  ["Dell XPS 15 Laptop","DLL-XPS15-I9-1TB","Laptops",18,179000,2,"Intel Core i9, 32GB RAM, 1TB SSD, OLED display"],
  ["DJI Mini 4 Pro Drone","DJI-MINI4P-RC2","Drones",12,74999,2,"4K/60fps obstacle sensing professional drone"],
  ["Herman Miller Aeron Chair","HM-AERON-SZ-B","Furniture",10,129000,2,"Ergonomic office chair, Size B, Graphite"],
];
async function seed() {
  await connectDB();
  const supplierDocs = await Promise.all(suppliers.map((supplier) =>
    Supplier.findOneAndUpdate({ contactEmail: supplier.contactEmail }, { $set: supplier }, { upsert: true, new: true, runValidators: true })
  ));
  const products = productData.map(([product_name,sku,category,quantity,price,supplierIndex,description]) => ({
    product_name, sku, category, quantity, price, supplier: supplierDocs[supplierIndex]._id, description,
  }));
  await Promise.all(products.map((product) => Inventory.findOneAndUpdate(
    { sku: product.sku }, { $set: product }, { upsert: true, new: true, runValidators: true }
  )));
  process.stdout.write("Seed completed: existing records were preserved and sample records were upserted.\n");
  await require("mongoose").connection.close();
}
seed().catch(async (error) => {
  process.stderr.write("Seed failed: " + error.message + "\n");
  await require("mongoose").connection.close();
  process.exitCode = 1;
});
