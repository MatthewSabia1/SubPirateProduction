/**
 * Script to apply the fix_profile_subscription_error.sql migration to Supabase
 * 
 * This script reads the migration file and executes it using the Supabase
 * client's rpc function to run SQL commands.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and key from environment or configure here
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-role-key';

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseKey);

// Path to the migration file
const migrationPath = path.join(__dirname, '..', 'migrations', 'fix_profile_subscription_error.sql');

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration to Supabase...');
    
    // Option 1: If exec_sql function exists in your database
    const { error: execError } = await supabase.rpc('exec_sql', { sql });
    
    if (execError) {
      console.error('Error using exec_sql function:', execError);
      
      // Option 2: Fall back to direct SQL execution if available
      console.log('Trying direct SQL execution...');
      const { error: sqlError } = await supabase.sql(sql);
      
      if (sqlError) {
        console.error('Error executing SQL directly:', sqlError);
        throw new Error('Failed to apply migration');
      } else {
        console.log('✅ Migration applied successfully via direct SQL execution');
      }
    } else {
      console.log('✅ Migration applied successfully via exec_sql function');
    }
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration function
applyMigration(); 