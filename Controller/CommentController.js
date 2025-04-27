const db = require('../db');

exports.createComment = async (req, res) => {
  const { produit_id, client_id, contenu } = req.body;

  if (!produit_id || !client_id || !contenu) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO commentaire (produit_id, client_id, contenu) VALUES (?, ?, ?)',
      [produit_id, client_id, contenu]
    );
    res.status(201).json({ message: 'Comment created', id: result.insertId });
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ message: 'Error creating comment', error: err });
  }
};

exports.getCommentsByProduct = async (req, res) => {
  const { produit_id } = req.params;

  try {
    const [comments] = await db.query(
      `SELECT c.*, cl.Prenom, cl.Nom, cl.photo 
       FROM commentaire c 
       JOIN client cl ON c.client_id = cl.id 
       WHERE c.produit_id = ? 
       ORDER BY c.date_creation DESC`,
      [produit_id]
    );
    res.status(200).json(comments);
  } catch (err) {
    console.error('Error retrieving comments:', err);
    res.status(500).json({ message: 'Error retrieving comments', error: err });
  }
};