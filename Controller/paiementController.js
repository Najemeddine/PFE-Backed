const db = require('../db');

// Get all modepai
exports.getAllCommandes = (req, res) => {
  db.query('SELECT * FROM paiement', (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving paiement", error: err });
    }
    res.status(200).json(results);
  });
};

// Get a single paiement by ID
exports.getCommandeById = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM paiement WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving paiement", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "paiement not found" });
    }
    res.status(200).json(result[0]);
  });
};

// Create a new paiement
exports.createCommande = (req, res) => {
  const { client_id, fournisseur_id, details } = req.body;
  db.query('INSERT INTO paiement (client_id, fournisseur_id, details) VALUES (?, ?, ?)', [client_id, fournisseur_id, details], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error creating paiement", error: err });
    }
    res.status(201).json({ message: "paiement created", id: result.insertId });
  });
};

// Update a paiement
exports.updateCommande = (req, res) => {
  const { id } = req.params;
  const { client_id, fournisseur_id, details } = req.body;
  db.query('UPDATE paiement SET client_id = ?, fournisseur_id = ?, details = ? WHERE id = ?', [client_id, fournisseur_id, details, id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error updating paiement", error: err });
    }
    res.status(200).json({ message: "paiement updated" });
  });
};

// Delete a paiement
exports.deleteCommande = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM paiement WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting paiement", error: err });
    }
    res.status(200).json({ message: "paiement deleted" });
  });
};
