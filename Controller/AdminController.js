const db = require('../db');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Get all clients
exports.getAllClients = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM client');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error retrieving clients:', err);
    res.status(500).json({ message: "Error retrieving clients", error: err.message });
  }
};

// Delete a client
exports.deleteClient = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM client WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ message: "Error deleting client", error: err.message });
  }
};

// Get admin statistics
exports.getAdminStatistics = async (req, res) => {
  try {
    // Total clients and suppliers
    const [clients] = await db.query('SELECT COUNT(*) as total FROM client');
    const [suppliers] = await db.query('SELECT COUNT(*) as total FROM fournisseur');

    // Total orders and total sales
    const [orders] = await db.query('SELECT COUNT(*) as total, SUM(total) as totalSales FROM commande');
    const totalOrders = orders[0].total;
    const totalSales = orders[0].totalSales || 0; // Handle case where no orders exist

    // Orders by period (daily, weekly, monthly)
    const [dailyOrders] = await db.query(
      "SELECT COUNT(*) as total FROM commande WHERE DATE(date_creation) = CURDATE()"
    );
    const [weeklyOrders] = await db.query(
      "SELECT COUNT(*) as total FROM commande WHERE date_creation >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
    );
    const [monthlyOrders] = await db.query(
      "SELECT COUNT(*) as total FROM commande WHERE date_creation >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
    );

    // Top 5 products by quantity ordered
    const [topProductsRaw] = await db.query(`
      SELECT p.Nom, SUM(cp.quantite) as totalQuantity
      FROM commande_produits cp
      JOIN produit p ON cp.produit_id = p.id
      GROUP BY p.id, p.Nom
      ORDER BY totalQuantity DESC
      LIMIT 5
    `);
    const topProducts = topProductsRaw.map(product => ({
      name: product.Nom,
      orders: product.totalQuantity,
    }));

    // Order trends for the chart (same as daily, weekly, monthly)
    const orderTrends = [
      { name: "Daily", value: dailyOrders[0].total },
      { name: "Weekly", value: weeklyOrders[0].total },
      { name: "Monthly", value: monthlyOrders[0].total },
    ];

    const stats = {
      totalClients: clients[0].total,
      totalSuppliers: suppliers[0].total,
      totalOrders,
      totalSales,
      dailyOrders: dailyOrders[0].total,
      weeklyOrders: weeklyOrders[0].total,
      monthlyOrders: monthlyOrders[0].total,
      orderTrends,
      topProducts,
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching admin statistics:", error);
    res.status(500).json({ message: "Error fetching statistics", error: error.message });
  }
};

// Get admin by ID
exports.getClientById = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('SELECT * FROM admin WHERE id = ?', [id]);
    if (result.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.status(200).json(result[0]);
  } catch (err) {
    console.error('Error retrieving admin:', err);
    res.status(500).json({ message: "Error retrieving admin", error: err.message });
  }
};

// Create admin
exports.createadmin = async (req, res) => {
  const { email, password, Nom, Prenom, Dateinsc, Adresse, numtel, typeuser } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM admin WHERE email = ?", [email]);
    if (rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO admin (email, password, Nom, Prenom, Dateinsc, Adresse, numtel, typeuser) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [email, hashedPassword, Nom, Prenom, Dateinsc, Adresse, numtel, typeuser]
    );

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM admin WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in the environment variables");
    }

    const token = jwt.sign(
      { id: rows[0].id, email: rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token,
      client: {
        id: rows[0].id,
        email: rows[0].email,
        Nom: rows[0].Nom,
        Prenom: rows[0].Prenom,
        Dateinsc: rows[0].Dateinsc,
        Adresse: rows[0].Adresse,
        numtel: rows[0].numtel
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: error.message });
  }
};

// Authenticate token
exports.authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

// Update admin
exports.updateAdmin = async (req, res) => {
  const { id } = req.params;
  const { Nom, Prenom, email, Adresse, numtel } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE admin SET Nom = ?, Prenom = ?, email = ?, Adresse = ?, numtel = ? WHERE id = ?',
      [Nom, Prenom, email, Adresse, numtel, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const [updatedAdmin] = await db.query('SELECT * FROM admin WHERE id = ?', [id]);
    res.status(200).json(updatedAdmin[0]);
  } catch (err) {
    console.error('Error updating admin:', err);
    res.status(500).json({ message: "Error updating admin", error: err.message });
  }
};

// Delete admin
exports.deleteAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM admin WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.status(200).json({ message: "Admin deleted" });
  } catch (err) {
    console.error('Error deleting admin:', err);
    res.status(500).json({ message: "Error deleting admin", error: err.message });
  }
};