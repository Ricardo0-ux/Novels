const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool();
const Joi = require('joi');
const authenticate = require('../middleware/authenticate');

// Esquema de validação
const novelSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().allow('').max(500),
  genre: Joi.string().max(50),
  status: Joi.string().valid('Ongoing', 'Completed', 'Hiatus').default('Ongoing'),
  author: Joi.string().min(3).max(50).required()
});

// Middleware para verificar se o usuário é o dono da novel
const checkNovelOwner = async (req, res, next) => {
  try {
    const novelId = req.params.id;
    const userId = req.user.id;
    
    const novel = await pool.query('SELECT user_id FROM novels WHERE id = $1', [novelId]);
    
    if (novel.rows.length === 0) {
      return res.status(404).json({ error: 'Novel not found' });
    }
    
    if (novel.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this novel' });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

// Listar novels com paginação
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      'SELECT * FROM novels ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    const countResult = await pool.query('SELECT COUNT(*) FROM novels');
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Criar nova novel
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { error } = novelSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { title, description, genre, status, author } = req.body;
    const result = await pool.query(
      `INSERT INTO novels 
       (title, description, genre, status, author, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [title, description, genre, status, author, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Obter detalhes de uma novel
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM novels WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Novel not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Atualizar novel
router.put('/:id', authenticate, checkNovelOwner, async (req, res, next) => {
  try {
    const { error } = novelSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { title, description, genre, status, author } = req.body;
    const result = await pool.query(
      `UPDATE novels 
       SET title = $1, description = $2, genre = $3, status = $4, author = $5, updated_at = NOW() 
       WHERE id = $6 
       RETURNING *`,
      [title, description, genre, status, author, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Deletar novel
router.delete('/:id', authenticate, checkNovelOwner, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM novels WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
