const db = require('../db');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
// Get all clients
exports.getAllClients = (req, res) => {
  db.query('SELECT * FROM admin', (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error retrievingclients", error: err });
    }
    res.status(200).json(results);
  });
};

// Get a single client by ID
exports.getClientById = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM admin WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error retrievingclient", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json(result[0]);
  });
};

exports.createadmin = async (req, res) => {
  const { email, password, Nom, Prenom, Dateinsc, Adresse, numtel,
typeuser } = req.body;

  try {
    // Check if the email already exists
    const [rows] = await db.execute("SELECT * FROM admin WHERE email =?", [email]);
    if (rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new fourn
    await db.execute(
      "INSERT INTO admin (email, password, Nom, Prenom, Dateinsc,Adresse, numtel, typeuser) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [email, hashedPassword, Nom, Prenom, Dateinsc, Adresse, numtel, typeuser]
    );

    res.status(201).json({ message: "admin registered successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find client by email
    const [rows] = await db.execute("SELECT * FROM admin WHERE email =?", [email]);

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) return res.status(400).json({ message: "Invalidemail or password" });

    // Check if JWT_SECRET is correctly set
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in the environment variables");
    }

    // Generate JWT token
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
    res.status(500).json({ message: error.message });
  }
};

exports.authenticate = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};
// Update a client
exports.updateClient = (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  db.query('UPDATE admin SET name = ?, email = ?, phone = ? WHERE id =?', [name, email, phone, id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error updating client",
error: err });
    }
    res.status(200).json({ message: "Client updated" });
  });
};

// Delete a client
exports.deleteClient = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM admin WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting client",
error: err });
    }
    res.status(200).json({ message: "Client deleted" });
  });
};