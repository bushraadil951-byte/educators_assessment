import { db, json } from './_shared.mjs';

export const handler = async () => {
  try {
    const sql = db();
    const tests = await sql`
      SELECT test_id, to_char(test_date, 'YYYY-MM-DD') AS date,
             max_ib_lp::float8 AS max_ib_lp, max_isp_lp::float8 AS max_isp_lp, max_ib_doc::float8 AS max_ib_doc
      FROM tests ORDER BY test_date, test_id`;
    const marks = await sql`
      SELECT test_id, teacher, ib_lp::float8 AS ib_lp, isp_lp::float8 AS isp_lp, ib_doc::float8 AS ib_doc
      FROM test_marks ORDER BY teacher`;
    return json(200, { tests, marks });
  } catch (error) {
    console.error('data endpoint:', error);
    return json(500, { error: 'Could not load marks. Check DATABASE_URL and that schema.sql has been run.' });
  }
};
