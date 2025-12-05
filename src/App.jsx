import { useEffect, useRef, useState } from 'react';

// --- GAME CONFIGURATION ---
const INITIAL_VIEW_TIME = 3000;  // 3 seconds to start
const MIN_VIEW_TIME = 500;       // It gets down to 0.5s eventually
const DECAY_RATE = 200;          // ms removed per level
const INPUT_TIME_LIMIT = 10000;  // 10 seconds to enter

const DISTRACTIONS = [
  "Kid is screaming...",
  "You dropped your phone...",
  "Wait, was that a 5 or an S?",
  "Wifi connection lost...",
  "Cat jumped on lap...",
  "Someone is calling you...",
  "Your glasses fogged up...",
  "Processing request...",
  "Buffering...",
  "Did I lock the front door?",
  "Boss is slacking you...",
  "Low Battery: 2%"
];

const App = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState('menu'); // menu, viewing, distraction, input, result, gameover
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Round State
  const [targetCode, setTargetCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [feedback, setFeedback] = useState('');
  const [currentDistraction, setCurrentDistraction] = useState('');

  // Refs
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // --- LOGIC ---

  const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const startRound = (resetGame = false) => {
    if (resetGame) {
      setLevel(1);
      setScore(0);
      setStreak(0);
    }

    const newCode = generateCode();
    setTargetCode(newCode);
    setInputVal('');
    setAttempts(0);
    setFeedback('');

    // Calculate how long they get to look at the code
    const currentViewTime = Math.max(
      INITIAL_VIEW_TIME - ((resetGame ? 0 : level - 1) * DECAY_RATE),
      MIN_VIEW_TIME
    );

    setGameState('viewing');
    setTimeLeft(currentViewTime);
  };

  // State Machine Timer
  useEffect(() => {
    // 1. VIEWING
    if (gameState === 'viewing') {
      if (timeLeft <= 0) {
        // Pick a distraction
        const randomMsg = DISTRACTIONS[Math.floor(Math.random() * DISTRACTIONS.length)];
        setCurrentDistraction(randomMsg);
        setGameState('distraction');

        // Random time between 1s and 4s
        const distractionTime = Math.floor(Math.random() * 3000) + 1000;
        setTimeLeft(distractionTime);
        return;
      }
      timerRef.current = setTimeout(() => setTimeLeft((p) => p - 100), 100);
    }

    // 2. DISTRACTION
    if (gameState === 'distraction') {
      if (timeLeft <= 0) {
        setGameState('input');
        setTimeLeft(INPUT_TIME_LIMIT);
        // Queue focus to happen after render
        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }
      timerRef.current = setTimeout(() => setTimeLeft((p) => p - 100), 100);
    }

    // 3. INPUT
    if (gameState === 'input') {
      if (timeLeft <= 0) {
        handleGameOver();
        return;
      }
      timerRef.current = setTimeout(() => setTimeLeft((p) => p - 100), 100);
    }

    return () => clearTimeout(timerRef.current);
  }, [gameState, timeLeft]);

  const handleGameOver = () => {
    setGameState('gameover');
    if (score > highScore) setHighScore(score);
  };

  const calculatePoints = (attemptNum) => {
    let base = 0;
    if (attemptNum === 1) base = 1000;
    else if (attemptNum === 2) base = 500;
    else if (attemptNum === 3) base = 250;

    // Streak bonus
    const multiplier = 1 + (Math.floor(streak / 5) * 0.1);
    return Math.floor(base * multiplier);
  };

  // --- SUBMISSION LOGIC ---

  const processSubmission = (codeToTest) => {
    if (codeToTest === targetCode) {
      // SUCCESS
      const currentAttempt = attempts + 1;
      const points = calculatePoints(currentAttempt);
      setScore((prev) => prev + points);

      if (currentAttempt === 1) {
        setStreak((prev) => prev + 1);
        setFeedback('VERIFIED');
      } else {
        setStreak(0);
        setFeedback('ACCEPTED');
      }

      setGameState('result');
      setTimeout(() => {
        setLevel((prev) => prev + 1);
        startRound();
      }, 1500);

    } else {
      // FAILURE
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setInputVal(''); // Wipe it clean to induce rage

      if (newAttempts >= 3) {
        handleGameOver();
      } else {
        setFeedback(`${3 - newAttempts} Retries Left`);
        // Keep focus
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (inputVal.length > 0) processSubmission(inputVal);
  };

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); // Numbers only
    setInputVal(val);

    // AUTO-SUBMIT TRIGGER
    if (val.length === 6) {
      processSubmission(val);
    }
  };

  // --- RENDERING HELPERS ---

  const getProgressColor = () => {
    if (gameState === 'viewing') return 'bg-cyan-500';
    if (gameState === 'distraction') return 'bg-purple-500';
    return 'bg-orange-500';
  };

  const getMaxTime = () => {
    if (gameState === 'viewing') return Math.max(INITIAL_VIEW_TIME - ((level - 1) * DECAY_RATE), MIN_VIEW_TIME);
    if (gameState === 'distraction') return 4000;
    return INPUT_TIME_LIMIT;
  };

  const progressPercent = (timeLeft / getMaxTime()) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-md p-6 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 relative overflow-hidden">

        {/* HEADER - FIXED LAYOUT */}
        <div className="flex justify-between items-center mb-8 h-10">
          {/* Left: Level */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Level</span>
            <span className="font-bold text-white leading-none">{level}</span>
          </div>

          {/* Center: Streak (Only visible if > 1) */}
          {streak > 1 && !['menu', 'gameover'].includes(gameState) && (
            <div className="bg-green-900/30 border border-green-500/30 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(74,222,128,0.1)] animate-pulse">
              {streak}x Streak
            </div>
          )}

          {/* Right: Score */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Score</span>
            <span className="font-bold text-cyan-400 leading-none">{score}</span>
          </div>
        </div>

        {/* --- STATE: MENU --- */}
        {gameState === 'menu' && (
          <div className="text-center space-y-6 py-4">
            <h1 className="text-4xl font-bold text-white mb-2">2FA: THE GAME</h1>
            <p className="text-slate-400 text-sm">Memorize the code.<br />Survive the distraction.<br />Don't panic.</p>
            <button
              onClick={() => startRound(true)}
              className="w-full py-4 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)]"
            >
              INITIALIZE
            </button>
          </div>
        )}

        {/* --- STATE: VIEWING --- */}
        {gameState === 'viewing' && (
          <div className="text-center py-10">
            <div className="text-xs text-slate-500 mb-4 uppercase tracking-widest">Memorize Token</div>
            <div className="text-6xl font-black tracking-[0.2em] text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              {targetCode.split('').map((char, i) => (
                <span key={i} className="inline-block mx-1">{char}</span>
              ))}
            </div>
          </div>
        )}

        {/* --- STATE: DISTRACTION --- */}
        {gameState === 'distraction' && (
          <div className="text-center py-12 flex flex-col items-center justify-center min-h-[160px]">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <div className="text-xl font-bold text-purple-400 animate-pulse px-4">
              {currentDistraction}
            </div>
          </div>
        )}

        {/* --- STATE: INPUT --- */}
        {gameState === 'input' && (
          <div className="text-center py-6">
            <div className="text-xs text-slate-500 mb-4 uppercase tracking-widest">Verify Identity</div>
            <form onSubmit={handleManualSubmit}>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  pattern="\d*"
                  maxLength={6}
                  value={inputVal}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-orange-500 text-center text-4xl py-4 rounded-lg outline-none tracking-[0.5em] font-bold text-white placeholder-slate-800 transition-colors"
                  placeholder="------"
                  autoComplete="off"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>

              {/* Panic Button */}
              <button
                type="submit"
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-sm transition-colors"
              >
                VERIFY NOW!
              </button>

              <div className="mt-4 h-6 text-red-400 font-bold text-sm animate-bounce">
                {feedback}
              </div>
            </form>
          </div>
        )}

        {/* --- STATE: RESULT --- */}
        {gameState === 'result' && (
          <div className="text-center py-10 animate-pulse">
            <div className="text-4xl font-bold text-green-400 mb-2">{feedback}</div>
            <div className="text-slate-500 text-sm">Generating new token...</div>
          </div>
        )}

        {/* --- STATE: GAME OVER --- */}
        {gameState === 'gameover' && (
          <div className="text-center space-y-6 py-4">
            <div className="text-5xl font-bold text-red-600 mb-2">ACCESS DENIED</div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex justify-between mb-2">
                <span className="text-slate-400">Final Score</span>
                <span className="font-bold text-white">{score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">High Score</span>
                <span className="text-yellow-500 font-bold">{highScore}</span>
              </div>
            </div>

            <div className="text-xs text-slate-500 mt-4">
              The code was: <span className="text-slate-300 font-mono">{targetCode}</span>
            </div>

            {/* BUTTON GROUP */}
            <div className="flex gap-3">
              <button
                onClick={() => setGameState('menu')}
                className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold rounded-lg transition-colors border border-slate-700"
              >
                Main Menu
              </button>
              <button
                onClick={() => startRound(true)}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors border border-slate-600 shadow-lg"
              >
                Re-Authenticate
              </button>
            </div>
          </div>
        )}

        {/* PROGRESS BAR */}
        {['viewing', 'distraction', 'input'].includes(gameState) && (
          <div className="absolute bottom-0 left-0 h-1.5 bg-slate-800 w-full">
            <div
              className={`h-full transition-all duration-100 ease-linear ${getProgressColor()}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;