
import { query } from '../db.js';

const rules = {
  'Pothole / Road Damage': 'ROADS',
  'Damaged Sidewalk': 'ROADS',
  'Damaged Road Sign': 'ROADS',
  'Broken Streetlight': 'ELECTRICAL',
  'Garbage Overflow': 'SANITATION',
  'Water Leakage': 'WATER',
  'Fallen Tree': 'PARKS',
  'Damaged Public Property': 'PUBLIC_WORKS',
  'Drainage Problem': 'WATER',
  'Other': 'MUNICIPAL'
};

function normalize(s = '') {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ');
}

/*
  Duplicate detection:

  - Same category
  - Within 100 meters
  - Reported within the last 90 days
  - Description must have at least 2 matching meaningful words

  IMPORTANT:
  The citizen/user is NOT considered here.

  Therefore:
  Citizen A reports a water leak.
  Citizen B reports the same water leak nearby.
  -> B can be flagged as a possible duplicate.
*/

export async function findDuplicates({
  lat,
  lng,
  categoryId,
  description
}) {
  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lng))
  ) {
    return [];
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  /*
    Approximate bounding box first.

    0.001 degrees latitude is approximately 111 meters.

    We use 0.0015 degrees as a safe search box,
    then calculate the actual distance in meters below.
  */

  const r = await query(
    `
    SELECT
      c.id,
      c.public_id,
      c.status,
      c.description,
      c.latitude,
      c.longitude,
      cat.name AS category,

      (
        6371000 * acos(
          LEAST(
            1,
            GREATEST(
              -1,
              cos(radians($1))
              * cos(radians(c.latitude))
              * cos(radians(c.longitude) - radians($2))
              + sin(radians($1))
              * sin(radians(c.latitude))
            )
          )
        )
      ) AS distance_meters

    FROM complaints c

    LEFT JOIN categories cat
      ON cat.id = c.category_id

    WHERE c.created_at > now() - interval '90 days'

      AND c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL

      -- Small bounding box for performance
      AND c.latitude BETWEEN $1 - 0.0015
                         AND $1 + 0.0015

      AND c.longitude BETWEEN $2 - 0.0015
                          AND $2 + 0.0015

      -- Same category only
      AND (
        $3::int IS NULL
        OR c.category_id = $3::int
      )

    ORDER BY c.created_at DESC

    LIMIT 50
    `,
    [
      latitude,
      longitude,
      categoryId != null
        ? Number(categoryId)
        : null
    ]
  );

  const words = new Set(
    normalize(description)
      .split(/\s+/)
      .filter(word => word.length > 4)
  );

  return r.rows.filter(report => {
    const distance = Number(
      report.distance_meters
    );

    /*
      REAL 100-METER CHECK
    */
    if (
      !Number.isFinite(distance) ||
      distance > 100
    ) {
      return false;
    }

    /*
      Compare meaningful description words.
    */
    const reportWords = normalize(
      report.description
    )
      .split(/\s+/)
      .filter(word => word.length > 4);

    const overlap = reportWords.filter(
      word => words.has(word)
    ).length;

    return overlap >= 2;
  });
}

export function routeCategory(name) {
  return rules[name] || 'MUNICIPAL';
}

export async function departmentForCategory(name) {
  const code = routeCategory(name);

  const r = await query(
    `
    SELECT id, name
    FROM departments
    WHERE code = $1
      AND active = true
    LIMIT 1
    `,
    [code]
  );

  return r.rows[0] || null;
}
