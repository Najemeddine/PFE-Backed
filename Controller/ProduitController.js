const db = require('../db');


exports.getAllCommandes = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM produit');
    res.status(200).json(results);
  } catch (err) {
    console.error("Error retrieving fournisseurs:", err);
    res.status(500).json({ message: "Error retrieving fournisseurs", error: err });
  }
};

exports.getCommandeById = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM produit WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving produit", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "produit not found" });
    }
    res.status(200).json(result[0]);
  });
};

// Create a new produit
exports.createCommande = (req, res) => {
  const { client_id, fournisseur_id, details } = req.body;
  db.query('INSERT INTO produit (client_id, fournisseur_id, details) VALUES (?, ?, ?)', [client_id, fournisseur_id, details], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error creating produit", error: err });
    }
    res.status(201).json({ message: "produit created", id: result.insertId });
  });
};

// Update a produit
exports.updateCommande = (req, res) => {
  const { id } = req.params;
  const { client_id, fournisseur_id, details } = req.body;
  db.query('UPDATE produit SET client_id = ?, fournisseur_id = ?, details = ? WHERE id = ?', [client_id, fournisseur_id, details, id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error updating produit", error: err });
    }
    res.status(200).json({ message: "produit updated" });
  });
};

// Delete a produit
exports.deleteCommande = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM produit WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting produit", error: err });
    }
    res.status(200).json({ message: "produit deleted" });
  });
};
