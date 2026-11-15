import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, CheckCircle, Flame, Trophy, RefreshCw, Info, ChevronDown, ChevronUp, Music } from 'lucide-react';

// --- נתוני האימון (8 תחנות HIIRT בעברית) ---
const WORKOUT_STATIONS = [
  {
    id: 1,
    category: 'פלג גוף תחתון וליבה',
    name: 'גובלט סקוואט עם משקולת',
    target: 'ארבע ראשי, ישבן וליבה',
    cue: 'החזק משקולת אחת אנכית צמוד לחזה עם מרפקים מכונסים. הורד את האגן לאחור ולמטה עד שהירכיים מקבילות לרצפה, ודחוף חזרה למעלה דרך מרכז כף הרגל.'
  },
  {
    id: 2,
    category: 'פלג גוף תחתון וליבה',
    name: 'שכיבות סמיכה (או לחיצת חזה בשכיבה)',
    target: 'חזה, כתף קדמית ויד אחורית',
    cue: 'שמור על גוף ישר כמקשה אחת ומרפקים בזווית של כ-45 מעלות מהגוף בזמן הורדת החזה לכיוון הרצפה.'
  },
  {
    id: 3,
    category: 'פלג גוף תחתון וליבה',
    name: 'דדליפט רומני עם משקולות (RDLs)',
    target: 'ירך אחורית, ישבן וגב תחתון',
    cue: 'שמור על כיפוף קל בברכיים ודחוף את האגן ישר לאחור, כשהמשקולות צמודות לשוקיים, עד שתרגיש מתיחה עמוקה בירך האחורית.'
  },
  {
    id: 4,
    category: 'פלג גוף תחתון וליבה',
    name: 'חתירה בהטיית גו לסירוגין',
    target: 'גב עליון, רחב גבי ויד קדמית',
    cue: 'הטה את הגו קדימה בזווית של 45 מעלות עם גב ישר. משוך משקולת אחת לכיוון המותן תוך כיווץ השכמה לאחור, הורד בשליטה והחלף צד.'
  },
  {
    id: 5,
    category: 'כתפיים, יד קדמית ואחורית',
    name: 'הרחקת כתפיים לצדדים',
    target: 'כתף אמצעית',
    cue: 'עמוד זקוף עם משקולות בצדי הגוף וכיפוף קל במרפקים. הרם את הידיים לצדדים עד לגובה הכתפיים, הובל עם המרפקים והימנע מהרמת הטרפזים.'
  },
  {
    id: 6,
    category: 'כתפיים, יד קדמית ואחורית',
    name: 'כפיפות פטיש לסירוגין (Hammer Curls)',
    target: 'יד קדמית ואמות',
    cue: 'החזק משקולות בצדי הגוף כשכפות הידיים פונות פנימה. שמור על המרפקים צמודים לצלעות בזמן הרמת משקולת אחת לכתף, הורד לאט והחלף צד.'
  },
  {
    id: 7,
    category: 'כתפיים, יד קדמית ואחורית',
    name: 'פשיטת מרפקים מעל הראש',
    target: 'יד אחורית (ראש ארוך)',
    cue: 'החזק משקולת אחת כבדה (או שתיים קלות) מעל הראש בשתי ידיים, הבטן אסופה והצלעות סגורות. הורד את המשקל מאחורי הראש בכיפוף מרפקים בלבד ויישר חזרה.'
  },
  {
    id: 8,
    category: 'כתפיים, יד קדמית ואחורית',
    name: 'לחיצת כתפיים ארנולד',
    target: 'כל שלושת ראשי הכתף ויד אחורית',
    cue: 'התחל כשהמשקולות מול הכתפיים וכפות הידיים פונות לחזה. תוך כדי לחיצה מעל הראש, סובב את פרקי הידיים כך שיפנו קדימה בשיא התנועה, והפוך בירידה.'
  }
];

const WORK_TIME = 40;
const REST_TIME = 20;
const ROUND_REST_TIME = 90;
const TOTAL_ROUNDS = 4;

