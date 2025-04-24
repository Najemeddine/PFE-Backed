const db = require('../db');
const fs = require('fs');
const path = require('path');

const saveBase64Image = (base64String, filename) => {
  const uploadDir = './Uploads/products';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const imageBuffer = Buffer.from(matches[2], 'base64');
  const fileExtension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : matches[1].split('/')[1];
  const uniqueFilename = `${Date.now()}-${filename || 'product'}.${fileExtension}`;
  const filePath = path.join(uploadDir, uniqueFilename);

  fs.writeFileSync(filePath, imageBuffer);
  return `/Uploads/products/${uniqueFilename}`;
};

exports.getAllProduits = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM produit');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error retrieving produits:', err);
    res.status(500).json({ message: 'Error retrieving produits', error: err });
  }
};

exports.getProduitById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM produit WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Produit not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error retrieving produit:', err);
    res.status(500).json({ message: 'Error retrieving produit', error: err });
  }
};

exports.createProduit = async (req, res) => {
  const { Nom, categorie, prix, description, photo, fournisseur, stock } = req.body;

  if (!Nom || !categorie || !prix || !fournisseur) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  try {
    const photoPath = photo ? saveBase64Image(photo, Nom) : null;

    const [result] = await db.execute(
      'INSERT INTO produit (Nom, categorie, prix, description, photo, fournisseur, stock, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [Nom, categorie, prix, description || null, photoPath, fournisseur, stock || 0, 0]
    );

    res.status(201).json({ message: 'Produit created', id: result.insertId });
  } catch (err) {
    console.error('Error creating produit:', err);
    res.status(500).json({ message: 'Error creating produit', error: err });
  }
};

exports.updateProduit = async (req, res) => {
  const { id } = req.params;
  const { Nom, categorie, prix, description, photo, stock } = req.body;

  try {
    const [existing] = await db.execute('SELECT * FROM produit WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Produit not found' });
    }

    const photoPath = photo ? saveBase64Image(photo, Nom || existing[0].Nom) : existing[0].photo;

    const [result] = await db.execute(
      'UPDATE produit SET Nom = ?, categorie = ?, prix = ?, description = ?, photo = ?, stock = ? WHERE id = ?',
      [
        Nom || existing[0].Nom,
        categorie || existing[0].categorie,
        prix || existing[0].prix,
        description || existing[0].description,
        photoPath,
        stock !== undefined ? stock : existing[0].stock,
        id,
      ]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Produit updated' });
    } else {
      res.status(400).json({ message: 'No changes made' });
    }
  } catch (err) {
    console.error('Error updating produit:', err);
    res.status(500).json({ message: 'Error updating produit', error: err });
  }
};

exports.deleteProduit = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM produit WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Produit not found' });
    }
    res.status(200).json({ message: 'Produit deleted' });
  } catch (err) {
    console.error('Error deleting produit:', err);
    res.status(500).json({ message: 'Error deleting produit', error: err });
  }
};

exports.getStatistics = async (req, res) => {
  const { fournisseur } = req.query;

  try {
    const [totalProducts] = await db.execute(
      'SELECT COUNT(*) as count FROM produit WHERE fournisseur = ?',
      [fournisseur]
    );
    const [outOfStock] = await db.execute(
      'SELECT COUNT(*) as count FROM produit WHERE fournisseur = ? AND stock = 0',
      [fournisseur]
    );
    const [avgRating] = await db.execute(
      'SELECT AVG(rating) as avg FROM produit WHERE fournisseur = ? AND rating > 0',
      [fournisseur]
    );
    const [totalRevenue] = await db.execute(
      'SELECT SUM(prix * stock) as revenue FROM produit WHERE fournisseur = ?',
      [fournisseur]
    );

    res.status(200).json({
      totalProducts: totalProducts[0].count,
      outOfStock: outOfStock[0].count,
      avgRating: avgRating[0].avg || 0,
      totalRevenue: totalRevenue[0].revenue || 0,
    });
  } catch (err) {
    console.error('Error retrieving statistics:', err);
    res.status(500).json({ message: 'Error retrieving statistics', error: err });
  }
};