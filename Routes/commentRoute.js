const express = require('express');
const router = express.Router();
const commentController = require('../Controller/CommentController');

// Add these routes
router.post('/comments', commentController.createComment);
router.get('/comments/:produit_id', commentController.getCommentsByProduct);

module.exports = router;