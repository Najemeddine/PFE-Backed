const db = require('../db');

// Get all commandes with associated products
exports.getAllCommandes = async (req, res) => {
  try {
    const query = `
      SELECT c.*, cp.produit_id, cp.quantite, p.Nom AS produit_nom, cl.Nom AS client_nom, cl.Prenom AS client_prenom
      FROM commande c
      LEFT JOIN commande_produits cp ON c.id = cp.commande_id
      LEFT JOIN produit p ON cp.produit_id = p.id
      LEFT JOIN client cl ON c.Client = cl.id
    `;
    const [results] = await db.query(query);

    // Group results by commande
    const commandes = results.reduce((acc, row) => {
      const commande = acc.find(c => c.id === row.id);
      if (commande) {
        if (row.produit_id) {
          commande.produits.push({
            produit_id: row.produit_id,
            quantite: row.quantite,
            Nom: row.produit_nom
          });
        }
      } else {
        acc.push({
          id: row.id,
          Client: row.client_nom && row.client_prenom ? `${row.client_nom} ${row.client_prenom}` : 'Client inconnu',
          total: row.total,
          date_creation: row.date_creation,
          status: row.status,
          produits: row.produit_id ? [{
            produit_id: row.produit_id,
            quantite: row.quantite,
            Nom: row.produit_nom
          }] : []
        });
      }
      return acc;
    }, []);

    res.status(200).json(commandes);
  } catch (err) {
    console.error('Error retrieving commandes:', err);
    res.status(500).json({ message: 'Error retrieving commandes', error: err.message });
  }
};

