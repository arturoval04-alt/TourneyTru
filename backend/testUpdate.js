const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient('https://imwcaojhxsgdwvofagbe.supabase.co', 'sb_publishable_DBile_ss4Cs09sLkN03cWg_2gw4ODGj');

async function testUpdate() {
  const { data: tourns } = await supabase.from('tournaments').select('*').limit(1);
  const id = tourns[0].id;
  
  const { data, error, count } = await supabase
    .from('tournaments')
    .update({ name: tourns[0].name + ' Test' })
    .eq('id', id)
    .select('*');
    
  fs.writeFileSync('output.json', JSON.stringify({ data, error, count }, null, 2));
}
testUpdate().catch(console.error);
