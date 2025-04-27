
const db = require('../db');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require("dotenv").config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// Function to save base64 image to a file
const saveBase64Image = (base64String, filename) => {
  // Create uploads directory if it doesn't exist
  const uploadDir = './uploads/profiles';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Extract actual base64 data from the data URL
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const imageBuffer = Buffer.from(matches[2], 'base64');
  const fileExtension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : matches[1].split('/')[1];
  const uniqueFilename = `${Date.now()}-${filename || 'profile'}.${fileExtension}`;
  const filePath = path.join(uploadDir, uniqueFilename);

  fs.writeFileSync(filePath, imageBuffer);
  return filePath;
};

// Fonction pour générer un matricule unique pour les fournisseurs
const generateMatricule = () => {
  // Format: WFyyyy-MM-xxxxx (WF pour WeeFarm, année-mois, puis 5 chiffres aléatoires)
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 chiffres aléatoires

  return `WF${year}-${month}-${randomDigits}`;
};

// Fonction pour envoyer un email avec le matricule utilisant SendGrid
const sendMatriculeEmail = async (email, matricule, nom, prenom) => {
  try {
    const msg = {
      to: email,
      from: {
        email: process.env.EMAIL_FROM || 'support@weefarm.com',
        name: process.env.EMAIL_FROM_NAME || 'WeeFarm Support'
      },
      subject: 'Votre matricule WeeFarm',
      html: `
        <h1>Bienvenue sur WeeFarm, ${prenom} ${nom}!</h1>
        <p>Votre compte fournisseur a été créé avec succès.</p>
        <p>Voici votre matricule fournisseur unique: <strong>${matricule}</strong></p>
        <p>Veuillez le conserver précieusement, vous en aurez besoin pour vous connecter à votre compte fournisseur.</p>
        <p>L'équipe WeeFarm</p>
      `
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
};

exports.register = async (req, res) => {
  try {
    // Extract form data
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
      typeuser,
      emailPro,
      Entreprise,
      photo, // This will be the base64 string
      photoName // Not needed if storing base64 directly
    } = req.body;

    // Check if email already exists
    const [existingUsers] = await db.execute("SELECT * FROM client WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    if (typeuser === "fournisseur" && emailPro) {
      const [existingProEmails] = await db.execute("SELECT * FROM fournisseur WHERE emailPro = ?", [emailPro]);
      if (existingProEmails.length > 0) {
        return res.status(400).json({ message: "Cet email professionnel est déjà utilisé" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // No need to save the photo to a file, use the base64 string directly
    const photoData = photo; // This will be the base64 string

    if (typeuser === "client") {
      // Insert a new client with the base64 photo directly
      await db.execute(
        "INSERT INTO client (email, password, Nom, Prenom, Dateinsc, Adresse, numtel, dateNaissance, genre, photo, typeuser) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [email, hashedPassword, Nom, Prenom, Dateinsc || null, Adresse, numtel, dateNaissance || null, genre, photoData, typeuser]
      );

      return res.status(201).json({ message: "Client enregistré avec succès" });
    }
    else if (typeuser === "fournisseur") {
      // Generate unique supplier ID
      const matricule = req.body.matricule || generateMatricule();

      // Insert a new supplier with the base64 photo directly
      await db.execute(
        "INSERT INTO fournisseur (email, emailPro, password, Nom, Prenom, Dateinsc, Adresse, Entreprise, numtel, dateNaissance, genre, matricule, photo, typeuser) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [email, emailPro || null, hashedPassword, Nom, Prenom, Dateinsc || null, Adresse, Entreprise || null, numtel, dateNaissance || null, genre, matricule, photoData, typeuser]
      );

      // Send email with the matricule using SendGrid
      const emailSent = await sendMatriculeEmail(email, matricule, Nom, Prenom);

      return res.status(201).json({
        message: "Fournisseur enregistré avec succès. Un email avec votre matricule a été envoyé."
      });
    }
    else {
      return res.status(400).json({ message: "Type d'utilisateur non valide" });
    }
  } catch (error) {
    console.error("Error in register function:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password, matricule } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in the environment variables");
    }

    let user = null;
    let typeuser = null;

    // Recherche dans la table client
    let [rows] = await db.execute("SELECT * FROM client WHERE email = ?", [email]);
    if (rows.length > 0) {
      user = rows[0];
      typeuser = "client";
    }

    // Recherche dans la table fournisseur si non trouvé
    if (!user) {
      [rows] = await db.execute("SELECT * FROM fournisseur WHERE email = ?", [email]);
      if (rows.length > 0) {
        user = rows[0];
        typeuser = "fournisseur";

        // Vérifier le matricule pour les fournisseurs
        if (!matricule || matricule !== user.matricule) {
          return res.status(400).json({ message: "Matricule invalide", field: "matricule" });
        }
      }
    }

    // Recherche dans la table admin si non trouvé
    if (!user) {
      [rows] = await db.execute("SELECT * FROM admin WHERE email = ?", [email]);
      if (rows.length > 0) {
        user = rows[0];
        typeuser = "admin";
      }
    }

    // Si aucun utilisateur trouvé
    if (!user) {
      return res.status(400).json({ message: "Email ou mot de passe invalide" });
    }

    // Vérification du mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Email ou mot de passe invalide" });
    }

    // Génération du token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, typeuser },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Retour des infos utilisateur
    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        Nom: user.Nom,
        Prenom: user.Prenom,
        Adresse: user.Adresse,
        numtel: user.numtel,
        photo: user.photo,
        dateNaissance: user.dateNaissance,
        genre: user.genre,
        typeuser
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
exports.getAllClients = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM client');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error retrieving clients:', err);
    res.status(500).json({ message: "Error retrieving clients", error: err.message });
  }
};

// Get a single client by ID
exports.getClientById = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM client WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error retrievingclient", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json(result[0]);
  });
};

