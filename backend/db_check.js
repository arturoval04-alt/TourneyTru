const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient('https://imwcaojhxsgdwvofagbe.supabase.co', 'sb_publishable_DBile_ss4Cs09sLkN03cWg_2gw4ODGj');

async function debug() {
  const { data: tourns, error } = await supabase.from('tournaments').select('*');
  if (!tourns) {
     console.log('Error', error);
     return;
  }
  
  const id = tourns[0].id;
  
  // Attempt to update
  const { data, error: updateError } = await supabase
    .from('tournaments')
    .update({ description: 'Testing manual update' })
    .eq('id', id)
    .select('*');
    
  fs.writeFileSync('db_check.json', JSON.stringify({
    success: updateError === null,
    updated_data: data,
    error: updateError
  }, null, 2));
}

debug();
