const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool();
const Joi = require('joi');
const authenticate = require('../middleware/authenticate');

// Esquema de validação
const chapterSchema = Joi.object({
  novel_id: Joi.number().integer().required(),
  number: Joi.number().integer().min(1).required(),
  title: Joi.string().min(3).max(100).required(),
  content: Joi.string().min(10).required()
});

// Middleware para verificar se o usuário é o dono do capítulo
const checkChapterOwner = async (req, res, next) => {
  try {
    const chapterId = req.params.id;
    const userId = req.user.id;
    
    const chapter = await pool.query(
      'SELECT n.user_id FROM chapters c JOIN novels n ON c.novel_id = n.id WHERE c.id = $1',
      [chapterId]
    );
    
    if (chapter.rows.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    if (chapter.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this chapter' });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

// Listar capítulos de uma novel
router.get('/:novelId', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, number, title FROM chapters WHERE novel_id = $1 ORDER BY number ASC',
      [req.params.novelId]
    );
    
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Criar novo capítulo
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { error } = chapterSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { novel_id, number, title, content } = req.body;
    
    // Verifica se o usuário é dono da novel
    const novel = await pool.query('SELECT user_id FROM novels WHERE id = $1', [novel_id]);
    if (novel.rows.length === 0) {
      return res.status(404).json({ error: 'Novel not found' });
    }
    if (novel.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to add chapters to this novel' });
    }
    
    const result = await pool.query(
      `INSERT INTO chapters (novel_id, number, title, content) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, number, title`,
      [novel_id, number, title, content]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Violação de unique constraint
      return res.status(409).json({ error: 'Chapter number already exists for this novel' });
    }
    next(err);
  }
});

// Obter conteúdo de um capítulo
router.get('/chapter/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, number, title, content FROM chapters WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Atualizar capítulo
router.put('/:id', authenticate, checkChapterOwner, async (req, res, next) => {
  try {
    const { error } = chapterSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { novel_id, number, title, content } = req.body;
    const result = await pool.query(
      `UPDATE chapters 
       SET number = $1, title = $2, content = $3, updated_at = NOW() 
       WHERE id = $4 
       RETURNING id, number, title`,
      [number, title, content, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Chapter number already exists for this novel' });
    }
    next(err);
  }
});

// Deletar capítulo
router.delete('/:id', authenticate, checkChapterOwner, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM chapters WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
