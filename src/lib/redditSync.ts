import { supabase } from './supabase';
import { redditApi } from './redditApi';

/**
 * Syncs posts from a Reddit account to the database.
 * This function follows these steps:
 * 1. Checks if a sync is needed based on last sync time
 * 2. Fetches new posts from Reddit API
 * 3. Ensures all referenced subreddits exist in the database
 * 4. Stores the posts in the database with today's date
 * 5. Updates account statistics
 */
export async function syncRedditAccountPosts(accountId: string): Promise<void> {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting sync for Reddit account ID: ${accountId}`);
  
  try {
    // First, check if we need to update this account at all
    const { data: account, error: accountError } = await supabase
      .from('reddit_accounts')
      .select('username, last_post_sync')
      .eq('id', accountId)
      .single();

    if (accountError) {
      console.error(`Error fetching account ${accountId}:`, accountError);
      throw accountError;
    }
    
    if (!account) {
      console.error(`Account ${accountId} not found`);
      throw new Error('Account not found');
    }

    console.log(`Syncing posts for u/${account.username}`);

    // Get full account details
    const { data: fullAccount, error: fullAccountError } = await supabase
      .from('reddit_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (fullAccountError) throw fullAccountError;
    if (!fullAccount) throw new Error('Account details not found');

    // Set up the API client with the account's credentials
    await redditApi.setAccountAuth(accountId);

    // Fetch posts from Reddit (limited to 25 for efficiency)
    console.log(`Fetching posts for u/${account.username} from Reddit API...`);
    const posts = await redditApi.getUserPosts(
      account.username,
      'new'
    );

    // Limit to 25 most recent posts
    const limitedPosts = posts.slice(0, 25);
    console.log(`Retrieved ${limitedPosts.length} posts for u/${account.username} from Reddit API`);

    if (limitedPosts.length === 0) {
      console.log(`No posts found for u/${account.username}, updating last_post_sync time only`);
      await supabase
        .from('reddit_accounts')
        .update({ last_post_sync: new Date().toISOString() })
        .eq('id', accountId);
      return;
    }

    // Get subreddit IDs for these posts
    const subredditNames = [...new Set(limitedPosts.map(post => post.subreddit))];
    console.log(`Found posts from ${subredditNames.length} unique subreddits:`, subredditNames);
    
    // Process subreddits - ensure they exist in the database
    await processSyncSubreddits(subredditNames);
    
    // Now get all the subreddit IDs
    const { data: subreddits, error: subredditError } = await supabase
      .from('subreddits')
      .select('id, name')
      .in('name', subredditNames);

    if (subredditError) {
      console.error(`Error fetching subreddits:`, subredditError);
      throw subredditError;
    }

    console.log(`Found ${subreddits.length} subreddits in the database`);
    if (subreddits.length < subredditNames.length) {
      console.warn(`Warning: Not all subreddits were found in the database. Expected ${subredditNames.length}, got ${subreddits.length}`);
    }

    // Create map of subreddit names to IDs
    const subredditMap = new Map(
      subreddits.map(s => [s.name.toLowerCase(), s.id])
    );

    // Prepare all posts for database - don't filter based on existing posts
    const postsToUpsert = limitedPosts
      .map(post => {
        // Use the actual Reddit post creation date
        const postDate = new Date(post.created_utc * 1000);
        
        return {
          reddit_account_id: accountId,
          subreddit_id: subredditMap.get(post.subreddit.toLowerCase()),
          post_id: post.id,
          created_at: postDate.toISOString(), // Use original post date
          title: post.title,
          url: post.url,
          selftext: post.selftext,
          score: post.score,
          num_comments: post.num_comments,
          thumbnail: post.thumbnail,
          preview_url: post.preview_url
        };
      })
      .filter(post => post.subreddit_id); // Only keep posts with valid subreddit IDs

    console.log(`Prepared ${postsToUpsert.length} posts for database insertion/update`);
    
    // Display the first post for debugging
    if (postsToUpsert.length > 0) {
      const firstPost = postsToUpsert[0];
      console.log("Sample post data:", {
        reddit_account_id: firstPost.reddit_account_id,
        subreddit_id: firstPost.subreddit_id,
        post_id: firstPost.post_id,
        created_at: firstPost.created_at,
        title: firstPost.title
      });
    }

    // Insert posts 
    const { error: insertError } = await supabase
      .from('reddit_posts')
      .upsert(postsToUpsert, {
        onConflict: 'reddit_account_id,post_id',
        ignoreDuplicates: false
      });

    if (insertError) {
      console.error('Error upserting posts:', insertError);
      throw insertError;
    }
    
    console.log(`Successfully inserted ${postsToUpsert.length} posts to database`);

    // Update account stats
    const { error: updateError } = await supabase
      .from('reddit_accounts')
      .update({
        last_post_sync: new Date().toISOString(),
        total_posts: limitedPosts.length,
        posts_today: limitedPosts.filter(post => {
          const postDate = new Date(post.created_utc * 1000);
          const today = new Date();
          return postDate.toDateString() === today.toDateString();
        }).length,
        karma_score: limitedPosts.length > 0 ? limitedPosts[0].post_karma || fullAccount.karma_score : fullAccount.karma_score
      })
      .eq('id', accountId);

    if (updateError) throw updateError;
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Sync completed successfully for u/${account.username} in ${duration}s`);
  } catch (err) {
    console.error('Error syncing Reddit account posts:', err);
    throw err;
  }
}

