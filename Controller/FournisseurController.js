const db = require('../db');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.getAllFournisseurs = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM fournisseur');
    res.status(200).json(results);
  } catch (err) {
    console.error("Error retrieving fournisseurs:", err);
    res.status(500).json({ message: "Error retrieving fournisseurs", error: err });
  }
};

// Get a single fournisseur by ID
exports.getFournisseurById = async (req, res) => {
  const { id } = req.params;
  console.log('Received ID:', id); // Debugging

  try {
    // Query the database using the promise-based API
    const [rows] = await db.query('SELECT * FROM fournisseur WHERE id = ?', [id]);

    if (rows.length === 0) {
      console.log('No fournisseur found');
      return res.status(404).json({ message: "Fournisseur not found" });
    }

    console.log('Fournisseur found:', rows[0]);
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Error retrieving fournisseur:", err);
    return res.status(500).json({ message: "Error retrieving fournisseur", error: err });
  }
};
exports.createFournisseur = async (req, res) => {
  const { email, password, Nom, Prenom, Dateinsc, Adresse, numtel, typeuser } = req.body;

  // Check if any required fields are missing or undefined
  if (!email || !password || !Nom || !Prenom || !Dateinsc || !Adresse || !numtel) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the email already exists
    const [rows] = await db.execute("SELECT * FROM fournisseur WHERE email = ?", [email]);
    if (rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new fournisseur
    const result = await db.execute(
      "INSERT INTO fournisseur (email, password, Nom, Prenom, Dateinsc, Adresse, numtel, typeuser) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [email, hashedPassword, Nom, Prenom, Dateinsc, Adresse, numtel, typeuser || 'fournisseur'] // Ensure typeuser is passed
    );

    res.status(201).json({ message: "Fournisseur registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};



exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find client by email
    const [rows] = await db.execute("SELECT * FROM fournisseur WHEREemail = ?", [email]);

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

exports.updateFournisseur = async (req, res) => {
  const { id } = req.params;
  const { Nom, Prenom, email, Dateinsc, Entreprise, Adresse, numtel } = req.body;

  try {
    const [result] = await db.execute(
      "UPDATE fournisseur SET Nom = ?, Prenom = ?, email = ?, Dateinsc = ?, Entreprise = ?, Adresse = ?, numtel = ? WHERE id = ?",
      [Nom, Prenom, email, Dateinsc, Entreprise, Adresse, numtel, id]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Supplier updated successfully" });
    } else {
      res.status(404).json({ message: "Supplier not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Backend service for deleting
exports.deleteFournisseur = async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM fournisseur WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Fournisseur not found" });
    }

    res.status(200).json({ message: "Fournisseur deleted successfully" });
  } catch (error) {
    console.error("Error deleting fournisseur:", error);
    res.status(500).json({ message: "Failed to delete fournisseur", error: error.message });
  }
};


