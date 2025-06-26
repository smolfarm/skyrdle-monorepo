

function api(app, Game, Word, Player) {
    /**
     * Get the leaderboard
     */
    app.get('/api/leaderboard', async (req, res) => {
      console.log('Fetching leaderboard')

      const players = await Player.find().sort({ currentStreak: -1 })

      const data = players.map(player => ({
        did: player.did,
        currentStreak: player.currentStreak,
        gamesWon: player.gamesWon,
        averageScore: player.averageScore
      }))
      
      res.json(data)
    })

    /**
     * Get a player's stats
     * @param {string} did - The player's DID
     */
    app.get('/api/stats', async (req, res) => {
        console.log(`Fetching player stats for ${req.query.did}`)

        const { did } = req.query
        if (!did) return res.status(400).json({ error: 'Missing did' })
        try {
          const games = await Game.find({ did }).sort({ gameNumber: -1 })
          let streak = 0
      
          for (const game of games) {
            if (game.status === 'Won') streak++
            else break
          }
      
          const wins = games.filter(g => g.status === 'Won').length
          const winGames = games.filter(g => g.status === 'Won')
          const avg = winGames.length > 0
            ? winGames.reduce((sum, g) => sum + g.guesses.length, 0) / winGames.length
            : 0
      
          res.json({ currentStreak: streak, gamesWon: wins, averageScore: avg })
        } catch (err) {
          console.error('Error computing stats:', err);
          res.status(500).json({ error: 'Failed to compute stats' });
        }
    })

    /**
     * Get a specific game's stats
     * @param {number} gameNumber - The game number
     */
    app.get('/api/game/:gameNumber/stats', async (req, res) => {
      const { gameNumber } = req.params
      if (!gameNumber) return res.status(400).json({ error: 'Missing gameNumber' })
      try {
        const game = await Word.findOne({ gameNumber })
        if (!game) return res.status(404).json({ error: 'Word not found' })
        res.json({
          gamesWon: game.gamesWon,
          gamesLost: game.gamesLost,
          avgScore: game.avgScore
        })
      } catch (err) {
        console.error('Error fetching game stats:', err);
        res.status(500).json({ error: 'Failed to fetch game stats' });
      }
    })
}

module.exports = api
