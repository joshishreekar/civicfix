
import express from 'express';
import { query } from '../db.js';
import { auth } from '../middleware/auth.js';

const r = express.Router();

/*
|--------------------------------------------------------------------------
| GET NOTIFICATIONS
|--------------------------------------------------------------------------
| CITIZEN:
|   notifications.user_id = req.user.id
|
| DEPARTMENT:
|   notifications.department_id = req.user.id
|--------------------------------------------------------------------------
*/
r.get('/', auth, async (req, res, next) => {
  try {
    let q;

    if (req.user.role === 'DEPARTMENT') {
      q = await query(
        `SELECT
          n.*,
          c.public_id,
          c.status,
          c.final_priority,
          c.description
         FROM notifications n
         LEFT JOIN complaints c
           ON c.id = n.complaint_id
         WHERE n.department_id = $1
         ORDER BY n.created_at DESC
         LIMIT 100`,
        [req.user.id]
      );
    } else {
      q = await query(
        `SELECT
          n.*,
          c.public_id,
          c.status,
          c.final_priority,
          c.description
         FROM notifications n
         LEFT JOIN complaints c
           ON c.id = n.complaint_id
         WHERE n.user_id = $1
         ORDER BY n.created_at DESC
         LIMIT 100`,
        [req.user.id]
      );
    }

    res.json(q.rows);

  } catch (e) {
    next(e);
  }
});

/*
|--------------------------------------------------------------------------
| MARK ONE NOTIFICATION AS READ
|--------------------------------------------------------------------------
*/
r.patch('/:id/read', auth, async (req, res, next) => {
  try {
    if (req.user.role === 'DEPARTMENT') {
      await query(
        `UPDATE notifications
         SET is_read = true
         WHERE id = $1
           AND department_id = $2`,
        [
          req.params.id,
          req.user.id
        ]
      );
    } else {
      await query(
        `UPDATE notifications
         SET is_read = true
         WHERE id = $1
           AND user_id = $2`,
        [
          req.params.id,
          req.user.id
        ]
      );
    }

    res.json({
      ok: true
    });

  } catch (e) {
    next(e);
  }
});

/*
|--------------------------------------------------------------------------
| MARK ALL NOTIFICATIONS AS READ
|--------------------------------------------------------------------------
*/
r.patch('/read-all', auth, async (req, res, next) => {
  try {
    if (req.user.role === 'DEPARTMENT') {
      await query(
        `UPDATE notifications
         SET is_read = true
         WHERE department_id = $1`,
        [req.user.id]
      );
    } else {
      await query(
        `UPDATE notifications
         SET is_read = true
         WHERE user_id = $1`,
        [req.user.id]
      );
    }

    res.json({
      ok: true
    });

  } catch (e) {
    next(e);
  }
});

export default r;
