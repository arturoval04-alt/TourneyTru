const { Client } = require('pg');
async function checkRLS() {
  const client = new Client({ connectionString: 'postgresql://postgres:Arete21120421@db.imwcaojhxsgdwvofagbe.supabase.co:5432/postgres' });
  await client.connect();
  const res = await client.query(`
  SELECT relrowsecurity FROM pg_class WHERE relname = 'tournaments';
  `);
  console.log('RLS Enabled:', res.rows[0].relrowsecurity);
  await client.end();
}
checkRLS().catch(console.error);
