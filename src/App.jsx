import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Activity,
  CheckCircle,
  Music,
} from 'lucide-react';

const EXERCISES = [
  {
    name: 'סקוואט גובלט עם משקולת',
    target: 'ארבע ראשי, עכוז ושרירי ליבה.',
    cue: 'החזק משקולת אנכית כנגד החזה עם מרפקים צמודים מטה. רד לאחור ולמטה עד שהירכיים מקבילות לרצפה, ואז דחוף למעלה דרך מרכז כף הרגל.',
  },
  {
    name: 'שכיבות סמיכה (או לחיצת חזה עם משקולות)',
    target: 'חזה, כתף קדמית, ויד אחורית.',
    cue: 'שמור על גוף ישר כסרגל וזווית מרפקים של כ-45 מעלות מהגוף בזמן שאתה מוריד את החזה לרצפה.',
  },
  {
    name: 'דדליפט רומני עם משקולות',
    target: 'ירך אחורית, עכוז וגב תחתון.',
    cue: 'שמור על כיפוף קל בברכיים ודחוף את האגן ישירות לאחור, שמור את המשקולות קרובות לשוקיים עד שתרגיש מתיחה עמוקה בירך האחורית.',
  },
  {
    name: 'חתירה בהטיית גו עם משקולות',
    target: 'גב עליון, רחב גבי ודו-ראשי.',
    cue: 'הישען קדימה בזווית של 45 מעלות עם גב ישר. משוך משקולת אחת לכיוון המותן תוך כיווץ השכמה לאחור, הורד בשליטה והחלף צד.',
  },
  {
    name: 'הרחקת כתפיים עם משקולות',
    target: 'כתף אמצעית.',
    cue: 'עמוד זקוף עם המשקולות בצידי הגוף וכיפוף קל במרפקים. הרם את הזרועות לצדדים עד לגובה הכתפיים, הובל עם המרפקים והימנע מהרמת הטרפזים.',
  },
  {
    name: 'כפיפת מרפקים פטישים',
    target: 'דו-ראשי וברכיאליס (אמות).',
    cue: 'החזק את המשקולות בצידי הגוף כאשר כפות הידיים פונות פנימה אל הגוף. שמור על המרפקים צמודים לצלעות וסובב משקולת אחת למעלה לכיוון הכתף, הורד לאט והחלף צד.',
  },
  {
    name: 'פשיטת מרפקים מעל הראש',
    target: 'יד אחורית.',
    cue: 'החזק משקולת כבדה אחת (או שתיים קלות) מעל הראש בשתי הידיים וכווץ את הליבה כדי שהצלעות לא יבלטו. הורד את המשקולת מאחורי הראש על ידי כיפוף המרפקים בלבד, השאר אותם מצביעים קדימה, ואז פשוט חזרה למעלה.',
  },
  {
    name: 'לחיצת ארנולד',
    target: 'כל שלושת ראשי הכתף (קדמי, אמצעי, אחורי) ויד אחורית.',
    cue: 'התחל עם המשקולות מוחזקות מול הכתפיים, כפות הידיים פונות לחזה. בזמן לחיצת המשקולות מעל הראש, סובב את פרקי כפות הידיים כך שכפות הידיים יפנו קדימה בשיא התנועה, ואז הפוך את התנועה בדרך למטה.',
  },
];

const CONFIG = {
  PREPARE_TIME: 10,
  WORK_TIME: 40,
  REST_TIME: 20,
  ROUND_REST_TIME: 90,
  TOTAL_ROUNDS: 4,
  TOTAL_STATIONS: 8,
};

