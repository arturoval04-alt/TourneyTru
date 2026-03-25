const axios = require('axios');

async function verify() {
  const baseURL = 'http://localhost:3001/api';
  try {
    console.log('Fetching leagues...');
    const leaguesRes = await axios.get(`${baseURL}/leagues`);
    const league = leaguesRes.data[0];
    
    if (!league) {
      console.log('No leagues found in DB.');
      return;
    }

    console.log(`Testing with league: ${league.name} (${league.id})`);

    console.log('\nTesting GET /leagues/:id/tournaments...');
    const tournamentsRes = await axios.get(`${baseURL}/leagues/${league.id}/tournaments`);
    console.log(`Found ${tournamentsRes.data.length} tournaments.`);

    console.log('\nTesting GET /umpires?leagueId=...');
    const umpiresRes = await axios.get(`${baseURL}/umpires?leagueId=${league.id}`);
    console.log(`Found ${umpiresRes.data.length} umpires.`);

    console.log('\nSUCCESS: All endpoints returned 200.');
  } catch (err) {
    console.error('ERROR during verification:', err.response?.status, err.response?.data || err.message);
  }
}

verify();
