/*
*  _____ _   ___   _____________ _     _____
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__
*  `--. \    \  \ / |    /| | | | |   |  __|
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/
*
* Root React component for Skyrdle.
*/

import React, { KeyboardEvent, useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { getScore, getSharedGameScore, initAuth, logout, postSkeet, saveScore, saveSharedGameScore, ServerGuess, startLogin } from './atproto'
import CreateSharedGameModal from './components/CreateSharedGameModal'
import AboutModal from './components/AboutModal'
import Footer from './components/Footer'
import LoginForm from './components/LoginForm'
import SettingsModal from './components/SettingsModal'
import ShareResults from './components/ShareResults'
import VirtualKeyboard from './components/VirtualKeyboard'
import { buildAppPath, parseAppRoute, type AppRoute } from './utils/appRoutes'
import { GameStatus, generateEmojiGrid } from './utils/emojiGrid'
import { calculateKeyboardStatus } from './utils/keyboardUtils'
import { buildInfiniteShareText, buildSharedGameShareText } from './utils/shareText'

export { generateEmojiGrid, GameStatus }

const WORD_LENGTH = 5

type SharedGameDetails = {
  shareCode: string
  title: string
  creatorDid: string
  shareUrl: string
}

type SharedGameResponse = SharedGameDetails & {
  guesses?: ServerGuess[]
  status?: keyof typeof GameStatus
}

function getInitialRoute(): AppRoute {
  if (typeof window === 'undefined') return { kind: 'daily' }
  return parseAppRoute(window.location.pathname)
}

function getSharedGameTitle(sharedGame: SharedGameDetails | null, route: AppRoute) {
  if (sharedGame?.title.trim()) return sharedGame.title.trim()
  if (route.kind === 'shared') return `Code ${route.shareCode.toUpperCase()}`
  return 'Shared Game'
}

const App: React.FC = () => {
  const [handle, setHandle] = useState('')
  const [did, setDid] = useState<string | null>(null)
  const [status, setStatus] = useState<GameStatus>(GameStatus.Playing)
  const [route, setRoute] = useState<AppRoute>(getInitialRoute)
  const [gameNumber, setGameNumber] = useState<number | null>(null)
  const [viewedGameNumber, setViewedGameNumber] = useState<number | null>(null)
  const [maxGameNumber, setMaxGameNumber] = useState<number | null>(null)
  const [guesses, setGuesses] = useState<ServerGuess[]>([])
  const [current, setCurrent] = useState<string[]>([])
  const [shareText, setShareText] = useState('')
  const [isPostingSkeet, setIsPostingSkeet] = useState(false)
  const [existingScore, setExistingScore] = useState<number | null | undefined>(undefined)
  const [keyboardStatus, setKeyboardStatus] = useState<Record<string, 'correct' | 'present' | 'absent' | null>>({})
  const [showAbout, setShowAbout] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateSharedGame, setShowCreateSharedGame] = useState(false)
  const [isCreatingSharedGame, setIsCreatingSharedGame] = useState(false)
  const [stats, setStats] = useState<{ currentStreak: number; gamesWon: number; averageScore: number } | null>(null)
  const [isInvalidGuess, setIsInvalidGuess] = useState(false)
  const [sharedGame, setSharedGame] = useState<SharedGameDetails | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)

  const [infiniteTargetWord, setInfiniteTargetWord] = useState<string | null>(null)

  const isSharedMode = route.kind === 'shared'
  const isInfiniteMode = route.kind === 'infinite'

  useEffect(() => {
    if (showStats && did) {
      fetch(`/api/stats?did=${did}`)
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch((err) => console.error('Failed to fetch stats:', err))
    }
  }, [showStats, did])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseAppRoute(window.location.pathname))
      setRouteError(null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    ;(async () => {
      const restoredDid = await initAuth()
      if (restoredDid) {
        setDid(restoredDid)
        // Restore the route the user was on before OAuth redirect
        const returnPath = sessionStorage.getItem('skyrdle_return_path')
        if (returnPath) {
          sessionStorage.removeItem('skyrdle_return_path')
          const returnRoute = parseAppRoute(returnPath)
          if (returnRoute.kind !== 'daily') {
            updateRoute(returnRoute, true)
          }
        }
      }
    })()
  }, [])

  const updateRoute = (nextRoute: AppRoute, replace = false) => {
    const nextPath = buildAppPath(nextRoute)
    if (window.location.pathname !== nextPath) {
      const method = replace ? 'replaceState' : 'pushState'
      window.history[method](null, '', nextPath)
    }
    setRoute(nextRoute)
    setRouteError(null)
  }

  const resetBoardState = () => {
    setGuesses([])
    setCurrent([])
    setKeyboardStatus({})
    setStatus(GameStatus.Playing)
    setExistingScore(undefined)
    setShareText('')
    setInfiniteTargetWord(null)
  }

  const copyToClipboard = async (text: string, successMessage: string) => {
    if (!navigator.clipboard || !text) return

    try {
      await navigator.clipboard.writeText(text)
      await Swal.fire({
        title: 'Success!',
        text: successMessage,
        icon: 'success',
        confirmButtonText: 'OK',
      })
    } catch (error) {
      console.error('Failed to copy text:', error)
      alert('Failed to copy to clipboard.')
    }
  }

  const fetchCurrentGame = async (userDid: string) => {
    try {
      const res = await fetch(`/api/game?did=${userDid}`)
      const data = await res.json()
      const newGuesses = data.guesses as ServerGuess[]

      setGuesses(newGuesses)
      setGameNumber(data.gameNumber)
      setViewedGameNumber(data.gameNumber)
      setMaxGameNumber(data.gameNumber)
      setStatus(GameStatus[data.status as keyof typeof GameStatus])
      setExistingScore(undefined)
      setCurrent([])
      setShareText('')
      setKeyboardStatus(calculateKeyboardStatus(newGuesses))
      setSharedGame(null)
      setRouteError(null)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchSpecificGame = async (userDid: string, gameNumToFetch: number) => {
    try {
      const res = await fetch(`/api/game/${gameNumToFetch}?did=${userDid}`)
      const data = await res.json()

      if (data.error) {
        alert(`Error fetching game ${gameNumToFetch}: ${data.error}`)
        if (maxGameNumber && viewedGameNumber !== maxGameNumber) {
          setViewedGameNumber(maxGameNumber)
        }
        return
      }

      const newGuesses = data.guesses as ServerGuess[]
      setGuesses(newGuesses)
      setViewedGameNumber(data.gameNumber)
      setStatus(GameStatus[data.status as keyof typeof GameStatus])
      setCurrent([])
      setKeyboardStatus(calculateKeyboardStatus(newGuesses))
      const score = await getScore(userDid, data.gameNumber)
      setExistingScore(score)
      setRouteError(null)
    } catch (error) {
      console.error(`Error fetching game ${gameNumToFetch}:`, error)
      alert(`Failed to fetch game ${gameNumToFetch}.`)
    }
  }

  const applySharedGameResponse = (data: SharedGameResponse) => {
    const newGuesses = (data.guesses || []) as ServerGuess[]
    setSharedGame({
      shareCode: data.shareCode,
      title: data.title || '',
      creatorDid: data.creatorDid,
      shareUrl: data.shareUrl,
    })
    setGuesses(newGuesses)
    setCurrent([])
    setKeyboardStatus(calculateKeyboardStatus(newGuesses))
    setViewedGameNumber(null)
    setMaxGameNumber(null)
    setExistingScore(undefined)
    setRouteError(null)

    if (data.status) {
      setStatus(GameStatus[data.status])
    } else {
      setStatus(GameStatus.Playing)
    }
  }

  const fetchSharedGamePreview = async (shareCode: string) => {
    try {
      const res = await fetch(`/api/shared-games/${shareCode}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load shared game')
      }

      setSharedGame({
        shareCode: data.shareCode,
        title: data.title || '',
        creatorDid: data.creatorDid,
        shareUrl: data.shareUrl,
      })
      setRouteError(null)
    } catch (error: any) {
      console.error('Error loading shared game preview:', error)
      setRouteError(error.message || 'Failed to load shared game')
    }
  }

  const fetchSharedGame = async (userDid: string, shareCode: string) => {
    try {
      const res = await fetch(`/api/shared-games/${shareCode}?did=${encodeURIComponent(userDid)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load shared game')
      }

      applySharedGameResponse(data)
    } catch (error: any) {
      console.error('Error loading shared game:', error)
      resetBoardState()
      setRouteError(error.message || 'Failed to load shared game')
    }
  }

  const startInfiniteGame = async (userDid: string) => {
    resetBoardState()
    try {
      const res = await fetch('/api/infinite/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: userDid }),
      })
      const data = await res.json()
      setGuesses(data.guesses || [])
      setStatus(GameStatus[data.status as keyof typeof GameStatus])
      setGameNumber(null)
      setViewedGameNumber(null)
      setMaxGameNumber(null)
      setSharedGame(null)
      setRouteError(null)
    } catch (error) {
      console.error('Error starting infinite game:', error)
    }
  }

  const fetchInfiniteGame = async (userDid: string) => {
    try {
      const res = await fetch(`/api/infinite/current?did=${encodeURIComponent(userDid)}`)
      if (res.ok) {
        const data = await res.json()
        const newGuesses = (data.guesses || []) as ServerGuess[]
        setGuesses(newGuesses)
        setKeyboardStatus(calculateKeyboardStatus(newGuesses))
        setStatus(GameStatus[data.status as keyof typeof GameStatus])
        setCurrent([])
        setGameNumber(null)
        setViewedGameNumber(null)
        setMaxGameNumber(null)
        setSharedGame(null)
        setRouteError(null)
        if (data.targetWord) setInfiniteTargetWord(data.targetWord)
      } else {
        await startInfiniteGame(userDid)
      }
    } catch (error) {
      console.error('Error fetching infinite game:', error)
      await startInfiniteGame(userDid)
    }
  }

  useEffect(() => {
    if (!did) {
      if (route.kind === 'shared') {
        fetchSharedGamePreview(route.shareCode)
      }
      return
    }

    if (route.kind === 'infinite') {
      fetchInfiniteGame(did)
      return
    }

    if (route.kind === 'shared') {
      fetchSharedGame(did, route.shareCode)
      return
    }

    fetchCurrentGame(did)
  }, [did, route])

  useEffect(() => {
    if (!did) return
    if (route.kind === 'daily' && viewedGameNumber != null) {
      getScore(did, viewedGameNumber).then((score) => setExistingScore(score))
    } else if (route.kind === 'shared' && sharedGame) {
      getSharedGameScore(did, sharedGame.shareCode).then((score) => setExistingScore(score))
    }
  }, [did, route, viewedGameNumber, sharedGame])

  useEffect(() => {
    if (route.kind === 'infinite') {
      if (status === GameStatus.Won || status === GameStatus.Lost) {
        setShareText(buildInfiniteShareText(guesses, status))
      } else {
        setShareText('')
      }
      return
    }

    if (route.kind === 'daily') {
      if (did && viewedGameNumber !== null && (status === GameStatus.Won || status === GameStatus.Lost)) {
        if (existingScore === null) {
          const scoreVal = status === GameStatus.Won ? guesses.length : -1
          ;(async () => {
            await saveScore(did, viewedGameNumber, scoreVal, guesses)
            setExistingScore(scoreVal)
          })()
        }
      }

      if (viewedGameNumber !== null && (status === GameStatus.Won || status === GameStatus.Lost)) {
        setShareText(generateEmojiGrid(viewedGameNumber, guesses, status))
      } else {
        setShareText('')
      }

      return
    }

    if (sharedGame && (status === GameStatus.Won || status === GameStatus.Lost)) {
      if (did && existingScore === null) {
        const scoreVal = status === GameStatus.Won ? guesses.length : -1
        ;(async () => {
          await saveSharedGameScore(did, sharedGame.shareCode, sharedGame.title, scoreVal, guesses)
          setExistingScore(scoreVal)
        })()
      }

      setShareText(buildSharedGameShareText(getSharedGameTitle(sharedGame, route), sharedGame.shareUrl, guesses, status))
    } else {
      setShareText('')
    }
  }, [status, did, route, viewedGameNumber, existingScore, guesses, sharedGame])

  const handlePreviousGame = () => {
    if (route.kind !== 'daily') return
    if (did && viewedGameNumber && viewedGameNumber > 1) {
      fetchSpecificGame(did, viewedGameNumber - 1)
    }
  }

  const handleNextGame = () => {
    if (route.kind !== 'daily') return
    if (did && viewedGameNumber && maxGameNumber && viewedGameNumber < maxGameNumber) {
      fetchSpecificGame(did, viewedGameNumber + 1)
    }
  }

  const handleShare = async () => {
    if (shareText) {
      await copyToClipboard(shareText, 'Results copied to clipboard!')
    }
  }

  const handleCopySharedLink = async () => {
    if (sharedGame?.shareUrl) {
      await copyToClipboard(sharedGame.shareUrl, 'Link copied to clipboard!')
    }
  }

  const handleSkeetResults = async () => {
    if (!shareText || !did) return

    setIsPostingSkeet(true)

    try {
      await postSkeet(shareText)
      await Swal.fire({
        title: 'Success!',
        text: 'Results posted to Bluesky!',
        icon: 'success',
        confirmButtonText: 'OK',
      })
    } catch (error: any) {
      console.error('Failed to post skeet:', error)
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to post results: ' + (error.message || 'Unknown error'),
        icon: 'error',
        confirmButtonText: 'OK',
      })
    } finally {
      setIsPostingSkeet(false)
    }
  }

  const handleLogin = async () => {
    if (!handle) {
      alert('Please enter your handle')
      return
    }
    try {
      // Preserve current path so we can restore it after OAuth redirect
      sessionStorage.setItem('skyrdle_return_path', window.location.pathname)
      await startLogin(handle)
    } catch (error: any) {
      alert('Login failed: ' + (error.message || JSON.stringify(error)))
    }
  }

  const submitGuess = () => {
    if (!did || status !== GameStatus.Playing || current.length !== WORD_LENGTH) return

    const guessStr = current.join('')
    let requestUrl: string
    let requestBody: object

    if (route.kind === 'infinite') {
      requestUrl = '/api/infinite/guess'
      requestBody = { did, guess: guessStr }
    } else if (route.kind === 'shared') {
      requestUrl = `/api/shared-games/${route.shareCode}/guess`
      requestBody = { did, guess: guessStr }
    } else {
      requestUrl = '/api/guess'
      requestBody = { did, guess: guessStr, gameNumber: viewedGameNumber }
    }

    fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'An unknown error occurred')
        }
        return data
      })
      .then((data) => {
        if (route.kind === 'infinite') {
          const newGuesses = data.guesses as ServerGuess[]
          setGuesses(newGuesses)
          setKeyboardStatus(calculateKeyboardStatus(newGuesses))
          setStatus(GameStatus[data.status as keyof typeof GameStatus])
          if (data.targetWord) setInfiniteTargetWord(data.targetWord)
        } else if (route.kind === 'shared') {
          applySharedGameResponse(data)
        } else {
          const newGuesses = data.guesses as ServerGuess[]
          setGuesses(newGuesses)
          setKeyboardStatus(calculateKeyboardStatus(newGuesses))
          if (did && viewedGameNumber !== null) fetchSpecificGame(did, viewedGameNumber)
          setStatus(GameStatus[data.status as keyof typeof GameStatus])
        }

        setCurrent([])
      })
      .catch((error) => {
        console.error(error)
        if (error.message === 'Invalid word') {
          setIsInvalidGuess(true)
          setTimeout(() => setIsInvalidGuess(false), 500)
        } else {
          alert(error.message || 'Failed to submit guess')
        }
      })
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!did || status !== GameStatus.Playing) return
    if (showCreateSharedGame || showAbout || showStats || showSettings) return

    const key = event.key
    if (key === 'Enter') {
      submitGuess()
    } else if (key === 'Backspace') {
      setCurrent((prev) => prev.slice(0, -1))
    } else if (/^[a-zA-Z]$/.test(key) && current.length < WORD_LENGTH) {
      setCurrent((prev) => [...prev, key.toUpperCase()])
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown as any)
    return () => window.removeEventListener('keydown', onKeyDown as any)
  })

  const handleVirtualKey = (key: string) => {
    if (!did || status !== GameStatus.Playing) return
    if (/^[A-Z]$/.test(key) && current.length < WORD_LENGTH) {
      setCurrent((prev) => [...prev, key])
    }
  }

  const handleVirtualKeyEnter = () => {
    submitGuess()
  }

  const handleVirtualKeyBackspace = () => {
    if (!did || status !== GameStatus.Playing) return
    setCurrent((prev) => prev.slice(0, -1))
  }

  const handleCreateSharedGame = async ({ title, targetWord }: { title: string; targetWord: string }) => {
    if (!did) {
      throw new Error('You need to log in before creating a shared game.')
    }

    setIsCreatingSharedGame(true)

    try {
      const response = await fetch('/api/shared-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, title, targetWord }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shared game')
      }

      resetBoardState()
      setShowCreateSharedGame(false)
      setSharedGame({
        shareCode: data.shareCode,
        title: data.title || '',
        creatorDid: data.creatorDid,
        shareUrl: data.shareUrl,
      })
      updateRoute({ kind: 'shared', shareCode: data.shareCode })
      await copyToClipboard(data.shareUrl, 'Shared game created. Link copied to clipboard!')
    } finally {
      setIsCreatingSharedGame(false)
    }
  }

  const renderCell = (char: string, idx: number, evals?: ('correct' | 'present' | 'absent')[]) => {
    const className = 'cell' + (evals ? ` ${evals[idx]}` : '')
    return (
      <div key={idx} className={className}>
        {char}
      </div>
    )
  }

  const loginContextMessage = isInfiniteMode
    ? 'Log in to play Skyrdle Infinite'
    : isSharedMode
      ? `Log in to play ${getSharedGameTitle(sharedGame, route)}`
      : undefined

  const headerTitle = isInfiniteMode
    ? 'Skyrdle \u221E'
    : isSharedMode
      ? getSharedGameTitle(sharedGame, route)
      : viewedGameNumber !== null || gameNumber !== null
        ? `Skyrdle #${viewedGameNumber !== null ? viewedGameNumber : gameNumber}`
        : 'Skyrdle'

  return (
    <div className="app">
      {!did ? (
        <LoginForm
          handle={handle}
          contextMessage={loginContextMessage}
          onHandleChange={setHandle}
          onLoginAttempt={handleLogin}
        />
      ) : (
        <>
          <header className="game-header-fixed">
            <div className="navigation-container">
              {isInfiniteMode ? (
                <>
                  <button type="button" onClick={() => updateRoute({ kind: 'daily' })} className="btn-glass">
                    Daily
                  </button>
                  <h1 className="game-title">{headerTitle}</h1>
                  <button
                    type="button"
                    onClick={() => did && startInfiniteGame(did)}
                    className="btn-glass"
                    disabled={status === GameStatus.Playing}
                  >
                    New Word
                  </button>
                </>
              ) : isSharedMode ? (
                <>
                  <button type="button" onClick={() => updateRoute({ kind: 'daily' })} className="btn-glass">
                    Daily
                  </button>
                  <h1 className="game-title">{headerTitle}</h1>
                  <button type="button" onClick={handleCopySharedLink} className="btn-glass" disabled={!sharedGame?.shareUrl}>
                    Copy Link
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePreviousGame}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                      }
                    }}
                    disabled={!viewedGameNumber || viewedGameNumber <= 1}
                    className="btn-glass"
                  >
                    Previous
                  </button>
                  <h1 className="game-title">{headerTitle}</h1>
                  <button
                    type="button"
                    onClick={handleNextGame}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                      }
                    }}
                    disabled={!viewedGameNumber || !maxGameNumber || viewedGameNumber >= maxGameNumber}
                    className="btn-glass"
                  >
                    Next
                  </button>
                </>
              )}
            </div>
          </header>

          <div className="game">
            {isSharedMode && sharedGame && (
              <div className="shared-game-banner">
                <p className="shared-game-eyebrow">Shared Game</p>
                <p className="shared-game-copy">Send this link to challenge someone else on web:</p>
                <button type="button" className="btn-glass shared-link-button" onClick={handleCopySharedLink}>
                  {sharedGame.shareUrl}
                </button>
              </div>
            )}

            {routeError ? (
              <div className="shared-game-error-panel">
                <h2>Couldn&apos;t open this game</h2>
                <p>{routeError}</p>
                <button type="button" className="btn-glass" onClick={() => updateRoute({ kind: 'daily' })}>
                  Back to Daily
                </button>
              </div>
            ) : (
              <>
                <div className="board">
                  {guesses.map(({ letters, evaluation }, guessIndex) => (
                    <div key={guessIndex} className="row">
                      {letters.map((character, index) => renderCell(character, index, evaluation))}
                    </div>
                  ))}
                  {status === GameStatus.Playing && (
                    <div className={`row${isInvalidGuess ? ' invalid-row' : ''}`}>
                      {Array.from({ length: WORD_LENGTH }).map((_, index) => renderCell(current[index] || '', index))}
                    </div>
                  )}
                </div>

                <div className="mobile-keyboard-container">
                  <VirtualKeyboard
                    keyboardStatus={keyboardStatus}
                    onKey={handleVirtualKey}
                    onEnter={handleVirtualKeyEnter}
                    onDelete={handleVirtualKeyBackspace}
                  />
                </div>

                {status === GameStatus.Won && (
                  <div className="message" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    {isInfiniteMode
                      ? 'Nice! Hit New Word to keep going.'
                      : isSharedMode
                        ? 'Solved. Share the link so someone else can try it.'
                        : 'Congrats! You won! Score saved!'}
                  </div>
                )}

                {status === GameStatus.Lost && (
                  <div className="message" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    {isInfiniteMode
                      ? `The word was ${infiniteTargetWord}. Hit New Word to try another.`
                      : isSharedMode
                        ? 'No luck this time. You can still pass the link along.'
                        : 'Game Over. Score saved.'}
                  </div>
                )}

                {shareText && (
                  <ShareResults
                    shareText={shareText}
                    onShare={handleShare}
                    onSkeet={handleSkeetResults}
                    isPostingSkeet={isPostingSkeet}
                  />
                )}

                {!isInfiniteMode && (
                  <button
                    type="button"
                    className="infinite-mode-link"
                    onClick={() => updateRoute({ kind: 'infinite' })}
                  >
                    Play Infinite Mode &infin;
                  </button>
                )}
              </>
            )}
          </div>

          <Footer
            onCreateGame={() => setShowCreateSharedGame(true)}
            onShowStats={() => setShowStats(true)}
            onShowAbout={() => setShowAbout(true)}
            onShowSettings={() => setShowSettings(true)}
            onLogout={async () => {
              await logout()
              setDid(null)
              resetBoardState()
            }}
          />

          {showAbout && (
            <AboutModal onClose={() => setShowAbout(false)} />
          )}

          {showSettings && (
            <SettingsModal onClose={() => setShowSettings(false)} />
          )}

          {showStats && (
            <div className="modal-overlay" onClick={() => setShowStats(false)}>
              <div className="modal-content" onClick={(event) => event.stopPropagation()}>
                <h2>Stats</h2>
                {stats ? (
                  <ul className="modal-list" style={{ listStyleType: 'none' }}>
                    <li>🔥 Streak: {stats.currentStreak}</li>
                    <li>🏆 Games Won: {stats.gamesWon}</li>
                    <li>🎯 Average Score: {stats.averageScore.toFixed(2)}</li>
                  </ul>
                ) : (
                  <p>Loading...</p>
                )}
                <button className="btn-glass" onClick={() => setShowStats(false)}>Close</button>
              </div>
            </div>
          )}

          {showCreateSharedGame && did && (
            <CreateSharedGameModal
              did={did}
              isSubmitting={isCreatingSharedGame}
              onClose={() => setShowCreateSharedGame(false)}
              onCreate={handleCreateSharedGame}
              onPlay={(shareCode) => {
                resetBoardState()
                updateRoute({ kind: 'shared', shareCode })
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
