import React, { useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { ServerGuess } from './atproto';
import { login, saveScore, restoreSession, getScore, postSkeet, ServerGuess as AtProtoServerGuess } from './atproto';
import MobileKeyboard from './MobileKeyboard';
import logo from './logo.jpg';

const WORD_LENGTH = 5

type Guess = string[];

enum GameStatus {
  Playing,
  Won,
  Lost,
}

const App: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [did, setDid] = useState<string | null>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.Playing);
  const [gameNumber, setGameNumber] = useState<number | null>(null);
  const [viewedGameNumber, setViewedGameNumber] = useState<number | null>(null);
  const [maxGameNumber, setMaxGameNumber] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<ServerGuess[]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [shareText, setShareText] = useState('');
  const [isPostingSkeet, setIsPostingSkeet] = useState(false);
  const [existingScore, setExistingScore] = useState<number | null | undefined>(undefined);
  // Track keyboard key statuses: correct, present, or absent
  const [keyboardStatus, setKeyboardStatus] = useState<Record<string, 'correct' | 'present' | 'absent' | null>>({});
  const [showAbout, setShowAbout] = useState(false);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      const storedDid = await restoreSession();
      if (storedDid) setDid(storedDid);
    })();
  }, []);
  
  // Calculate keyboard key statuses with priority: correct > present > default > absent
  const calculateKeyboardStatus = (currentGuesses: ServerGuess[]) => {
    const newKeyboardStatus: Record<string, 'correct' | 'present' | 'absent' | null> = {};
    
    // Process all guesses to determine the status of each letter
    currentGuesses.forEach(({ letters, evaluation }) => {
      letters.forEach((letter, i) => {
        const currentStatus = newKeyboardStatus[letter];
        const newStatus = evaluation[i];
        
        // Apply priority rules: correct > present > default > absent
        if (newStatus === 'correct') {
          // Correct always takes priority
          newKeyboardStatus[letter] = 'correct';
        } else if (newStatus === 'present' && currentStatus !== 'correct') {
          // Present takes priority unless the letter is already marked correct
          newKeyboardStatus[letter] = 'present';
        } else if (newStatus === 'absent' && currentStatus !== 'correct' && currentStatus !== 'present') {
          // Absent only applies if the letter isn't already marked correct or present
          newKeyboardStatus[letter] = 'absent';
        }
      });
    });
    
    setKeyboardStatus(newKeyboardStatus);
  };

  /*
   * Pull the current game from the server
   */
  const fetchCurrentGame = async (userDid: string) => {
    fetch(`/api/game?did=${userDid}`)
      .then(res => res.json())
      .then(data => {
        const newGuesses = data.guesses as AtProtoServerGuess[];
        setGuesses(newGuesses);
        setGameNumber(data.gameNumber)
        setViewedGameNumber(data.gameNumber)
        setMaxGameNumber(data.gameNumber)
        setStatus(GameStatus[data.status as keyof typeof GameStatus])
        setExistingScore(undefined)
        setCurrent([])
        setShareText('')
        calculateKeyboardStatus(newGuesses)
      })
      .catch(console.error);
  };

  /*
   * Pull a specific game's state for the user.
   */
  const fetchSpecificGame = async (userDid: string, gameNumToFetch: number) => {
    if (!userDid) return

    fetch(`/api/game/${gameNumToFetch}?did=${userDid}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(`Error fetching game ${gameNumToFetch}: ${data.error}`)
          if (maxGameNumber && viewedGameNumber !== maxGameNumber) {
             setViewedGameNumber(maxGameNumber)
          }
          return
        }
        const newGuesses = data.guesses as AtProtoServerGuess[]
        setGuesses(newGuesses)
        setViewedGameNumber(data.gameNumber)
        setStatus(GameStatus[data.status as keyof typeof GameStatus])
        setCurrent([]); // Clear current guess input

        // Calculate which keys should be disabled
        calculateKeyboardStatus(newGuesses)
        
        // Fetch score for the viewed game
        getScore(userDid, data.gameNumber).then(score => setExistingScore(score))
        
        // NOTE: Updating the share text handled by a useEffect()
      })
      .catch(err => {
        console.error(`Error fetching game ${gameNumToFetch}:`, err)
        alert(`Failed to fetch game ${gameNumToFetch}.`)
      })
  }

  /*
   * Fetch the previous game
   */
  const handlePreviousGame = () => {
    if (did && viewedGameNumber && viewedGameNumber > 1) {
      fetchSpecificGame(did, viewedGameNumber - 1);
    }
  }

  /*
   * Fetch the next game
   */
  const handleNextGame = () => {
    if (did && viewedGameNumber && maxGameNumber && viewedGameNumber < maxGameNumber) {
      fetchSpecificGame(did, viewedGameNumber + 1)
    }
  }

const generateEmojiGrid = (gameNum: number | null, gameGuesses: AtProtoServerGuess[], gameStatus: GameStatus): string => {
  if (gameNum === null) return '';
  const title = `Skyrdle ${gameNum} ${gameStatus === GameStatus.Won ? gameGuesses.length : 'X'}/6\n\n`;
  const EMOJI_MAP = {
    correct: '🟩',
    present: '🟨',
    absent: '⬛',
  }

  const grid = gameGuesses.map(guess =>
    guess.evaluation.map(evalType => EMOJI_MAP[evalType]).join('')
  ).join('\n')

  return title + grid
}

const handleShare = async () => {
  if (navigator.clipboard && shareText) {
    try {
      await navigator.clipboard.writeText(shareText);
      alert('Results copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy results.');
    }
  }
};

  const handleSkeetResults = async () => {
    if (!shareText || !did) return;
    setIsPostingSkeet(true);
    try {
      await postSkeet(shareText);
      alert('Results posted to Bluesky!');
    } catch (error: any) {
      console.error('Failed to post skeet:', error);
      alert('Failed to post results: ' + (error.message || 'Unknown error'));
    } finally {
      setIsPostingSkeet(false);
    }
  };

  /*
   * Load game state when logged in
   */
  useEffect(() => {
    if (!did) return;
    fetchCurrentGame(did);
  }, [did]);

  /*
   * Load existing score when gameNumber is known
   */
  useEffect(() => {
    if (did && viewedGameNumber != null) { // Use viewedGameNumber for score context
      getScore(did, viewedGameNumber).then(score => setExistingScore(score));
    }
  }, [did, viewedGameNumber]);

  /*
   * Handle login
   */
  const handleLogin = async () => {
    try {
      const data = await login(
        identifier,
        password,
        requires2FA ? twoFactorCode : undefined
      )
      setDid(data.did)
    } catch (e: any) {
      if (e.error === 'AuthFactorTokenRequired') {
        setRequires2FA(true)
        setTwoFactorCode('')
        return
      }
      alert('Login failed: ' + (e.message || JSON.stringify(e)))
    }
  }

  /*
   * Handle keyboard input
   */
  const onKeyDown = (e: KeyboardEvent) => {
    if (!did || status !== GameStatus.Playing) return; // Allow guesses if game status is Playing
    const key = e.key;
    if (key === 'Enter') {
      if (current.length !== WORD_LENGTH) return;
      const guessStr = current.join('');
      fetch('/api/guess', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ did, guess: guessStr, gameNumber: viewedGameNumber }),
      })
        .then(res => res.json())
        .then(data => {
          setGuesses(data.guesses);
          // setGameNumber(data.gameNumber); // This is for current game, not necessarily the one submitted to
          // The /api/guess endpoint always returns the current game's state after a guess.
          // So, if a guess is made while viewing a past game (which shouldn't happen),
          // it will still update the *current* game on the server.
          // We should refresh the current game view if a guess is made.
          if (did && viewedGameNumber !== null) fetchSpecificGame(did, viewedGameNumber); // Refresh the viewed game's data
          setStatus(GameStatus[data.status as keyof typeof GameStatus]); // This status is for the game guessed on
          setCurrent([]);
          calculateKeyboardStatus(data.guesses)
        })
        .catch(console.error);
    } else if (key === 'Backspace') {
      setCurrent(current.slice(0, -1))
    } else if (/^[a-zA-Z]$/.test(key) && current.length < WORD_LENGTH) {
      setCurrent([...current, key.toUpperCase()])
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown as any)
    return () => window.removeEventListener('keydown', onKeyDown as any)
  })

  /*
   * Save score when a game ends, and generate share text for any completed game
   */
  useEffect(() => {
    // Save score if the currently viewed game just ended and a score doesn't already exist
    if (did && viewedGameNumber !== null && (status === GameStatus.Won || status === GameStatus.Lost)) {
      if (existingScore === null) {
        const scoreVal = status === GameStatus.Won ? guesses.length : -1;
        (async () => {
          // At this point, viewedGameNumber is guaranteed to be a number.
          await saveScore(did, viewedGameNumber, scoreVal, guesses);
          setExistingScore(scoreVal);
        })()
      }
    }

    // Generate share text if the currently viewed game is Won or Lost
    if (viewedGameNumber !== null && (status === GameStatus.Won || status === GameStatus.Lost)) {
      setShareText(generateEmojiGrid(viewedGameNumber, guesses, status))
    } else {
      setShareText('') // Clear share text if game is Playing or not loaded
    }
  }, [status, did, viewedGameNumber, existingScore, guesses])

  // Virtual keyboard handlers
  const handleVirtualKey = (key: string) => {
    if (!did || status !== GameStatus.Playing) return;
    if (/^[A-Z]$/.test(key) && current.length < WORD_LENGTH) {
      setCurrent(prev => [...prev, key]);
    }
  }

  const handleVirtualKeyEnter = () => {
    if (!did || status !== GameStatus.Playing) return;
    if (current.length !== WORD_LENGTH) return;
    const guessStr = current.join('');
    fetch('/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did, guess: guessStr, gameNumber: viewedGameNumber }),
    })
      .then(res => res.json())
      .then(data => {
        const newGuesses = data.guesses;
        setGuesses(newGuesses);
        calculateKeyboardStatus(newGuesses);
        if (did && viewedGameNumber !== null) fetchSpecificGame(did, viewedGameNumber);
        setStatus(GameStatus[data.status as keyof typeof GameStatus]);
        setCurrent([]);
      })
      .catch(console.error);
  }

  const handleVirtualKeyBackspace = () => {
    if (!did || status !== GameStatus.Playing) return;
    setCurrent(prev => prev.slice(0, -1));
  }

  // render board
  const renderCell = (char: string, idx: number, evals?: ('correct'|'present'|'absent')[]) => {
    const className = 'cell' + (evals ? ` ${evals[idx]}` : '');
    return (
      <div key={idx} className={className}>
        {char}
      </div>
    );
  };

  return (
    <div className="app">
      {!did ? (
        <div className="login">
            <img src={logo} alt="Skyrdle Logo" className="login-logo" />
          <h2>Login to Skyrdle</h2>
          <input
            placeholder="Bluesky Username or Email"
            value={identifier}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
          {requires2FA && (
            <input
              placeholder="2FA Code"
              value={twoFactorCode}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTwoFactorCode(e.target.value)}
            />
          )}
          <button onClick={handleLogin} className="btn-glass">Login</button>
        </div>
      ) : (
        <>
          <header className="game-header-fixed">
            <div className="navigation-container">
              <button
                type="button"
                onClick={handlePreviousGame}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); } }}
                disabled={!viewedGameNumber || viewedGameNumber <= 1}
                className="btn-glass"
              >
                Previous
              </button>
              <h1 className="game-title">Skyrdle #{viewedGameNumber !== null ? viewedGameNumber : gameNumber}</h1>
              <button
                type="button"
                onClick={handleNextGame}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); } }}
                disabled={!viewedGameNumber || !maxGameNumber || viewedGameNumber >= maxGameNumber}
                className="btn-glass"
              >
                Next
              </button>
            </div>
          </header>
          
          <div className="game">
            <div className="board">
              {guesses.map(({letters, evaluation},gi) => (
                <div key={gi} className="row">
                  {letters.map((ch,i) => renderCell(ch,i,evaluation))}
                </div>
              ))}
              {status === GameStatus.Playing && (
                <div className="row">
                  {Array.from({ length: WORD_LENGTH }).map((_, i) => renderCell(current[i]||'', i))}
                </div>
              )}
            </div>
            
            {/* Mobile keyboard only on mobile */}
            <div className="mobile-keyboard-container">
              <MobileKeyboard
                keyboardStatus={keyboardStatus}
                onKey={handleVirtualKey}
                onEnter={handleVirtualKeyEnter}
                onDelete={handleVirtualKeyBackspace}
              />
            </div>
            {status === GameStatus.Won && (
              <div className="message">
                Congrats! You won! Score saved!
              </div>
            )}
            {status === GameStatus.Lost && (
              <div className="message">
                Game Over. Score saved.
              </div>
            )}
            {shareText && (
              <div className="share-results-box" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #555', borderRadius: '8px', backgroundColor: '#2a2a2e' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', textAlign: 'center' }}>Share Results</h3>
                <pre style={{ whiteSpace: 'pre-wrap', background: '#1e1e20', padding: '10px', borderRadius: '4px', textAlign: 'left', color: '#eee', border: '1px solid #444' }}>{shareText}</pre>
                <div className="share-buttons" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-around', gap: '0.5rem' }}>
                  <button onClick={handleShare} className="btn-glass" style={{ flex: 1 }}>Copy</button>
                  <button onClick={handleSkeetResults} disabled={isPostingSkeet} className="btn-glass" style={{ flex: 1, opacity: isPostingSkeet ? 0.6 : 1 }}>
                    {isPostingSkeet ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <footer className="game-footer">
            <button type="button" className="btn-glass btn-sm" onClick={() => setShowAbout(true)}>About</button>
            <button type="button" className="btn-glass btn-sm" onClick={() => { localStorage.removeItem('skyrdleSession'); setDid(null); }}>Logout</button>
          </footer>

        {showAbout && (
          <div className="modal-overlay" onClick={() => setShowAbout(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>Skyrdle</h2>
              <p>made with &lt;3 by <a href="https://smol.farm" target="_blank" rel="noopener noreferrer">smol farm</a></p>
              <p><a href="https://bsky.app/profile/skyrdle.com" target="_blank" rel="noopener noreferrer">follow skyrdle on bluesky</a></p>
              <p><a href="https://github.com/smolfarm/skyrdle-monorepo" target="_blank" rel="noopener noreferrer">view source on github</a></p>
              <button className="btn-glass" onClick={() => setShowAbout(false)}>Close</button>
            </div>
          </div>
        )}
      </>
      )}
    </div>
  )
}

export default App