// --- מנוע מוזיקה פרוצדורלי דינמי (Web Audio API) ---
class DynamicAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.isWorkPhase = true;
    this.timerID = null;
    this.nextNoteTime = 0;
    this.currentStep = 0;
    this.trackNumber = 1;

    this.bpm = 128;
    this.rootFreq = 55;
    this.scale = [0, 3, 5, 7, 10, 12];
    this.bassPattern = [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1];
    this.arpPattern = [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0];
    this.waveType = 'sawtooth';
    this.masterGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.updateVolume();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  randomizeTrack(isWork) {
    this.isWorkPhase = isWork;
    this.trackNumber += 1;
    
    this.bpm = isWork 
      ? Math.floor(Math.random() * (138 - 124 + 1)) + 124 
      : Math.floor(Math.random() * (105 - 92 + 1)) + 92;

    const roots = [41.20, 43.65, 49.00, 55.00, 61.74, 65.41];
    this.rootFreq = roots[Math.floor(Math.random() * roots.length)];

    const waves = ['sawtooth', 'square', 'triangle'];
    this.waveType = isWork 
      ? waves[Math.floor(Math.random() * 2)] 
      : 'triangle';

    this.bassPattern = Array.from({ length: 16 }, (_, i) => 
      (i % 4 === 0) ? 1 : (Math.random() > (isWork ? 0.45 : 0.7) ? 1 : 0)
    );
    this.arpPattern = Array.from({ length: 16 }, () => 
      Math.random() > (isWork ? 0.35 : 0.65) ? 1 : 0
    );

    this.updateVolume();
    return this.trackNumber;
  }

  updateVolume() {
    if (!this.masterGain || !this.ctx) return;
    const targetVol = this.isMuted ? 0 : (this.isWorkPhase ? 0.35 : 0.15);
    this.masterGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.2);
  }

  setMuted(muted) {
    this.isMuted = muted;
    this.updateVolume();
  }

  playKick(time) {
    if (!this.isWorkPhase && this.currentStep % 8 !== 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  playHiHat(time, open = false) {
    const bufferSize = this.ctx.sampleRate * (open ? 0.15 : 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(open ? 0.25 : 0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.15 : 0.04));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  playBass(time, noteFreq) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = this.waveType;
    osc.frequency.setValueAtTime(noteFreq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.isWorkPhase ? 600 : 250, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  playArp(time, noteFreq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(noteFreq * 4, time);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  playBeep(freq = 880, duration = 0.15, type = 'sine') {
    this.init();
    if (this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  scheduleNote(step, time) {
    if (step % 4 === 0) {
      this.playKick(time);
    }

    if (step % 2 === 1) {
      this.playHiHat(time, step % 4 === 3 && this.isWorkPhase);
    }

    if (this.bassPattern[step]) {
      const interval = this.scale[step % this.scale.length];
      const freq = this.rootFreq * Math.pow(2, interval / 12);
      this.playBass(time, freq);
    }

    if (this.arpPattern[step]) {
      const interval = this.scale[(step * 3) % this.scale.length];
      const freq = this.rootFreq * Math.pow(2, interval / 12);
      this.playArp(time, freq);
    }
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      const secondsPerBeat = 60.0 / this.bpm;
      this.nextNoteTime += 0.25 * secondsPerBeat;
      this.currentStep = (this.currentStep + 1) % 16;
    }
    this.timerID = setTimeout(() => this.scheduler(), 25);
  }

  start() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }
}

export default function App() {
  const [status, setStatus] = useState('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [currentRound, setCurrentRound] = useState(1);
  const [stationIndex, setStationIndex] = useState(0);
  
  const [isMuted, setIsMuted] = useState(false);
  const [showCue, setShowCue] = useState(true);
  const [showAllStations, setShowAllStations] = useState(false);
  const [trackNum, setTrackNum] = useState(1);

  const audioRef = useRef(null);

  if (!audioRef.current) {
    audioRef.current = new DynamicAudioEngine();
  }

  const currentStation = WORKOUT_STATIONS[stationIndex];
  const nextStation = stationIndex < WORKOUT_STATIONS.length - 1 
    ? WORKOUT_STATIONS[stationIndex + 1] 
    : (currentRound < TOTAL_ROUNDS ? WORKOUT_STATIONS[0] : null);

  useEffect(() => {
    const engine = audioRef.current;
    engine.setMuted(isMuted);

    if (isRunning && (status === 'work' || status === 'rest' || status === 'round_rest')) {
      engine.start();
    } else {
      engine.stop();
    }

    return () => engine.stop();
  }, [isRunning, status, isMuted]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 4 && prev > 1) {
          audioRef.current.playBeep(660, 0.1, 'sine');
        }

        if (prev <= 1) {
          handlePhaseTransition();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, status, stationIndex, currentRound]);

  const handlePhaseTransition = () => {
    const engine = audioRef.current;

    if (status === 'work') {
      engine.playBeep(440, 0.3, 'triangle');
      
      if (stationIndex < WORKOUT_STATIONS.length - 1) {
        setStatus('rest');
        setTimeLeft(REST_TIME);
        setTrackNum(engine.randomizeTrack(false));
      } else if (currentRound < TOTAL_ROUNDS) {
        setStatus('round_rest');
        setTimeLeft(ROUND_REST_TIME);
        setTrackNum(engine.randomizeTrack(false));
      } else {
        setStatus('finished');
        setIsRunning(false);
        engine.stop();
        engine.playBeep(880, 0.5, 'sine');
      }
    } else if (status === 'rest') {
      engine.playBeep(880, 0.25, 'square');
      setStationIndex((prev) => prev + 1);
      setStatus('work');
      setTimeLeft(WORK_TIME);
      setTrackNum(engine.randomizeTrack(true));
    } else if (status === 'round_rest') {
      engine.playBeep(880, 0.25, 'square');
      setCurrentRound((prev) => prev + 1);
      setStationIndex(0);
      setStatus('work');
      setTimeLeft(WORK_TIME);
      setTrackNum(engine.randomizeTrack(true));
    }
  };

  const togglePlayPause = () => {
    if (status === 'idle') {
      audioRef.current.init();
      audioRef.current.playBeep(880, 0.2, 'square');
      setStatus('work');
      setTimeLeft(WORK_TIME);
      setTrackNum(audioRef.current.randomizeTrack(true));
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleSkip = () => {
    if (status === 'idle' || status === 'finished') return;
    handlePhaseTransition();
  };

  const handleReset = () => {
    setIsRunning(false);
    audioRef.current.stop();
    setStatus('idle');
    setCurrentRound(1);
    setStationIndex(0);
    setTimeLeft(WORK_TIME);
  };

  const handleNextTrackManual = () => {
    if (status === 'idle' || status === 'finished') return;
    setTrackNum(audioRef.current.randomizeTrack(status === 'work'));
  };

  const totalPhaseTime = status === 'work' ? WORK_TIME : (status === 'rest' ? REST_TIME : ROUND_REST_TIME);
  const progressPercentage = status === 'idle' ? 100 : ((totalPhaseTime - timeLeft) / totalPhaseTime) * 100;

  const getThemeColors = () => {
    switch (status) {
      case 'work':
        return {
          bg: 'bg-gray-950',
          accent: 'text-emerald-400',
          border: 'border-emerald-500/30',
          ring: 'stroke-emerald-500',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          btn: 'bg-emerald-500 hover:bg-emerald-600 text-gray-950',
          label: 'עבודה עצימה!'
        };
      case 'rest':
        return {
          bg: 'bg-gray-950',
          accent: 'text-amber-400',
          border: 'border-amber-500/30',
          ring: 'stroke-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          btn: 'bg-amber-500 hover:bg-amber-600 text-gray-950',
          label: 'מנוחה והתארגנות'
        };
      case 'round_rest':
        return {
          bg: 'bg-gray-950',
          accent: 'text-sky-400',
          border: 'border-sky-500/30',
          ring: 'stroke-sky-400',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          btn: 'bg-sky-500 hover:bg-sky-600 text-gray-950',
          label: 'מנוחת סבב (90 שנ׳)'
        };
      default:
        return {
          bg: 'bg-gray-950',
          accent: 'text-emerald-400',
          border: 'border-gray-800',
          ring: 'stroke-emerald-500',
          badge: 'bg-gray-800 text-gray-300 border-gray-700',
          btn: 'bg-emerald-500 hover:bg-emerald-600 text-gray-950',
          label: 'מוכן להתחלה'
        };
    }
  };

  const theme = getThemeColors();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs < 10 ? '0' : ''}${secs}` : `${secs}`;
  };

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-black text-white flex justify-center font-sans select-none">
      <div className={`w-full max-w-md ${theme.bg} flex flex-col justify-between h-[100dvh] overflow-hidden relative shadow-2xl border-x border-gray-900`}>
        
        {/* כותרת עליונה ממותגת ומוגדלת */}
        <header className="px-4 pt-4 pb-2 border-b border-gray-900 bg-gray-950/90 backdrop-blur-md z-10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold mb-1">
                <span>שיטת שני הכוחות</span>
                <span className="text-gray-600">•</span>
                <span>שלו חן - מאמן אחרת</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                אימון HIIRT משקולות
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                8 תחנות • 4 סבבים • 40 שנ׳ עבודה / 20 שנ׳ מנוחה
              </p>
            </div>
            
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-full border transition-all ${
                isMuted 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : 'bg-gray-900 border-gray-800 text-emerald-400'
              }`}
              aria-label="השתק או הפעל סאונד"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-900/80 text-xs">
            <div className="flex items-center gap-1.5">
              <Flame size={14} className="text-orange-500" />
              <span className="font-bold text-gray-200">סבב {currentRound} מתוך {TOTAL_ROUNDS}</span>
            </div>
            <div className="flex gap-1">
              {WORKOUT_STATIONS.map((st, idx) => (
                <div
                  key={st.id}
                  className={`h-1.5 w-4 rounded-full transition-all ${
                    idx < stationIndex 
                      ? 'bg-emerald-500' 
                      : idx === stationIndex && status !== 'idle'
                        ? (status === 'work' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')
                        : 'bg-gray-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </header>

        {/* אזור תוכן מרכזי נגלל */}
        <main className="flex-1 overflow-y-auto px-4 py-3 flex flex-col justify-between gap-3">
          
          {status === 'finished' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/40">
                <Trophy size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">האימון הושלם!</h2>
              <p className="text-gray-400 text-sm max-w-xs mb-6">
                סיימת בהצלחה את כל 4 הסבבים ו-8 התחנות. עבודה אדירה!
              </p>
              <button
                onClick={handleReset}
                className="px-6 py-3.5 bg-emerald-500 text-gray-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <RotateCcw size={18} />
                התחל אימון חדש
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${theme.badge}`}>
                  {theme.label}
                </span>

                {status !== 'idle' && (
                  <button 
                    onClick={handleNextTrackManual}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-900 border border-gray-800 text-[11px] text-gray-300 active:scale-95 transition"
                  >
                    <Music size={12} className={isRunning && !isMuted ? 'text-emerald-400 animate-bounce' : 'text-gray-500'} />
                    <span>מיקס #{trackNum}</span>
                    <RefreshCw size={10} className="text-gray-500 mr-0.5" />
                  </button>
                )}
              </div>

              <div className="relative flex items-center justify-center my-1">
                <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    className="text-gray-900"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="7"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - progressPercentage / 100)}
                    strokeLinecap="round"
                    className={`${theme.ring} transition-all duration-300 ease-linear`}
                  />
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black tracking-tighter tabular-nums">
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-xs text-gray-400 font-medium mt-1">
                    {status === 'idle' ? 'שניות לתחנה' : (status === 'work' ? 'קצב חזק ומבוקר' : 'התאוששות')}
                  </span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl bg-gray-900/90 border ${theme.border} transition-all`}>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>
                    {status === 'rest' || status === 'round_rest' 
                      ? 'התחנה הבאה בתור:' 
                      : `תחנה ${currentStation.id} מתוך ${WORKOUT_STATIONS.length}`}
                  </span>
                  <span className="text-gray-500">
                    {(status === 'rest' || status === 'round_rest') && nextStation 
                      ? nextStation.category 
                      : currentStation.category}
                  </span>
                </div>

                <h2 className="text-xl font-extrabold text-white leading-snug mb-1.5">
                  {(status === 'rest' || status === 'round_rest') && nextStation 
                    ? nextStation.name 
                    : currentStation.name}
                </h2>

                <div className="inline-block px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[11px] font-medium mb-2.5">
                  שרירי מטרה: {(status === 'rest' || status === 'round_rest') && nextStation 
                    ? nextStation.target 
                    : currentStation.target}
                </div>

                <div className="border-t border-gray-800/80 pt-2">
                  <button
                    onClick={() => setShowCue(!showCue)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-emerald-400"
                  >
                    <span className="flex items-center gap-1">
                      <Info size={14} />
                      דגשים לביצוע נכון
                    </span>
                    {showCue ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {showCue && (
                    <p className="text-xs text-gray-300 leading-relaxed mt-1.5">
                      {(status === 'rest' || status === 'round_rest') && nextStation 
                        ? nextStation.cue 
                        : currentStation.cue}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowAllStations(!showAllStations)}
                className="w-full py-2 text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 border border-gray-900 rounded-xl bg-gray-950"
              >
                <span>{showAllStations ? 'הסתר רשימת תחנות' : 'צפה בכל 8 התחנות'}</span>
                {showAllStations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAllStations && (
                <div className="space-y-2 pb-2">
                  {WORKOUT_STATIONS.map((st, idx) => (
                    <div 
                      key={st.id}
                      onClick={() => {
                        setStationIndex(idx);
                        setStatus('work');
                        setTimeLeft(WORK_TIME);
                        setShowAllStations(false);
                      }}
                      className={`p-3 rounded-xl border text-right cursor-pointer transition ${
                        idx === stationIndex 
                          ? 'bg-emerald-950/30 border-emerald-500/40' 
                          : 'bg-gray-900/50 border-gray-800/60 hover:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{st.id}. {st.name}</span>
                        {idx < stationIndex && <CheckCircle size={14} className="text-emerald-500" />}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{st.target}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* סרגל פקדים תחתון קבוע */}
        {status !== 'finished' && (
          <footer className="p-4 bg-gray-950 border-t border-gray-900 flex items-center justify-between gap-3 z-10">
            <button
              onClick={handleReset}
              disabled={status === 'idle'}
              className="p-3.5 rounded-2xl bg-gray-900 text-gray-400 hover:text-white disabled:opacity-30 transition border border-gray-800"
              aria-label="אפס אימון"
            >
              <RotateCcw size={22} />
            </button>

            <button
              onClick={togglePlayPause}
              className={`flex-1 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] ${theme.btn}`}
            >
              {isRunning ? (
                <>
                  <Pause size={24} fill="currentColor" />
                  <span>השהה אימון</span>
                </>
              ) : (
                <>
                  <Play size={24} fill="currentColor" />
                  <span>{status === 'idle' ? 'התחל אימון' : 'המשך אימון'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleSkip}
              disabled={status === 'idle'}
              className="p-3.5 rounded-2xl bg-gray-900 text-gray-400 hover:text-white disabled:opacity-30 transition border border-gray-800"
              aria-label="דלג שלב"
            >
              <SkipForward size={22} />
            </button>
          </footer>
        )}

      </div>
    </div>
  );
}
