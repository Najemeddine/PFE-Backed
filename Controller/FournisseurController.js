const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Function to save base64 image to a file
const saveBase64Image = (base64String, filename) => {
  const uploadDir = './Uploads/profiles';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const imageBuffer = Buffer.from(matches[2], 'base64');
  const fileExtension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : matches[1].split('/')[1];
  const uniqueFilename = `${Date.now()}-${filename || 'profile'}.${fileExtension}`;
  const filePath = path.join(uploadDir, uniqueFilename);

  fs.writeFileSync(filePath, imageBuffer);
  return `/Uploads/profiles/${uniqueFilename}`;
};

// Generate unique matricule
const generateMatricule = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  return `WF${year}-${month}-${randomDigits}`;
};

// Send matricule email
const sendMatriculeEmail = async (email, matricule, nom, prenom) => {
  try {
    const msg = {
      to: email,
      from: {
        email: process.env.EMAIL_FROM || 'support@weefarm.com',
        name: process.env.EMAIL_FROM_NAME || 'WeeFarm Support',
      },
      subject: 'Votre matricule WeeFarm',
      html: `
        <h1>Bienvenue sur WeeFarm, ${prenom} ${nom}!</h1>
        <p>Votre compte fournisseur a été créé avec succès.</p>
        <p>Voici votre matricule fournisseur unique: <strong>${matricule}</strong></p>
        <p>Veuillez le conserver précieusement, vous en aurez besoin pour vous connecter à votre compte fournisseur.</p>
        <p>L'équipe WeeFarm</p>
      `,
    };
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
};

// Get all fournisseurs
exports.getAllFournisseurs = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM fournisseur');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error retrieving fournisseurs:', err);
    res.status(500).json({ message: 'Error retrieving fournisseurs', error: err });
  }
};

// Get fournisseur by ID
exports.getFournisseurById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM fournisseur WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Fournisseur not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error retrieving fournisseur:', err);
    res.status(500).json({ message: 'Error retrieving fournisseur', error: err });
  }
};

// Create fournisseur
exports.createFournisseur = async (req, res) => {
  const {
    email,
    password,
    Nom,
    Prenom,
    Dateinsc,
    Adresse,
    numtel,
    dateNaissance,
    genre,
    emailPro,
    Entreprise,
    photo,
    typeuser,
  } = req.body;

  if (!email || !password || !Nom || !Prenom || !Adresse || !numtel) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM fournisseur WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    if (emailPro) {
      const [proRows] = await db.execute('SELECT * FROM fournisseur WHERE emailPro = ?', [emailpicture]);
      if (proRows.length > 0) {
        return res.status(400).json({ message: 'Professional email already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const matricule = generateMatricule();
    const photoPath = photo ? saveBase64Image(photo, `${Nom}_${Prenom}`) : null;

    const [result] = await db.execute(
      'INSERT INTO fournisseur (email, emailPro, password, Nom, Prenom, Dateinsc, Adresse, numtel, dateNaissance, genre, Entreprise, matricule, photo, typeuser) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        email,
        emailPro || null,
        hashedPassword,
        Nom,
        Prenom,
        Dateinsc || null,
        Adresse,
        numtel,
        dateNaissance || null,
        genre || null,
        Entreprise || null,
        matricule,
        photoPath,
        typeuser || 'fournisseur',
      ]
    );

    await sendMatriculeEmail(email, matricule, Nom, Prenom);
    res.status(201).json({ message: 'Fournisseur registered successfully', matricule });
  } catch (error) {
    console.error('Error creating fournisseur:', error);
    res.status(500).json({ message: 'Error creating fournisseur', error: error.message });
  }
};

// Update fournisseur
exports.updateFournisseur = async (req, res) => {
  const { id } = req.params;
  const {
    Nom,
    Prenom,
    email,
    emailPro,
    Adresse,
    numtel,
    dateNaissance,
    genre,
    Entreprise,
    photo,
  } = req.body;

  try {
    const [existing] = await db.execute('SELECT * FROM fournisseur WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Fournisseur not found' });
    }

    const photoPath = photo ? photo : existing[0].photo;

    const [result] = await db.execute(
      'UPDATE fournisseur SET Nom = ?, Prenom = ?, email = ?, emailPro = ?, Adresse = ?, numtel = ?, dateNaissance = ?, genre = ?, Entreprise = ?, photo = ? WHERE id = ?',
      [
        Nom || existing[0].Nom,
        Prenom || existing[0].Prenom,
        email || existing[0].email,
        emailPro || existing[0].emailPro,
        Adresse || existing[0].Adresse,
        numtel || existing[0].numtel,
        dateNaissance || existing[0].dateNaissance,
        genre || existing[0].genre,
        Entreprise || existing[0].Entreprise,
        photoPath,
        id,
      ]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Fournisseur updated successfully' });
    } else {
      res.status(400).json({ message: 'No changes made' });
    }
  } catch (error) {
    console.error('Error updating fournisseur:', error);
    res.status(500).json({ message: 'Error updating fournisseur', error: error.message });
  }
};

// Delete fournisseur
exports.deleteFournisseur = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM fournisseur WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Fournisseur not found' });
    }
    res.status(200).json({ message: 'Fournisseur deleted successfully' });
  } catch (error) {
    console.error('Error deleting fournisseur:', error);
    res.status(500).json({ message: 'Error deleting fournisseur', error: error.message });
  }
};


