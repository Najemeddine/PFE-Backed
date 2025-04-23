const db = require('../db');

// Get all commandes
exports.getAllCommandes = (req, res) => {
  db.query('SELECT * FROM commande', (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving commandes", error: err });
    }
    res.status(200).json(results);
  });
};

// Get a single commande by ID
exports.getCommandeById = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM commande WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving commande", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Commande not found" });
    }
    res.status(200).json(result[0]);
  });
};

// Create a new commande
exports.createCommande = (req, res) => {
  const { client_id, fournisseur_id, details } = req.body;
  db.query('INSERT INTO commande (client_id, fournisseur_id, details) VALUES (?, ?, ?)', [client_id, fournisseur_id, details], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error creating commande", error: err });
    }
    res.status(201).json({ message: "Commande created", id: result.insertId });
  });
};

// Update a commande
exports.updateCommande = (req, res) => {
  const { id } = req.params;
  const { client_id, fournisseur_id, details } = req.body;
  db.query('UPDATE commande SET client_id = ?, fournisseur_id = ?, details = ? WHERE id = ?', [client_id, fournisseur_id, details, id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error updating commande", error: err });
    }
    res.status(200).json({ message: "Commande updated" });
  });
};

// Delete a commande
exports.deleteCommande = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM commande WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting commande", error: err });
    }
    res.status(200).json({ message: "Commande deleted" });
  });
};
