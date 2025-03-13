#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Handle ESM module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Path to migration file
const migrationFilePath = path.resolve(__dirname, '../migrations/create_special_user_function.sql');

async function runMigration() {
  try {
    console.log('Running create_special_user function migration...');
    
    // Read and execute the migration SQL file
    const migrationSQL = fs.readFileSync(migrationFilePath, 'utf8');
    
    // Execute the SQL using Supabase's RPC capabilities
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Successfully created create_special_user function');
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

// Check if the exec_sql function exists first; if not, create it
async function ensureExecSqlFunction() {
  try {
    // Check if function exists by trying to call it with empty SQL
    const { error } = await supabase.rpc('exec_sql', { sql: '-- test' });
    
    // If the function doesn't exist, we'll get a specific error
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('Creating exec_sql function...');
      
      // Create the exec_sql function
      const { error: createError } = await supabase.sql(`
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
        
        -- Grant execute permission to authenticated users
        GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;
      `);
      
      if (createError) {
        throw createError;
      }
      
      console.log('✅ Created exec_sql function');
    } else if (error) {
      // Some other error occurred
      console.warn('Warning: exec_sql may not be available:', error);
    } else {
      console.log('✅ exec_sql function already exists');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up exec_sql function:', error);
    return false;
  }
}

// Main function to run everything
async function main() {
  const execSqlReady = await ensureExecSqlFunction();
  
  if (execSqlReady) {
    await runMigration();
  } else {
    console.error('Unable to run migration: exec_sql function is not available.');
    process.exit(1);
  }
}

main(); 