/**
 * Processes and ensures all subreddits exist in the database
 */
async function processSyncSubreddits(subredditNames: string[]): Promise<void> {
  try {
    // Check which subreddits already exist
    const { data: existingSubreddits } = await supabase
      .from('subreddits')
      .select('name')
      .in('name', subredditNames);
      
    const existingSubredditSet = new Set((existingSubreddits || []).map(s => s.name.toLowerCase()));
    const missingSubreddits = subredditNames.filter(name => !existingSubredditSet.has(name.toLowerCase()));
    
    if (missingSubreddits.length > 0) {
      console.log(`Need to create ${missingSubreddits.length} missing subreddits:`, missingSubreddits);
      
      // Create missing subreddits one by one to maximize success
      for (const name of missingSubreddits) {
        try {
          const subredditInfo = await redditApi.getSubredditInfo(name);
          
          // Try to insert the subreddit
          const { error } = await supabase
            .from('subreddits')
            .insert({
              name: subredditInfo.name,
              subscriber_count: subredditInfo.subscribers,
              active_users: subredditInfo.active_users,
              icon_img: subredditInfo.icon_img,
              community_icon: subredditInfo.community_icon,
              created_at: new Date(subredditInfo.created_utc * 1000).toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (error) {
            console.error(`Error creating subreddit ${name}:`, error);
            
            // Try with minimal data if there's an error
            const { error: minimalError } = await supabase
              .from('subreddits')
              .insert({
                name: name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (minimalError) {
              console.error(`Error creating minimal subreddit ${name}:`, minimalError);
            } else {
              console.log(`Created minimal subreddit: ${name}`);
            }
          } else {
            console.log(`Created subreddit: ${name}`);
          }
        } catch (err) {
          console.error(`Error processing subreddit ${name}:`, err);
          
          // Try to create a minimal entry if API fetch fails
          try {
            const { error } = await supabase
              .from('subreddits')
              .insert({
                name: name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (error) {
              console.error(`Error creating fallback subreddit ${name}:`, error);
            } else {
              console.log(`Created fallback subreddit: ${name}`);
            }
          } catch (fallbackErr) {
            console.error(`Fallback subreddit creation failed for ${name}:`, fallbackErr);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error processing subreddits:', err);
    throw err;
  }
}

export async function syncAllRedditAccounts(): Promise<void> {
  try {
    // Get accounts that need syncing
    const { data: accounts, error: accountError } = await supabase
      .from('reddit_accounts')
      .select('id')
      .lt('last_post_sync', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // 5 minutes ago

    if (accountError) throw accountError;
    if (!accounts) return;

    // Sync each account
    await Promise.all(
      accounts.map(account => syncRedditAccountPosts(account.id))
    );
  } catch (err) {
    console.error('Error syncing all Reddit accounts:', err);
    throw err;
  }
}

// Check if database needs migration and execute if needed
export async function ensureRedditPostsSchema(): Promise<boolean> {
  try {
    // Check if we have a title column, which would indicate the newer schema
    const { data, error } = await supabase
      .from('reddit_posts')
      .select('id, title')
      .limit(1);
      
    if (error) {
      // Check if the error is specifically about a missing column
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('Missing columns in reddit_posts table, need to run migrations');
        return false;
      }
      throw error;
    }

    // If we got here, the table exists with the title column
    console.log('Reddit posts table exists with title column, proceeding with sync');
    return true;
  } catch (err) {
    console.error('Error checking reddit_posts schema:', err);
    return false;
  }
}