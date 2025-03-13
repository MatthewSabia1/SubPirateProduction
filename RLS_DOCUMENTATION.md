# Row-Level Security Implementation for SubPirate

This document details the implementation of Row-Level Security (RLS) in SubPirate to ensure proper data isolation between users.

## Overview

Row-Level Security restricts the rows a user can access in a database table based on their identity. We've implemented RLS policies to ensure users can only access:

1. Their own saved subreddits
2. Their own projects
3. Projects they've been invited to as members
4. Their own Reddit accounts and associated data

## Compatibility with Existing Database

This implementation builds upon the RLS policies already present in your database. The script:

- Safely checks if RLS is already enabled before enabling it on tables
- Only creates policies if they don't already exist
- Uses conditional logic (DO blocks with IF EXISTS checks) to avoid conflicts
- Preserves existing policies for user_usage_stats, profiles, and other tables

## RLS Policies Implemented

### Saved Subreddits
- Users can only view, insert, update, or delete their own saved subreddits
- The `saved_subreddits_with_icons` view now respects these permissions

### Projects
- Users can view their own projects (where user_id = auth.uid())
- Users can view projects they are members of (via project_members table)
- Users can only insert, update, or delete their own projects

### Project Members
- Project owners can view, add, update, or remove members
- Users can view their own project memberships

### Project Subreddits
- Users can view subreddits for projects they're members of
- Only project owners and editors can add, update, or remove subreddits from projects

### Reddit Accounts
- Users can only view, insert, update, or delete their own Reddit accounts

### Reddit Posts
- Users can only view posts from their own Reddit accounts

## Helper Functions

Several helper functions have been created to support RLS policies:

1. `user_has_project_access(project_uuid UUID)` - Checks if a user has access to a specific project
2. `get_project_role(project_uuid UUID)` - Returns a user's role in a project
3. `get_accessible_projects()` - Returns a list of project IDs a user has access to

## How Application Code Works with RLS

The application code has been verified to work properly with these RLS policies:

1. The application fetches data without explicit user_id filtering since RLS handles this automatically
2. Special views have been created to ensure complex queries respect RLS

## Testing RLS Policies

A test script `updated_test_rls_permissions.sql` has been provided to verify RLS policies are working correctly. To test:

1. Log in to the Supabase dashboard
2. Go to the SQL Editor
3. Run the test script, replacing `'actual-user-uuid'` with a real user ID from your database
4. Verify that users can only see their own data

You can test with different user sessions to confirm data isolation is working properly.

## Implementation

The implementation is done through a single consolidated SQL script:

1. `consolidated_rls_implementation.sql` - Safely adds RLS policies to all tables without breaking existing functionality

## Troubleshooting

If you experience issues with data access:

1. Check that all tables have RLS enabled (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`)
2. Verify policies are correctly defined for all operations (SELECT, INSERT, UPDATE, DELETE)
3. For complex queries, consider creating views that respect RLS
4. Use the `auth.uid()` function to get the current user's ID in SQL
5. Run the test script to check if RLS is working as expected 