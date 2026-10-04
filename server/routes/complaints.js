
import express from 'express';
import { query } from '../db.js';
import { auth, role } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  analyzeText,
  analyzeImage
} from '../services/openaiService.js';
import {
  departmentForCategory,
  findDuplicates
} from '../services/complaintService.js';

const r = express.Router();

/*
|--------------------------------------------------------------------------
| CREATE COMPLAINT
|--------------------------------------------------------------------------
*/
r.post(
  '/',
  auth,
  role('CITIZEN'),
  upload.single('image'),
  async (req, res, next) => {
    try {
      const {
        description,
        latitude,
        longitude,
        address,
        landmark,
        categoryId,
        confirmedDuplicate
      } = req.body;

      if (!description?.trim()) {
        return res
          .status(400)
          .json({ message: 'Description is required' });
      }

      const ai = await analyzeText(description).catch(() => ({
        available: false
      }));
      
      let imageAi = {
  available: false
};

if (req.file) {
  imageAi = await analyzeImage(req.file.path).catch(() => ({
    available: false
  }));
}

      let catId = categoryId
  ? Number(categoryId)
  : null;

/*
 * IMAGE AI HAS PRIORITY WHEN IT HAS
 * A HIGH-CONFIDENCE CIVIC CLASSIFICATION.
 */
const imageCategory =
  imageAi?.available &&
  imageAi?.category &&
  imageAi.category !== 'Other' &&
  ['low', 'medium', 'high'].includes(
    String(imageAi.confidence || '').toLowerCase()
  )
    ? imageAi.category
    : null;

const finalAiCategory =
  imageCategory ||
  ai.category ||
  null;

if (!catId && finalAiCategory) {
  const c = await query(
    `SELECT id
     FROM categories
     WHERE lower(name) = lower($1)
     LIMIT 1`,
    [finalAiCategory]
  );

  catId = c.rows[0]?.id || null;
}

      const cat = catId
        ? (
            await query(
              `SELECT name
               FROM categories
               WHERE id = $1::int`,
              [catId]
            )
          ).rows[0]
        : null;

      const dept = cat
        ? await departmentForCategory(cat.name)
        : null;

      const dup = await findDuplicates({
        lat: Number(latitude),
        lng: Number(longitude),
        categoryId: catId,
        description
      });

      if (dup.length && !confirmedDuplicate) {
        return res.status(409).json({
          message:
            'Similar reports may already exist nearby. Review similar reports before continuing, then submit again if appropriate.',
          duplicates: dup
        });
      }

      const priority = [
        'Critical',
        'High',
        'Medium',
        'Low'
      ].includes(ai.severity)
        ? ai.severity
        : 'Medium';

      const publicId =
        'CF-' +
        Date.now()
          .toString()
          .slice(-6);

      const c = await query(
        `INSERT INTO complaints(
          public_id,
          citizen_id,
          department_id,
          category_id,
          description,
          ai_summary,
          ai_category,
          ai_priority,
          ai_analysis,
          final_priority,
          status,
          latitude,
          longitude,
          address,
          landmark
        )
        VALUES(
          $1,
          $2::uuid,
          $3::uuid,
          $4::int,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          'Reported',
          $11::double precision,
          $12::double precision,
          $13,
          $14
        )
        RETURNING *`,
        [
          publicId,
          req.user.id,
          dept?.id || null,
          catId,
          description,
          ai.problem_summary || null,
          finalAiCategory,
          ai.severity || null,
          JSON.stringify({
  text: ai,
  image: imageAi,
  final_category: finalAiCategory
}),
          priority,
          Number(latitude) || null,
          Number(longitude) || null,
          address || null,
          landmark || null
        ]
      );

      if (req.file) {
  await query(
    `INSERT INTO complaint_images(
      complaint_id,
      image_url,
      image_type,
      ai_analysis
    )
    VALUES(
      $1::bigint,
      $2,
      $3,
      $4
    )`,
    [
      c.rows[0].id,
      `/uploads/${req.file.filename}`,
      'problem',
      JSON.stringify(imageAi)
    ]
  );
}

      /*
      |--------------------------------------------------------------------------
      | CITIZEN STATUS HISTORY
      |--------------------------------------------------------------------------
      */
      await query(
        `INSERT INTO complaint_status_history(
          complaint_id,
          new_status,
          changed_by,
          remark
        )
        VALUES(
          $1::bigint,
          $2,
          $3::uuid,
          $4
        )`,
        [
          c.rows[0].id,
          'Reported',
          req.user.id,
          'Complaint submitted'
        ]
      );

      /*
      |--------------------------------------------------------------------------
      | DEPARTMENT NOTIFICATION
      |--------------------------------------------------------------------------
      */
      if (dept) {
        await query(
          `INSERT INTO notifications(
            department_id,
            title,
            message,
            type,
            complaint_id
          )
          VALUES(
            $1::uuid,
            $2,
            $3,
            $4,
            $5::bigint
          )`,
          [
            dept.id,
            `New complaint ${publicId}`,
            `A new civic report was routed to ${dept.name}.`,
            'assignment',
            c.rows[0].id
          ]
        );
      }

      res.status(201).json({
        complaint: c.rows[0],
        ai,
        duplicates: dup
      });

    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| MY REPORTS
|--------------------------------------------------------------------------
*/
r.get(
  '/my',
  auth,
  role('CITIZEN'),
  async (req, res, next) => {
    try {
      const q = await query(
        `SELECT
          c.*,
          cat.name AS category,
          d.name AS department
         FROM complaints c
         LEFT JOIN categories cat
           ON cat.id = c.category_id
         LEFT JOIN departments d
           ON d.id = c.department_id
         WHERE c.citizen_id = $1::uuid
         ORDER BY c.created_at DESC`,
        [req.user.id]
      );

      res.json(q.rows);

    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| SINGLE COMPLAINT
|--------------------------------------------------------------------------
*/
r.get(
  '/:id',
  auth,
  async (req, res, next) => {
    try {
      const q = await query(`
  SELECT
    c.*,
    cat.name AS category,
    d.name AS department,
    u.name AS citizen_name,
    u.email AS citizen_email,
    u.phone AS citizen_phone
  FROM complaints c
  LEFT JOIN categories cat
    ON cat.id = c.category_id
  LEFT JOIN departments d
    ON d.id = c.department_id
  JOIN users u
    ON u.id = c.citizen_id
  WHERE c.id = $1
`, [req.params.id]);

      if (!q.rowCount) {
        return res
          .status(404)
          .json({ message: 'Complaint not found' });
      }

      const c = q.rows[0];

      if (
        req.user.role === 'CITIZEN' &&
        c.citizen_id !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: 'Forbidden' });
      }

      if (
        req.user.role === 'DEPARTMENT' &&
        c.department_id !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: 'Forbidden' });
      }

      const [
        hist,
        img,
        remarks,
        resolution
      ] = await Promise.all([
        query(
          `SELECT *
           FROM complaint_status_history
           WHERE complaint_id = $1::bigint
           ORDER BY created_at`,
          [c.id]
        ),

        query(
          `SELECT *
           FROM complaint_images
           WHERE complaint_id = $1::bigint
           ORDER BY created_at`,
          [c.id]
        ),

        query(
          `SELECT *
           FROM department_remarks
           WHERE complaint_id = $1::bigint
           ORDER BY created_at DESC`,
          [c.id]
        ),

        query(
          `SELECT *
           FROM resolution_evidence
           WHERE complaint_id = $1::bigint
           ORDER BY created_at DESC`,
          [c.id]
        )
      ]);

      res.json({
        ...c,
        history: hist.rows,
        images: img.rows,
        remarks: remarks.rows,
        resolution: resolution.rows
      });

    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| DEPARTMENT UPDATE STATUS
|--------------------------------------------------------------------------
*/

r.patch(
  '/:id/status',
  auth,
  role('DEPARTMENT'),
  async (req, res, next) => {
    try {
      console.log('--- DEPARTMENT STATUS UPDATE ---');
      console.log('complaint id:', req.params.id);
      console.log('user id:', req.user.id);
      console.log('user role:', req.user.role);
      console.log('body:', req.body);

      // 1. Get complaint
      const old = await query(
        `SELECT
          status,
          department_id,
          citizen_id,
          public_id
         FROM complaints
         WHERE id = $1::bigint`,
        [req.params.id]
      );

      console.log('STEP 1 OK:', old.rows);

      if (!old.rowCount) {
        return res.status(404).json({
          message: 'Complaint not found'
        });
      }

      const c = old.rows[0];

      // 2. Check department ownership
      if (String(c.department_id) !== String(req.user.id)) {
        return res.status(403).json({
          message: 'This complaint does not belong to your department'
        });
      }

      console.log('STEP 2 OK: department owns complaint');

      const {
        status,
        remark,
        priority
      } = req.body;

      if (!status) {
        return res.status(400).json({
          message: 'Status is required'
        });
      }

      // 3. Update complaint
      await query(
        `UPDATE complaints
         SET
           status = $1::varchar,
           final_priority = COALESCE($2::varchar, final_priority),
           updated_at = now(),
           resolved_at =
             CASE
               WHEN $1::varchar = 'Resolved'
                 THEN now()
               WHEN $1::varchar = 'Reopened'
                 THEN NULL
               ELSE resolved_at
             END
         WHERE id = $3::bigint`,
        [
          status,
          priority || null,
          req.params.id
        ]
      );

      console.log('STEP 3 OK: complaint updated');

      // 4. Department history
      await query(
        `INSERT INTO complaint_status_history
        (
          complaint_id,
          old_status,
          new_status,
          changed_by_department,
          remark
        )
        VALUES
        (
          $1::bigint,
          $2::varchar,
          $3::varchar,
          $4::uuid,
          $5::text
        )`,
        [
          req.params.id,
          c.status,
          status,
          req.user.id,
          remark || null
        ]
      );

      console.log('STEP 4 OK: history inserted');

      // 5. Citizen notification
      await query(
        `INSERT INTO notifications
        (
          user_id,
          title,
          message,
          type,
          complaint_id
        )
        VALUES
        (
          $1::uuid,
          $2::varchar,
          $3::text,
          $4::varchar,
          $5::bigint
        )`,
        [
          c.citizen_id,
          `Complaint ${c.public_id} updated`,
          `Status changed to ${status}.`,
          'status',
          req.params.id
        ]
      );

      console.log('STEP 5 OK: notification inserted');

      res.json({
        message: 'Updated'
      });

    } catch (e) {
      console.error('DEPARTMENT STATUS ERROR:', e);
      next(e);
    }
  }
);


/*
|--------------------------------------------------------------------------
| DEPARTMENT REMARK
|--------------------------------------------------------------------------
*/
r.post(
  '/:id/remarks',
  auth,
  role('DEPARTMENT'),
  async (req, res, next) => {
    try {
      const c = (
        await query(
          `SELECT department_id
           FROM complaints
           WHERE id = $1::bigint`,
          [req.params.id]
        )
      ).rows[0];

      if (
        !c ||
        String(c.department_id) !== String(req.user.id)
      ) {
        return res
          .status(403)
          .json({ message: 'Forbidden' });
      }

      await query(
        `INSERT INTO department_remarks(
          complaint_id,
          department_id,
          remark
        )
        VALUES(
          $1::bigint,
          $2::uuid,
          $3
        )`,
        [
          req.params.id,
          req.user.id,
          req.body.remark
        ]
      );

      res.json({
        message: 'Remark added'
      });

    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| DEPARTMENT RESOLUTION
|--------------------------------------------------------------------------
*/
r.post(
  '/:id/resolution',
  auth,
  role('DEPARTMENT'),
  upload.single('image'),
  async (req, res, next) => {
    try {
      const c = (
        await query(
          `SELECT *
           FROM complaints
           WHERE id = $1::bigint`,
          [req.params.id]
        )
      ).rows[0];

      if (
        !c ||
        String(c.department_id) !== String(req.user.id)
      ) {
        return res
          .status(403)
          .json({ message: 'Forbidden' });
      }

      await query(
        `INSERT INTO resolution_evidence(
          complaint_id,
          department_id,
          image_url,
          description
        )
        VALUES(
          $1::bigint,
          $2::uuid,
          $3,
          $4
        )`,
        [
          c.id,
          req.user.id,
          req.file
            ? `/uploads/${req.file.filename}`
            : null,
          req.body.description ||
            'Resolution evidence'
        ]
      );

      await query(
        `UPDATE complaints
         SET
           status = 'Resolved',
           resolved_at = now(),
           updated_at = now()
         WHERE id = $1::bigint`,
        [c.id]
      );

      /*
      |--------------------------------------------------------------------------
      | Resolution history
      |--------------------------------------------------------------------------
      */
      await query(
        `INSERT INTO complaint_status_history(
          complaint_id,
          old_status,
          new_status,
          changed_by_department,
          remark
        )
        VALUES(
          $1::bigint,
          $2,
          'Resolved',
          $3::uuid,
          $4
        )`,
        [
          c.id,
          c.status,
          req.user.id,
          'Resolution recorded'
        ]
      );

      /*
      |--------------------------------------------------------------------------
      | Notify citizen
      |--------------------------------------------------------------------------
      */
      await query(
        `INSERT INTO notifications(
          user_id,
          title,
          message,
          type,
          complaint_id
        )
        VALUES(
          $1::uuid,
          $2,
          $3,
          $4,
          $5::bigint
        )`,
        [
          c.citizen_id,
          `Complaint ${c.public_id} resolved`,
          'The department marked your complaint as resolved.',
          'resolved',
          c.id
        ]
      );

      res.json({
        message: 'Resolution recorded'
      });

    } catch (e) {
      next(e);
    }
  }
);

/*
|--------------------------------------------------------------------------
| CITIZEN CONFIRM / REOPEN
|--------------------------------------------------------------------------
*/
r.post(
  '/:id/confirm',
  auth,
  role('CITIZEN'),
  async (req, res, next) => {
    try {
      const c = (
        await query(
          `SELECT
            citizen_id,
            public_id,
            status
           FROM complaints
           WHERE id = $1::bigint`,
          [req.params.id]
        )
      ).rows[0];

      if (
        !c ||
        String(c.citizen_id) !== String(req.user.id)
      ) {
        return res
          .status(403)
          .json({ message: 'Forbidden' });
      }

      const confirmed =
        Boolean(req.body.confirmed);

      const status = confirmed
        ? 'Citizen Confirmed'
        : 'Reopened';

      await query(
        `UPDATE complaints
         SET
           status = $1,
           citizen_confirmation = $2,
           updated_at = now()
         WHERE id = $3::bigint`,
        [
          status,
          confirmed
            ? 'confirmed'
            : 'reopened',
          req.params.id
        ]
      );

      await query(
        `INSERT INTO complaint_status_history(
          complaint_id,
          old_status,
          new_status,
          changed_by,
          remark
        )
        VALUES(
          $1::bigint,
          $2,
          $3,
          $4::uuid,
          $5
        )`,
        [
          req.params.id,
          c.status,
          status,
          req.user.id,
          confirmed
            ? 'Citizen confirmed resolution'
            : 'Citizen reported issue still exists'
        ]
      );

      /*
      |--------------------------------------------------------------------------
      | If citizen reopens, notify department
      |--------------------------------------------------------------------------
      */
      if (!confirmed) {
        const dept = (
          await query(
            `SELECT department_id
             FROM complaints
             WHERE id = $1::bigint`,
            [req.params.id]
          )
        ).rows[0];

        if (dept?.department_id) {
          await query(
            `INSERT INTO notifications(
              department_id,
              title,
              message,
              type,
              complaint_id
            )
            VALUES(
              $1::uuid,
              $2,
              $3,
              $4,
              $5::bigint
            )`,
            [
              dept.department_id,
              `Complaint ${c.public_id} reopened`,
              'The citizen reported that the issue still exists.',
              'reopened',
              req.params.id
            ]
          );
        }
      }

      res.json({
        message: status
      });

    } catch (e) {
      next(e);
    }
  }
);

export default r;
