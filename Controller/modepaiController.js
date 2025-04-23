const db = require('../db');

// Get all modepai
exports.getAllCommandes = (req, res) => {
  db.query('SELECT * FROM modepai', (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving modepai", error: err });
    }
    res.status(200).json(results);
  });
};

// Get a single modepai by ID
exports.getCommandeById = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM modepai WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving modepai", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Commande not found" });
    }
    res.status(200).json(result[0]);
  });
};

// Create a new modepai
exports.createCommande = (req, res) => {
  const { client_id, fournisseur_id, details } = req.body;
  db.query('INSERT INTO modepai (client_id, fournisseur_id, details) VALUES (?, ?, ?)', [client_id, fournisseur_id, details], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error creating modepai", error: err });
    }
    res.status(201).json({ message: "modepai created", id: result.insertId });
  });
};

// Update a modepai
exports.updateCommande = (req, res) => {
  const { id } = req.params;
  const { client_id, fournisseur_id, details } = req.body;
  db.query('UPDATE modepai SET client_id = ?, fournisseur_id = ?, details = ? WHERE id = ?', [client_id, fournisseur_id, details, id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error updating commande", error: err });
    }
    res.status(200).json({ message: "categorie updated" });
  });
};

// Delete a modepai
exports.deleteCommande = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM modepai WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting modepai", error: err });
    }
    res.status(200).json({ message: "modepai deleted" });
  });
};