// Dynamic Procedural Audio Engine for seamless "Playlist" generation
class DynamicAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.nextNoteTime = 0.0;
    this.current16thNote = 0;
    this.timerID = null;
    this.phase = 'prepare';
    this.volume = 0.5;

    // Generative Track Parameters
    this.bpm = 120;
    this.rootFreq = 65.41; // C2
    this.scale = [1, 1.189, 1.335, 1.498, 1.782]; // Minor pentatonic frequency ratios
    this.bassPattern = [];
    this.kickPattern = [];
    this.synthType = 'sawtooth';
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.generateNewSong(this.phase);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.5);
    }
  }

  generateNewSong(phase) {
    this.phase = phase;
    const isWork = phase === 'work';

    // Randomize BPM and Key for that "new track" DJ feel
    this.bpm = isWork
      ? Math.floor(Math.random() * 25) + 125
      : Math.floor(Math.random() * 20) + 75;

    // Pick a random root note between C2 (65.41 Hz) and G2 (98.00 Hz)
    const bases = [65.41, 73.42, 82.41, 87.31, 98.0];
    this.rootFreq = bases[Math.floor(Math.random() * bases.length)];

    // Swap synthesizer character
    this.synthType = isWork
      ? Math.random() > 0.5
        ? 'sawtooth'
        : 'square'
      : Math.random() > 0.5
      ? 'sine'
      : 'triangle';

    // Generate fresh 16-step patterns
    this.bassPattern = Array.from({ length: 16 }, () =>
      Math.random() > (isWork ? 0.3 : 0.7)
        ? Math.floor(Math.random() * this.scale.length)
        : -1
    );

    // Energetic 4-on-the-floor for work, sparse half-time for rest
    this.kickPattern = isWork
      ? [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
      : [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note timing
    this.current16thNote = (this.current16thNote + 1) % 16;
  }

  scheduleNote(beatNumber, time) {
    if (!this.ctx) return;
    const isWork = this.phase === 'work';

    // 1. Kick Drum
    if (this.kickPattern[beatNumber] === 1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.frequency.setValueAtTime(isWork ? 150 : 100, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      gain.gain.setValueAtTime(isWork ? 1 : 0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      osc.start(time);
      osc.stop(time + 0.15);
    }

    // 2. Dynamic Hi-Hat (Offbeats for work, sporadic for rest)
    if (
      (isWork && beatNumber % 2 !== 0) ||
      (!isWork && beatNumber % 4 === 2 && Math.random() > 0.5)
    ) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.frequency.setValueAtTime(8000, time);
      gain.gain.setValueAtTime(isWork ? 0.15 : 0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

      osc.start(time);
      osc.stop(time + 0.05);
    }

    // 3. Bass/Melody Synth
    const noteIdx = this.bassPattern[beatNumber];
    if (noteIdx !== -1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = this.synthType;
      osc.connect(gain);
      gain.connect(this.masterGain);

      const freq = this.rootFreq * this.scale[noteIdx];
      // Bump up an octave occasionally for energy during work phase
      const octaveMult = isWork && Math.random() > 0.8 ? 2 : 1;

      osc.frequency.setValueAtTime(freq * octaveMult, time);

      const noteLength = isWork ? 0.15 : 0.4;
      gain.gain.setValueAtTime(isWork ? 0.25 : 0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + noteLength);

      osc.start(time);
      osc.stop(time + noteLength);
    }
  }

  scheduler() {
    // Lookahead scheduling to ensure tight timing immune to JS thread stutter
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = setTimeout(() => this.scheduler(), 25);
  }

  start() {
    if (this.isPlaying) return;
    if (!this.ctx) this.init();
    this.isPlaying = true;
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    clearTimeout(this.timerID);
  }

  playSFX(type, sfxEnabled) {
    if (!this.ctx || !sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    // Connect directly to destination to bypass music volume fader
    gainNode.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    if (type === 'countdown') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'start') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, now);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'rest') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }
}

export default function WorkoutTimer() {
  const [timerState, setTimerState] = useState('idle'); // idle, running, paused, finished
  const [phase, setPhase] = useState('prepare'); // prepare, work, rest, round_rest, finished
  const [timeLeft, setTimeLeft] = useState(CONFIG.PREPARE_TIME);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentStation, setCurrentStation] = useState(1);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);

  const audioEngineRef = useRef(null);

  // Initialize Audio Engine
  const initAudio = () => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new DynamicAudioEngine();
    }
    audioEngineRef.current.init();
  };

  // Generate a new song automatically when phase changes
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.generateNewSong(phase);
    }
  }, [phase]);

  // Sync music playback and volume with app state
  useEffect(() => {
    if (!audioEngineRef.current) return;

    if (timerState === 'running' && musicEnabled && phase !== 'finished') {
      audioEngineRef.current.start();
      audioEngineRef.current.setVolume(phase === 'work' ? 0.6 : 0.2);
    } else {
      audioEngineRef.current.stop();
    }
  }, [timerState, phase, musicEnabled]);

  const playBeep = useCallback(
    (type) => {
      if (audioEngineRef.current) {
        audioEngineRef.current.playSFX(type, soundEnabled);
      }
    },
    [soundEnabled]
  );

  // Main Timer Logic
  useEffect(() => {
    let interval = null;

    if (timerState === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const nextTime = prev - 1;
          if (nextTime === 3 || nextTime === 2 || nextTime === 1) {
            playBeep('countdown');
          }
          return nextTime;
        });
      }, 1000);
    } else if (timerState === 'running' && timeLeft === 0) {
      if (phase === 'prepare') {
        setPhase('work');
        setTimeLeft(CONFIG.WORK_TIME);
        playBeep('start');
      } else if (phase === 'work') {
        if (currentStation < CONFIG.TOTAL_STATIONS) {
          setPhase('rest');
          setTimeLeft(CONFIG.REST_TIME);
          playBeep('rest');
        } else {
          if (currentRound < CONFIG.TOTAL_ROUNDS) {
            setPhase('round_rest');
            setTimeLeft(CONFIG.ROUND_REST_TIME);
            playBeep('rest');
          } else {
            setPhase('finished');
            setTimerState('finished');
            playBeep('start');
          }
        }
      } else if (phase === 'rest') {
        setCurrentStation((prev) => prev + 1);
        setPhase('work');
        setTimeLeft(CONFIG.WORK_TIME);
        playBeep('start');
      } else if (phase === 'round_rest') {
        setCurrentRound((prev) => prev + 1);
        setCurrentStation(1);
        setPhase('work');
        setTimeLeft(CONFIG.WORK_TIME);
        playBeep('start');
      }
    }

    return () => clearInterval(interval);
  }, [timerState, timeLeft, phase, currentRound, currentStation, playBeep]);

  const toggleTimer = () => {
    initAudio();
    if (timerState === 'idle' || timerState === 'paused') {
      setTimerState('running');
    } else if (timerState === 'running') {
      setTimerState('paused');
    }
  };

  const resetTimer = () => {
    setTimerState('idle');
    setPhase('prepare');
    setTimeLeft(CONFIG.PREPARE_TIME);
    setCurrentRound(1);
    setCurrentStation(1);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m > 0 ? m + ':' : ''}${s
      .toString()
      .padStart(m > 0 ? 2 : 1, '0')}`;
  };

  // UI Theme Helpers
  const getPhaseColors = () => {
    switch (phase) {
      case 'prepare':
        return 'text-blue-400 border-blue-500 shadow-blue-500/30';
      case 'work':
        return 'text-green-400 border-green-500 shadow-green-500/30';
      case 'rest':
        return 'text-orange-400 border-orange-500 shadow-orange-500/30';
      case 'round_rest':
        return 'text-purple-400 border-purple-500 shadow-purple-500/30';
      case 'finished':
        return 'text-yellow-400 border-yellow-500 shadow-yellow-500/30';
      default:
        return 'text-slate-400 border-slate-500';
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'prepare':
        return 'התכונן';
      case 'work':
        return 'עבודה!';
      case 'rest':
        return 'מנוחה';
      case 'round_rest':
        return 'מנוחת סיבוב';
      case 'finished':
        return 'סיום';
      default:
        return '';
    }
  };

  const currentExercise = EXERCISES[currentStation - 1];
  const nextExercise =
    currentStation < CONFIG.TOTAL_STATIONS
      ? EXERCISES[currentStation]
      : EXERCISES[0];
  const isResting =
    phase === 'rest' || phase === 'round_rest' || phase === 'prepare';

  return (
    <div
      dir="rtl"
      className="h-[100dvh] w-full max-w-md mx-auto bg-slate-950 text-slate-100 font-sans selection:bg-slate-700 flex flex-col relative sm:border-x sm:border-slate-800 shadow-2xl overflow-hidden"
    >
      {/* App Header */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-8 h-8 text-indigo-400" />
          <h1 className="text-4xl font-black tracking-tighter">אימון HIIRT</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              initAudio();
              setMusicEnabled(!musicEnabled);
            }}
            className={`p-2 rounded-full transition-colors ${
              musicEnabled
                ? 'text-indigo-400 bg-indigo-900/30'
                : 'text-slate-500'
            }`}
            aria-label="Toggle Music"
          >
            <Music className="w-5 h-5" />
            {!musicEnabled && (
              <div className="absolute w-6 h-0.5 bg-slate-500 -rotate-45 translate-x-[-2px] translate-y-[-10px]"></div>
            )}
          </button>
          <button
            onClick={() => {
              initAudio();
              setSoundEnabled(!soundEnabled);
            }}
            className={`p-2 rounded-full transition-colors ${
              soundEnabled
                ? 'text-indigo-400 bg-indigo-900/30'
                : 'text-slate-500'
            }`}
            aria-label="Toggle SFX"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 flex flex-col gap-6 relative">
        {/* Progress Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
              סיבוב
            </span>
            <div className="text-xl font-bold tabular-nums">
              {currentRound}{' '}
              <span className="text-slate-600 text-sm">
                / {CONFIG.TOTAL_ROUNDS}
              </span>
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
              תחנה
            </span>
            <div className="text-xl font-bold tabular-nums">
              {currentStation}{' '}
              <span className="text-slate-600 text-sm">
                / {CONFIG.TOTAL_STATIONS}
              </span>
            </div>
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex flex-col items-center justify-center py-4 shrink-0">
          <div
            className={`relative flex flex-col items-center justify-center w-56 h-56 rounded-full border-[6px] bg-slate-950 shadow-[0_0_30px_rgba(0,0,0,0.4)] transition-colors duration-500 ${getPhaseColors()}`}
          >
            {/* Pulsing Visual Effect at 3, 2, 1 */}
            {timeLeft <= 3 && timeLeft > 0 && timerState === 'running' && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-current"></div>
            )}

            <span className="text-sm font-bold uppercase tracking-[0.1em] mb-1">
              {getPhaseText()}
            </span>
            <span
              className="text-7xl font-black tracking-tighter tabular-nums leading-none"
              dir="ltr"
            >
              {formatTime(timeLeft)}
            </span>

            {/* Paused Indicator */}
            {timerState === 'paused' && (
              <span className="absolute bottom-8 text-[10px] uppercase tracking-widest text-slate-400 font-semibold bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                מושהה
              </span>
            )}
          </div>
        </div>

        {/* Exercise Information Cards */}
        {phase !== 'finished' ? (
          <div className="flex flex-col gap-3">
            {/* Current Exercise (Highlighted during work) */}
            <div
              className={`rounded-xl p-4 border transition-all duration-300 ${
                phase === 'work'
                  ? 'bg-indigo-900/20 border-indigo-500/40 shadow-lg shadow-indigo-900/20'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {phase === 'work' && (
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                )}
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {phase === 'work' ? 'תחנה פעילה' : 'פרטי התחנה הנוכחית'}
                </p>
              </div>
              <h2
                className={`text-xl font-bold mb-4 ${
                  phase === 'work' ? 'text-white' : 'text-slate-300'
                }`}
              >
                {currentExercise.name}
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-1">
                    שרירי מטרה
                  </h3>
                  <p className="text-slate-300 text-sm leading-snug">
                    {currentExercise.target}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1">
                    דגשים
                  </h3>
                  <p className="text-slate-300 text-sm leading-snug">
                    {currentExercise.cue}
                  </p>
                </div>
              </div>
            </div>

            {/* Upcoming Exercise */}
            {isResting && (
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/60">
                <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">
                  הבא בתור
                </p>
                <h2 className="text-base font-bold text-slate-200 mb-1">
                  {nextExercise.name}
                </h2>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-green-900/20 rounded-2xl border border-green-500/30">
            <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
            <h2 className="text-3xl font-bold text-white mb-2">
              האימון הושלם!
            </h2>
            <p className="text-slate-300 text-base">
              עבודה מדהימה! סיימת אימון HIIRT של 8 תחנות.
            </p>
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-slate-950/95 backdrop-blur border-t border-slate-800 p-4 pb-safe flex justify-between items-center z-20">
        <button
          onClick={resetTimer}
          className="p-3 sm:p-4 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-700"
          aria-label="אפס"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          onClick={toggleTimer}
          className={`flex-1 mx-4 max-w-[200px] h-14 rounded-full flex items-center justify-center gap-2 font-bold text-xl transition-all focus:outline-none focus:ring-4 active:scale-95 ${
            timerState === 'running'
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 focus:ring-slate-700'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-700 shadow-lg shadow-indigo-900/50'
          }`}
          aria-label={timerState === 'running' ? 'השהה' : 'התחל'}
        >
          {timerState === 'running' ? (
            <>
              <Pause className="w-6 h-6 fill-current" /> השהה
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current" /> התחל
            </>
          )}
        </button>

        <div className="w-12 sm:w-14"></div>
      </div>
    </div>
  );
}
