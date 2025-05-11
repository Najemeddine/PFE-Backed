const db = require('../db');
const fs = require('fs');
const path = require('path');

exports.getAllProduits = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM produit');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error retrieving produits:', err);
    res.status(500).json({ message: 'Error retrieving produits', error: err });
  }
};

exports.getAllProduitsbyfourn = async (req, res) => {
  const idFournisseur = req.params.idFournisseur;
  const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
  const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
  const offset = (page - 1) * limit;

  try {
    // Get total number of products for this fournisseur
    const [totalCountResult] = await db.query(
      'SELECT COUNT(*) as total FROM produit WHERE fournisseur = ?',
      [idFournisseur]
    );
    const totalProducts = totalCountResult[0].total;
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch paginated products
    const [results] = await db.query(
      'SELECT * FROM produit WHERE fournisseur = ? LIMIT ? OFFSET ?',
      [idFournisseur, limit, offset]
    );

    res.status(200).json({
      products: results,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalProducts: totalProducts,
        limit: limit,
      },
    });
  } catch (err) {
    console.error('Error retrieving produits:', err);
    res.status(500).json({
      message: 'Error retrieving produits',
      error: err,
    });
  }
};

exports.getProduitById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM produit WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Produit not found' });
    }

    const [ratings] = await db.query('SELECT * FROM ratings WHERE produit_id = ?', [id]);

    res.status(200).json({ ...rows[0], ratings });
  } catch (err) {
    console.error('Error retrieving produit:', err);
    res.status(500).json({ message: 'Error retrieving produit', error: err });
  }
};

exports.createProduit = async (req, res) => {
  const { Nom, categorie, prix, description, photo, fournisseur, stock } = req.body;

  if (!Nom || !categorie || !prix || !fournisseur) {
    return res.status(400).json({
      message: 'All required fields must be provided',
    });
  }

  try {
    const photoPath = photo ? photo : null;

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

    const photoPath = photo ? photo : existing[0].photo;

    const [result] = await db.execute(
      'UPDATE produit SET Nom = ?, categorie = ?, prix = ?, description = ?, photo = ?, stock = ? WHERE id = ? ',
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

exports.rateProduit = async (req, res) => {
  const { id } = req.params;
  const { client_id, rating } = req.body;

  if (!client_id || !rating || rating < 0 || rating > 5) {
    return res.status(400).json({ message: 'Client ID and rating (0-5) are required' });
  }

  try {
    const [product] = await db.query('SELECT * FROM produit WHERE id = ?', [id]);
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const [existingRating] = await db.query(
      'SELECT * FROM ratings WHERE produit_id = ? AND client_id = ?',
      [id, client_id]
    );

    if (existingRating.length > 0) {
      return res.status(400).json({ message: 'Vous avez déjà noté ce produit' });
    }

    await db.execute(
      'INSERT INTO ratings (produit_id, client_id, rating) VALUES (?, ?, ?)',
      [id, client_id, rating]
    );

    const [ratings] = await db.query(
      'SELECT AVG(rating) as avg_rating FROM ratings WHERE produit_id = ?',
      [id]
    );

    let avgRating = ratings[0].avg_rating;
    avgRating = avgRating != null ? Number(avgRating) : 0;

    await db.execute(
      'UPDATE produit SET rating = ? WHERE id = ?',
      [avgRating.toFixed(1), id]
    );

    res.status(201).json({ message: 'Rating submitted successfully', avgRating });
  } catch (err) {
    console.error('Error submitting rating:', err);
    res.status(500).json({ message: 'Error submitting rating', error: err });
  }
};