// Get commandes by client ID
exports.getCommandesByClientId = async (req, res) => {
  const { clientId } = req.params;
  let connection;
  try {
    connection = await db.getConnection();
    const query = `
    SELECT c.*, cp.produit_id, cp.quantite, p.Nom AS produit_nom, cl.Nom AS client_nom, cl.Prenom AS client_prenom
    FROM commande c
    LEFT JOIN commande_produits cp ON c.id = cp.commande_id
    LEFT JOIN produit p ON cp.produit_id = p.id
    LEFT JOIN client cl ON c.Client = cl.id
    WHERE c.Client = ?
    ORDER BY c.date_creation DESC
`;
    console.log('Executing query for clientId:', clientId);
    const [results] = await connection.query(query, [clientId]);
    console.log('Query results:', results);

    const commandes = results.reduce((acc, row) => {
      const commande = acc.find(c => c.id === row.id);
      let details = {};
      try {
        details = row.details ? JSON.parse(row.details) : { totalPrice: 0, items: [] };
      } catch (e) {
        console.error('Error parsing details JSON:', e);
        details = { totalPrice: 0, items: [] };
      }

      const productDetailsMap = details.items.reduce((map, item) => {
        map[item.id] = item;
        return map;
      }, {});

      if (commande) {
        if (row.produit_id) {
          const productDetail = productDetailsMap[row.produit_id] || {};
          commande.produits.push({
            produit_id: row.produit_id,
            quantite: row.quantite,
            Nom: row.produit_nom,
            prix: productDetail.prix || 0
          });
        }
      } else {
        acc.push({
          id: row.id,
          Client: `${row.client_nom} ${row.client_prenom}`, // Use joined client name and surname
          total: details.totalPrice || row.total || 0,
          date_creation: row.date_creation,
          status: row.status,
          details: details,
          produits: row.produit_id ? [{
            produit_id: row.produit_id,
            quantite: row.quantite,
            Nom: row.produit_nom,
            prix: (productDetailsMap[row.produit_id] || {}).prix || 0
          }] : []
        });
      }
      return acc;
    }, []);

    console.log('Sending response:', commandes);
    res.status(200).json(commandes);
  } catch (err) {
    console.error('Error retrieving commandes:', err);
    res.status(500).json({ message: 'Error retrieving commandes', error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

// Get a single commande by ID
exports.getCommandeById = (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT c.*, cp.produit_id, cp.quantite, p.Nom AS produit_nom
    FROM commande c
    LEFT JOIN commande_produits cp ON c.id = cp.commande_id
    LEFT JOIN produits p ON cp.produit_id = p.id
    WHERE c.id = ?
  `;
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving commande", error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Commande not found" });
    }
    let details = {};
    try {
      details = results[0].details ? JSON.parse(results[0].details) : { totalPrice: 0, items: [] };
    } catch (e) {
      console.error('Error parsing details JSON:', e);
      details = { totalPrice: 0, items: [] };
    }

    const productDetailsMap = details.items.reduce((map, item) => {
      map[item.id] = item;
      return map;
    }, {});

    const commande = {
      id: results[0].id,
      Client: results[0].Client,
      total: details.totalPrice || results[0].total || 0,
      date_creation: results[0].date_creation,
      status: results[0].status,
      details: details,
      produits: results
        .filter(row => row.produit_id)
        .map(row => ({
          produit_id: row.produit_id,
          quantite: row.quantite,
          Nom: row.produit_nom,
          prix: (productDetailsMap[row.produit_id] || {}).prix || 0
        }))
    };
    res.status(200).json(commande);
  });
};

// Create a new commande
exports.createCommande = async (req, res) => {
  const { Client, details, produits } = req.body;
  console.time('createCommande');
  console.log('Starting createCommande');
  console.log('Received data:', { Client, details, produits });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.query('SET autocommit = 1');

    // Validate Client ID
    const [clientResults] = await connection.query('SELECT id FROM Client WHERE id = ?', [Client]);
    if (!clientResults.length) {
      console.error('Invalid Client ID:', Client);
      return res.status(400).json({ message: 'Invalid Client ID' });
    }

    // Parse details and calculate total
    const parsedDetails = JSON.parse(details);
    const total = parsedDetails.totalPrice;
    console.log('Calculated total:', total);

    // Insert into commandes
    console.log('Executing commande insert query');
    const [result] = await connection.query(
      'INSERT INTO commande (Client, details, total, status, date_creation) VALUES (?, ?, ?, ?, NOW())',
      [Client, details, total, 1]
    );
    console.log('Inserted into commande, ID:', result.insertId);
    const commandeId = result.insertId;

    // Handle products
    if (!produits || produits.length === 0) {
      console.log('No products to insert');
      console.timeEnd('createCommande');
      return res.status(201).json({ message: 'Commande created without products', id: commandeId });
    }

    // Validate product IDs
    const productIds = produits.map(p => parseInt(p.produit_id));
    const [productResults] = await connection.query('SELECT id FROM produit WHERE id IN (?)', [productIds]);
    if (productResults.length !== productIds.length) {
      console.error('Invalid product IDs:', productIds);
      return res.status(400).json({ message: 'Invalid product IDs' });
    }

    // Insert into commandes_produits
    const produitValues = produits.map(p => [commandeId, parseInt(p.produit_id), parseInt(p.quantite)]);
    console.log('Produit values for insertion:', produitValues);
    console.log('Executing commandes_produits insert query');
    await connection.query('INSERT INTO commande_produits (commande_id, produit_id, quantite) VALUES ?', [produitValues]);

    console.log('Successfully inserted products');
    console.log('Sending response');
    console.timeEnd('createCommande');
    return res.status(201).json({
      message: 'Commande created with products',
      id: commandeId,
      productsAdded: produits.length
    });
  } catch (error) {
    console.error('Unexpected error in createCommande:', error);
    console.timeEnd('createCommande');
    return res.status(500).json({ message: 'Error processing commande data', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// Update a commande
exports.updateCommande = (req, res) => {
  const { id } = req.params;
  const { Client, total, status } = req.body;
  db.query(
    'UPDATE commande SET Client = ?, total = ?, status = ? WHERE id = ?',
    [Client, total, status, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Error updating commande", error: err });
      }
      res.status(200).json({ message: "Commande updated" });
    }
  );
};

// Delete a commande
exports.deleteCommande = (req, res) => {
  const { id } = req.params;
  // First, delete related entries in commande_produits
  db.query('DELETE FROM commande_produits WHERE commande_id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting commande products", error: err });
    }
    // Then delete the commande
    db.query('DELETE FROM commande WHERE id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Error deleting commande", error: err });
      }
      res.status(200).json({ message: "Commande deleted" });
    });
  });
};