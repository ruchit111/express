const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, "users.json");

// Middleware
app.use(cors());
app.use(express.json());

const defaultUsers = [
  { id: 1, name: "Rahul", email: "rahul@example.com" },
  { id: 2, name: "Priya", email: "priya@example.com" },
  { id: 3, name: "Amit", email: "amit@example.com" }
];

const loadUsers = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultUsers, null, 2));
      return defaultUsers;
    }

    const fileData = fs.readFileSync(DATA_FILE, "utf8");
    return fileData ? JSON.parse(fileData) : [];
  } catch (error) {
    console.error("Could not load users:", error.message);
    return defaultUsers;
  }
};

const saveUsers = (userList) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(userList, null, 2));
};

let users = loadUsers();

const userRoutes = express.Router();

// Home route
app.get("/", (req, res) => {
  res.send("User Management API is running");
});

// Get all users
userRoutes.get("/", (req, res) => {
  res.status(200).json({
    message: "Users fetched successfully",
    students: users, // compatibility
    users: users
  });
});

// Get single user by ID
userRoutes.get("/:id", (req, res) => {
  const userId = Number(req.params.id);
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  res.status(200).json({
    message: "User fetched successfully",
    student: user, // compatibility
    user: user
  });
});

// Validation middleware
const validateUser = (req, res, next) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();

  if (!name || !email) {
    return res.status(400).json({
      message: "Name and email are required"
    });
  }

  req.body = { name, email };
  next();
};

// Create new user (or add new student)
userRoutes.post("/", validateUser, (req, res) => {
  const { name, email } = req.body;

  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const newUser = {
    id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
    name,
    email
  };

  users.push(newUser);

  try {
    saveUsers(users);

    res.status(201).json({
      message: "User added successfully",
      student: newUser, // compatibility
      user: newUser
    });
  } catch (error) {
    users = users.filter((u) => u.id !== newUser.id);
    res.status(500).json({
      message: "Could not save user"
    });
  }
});

// Registration route
userRoutes.post("/register", validateUser, (req, res) => {
  const { name, email } = req.body;

  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const newUser = {
    id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
    name,
    email
  };

  users.push(newUser);

  try {
    saveUsers(users);
    res.status(201).json({
      message: "Registration successful",
      user: newUser
    });
  } catch (error) {
    users = users.filter((u) => u.id !== newUser.id);
    res.status(500).json({
      message: "Could not complete registration"
    });
  }
});

// Login route
userRoutes.post("/login", (req, res) => {
  const email = String(req.body.email || "").trim();

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ message: "Invalid email" });
  }

  res.status(200).json({
    message: "Login successful",
    user: user
  });
});

// Delete user by ID
userRoutes.delete("/:id", (req, res) => {
  const userId = Number(req.params.id);
  const existingUsers = [...users];
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  users = users.filter((u) => u.id !== userId);

  try {
    saveUsers(users);

    res.status(200).json({
      message: "User deleted successfully",
      student: user, // compatibility
      user: user
    });
  } catch (error) {
    users = existingUsers;
    res.status(500).json({
      message: "Could not delete user"
    });
  }
});

// Edit user by ID
userRoutes.put("/:id", validateUser, (req, res) => {
  const userId = Number(req.params.id);
  const userIndex = users.findIndex((u) => u.id === userId);
  const existingUsers = [...users];

  if (userIndex === -1) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  // Check if email is already taken by someone else
  const otherUserEmail = users.find((u) => u.id !== userId && u.email.toLowerCase() === req.body.email.toLowerCase());
  if (otherUserEmail) {
    return res.status(400).json({ message: "Email is already in use by another user" });
  }

  const updatedUser = {
    id: userId,
    name: req.body.name,
    email: req.body.email
  };

  users[userIndex] = updatedUser;

  try {
    saveUsers(users);

    res.status(200).json({
      message: "User edited successfully",
      student: updatedUser, // compatibility
      user: updatedUser
    });
  } catch (error) {
    users = existingUsers;
    res.status(500).json({
      message: "Could not edit user"
    });
  }
});

app.use("/students", userRoutes);
app.use("/api/students", userRoutes);
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`User Backend API is running on http://localhost:${PORT}`);
});
