
import express from 'express';
import { query } from '../db.js';
import { auth } from '../middleware/auth.js';

const r = express.Router();

r.get('/complaints', auth, async (req, res, next) => {
  try {
    let q;

    if (req.user.role === 'DEPARTMENT') {
      q = await query(
        `SELECT
          c.id,
          c.public_id,
          c.status,
          c.final_priority,
          c.latitude,
          c.longitude,
          c.description,
          cat.name AS category,
          c.created_at
         FROM complaints c
         LEFT JOIN categories cat ON cat.id = c.category_id
         WHERE c.department_id = $1
           AND c.latitude IS NOT NULL
           AND c.longitude IS NOT NULL
         ORDER BY c.created_at DESC`,
        [req.user.id]
      );
    } else {
      q = await query(
        `SELECT
          c.id,
          c.public_id,
          c.status,
          c.final_priority,
          c.latitude,
          c.longitude,
          c.description,
          cat.name AS category,
          c.created_at
         FROM complaints c
         LEFT JOIN categories cat ON cat.id = c.category_id
         WHERE c.citizen_id = $1
           AND c.latitude IS NOT NULL
           AND c.longitude IS NOT NULL
         ORDER BY c.created_at DESC`,
        [req.user.id]
      );
    }

    res.json(q.rows);
  } catch (e) {
    next(e);
  }
});

export default r;