// Create a new client
exports.createadmin = (req, res) => {
  const { name, email, phone } = req.body;
  db.query('INSERT INTO client (name, email, phone) VALUES (?, ?, ?)',
    [name, email, phone], (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Error creating client",
          error: err
        });
      }
      res.status(201).json({ message: "Client created", id: result.insertId });
    });
};

// Update a client
exports.updateClient = async (req, res) => {
  const { id } = req.params;
  const {
    Nom,
    Prenom,
    email,
    numtel,
    Adresse,
    dateNaissance,
    genre,
    photo,
    typeuser,
    password,
  } = req.body;

  try {
    // Determine the table based on typeuser
    let table;
    switch (typeuser) {
      case 'client':
        table = 'client';
        break;
      case 'fournisseur':
        table = 'fournisseur';
        break;
      case 'admin':
        table = 'admin';
        break;
      default:
        return res.status(400).json({ message: "Invalid user type" });
    }

    // Check if the user exists in the specified table
    const [existingUser] = await db.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ message: `${typeuser} not found` });
    }

    // If a password is provided, hash it; otherwise, use the existing password
    let hashedPassword = existingUser[0].password; // Default to existing password
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Construct the SQL query to update the user
    const query = `
        UPDATE ${table} 
        SET 
          Nom = ?, 
          Prenom = ?, 
          email = ?, 
          numtel = ?, 
          Adresse = ?, 
          dateNaissance = ?, 
          genre = ?, 
          photo = ?, 
          typeuser = ?,
          password = ?
        WHERE id = ?
      `;

    // Execute the query
    const [result] = await db.execute(query, [
      Nom,
      Prenom,
      email,
      numtel,
      Adresse,
      dateNaissance || null,
      genre,
      photo,
      typeuser,
      hashedPassword,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `${typeuser} not found` });
    }

    res.status(200).json({ message: `${typeuser} updated successfully` });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({
      message: "Error updating user",
      error: err.message,
    });
  }
};

// Delete a client
exports.deleteClient = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM client WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Fournisseur not found' });
    }
    res.status(200).json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Error deleting client', error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    let user = null;
    let userType = null;

    // Check in client table
    let [rows] = await db.execute("SELECT * FROM client WHERE email = ?", [email]);
    if (rows.length > 0) {
      user = rows[0];
      userType = "client";
    }

    // Check in fournisseur table if not found
    if (!user) {
      [rows] = await db.execute("SELECT * FROM fournisseur WHERE email = ?", [email]);
      if (rows.length > 0) {
        user = rows[0];
        userType = "fournisseur";
      }
    }

    // Check in admin table if not found
    if (!user) {
      [rows] = await db.execute("SELECT * FROM admin WHERE email = ?", [email]);
      if (rows.length > 0) {
        user = rows[0];
        userType = "admin";
      }
    }

    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      return res.status(200).json({ message: "If your email exists in our system, you will receive a password reset link" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetTokenExpiry = new Date(Date.now() + 3600000); // Token valid for 1 hour

    // Store token in database
    await db.execute(
      "INSERT INTO reset_tokens (user_id, user_type, token, expires_at) VALUES (?, ?, ?, ?)",
      [user.id, userType, resetTokenHash, resetTokenExpiry]
    );

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}/${user.id}/${userType}`;

    // Setup SendGrid

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Create email
    const msg = {
      to: email,
      from: {
        email: process.env.EMAIL_FROM || 'support@weefarm.com',
        name: process.env.EMAIL_FROM_NAME || 'WeeFarm Support'
      },
      subject: 'Password Reset Request',
      html: `
          <h1>Password Reset Request</h1>
          <p>You requested a password reset for your WeeFarm account.</p>
          <p>Please click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link is valid for 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
    };

    // Send email
    await sgMail.send(msg);

    res.status(200).json({ message: "Password reset link sent to your email" });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: "An error occurred during the password reset process" });
  }
};

// Function to reset password with token
exports.resetPassword = async (req, res) => {
  const { token, userId, userType, newPassword } = req.body;

  try {
    // Find valid token
    const [rows] = await db.execute(
      "SELECT * FROM reset_tokens WHERE user_id = ? AND user_type = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [userId, userType]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const resetToken = rows[0];

    // Verify token
    const isValidToken = await bcrypt.compare(token, resetToken.token);
    if (!isValidToken) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password based on user type
    let table = '';
    switch (userType) {
      case 'client':
        table = 'client';
        break;
      case 'fournisseur':
        table = 'fournisseur';
        break;
      case 'admin':
        table = 'admin';
        break;
      default:
        return res.status(400).json({ message: "Invalid user type" });
    }

    // Update password
    await db.execute(
      `UPDATE ${table} SET password = ? WHERE id = ?`,
      [hashedPassword, userId]
    );

    // Delete used token
    await db.execute("DELETE FROM reset_tokens WHERE id = ?", [resetToken.id]);

    res.status(200).json({ message: "Password has been reset successfully" });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: "An error occurred during the password reset process" });
  }
};

// Function to validate token (optional - for frontend validation before showing password reset form)
exports.validateResetToken = async (req, res) => {
  const { token, userId, userType } = req.params;

  try {
    // Find valid token
    const [rows] = await db.execute(
      "SELECT * FROM reset_tokens WHERE user_id = ? AND user_type = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [userId, userType]
    );

    if (rows.length === 0) {
      return res.status(400).json({ valid: false });
    }

    const resetToken = rows[0];

    // Verify token
    const isValidToken = await bcrypt.compare(token, resetToken.token);

    res.status(200).json({ valid: isValidToken });

  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ valid: false });
  }
};
