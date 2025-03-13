#!/usr/bin/env node

/**
 * Script to set a user role in the Supabase database
 * Usage: 
 *   node scripts/set-admin.js <user_email> [--remove]        # Set/remove admin role
 *   node scripts/set-admin.js <user_email> --gift [--remove] # Set/remove gift role
 * 
 * Examples:
 *   node scripts/set-admin.js user@example.com          # Add admin role
 *   node scripts/set-admin.js user@example.com --remove # Remove admin role (revert to regular user)
 *   node scripts/set-admin.js user@example.com --gift   # Add gift role
 *   node scripts/set-admin.js user@example.com --gift --remove # Remove gift role
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get command line arguments
const userEmail = process.argv[2];
const giftFlag = process.argv.includes('--gift');
const removeFlag = process.argv.includes('--remove');

if (!userEmail) {
  console.error('Error: User email is required');
  console.log('Usage:');
  console.log('  node scripts/set-admin.js <user_email> [--remove]        # Set/remove admin role');
  console.log('  node scripts/set-admin.js <user_email> --gift [--remove] # Set/remove gift role');
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase credentials not found in environment variables');
  console.log('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setUserRole() {
  try {
    // First, find the user by email
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', userEmail)
      .single();

    if (userError) {
      console.error('Error finding user:', userError.message);
      return;
    }

    if (!userData) {
      console.error(`User not found with email: ${userEmail}`);
      return;
    }

    const userId = userData.id;
    let role = 'user'; // Default role if removing
    
    if (!removeFlag) {
      // Set the specific role based on flags
      role = giftFlag ? 'gift' : 'admin';
    }
    
    // Use the set_user_role function we created in the migration
    const { error: updateError } = await supabase
      .rpc('set_user_role', { user_id: userId, new_role: role });

    if (updateError) {
      console.error('Error updating user role:', updateError.message);
      return;
    }

    // Format a nice message based on the action
    let actionMessage;
    if (removeFlag) {
      actionMessage = `removed from ${giftFlag ? 'gift' : 'admin'} status`;
    } else {
      actionMessage = `set as ${role}`;
    }
    
    console.log(`User ${userEmail} (${userId}) has been ${actionMessage}`);
    
    // Verify the change
    const { data: checkData, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (checkError) {
      console.error('Error verifying role change:', checkError.message);
      return;
    }

    console.log('Updated user profile:', checkData);

  } catch (error) {
    console.error('Exception setting user role:', error);
  }
}

// Execute the function
setUserRole().catch(console.error); 