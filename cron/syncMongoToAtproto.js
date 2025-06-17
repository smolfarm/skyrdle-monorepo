// Script to sync MongoDB game data with AT Protocol PDS PLAYER_SCORE_COLLECTION
const { AtpAgent } = require('@atproto/api');
const crypto = require('crypto');

// Constants
const PLAYER_SCORE_COLLECTION = 'farm.smol.games.skyrdle.player.score'
const SYNC_INTERVAL_MS = 3600000 // Run every hour (3600000 ms)

// This module will use the Game model from the main server
let Game = null;

// Initialize AT Protocol agent
const agent = new AtpAgent({
  service: 'https://bsky.social'
})

// Flag to track if we're already running a sync to prevent overlapping syncs
let isSyncRunning = false

// Function to authenticate with AT Protocol
async function authenticateWithAtproto() {
  try {
    // Check if we have credentials
    if (!process.env.ATPROTO_SERVER_HANDLE || !process.env.ATPROTO_SERVER_APP_PASSWORD) {
      console.error('Missing AT Protocol credentials in environment variables');
      console.error('Please set ATPROTO_SERVER_HANDLE and ATPROTO_SERVER_APP_PASSWORD');
      return false;
    }

    console.log(`Attempting to authenticate as ${process.env.ATPROTO_SERVER_HANDLE}...`);
    
    const res = await agent.api.com.atproto.server.createSession({
      identifier: process.env.ATPROTO_SERVER_HANDLE,
      password: process.env.ATPROTO_SERVER_APP_PASSWORD
    });
    
    // Set the session on the agent
    agent.session = {
      accessJwt: res.data.accessJwt,
      refreshJwt: res.data.refreshJwt,
      handle: res.data.handle,
      did: res.data.did,
      email: res.data.email
    };
    
    console.log(`Successfully authenticated as ${res.data.handle} (${res.data.did})`);
    return true;
  } catch (error) {
    if (error.status === 401) {
      console.error('Authentication failed: Invalid credentials');
    } else {
      console.error('AT Protocol authentication error:', error);
    }
    return false;
  }
}

// Function to save score to AT Protocol
async function saveScoreToAtproto(did, gameNumber, score, guesses) {
  try {
    const isWin = score >= 0;
    const recordHash = crypto.createHash('sha256').update(`${did}|${gameNumber}|${score}`).digest('hex');
    
    // Make sure we have a valid session and DID
    if (!agent.session || !agent.session.did) {
      console.log('No valid session found, re-authenticating...');
      await authenticateWithAtproto();
      if (!agent.session || !agent.session.did) {
        throw new Error('Failed to authenticate with AT Protocol');
      }
    }
    
    // Format guesses to match the expected structure
    const formattedGuesses = guesses.map(g => ({
      letters: g.letters,
      evaluation: g.evaluation
    }));
    
    console.log(`Saving score for ${did}, game ${gameNumber}: ${score}`);
    
    await agent.com.atproto.repo.createRecord({
      repo: agent.session.did,
      collection: PLAYER_SCORE_COLLECTION,
      rkey: recordHash,
      record: {
        playerDid: did,
        gameNumber,
        score,
        timestamp: new Date().toISOString(),
        hash: recordHash,
        isWin
      }
    });
    
    console.log(`Successfully saved score for ${did}, game ${gameNumber}`);
    return true;
  } catch (error) {
    // Handle token expiry
    if (error.error === 'ExpiredToken') {
      try {
        console.log('Token expired, refreshing...');
        const res = await agent.api.com.atproto.server.refreshSession({
          refreshJwt: agent.session.refreshJwt
        });
        
        agent.session = {
          ...agent.session,
          accessJwt: res.data.accessJwt,
          refreshJwt: res.data.refreshJwt
        };
        
        // Retry with refreshed token
        return await saveScoreToAtproto(did, gameNumber, score, guesses);
      } catch (refreshError) {
        console.error('Failed to refresh AT Protocol session:', refreshError);
        // Re-authenticate if refresh fails
        await authenticateWithAtproto();
        return await saveScoreToAtproto(did, gameNumber, score, guesses);
      }
    } else if (error.status === 401) {
      console.log('Authentication error, re-authenticating...');
      await authenticateWithAtproto();
      return await saveScoreToAtproto(did, gameNumber, score, guesses);
    }
    
    console.error(`Error saving score for ${did}, game ${gameNumber}:`, error);
    return false;
  }
}

// Main sync function
async function syncMongoToAtproto() {
  // Prevent overlapping sync operations
  if (isSyncRunning) {
    console.log('Sync already in progress, skipping this run');
    return;
  }
  
  isSyncRunning = true;
  console.log(`Starting sync at ${new Date().toISOString()}`);
  
  try {
    // Check if Game model is initialized
    if (!Game) {
      console.error('Game model not initialized. Make sure to call initSync() first.');
      isSyncRunning = false;
      return;
    }
    
    // Authenticate with AT Protocol
    const authSuccess = await authenticateWithAtproto();
    if (!authSuccess) {
      console.error('Failed to authenticate with AT Protocol. Aborting sync.');
      isSyncRunning = false;
      return;
    }
    
    // Find completed games (Won or Lost) that haven't been synced yet
    const gamesToSync = await Game.find({
      status: { $in: ['Won', 'Lost'] },
      syncedToAtproto: { $ne: true }
    });
    
    console.log(`Found ${gamesToSync.length} games to sync`);
    
    if (gamesToSync.length === 0) {
      console.log('No games to sync. All caught up!');
      isSyncRunning = false;
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // Process each game
    for (const game of gamesToSync) {
      try {
        // Calculate score: number of guesses if Won, -1 if Lost
        const score = game.status === 'Won' ? game.guesses.length : -1;
        
        // Save to AT Protocol
        const syncSuccess = await saveScoreToAtproto(
          game.did,
          game.gameNumber,
          score,
          game.guesses
        );
        
        if (syncSuccess) {
          // Mark as synced in MongoDB
          game.syncedToAtproto = true;
          await game.save();
          
          console.log(`✅ Successfully synced game ${game.gameNumber} for user ${game.did}`);
          successCount++;
        } else {
          // Attempt to fetch existing record to handle duplicates
          try {
            const recordHash = crypto.createHash('sha256')
              .update(`${game.did}|${game.gameNumber}|${game.status === 'Won' ? game.guesses.length : -1}`)
              .digest('hex');
            await agent.api.com.atproto.repo.getRecord({
              repo: agent.session.did,
              collection: PLAYER_SCORE_COLLECTION,
              rkey: recordHash,
            });
            console.log(`Record exists for ${game.did} game ${game.gameNumber}. Marking as synced.`);
            game.syncedToAtproto = true;
            await game.save();
            successCount++;
            continue;
          } catch (getErr) {
            console.error(`❌ Failed to sync game ${game.gameNumber} for user ${game.did}`, getErr);
            failCount++;
          }
        }
      } catch (gameError) {
        console.error(`❌ Error processing game ${game.gameNumber} for user ${game.did}:`, gameError);
        failCount++;
      }
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`Sync completed at ${new Date().toISOString()}`);
    console.log(`Summary: ${successCount} games synced successfully, ${failCount} failed`);
  } catch (error) {
    console.error('Error during sync process:', error);
  } finally {
    // Always reset the sync flag when done
    isSyncRunning = false;
  }
}

// Export functions for use in main server file
module.exports = {
  SYNC_INTERVAL_MS,
  initSync: (gameModel) => {
    Game = gameModel
    console.log('AT Protocol sync service initialized')
    return syncMongoToAtproto
  }
}
