import { db, json, parseBody, requireAdmin } from './_shared.mjs';

// blank -> null (not attempted), number >= 0 -> number, anything else -> NaN
const mark = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export const handler = async (event) => {
  if (!requireAdmin(event)) return json(401, { error: 'Please sign in as administrator first.' });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  const body = parseBody(event);
  try {
    const sql = db();

    if (body.action === 'import') {
      const id = String(body.assessment_id || '').trim();
      const date = String(body.date || '');
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const maxes = [body.max_ib_lp, body.max_isp_lp, body.max_ib_doc].map(v =>
        v === null || v === undefined || String(v).trim() === '' ? null : Number(v));
      const labels = ['IB-LP', 'ISP-LP', 'IB Document'];

      if (!id || id.length > 40) return json(400, { error: 'Enter an assessment ID (maximum 40 characters).' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(400, { error: 'Choose a valid date.' });
      if (maxes.some(m => m !== null && (!Number.isFinite(m) || m <= 0))) return json(400, { error: 'A maximum score must be a number above 0, or left blank.' });
      if (maxes.every(m => m === null)) return json(400, { error: 'Enter a maximum score for at least one of IB-LP, ISP-LP or IB Document.' });
      if (!rows.length) return json(400, { error: 'The CSV has no teacher rows.' });
      if (rows.length > 500) return json(400, { error: 'Too many rows (maximum 500).' });

      const teachers = [], a = [], b = [], c = [];
      const seen = new Set();
      for (const [i, r] of rows.entries()) {
        const name = String(r.teacher || '').trim().replace(/\s+/g, ' ');
        if (!name || name.length > 120) return json(400, { error: `Row ${i + 1}: teacher name is missing or too long.` });
        if (seen.has(name.toLowerCase())) return json(400, { error: `Row ${i + 1}: "${name}" appears twice.` });
        seen.add(name.toLowerCase());
        const vals = [mark(r.ib_lp), mark(r.isp_lp), mark(r.ib_doc)];
        for (let k = 0; k < 3; k++) {
          if (Number.isNaN(vals[k])) return json(400, { error: `Row ${i + 1} (${name}): ${labels[k]} mark must be a number (or blank).` });
          if (vals[k] !== null && maxes[k] === null) return json(400, { error: `Row ${i + 1} (${name}): ${labels[k]} has no maximum score, so its column must be blank.` });
          if (vals[k] !== null && vals[k] > maxes[k]) return json(400, { error: `Row ${i + 1} (${name}): ${labels[k]} mark ${vals[k]} is above the maximum ${maxes[k]}.` });
        }
        teachers.push(name); a.push(vals[0]); b.push(vals[1]); c.push(vals[2]);
      }

      // Re-importing an existing ID replaces it (its marks are removed with it).
      const [removed] = await sql.transaction([
        sql`DELETE FROM tests WHERE test_id = ${id} RETURNING 1`,
        sql`INSERT INTO tests (test_id, test_date, max_ib_lp, max_isp_lp, max_ib_doc)
            VALUES (${id}, ${date}::date, ${maxes[0]}, ${maxes[1]}, ${maxes[2]})`,
        sql`INSERT INTO test_marks (test_id, teacher, ib_lp, isp_lp, ib_doc)
            SELECT ${id}::text, x.teacher, x.ib_lp, x.isp_lp, x.ib_doc
            FROM unnest(${teachers}::text[], ${a}::numeric[], ${b}::numeric[], ${c}::numeric[])
                 AS x(teacher, ib_lp, isp_lp, ib_doc)`
      ]);
      return json(200, { ok: true, imported: teachers.length, replaced: removed.length > 0 });
    }

    if (body.action === 'deleteAssessment') {
      const id = String(body.assessment_id || '').trim();
      if (!id) return json(400, { error: 'Enter an assessment ID.' });
      const removed = await sql`DELETE FROM tests WHERE test_id = ${id} RETURNING 1`;
      return json(200, { ok: true, deleted: removed.length });
    }

    if (body.action === 'deleteTeacher') {
      const name = String(body.teacher || '').trim();
      if (!name) return json(400, { error: 'Select a teacher.' });
      const removed = await sql`DELETE FROM test_marks WHERE teacher = ${name} RETURNING 1`;
      return json(200, { ok: true, deleted: removed.length });
    }

    return json(400, { error: 'Unknown action.' });
  } catch (error) {
    console.error('manage endpoint:', error);
    return json(500, { error: 'Could not save. Check that schema.sql has been run in Neon.' });
  }
};
