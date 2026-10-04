/**
 * FAQ Routes
 * GET /api/faqs — Public FAQ listing
 */
const express = require('express');
const router = express.Router();

const { statements } = require('../config/database');

router.get('/', (_req, res) => {
  res.json(statements.publicFaqs.all());
});

module.exports = router;
