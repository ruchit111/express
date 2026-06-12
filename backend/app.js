const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

const PRODUCTS_FILE = path.join(__dirname, "products.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to read file safely
const readJsonFile = (filePath, defaultData = []) => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(filePath, "utf8");
    return data ? JSON.parse(data) : defaultData;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return defaultData;
  }
};

// Helper function to write file safely
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    throw error;
  }
};

// API Home Route
app.get("/", (req, res) => {
  res.send("Inventory & Billing System API is running");
});

// ==========================================
// PRODUCTS ENDPOINTS
// ==========================================

// Get all products
app.get("/api/products", (req, res) => {
  const products = readJsonFile(PRODUCTS_FILE);
  res.status(200).json(products);
});

// Add new product
app.post("/api/products", (req, res) => {
  const { name, price, category, quantity, description } = req.body;

  // Validation
  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "Product name is required" });
  }
  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ message: "Valid price is required" });
  }
  if (!category || category.trim() === "") {
    return res.status(400).json({ message: "Category is required" });
  }
  if (quantity === undefined || isNaN(Number(quantity)) || Number(quantity) < 0) {
    return res.status(400).json({ message: "Valid quantity (stock) is required" });
  }

  const products = readJsonFile(PRODUCTS_FILE);

  // Check duplicate name
  if (products.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(400).json({ message: "Product with this name already exists" });
  }

  const newProduct = {
    id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
    name: name.trim(),
    price: Number(price),
    category: category.trim(),
    quantity: Number(quantity),
    description: (description || "").trim()
  };

  products.push(newProduct);
  writeJsonFile(PRODUCTS_FILE, products);

  res.status(201).json({
    message: "Product added successfully",
    product: newProduct
  });
});

// Update product
app.put("/api/products/:id", (req, res) => {
  const productId = Number(req.params.id);
  const { name, price, category, quantity, description } = req.body;

  // Validation
  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "Product name is required" });
  }
  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ message: "Valid price is required" });
  }
  if (!category || category.trim() === "") {
    return res.status(400).json({ message: "Category is required" });
  }
  if (quantity === undefined || isNaN(Number(quantity)) || Number(quantity) < 0) {
    return res.status(400).json({ message: "Valid quantity is required" });
  }

  const products = readJsonFile(PRODUCTS_FILE);
  const productIndex = products.findIndex(p => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Check duplicate name (excluding itself)
  if (products.some(p => p.id !== productId && p.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(400).json({ message: "Another product with this name already exists" });
  }

  const updatedProduct = {
    id: productId,
    name: name.trim(),
    price: Number(price),
    category: category.trim(),
    quantity: Number(quantity),
    description: (description || "").trim()
  };

  products[productIndex] = updatedProduct;
  writeJsonFile(PRODUCTS_FILE, products);

  res.status(200).json({
    message: "Product updated successfully",
    product: updatedProduct
  });
});

// Delete product
app.delete("/api/products/:id", (req, res) => {
  const productId = Number(req.params.id);
  const products = readJsonFile(PRODUCTS_FILE);
  const productIndex = products.findIndex(p => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({ message: "Product not found" });
  }

  const deletedProduct = products[productIndex];
  const updatedProducts = products.filter(p => p.id !== productId);
  writeJsonFile(PRODUCTS_FILE, updatedProducts);

  res.status(200).json({
    message: "Product deleted successfully",
    product: deletedProduct
  });
});

// ==========================================
// ORDERS / BILLING ENDPOINTS
// ==========================================

// Get all orders
app.get("/api/orders", (req, res) => {
  const orders = readJsonFile(ORDERS_FILE);
  res.status(200).json(orders);
});

// Place a new order
app.post("/api/orders", (req, res) => {
  const { customerName, customerNumber, items } = req.body;

  // Validation
  if (!customerName || customerName.trim() === "") {
    return res.status(400).json({ message: "Customer name is required" });
  }
  if (!customerNumber || customerNumber.trim() === "") {
    return res.status(400).json({ message: "Customer number is required" });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "At least one item is required to place an order" });
  }

  const products = readJsonFile(PRODUCTS_FILE);
  const orders = readJsonFile(ORDERS_FILE);

  // Validate stock for all items first
  const validatedItems = [];
  let grandTotal = 0;

  for (const item of items) {
    const product = products.find(p => p.id === Number(item.productId));
    if (!product) {
      return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
    }

    const orderQty = Number(item.quantity);
    if (isNaN(orderQty) || orderQty <= 0) {
      return res.status(400).json({ message: `Invalid quantity for product ${product.name}` });
    }

    if (product.quantity < orderQty) {
      return res.status(400).json({ 
        message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${orderQty}` 
      });
    }

    const total = product.price * orderQty;
    grandTotal += total;

    validatedItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: orderQty,
      total: total
    });
  }

  // Deduct stock from products
  for (const item of items) {
    const productIndex = products.findIndex(p => p.id === Number(item.productId));
    products[productIndex].quantity -= Number(item.quantity);
  }

  // Create new order
  const newOrder = {
    id: orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1,
    customerName: customerName.trim(),
    customerNumber: customerNumber.trim(),
    items: validatedItems,
    grandTotal: grandTotal,
    date: new Date().toISOString()
  };

  orders.push(newOrder);

  // Save changes to files
  writeJsonFile(PRODUCTS_FILE, products);
  writeJsonFile(ORDERS_FILE, orders);

  res.status(201).json({
    message: "Order placed successfully",
    order: newOrder
  });
});

// Backward compatibility user routes (optional, simple mocks to avoid errors if anything else calls them)
app.get("/api/users", (req, res) => {
  res.status(200).json({ users: [] });
});

app.listen(PORT, () => {
  console.log(`Inventory & Billing API running on http://localhost:${PORT}`);
});
