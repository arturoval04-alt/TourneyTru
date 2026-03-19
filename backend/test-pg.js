const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

const client = new Client({
  connectionString: connectionString,
});

async function test() {
  try {
    console.log('Testing with pg library...');
    await client.connect();
    console.log('✅ Connection successful with pg!');
    const res = await client.query('SELECT NOW()');
    console.log('Time from DB:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed with pg:', err.message);
  }
}

test();
