import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Coffee,
  Compass,
  Crosshair,
  Expand,
  Footprints,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { AiStudioModal, type CharacterTaskActivityUpdate } from './components/AiStudioModal';
import { AntigravityModal } from './components/AntigravityModal';
import { DriveTableModal } from './components/DriveTableModal';
import { GameCanvas } from './components/GameCanvas';
import { TasksPinboardModal } from './components/TasksPinboardModal';
import { TitleScreen } from './components/TitleScreen';
import { TopHud } from './components/TopHud';
import { TvModal } from './components/TvModal';
import { WorkspacePanel } from './components/WorkspacePanel';
import {
  CAMERA_DEFAULT_ZOOM,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  isDiningChairSeatId,
} from './game/houseMap';
import type {
  AssistantMood,
  CameraCommand,
  CameraPresetId,
  CameraUiState,
  CharacterId,
  CharacterStatusMap,
  CharacterStatusSnapshot,
  ChatMessage,
  GameState,
  InteractableId,
  InteractableObject,
  MinaActionMenuAnchor,
  MinaPinMission,
  MinaSummonCommand,
  MinaSummonMode,
  PlayerSeatId,
  RoomZone,
  SavedDraft,
  TimeOfDay,
  TvFeedItem,
  WorkMode,
  WorldToast,
} from './types/game';
import { ASSETS } from './types/game';
import { soundEngine } from './utils/sound';
import { createTask, GoogleTasksApiError } from './utils/tasksApi';
import {
  clearYouTubeAccessToken,
  initYouTubeAuth,
  signInWithGoogleForYouTube,
  signOutGoogle,
} from './utils/youtubeAuth';

const STORAGE_MESSAGES_KEY = 'cozy_desk_messages_v1';
const STORAGE_DRAFTS_KEY = 'cozy_desk_drafts_v1';
const STORAGE_TV_FEED_KEY = 'cozy_desk_tv_custom_feed_v1';

const DEFAULT_TV_FEED: TvFeedItem[] = [
  {
    id: 'chillhop-lofi-live',
    title: 'lofi hip hop radio — beats to study/relax to',
    channel: 'Chillhop Music',
    category: 'Lo-fi & โฟกัส',
    videoId: '7NOSDKb0HlU',
    isLive: true,
  },
  {
    id: 'synthwave-live',
    title: 'synthwave radio — beats to chill/game to',
    channel: 'Lofi Girl',
    category: 'Lo-fi & โฟกัส',
    videoId: '4xDzrJKXOOY',
    isLive: true,
  },
  {
    id: 'coding-chillstep',
    title: 'Lock In and Start Coding — Deep Focus Chillstep',
    channel: 'Chill Music Lab',
    category: 'โค้ดดิ้ง & ทำงาน',
    videoId: 'M5QY2_8704o',
    duration: '1:00:00',
  },
  {
    id: 'cozy-coffee-jazz',
    title: 'Coffee Jazz Music — Chill Out Lounge Jazz Radio 24/7',
    channel: 'BGM channel',
    category: 'คาเฟ่ & แจ๊ส',
    videoId: 'fEvM-OUbaKs',
    isLive: true,
  },
  {
    id: 'best-of-lofi',
    title: 'Best of lofi hip hop — beats to relax/study to',
    channel: 'Lofi Girl',
    category: 'Lo-fi & โฟกัส',
    videoId: 'n61ULEU7CO0',
    duration: '1:01:36',
  },
  {
    id: 'rainy-fireplace',
    title: 'Fireplace Ambience — Cozy Fire for Relaxation',
    channel: 'Fireplace Atmosphere',
    category: 'ธรรมชาติ & ผ่อนคลาย',
    videoId: 'L_LUpnjgPso',
    duration: '10:00:00',
  },
  {
    id: 'rain-window-asmr',
    title: 'Rain Sound On Window with Soft Thunder — Study & Sleep',
    channel: 'Relaxing Ambience ASMR',
    category: 'ธรรมชาติ & ผ่อนคลาย',
    videoId: 'mPZkdNFkNps',
    duration: '8:00:00',
  },
  {
    id: 'forest-waterfall',
    title: 'Relaxing Nature Sounds — Calm Forest Waterfall',
    channel: 'johnnielawson',
    category: 'ธรรมชาติ & ผ่อนคลาย',
    videoId: 'eKFTSSKCzWA',
    duration: '8:00:00',
  },
  {
    id: 'lofi-sleep-chill',
    title: 'lofi hip hop radio — beats to sleep/chill to',
    channel: 'Lofi Girl',
    category: 'คาเฟ่ & แจ๊ส',
    videoId: 'DWcJFNfaw9c',
    isLive: true,
  },
];

const BOOKSHELF_TIPS = [
  'โน้ตจากชั้นหนังสือ: เริ่มงานชิ้นใหญ่ด้วยการแตกเป็น 1 ขั้นตอนที่ทำเสร็จได้ใน 10 นาที',
  'โน้ตจากชั้นหนังสือ: พักสายตาทุก 45 นาทีแล้วกลับมาลุยต่อจะช่วยให้คิดไอเดียคมขึ้น',
  'โน้ตจากชั้นหนังสือ: ฉบับร่างแรกไม่จำเป็นต้องสมบูรณ์แบบ แค่เริ่มเขียนให้จบก่อนแล้วค่อยเกลา',
];

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getNextLocalMidnightMs(): number {
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

function createFallbackCharacterStatuses(): CharacterStatusMap {
  const resetAt = getNextLocalMidnightMs();
  const base = (id: CharacterId, name: string): CharacterStatusSnapshot => ({
    id,
    name,
    status: 'ready',
    tokensRemaining: 250_000,
    tokensUsed: 0,
    tokensLimit: 250_000,
    resetAt,
    currentTask: null,
    unavailableReason: null,
    unavailableCode: null,
  });
  return {
    mina: base('mina', 'มีน่า'),
    antigravity: base('antigravity', 'Antigravity'),
    ai_studio: base('ai_studio', 'Google AI Studio'),
  };
}

function summarizeMinaTask(prompt: string, mode: WorkMode): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  const prefix =
    mode === 'draft'
      ? 'ร่างข้อความ'
      : mode === 'brainstorm'
        ? 'ระดมไอเดีย'
        : 'ตอบคำถาม';
  if (!cleaned) return prefix;
  const snippet = cleaned.length > 26 ? `${cleaned.slice(0, 25)}…` : cleaned;
  return `${prefix}: ${snippet}`;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [zone, setZone] = useState<RoomZone>('living');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon');
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  const [nearestInteractable, setNearestInteractable] =
    useState<InteractableObject | null>(null);
  const [playerSeat, setPlayerSeat] = useState<PlayerSeatId | null>(null);
  const [assistantMood, setAssistantMood] = useState<AssistantMood>('idle');
  const [minaBubbleText, setMinaBubbleText] = useState<string | null>(null);
  const [minaMission, setMinaMission] = useState<MinaPinMission | null>(null);
  const [minaActionMenu, setMinaActionMenu] = useState<MinaActionMenuAnchor | null>(null);
  const [minaSummonCommand, setMinaSummonCommand] = useState<MinaSummonCommand | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
  const [cameraUi, setCameraUi] = useState<CameraUiState>({
    zoomPercent: Math.round(CAMERA_DEFAULT_ZOOM * 100),
    focusMode: 'follow',
    activePreset: 'follow',
  });
  const [extraPinCount, setExtraPinCount] = useState(0);
  const [toast, setToast] = useState<WorldToast | null>(null);
  const [tipIndex, setTipIndex] = useState(0);

  // Living room YouTube TV, Office Google Tasks Pinboard, Drive Table, Antigravity & Google AI Studio modal states
  const [isTvOpen, setIsTvOpen] = useState(false);
  const [isPinboardOpen, setIsPinboardOpen] = useState(false);
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [isAntigravityOpen, setIsAntigravityOpen] = useState(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);
  const [serverCharacterStatuses, setServerCharacterStatuses] =
    useState<CharacterStatusMap | null>(null);
  const [clientCharacterActivities, setClientCharacterActivities] = useState<
    Record<CharacterId, CharacterTaskActivityUpdate>
  >({
    mina: { busy: false, taskLabel: null },
    antigravity: { busy: false, taskLabel: null },
    ai_studio: { busy: false, taskLabel: null },
  });
  const [customTvFeed, setCustomTvFeed] = useState<TvFeedItem[]>(() =>
    loadStorage<TvFeedItem[]>(STORAGE_TV_FEED_KEY, [])
  );
  const allTvFeed = [...customTvFeed, ...DEFAULT_TV_FEED];
  const [activeTvItem, setActiveTvItem] = useState<TvFeedItem | null>(null);

  // Google Auth for personalized YouTube feed & Google Tasks (access token kept in memory only)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [youtubeToken, setYoutubeToken] = useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  // Workspace state persisted in localStorage
  const [workMode, setWorkMode] = useState<WorkMode>('qa');
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadStorage<ChatMessage[]>(STORAGE_MESSAGES_KEY, []).map((m) =>
      m.taskProposal?.status === 'saving'
        ? { ...m, taskProposal: { ...m.taskProposal, status: 'pending' } }
        : m
    )
  );
  const [drafts, setDrafts] = useState<SavedDraft[]>(() =>
    loadStorage<SavedDraft[]>(STORAGE_DRAFTS_KEY, [])
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const appRootRef = useRef<HTMLDivElement | null>(null);
  const enteredNativeFullscreenRef = useRef(false);

  // Persist messages & drafts
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DRAFTS_KEY, JSON.stringify(drafts));
    } catch {
      // Ignore quota errors
    }
  }, [drafts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TV_FEED_KEY, JSON.stringify(customTvFeed));
    } catch {
      // Ignore quota errors
    }
  }, [customTvFeed]);

  // Listen to Firebase Auth state and clear cached token on sign-out
  useEffect(() => {
    const unsubscribe = initYouTubeAuth(
      (user, token) => {
        setGoogleUser(user);
        setYoutubeToken(token);
      },
      () => {
        setGoogleUser(null);
        setYoutubeToken(null);
      }
    );
    return unsubscribe;
  }, []);

  const fetchCharacterStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/characters/status', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        characters?: CharacterStatusMap;
      };
      if (data.ok && data.characters) {
        setServerCharacterStatuses(data.characters);
      }
    } catch {
      // Keep last known snapshot silently
    }
  }, []);

  useEffect(() => {
    void fetchCharacterStatuses();
    const timer = window.setInterval(() => {
      void fetchCharacterStatuses();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [fetchCharacterStatuses]);

  const handleUpdateCharacterActivity = useCallback(
    (characterId: CharacterId, activity: CharacterTaskActivityUpdate) => {
      setClientCharacterActivities((prev) => ({
        ...prev,
        [characterId]: activity,
      }));
    },
    []
  );

  const characterStatuses = useMemo<CharacterStatusMap>(() => {
    const base = serverCharacterStatuses ?? createFallbackCharacterStatuses();

    const mergeOne = (id: CharacterId): CharacterStatusSnapshot => {
      const serverSnap = base[id];
      const clientAct = clientCharacterActivities[id];

      if (id === 'mina' && assistantMood === 'pinning' && minaMission) {
        const shortTitle =
          minaMission.taskTitle.length > 26
            ? `${minaMission.taskTitle.slice(0, 25)}…`
            : minaMission.taskTitle;
        return {
          ...serverSnap,
          status: 'busy',
          currentTask: `ปักหมุดงาน: ${shortTitle}`,
        };
      }

      if (clientAct.busy && clientAct.taskLabel) {
        return {
          ...serverSnap,
          status: 'busy',
          currentTask: clientAct.taskLabel,
        };
      }

      if (serverSnap.status === 'unavailable') {
        return serverSnap;
      }

      if (clientAct.errorReason) {
        return {
          ...serverSnap,
          status: 'unavailable',
          currentTask: null,
          unavailableReason: clientAct.errorReason,
          unavailableCode: clientAct.errorCode ?? serverSnap.unavailableCode ?? null,
        };
      }

      return serverSnap;
    };

    return {
      mina: mergeOne('mina'),
      antigravity: mergeOne('antigravity'),
      ai_studio: mergeOne('ai_studio'),
    };
  }, [assistantMood, clientCharacterActivities, minaMission, serverCharacterStatuses]);

  const showToast = useCallback(
    (text: string, speaker: WorldToast['speaker'] = 'house') => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({ id: Date.now(), text, speaker });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 4200);
    },
    []
  );

  const showMinaBubble = useCallback((text: string, durationMs = 4500) => {
    if (bubbleTimerRef.current) {
      window.clearTimeout(bubbleTimerRef.current);
    }
    setMinaBubbleText(text);
    bubbleTimerRef.current = window.setTimeout(() => {
      setMinaBubbleText(null);
    }, durationMs);
  }, []);

  const enterFullscreenMap = useCallback(() => {
    soundEngine.playInteract();
    setShowHelp(false);
    setIsFullscreenMap(true);
    const rootEl = appRootRef.current;
    if (rootEl && typeof rootEl.requestFullscreen === 'function' && !document.fullscreenElement) {
      rootEl.requestFullscreen().catch(() => {
        // Gracefully stay in full-viewport CSS mode if browser blocks native fullscreen
      });
    }
  }, []);

  const exitFullscreenMap = useCallback(() => {
    soundEngine.playInteract();
    setIsFullscreenMap(false);
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      document.exitFullscreen().catch(() => {
        // Ignore if already exited
      });
    }
  }, []);

  const toggleFullscreenMap = useCallback(() => {
    if (isFullscreenMap) {
      exitFullscreenMap();
    } else {
      enterFullscreenMap();
    }
  }, [enterFullscreenMap, exitFullscreenMap, isFullscreenMap]);

  // Sync React state when user exits native browser fullscreen (e.g. via Esc or browser UI)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        enteredNativeFullscreenRef.current = true;
      } else if (enteredNativeFullscreenRef.current) {
        enteredNativeFullscreenRef.current = false;
        setIsFullscreenMap(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Global Esc shortcut to close AI Studio, Antigravity, Drive, Pinboard, TV, help, stand up from desk, or exit fullscreen map
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isAiStudioOpen) {
        setIsAiStudioOpen(false);
        soundEngine.playInteract();
        return;
      }
      if (isAntigravityOpen) {
        setIsAntigravityOpen(false);
        soundEngine.playInteract();
        return;
      }
      if (isDriveOpen) {
        setIsDriveOpen(false);
        soundEngine.playInteract();
        return;
      }
      if (isPinboardOpen) {
        setIsPinboardOpen(false);
        soundEngine.playInteract();
        return;
      }
      if (isTvOpen) {
        setIsTvOpen(false);
        soundEngine.playInteract();
        return;
      }
      if (minaActionMenu) {
        setMinaActionMenu(null);
        soundEngine.playInteract();
        return;
      }
      if (showHelp) {
        setShowHelp(false);
        return;
      }
      if (gameState === 'WORKING') {
        setGameState('PLAYING');
        soundEngine.playInteract();
        showMinaBubble('พักเดินยืดเส้นยืดสายก่อนได้เลยครับ');
        return;
      }
      if (playerSeat) {
        setPlayerSeat(null);
        soundEngine.playInteract();
        return;
      }
      if (isFullscreenMap) {
        exitFullscreenMap();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [
    exitFullscreenMap,
    gameState,
    isAiStudioOpen,
    isAntigravityOpen,
    isDriveOpen,
    isFullscreenMap,
    isPinboardOpen,
    isTvOpen,
    minaActionMenu,
    playerSeat,
    showHelp,
    showMinaBubble,
  ]);

  // Global 'F' shortcut to toggle fullscreen full-map view while playing
  useEffect(() => {
    const handleFullscreenKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'f') return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (
        gameState !== 'PLAYING' ||
        isTvOpen ||
        isPinboardOpen ||
        isDriveOpen ||
        isAntigravityOpen ||
        isAiStudioOpen
      ) {
        return;
      }
      e.preventDefault();
      toggleFullscreenMap();
    };
    window.addEventListener('keydown', handleFullscreenKey);
    return () => window.removeEventListener('keydown', handleFullscreenKey);
  }, [
    gameState,
    isAiStudioOpen,
    isAntigravityOpen,
    isDriveOpen,
    isPinboardOpen,
    isTvOpen,
    toggleFullscreenMap,
  ]);

  const handleStartGame = () => {
    soundEngine.playInteract();
    setGameState('PLAYING');
    showToast(
      'เดินสำรวจห้องพักผ่อน หรือข้ามประตูฝั่งขวาเข้าห้องทำงานไปหามีน่าได้เลยครับ',
      'house'
    );
  };

  const handleZoneChange = useCallback(
    (nextZone: RoomZone) => {
      setZone(nextZone);
      if (nextZone === 'office') {
        soundEngine.playEnterOffice();
        showMinaBubble('สวัสดีครับ เข้ามาแล้วเหรอ!', 3200);
      } else {
        setAssistantMood('idle');
      }
    },
    [showMinaBubble]
  );

  const handleMinaProximityEvent = useCallback(
    (event: 'approached' | 'returning') => {
      if (event === 'approached') {
        soundEngine.playEnterOffice();
        setAssistantMood('greeting');
        showMinaBubble('สวัสดีครับ! มีอะไรให้ช่วยไหม?', 4000);
        window.setTimeout(() => {
          setAssistantMood((curr) => (curr === 'greeting' ? 'idle' : curr));
        }, 2600);
      } else {
        setAssistantMood('idle');
        showMinaBubble('งั้นกลับไปทำงานที่โต๊ะต่อนะครับ', 3200);
      }
    },
    [showMinaBubble]
  );

  const handleAntigravityProximityEvent = useCallback(
    (event: 'approached' | 'returning') => {
      if (event === 'approached') {
        soundEngine.playEnterOffice();
      }
    },
    []
  );

  const handleAiStudioProximityEvent = useCallback(
    (event: 'approached' | 'returning') => {
      if (event === 'approached') {
        soundEngine.playEnterOffice();
      }
    },
    []
  );

  const handleRequestMinaMenu = useCallback((anchor: MinaActionMenuAnchor) => {
    setMinaActionMenu(anchor);
  }, []);

  const handleDismissMinaMenu = useCallback(() => {
    setMinaActionMenu(null);
  }, []);

  const handleSelectMinaSummonMode = useCallback(
    (mode: MinaSummonMode) => {
      setMinaActionMenu(null);
      setPlayerSeat(null);
      soundEngine.playEnterOffice();
      setMinaSummonCommand({ id: Date.now(), mode });

      if (mode === 'walk_then_chat') {
        showMinaBubble('กำลังเดินไปหาครับ รอสักครู่นะ!', 4000);
      } else {
        setGameState('WORKING');
        setAssistantMood('greeting');
        showMinaBubble('เริ่มคุยได้เลยครับ กำลังเดินไปหา!', 3800);
        window.setTimeout(() => {
          setAssistantMood((curr) => (curr === 'greeting' ? 'idle' : curr));
        }, 1800);
      }
    },
    [showMinaBubble]
  );

  const handleMinaSummonArrived = useCallback(
    (mode: MinaSummonMode) => {
      if (mode === 'walk_then_chat') {
        soundEngine.playEnterOffice();
        setPlayerSeat(null);
        setGameState('WORKING');
        setAssistantMood('greeting');
        showMinaBubble('มาถึงแล้วครับ! อยากคุยเรื่องไหนดี?', 3600);
        window.setTimeout(() => {
          setAssistantMood((curr) => (curr === 'greeting' ? 'idle' : curr));
        }, 1800);
      } else {
        setAssistantMood((curr) => {
          if (curr === 'idle') {
            showMinaBubble('เดินมาถึงแล้วครับ พร้อมช่วยงานเต็มที่!', 3200);
          }
          return curr;
        });
      }
    },
    [showMinaBubble]
  );

  const handleInteract = useCallback(
    (id: InteractableId) => {
      setMinaActionMenu(null);

      if (id === 'mina_desk') {
        soundEngine.playEnterOffice();
        setPlayerSeat(null);
        setGameState('WORKING');
        setAssistantMood('greeting');
        showMinaBubble('พร้อมคุยงานครับ อยากเริ่มเรื่องไหนดี?', 3600);
        window.setTimeout(() => {
          setAssistantMood((curr) => (curr === 'greeting' ? 'idle' : curr));
        }, 1600);
        return;
      }

      if (id === 'workdesk') {
        soundEngine.playInteract();
        setPlayerSeat((curr) => {
          const next = curr === 'workdesk' ? null : 'workdesk';
          if (next === 'workdesk') {
            showToast('นั่งหน้าคอมพิวเตอร์ที่โต๊ะทำงานส่วนตัวแล้วครับ (กด WASD / E / Esc เพื่อลุก)', 'player');
          }
          return next;
        });
        return;
      }

      if (id === 'coffee') {
        soundEngine.playCoffeeSip();
        showToast('จิบกาแฟอุ่นๆ หอมกรุ่น เติมความสดชื่นก่อนเริ่มทำงานแล้วครับ', 'player');
        return;
      }

      if (id === 'sofa') {
        soundEngine.playInteract();
        setPlayerSeat((curr) => {
          const next = curr === 'sofa' ? null : 'sofa';
          if (next === 'sofa') {
            showToast('เอนหลังนั่งพักผ่อนบนโซฟาห้องนั่งเล่นแล้วครับ (คลิกทีวีดู YouTube หรือกด WASD เพื่อลุก)', 'player');
          }
          return next;
        });
        return;
      }

      if (id === 'window') {
        soundEngine.playInteract();
        setTimeOfDay((prev) => {
          const next: TimeOfDay =
            prev === 'morning'
              ? 'afternoon'
              : prev === 'afternoon'
                ? 'evening'
                : 'morning';
          const label =
            next === 'morning'
              ? 'เปลี่ยนเป็นแสงยามเช้าสดใสแล้วครับ'
              : next === 'afternoon'
                ? 'เปลี่ยนเป็นแสงบ่ายอุ่นๆ แล้วครับ'
                : 'เปลี่ยนเป็นบรรยากาศยามค่ำพร้อมแสงโคมไฟแล้วครับ';
          showToast(label, 'house');
          return next;
        });
        return;
      }

      if (id === 'bookshelf') {
        soundEngine.playInteract();
        const tip = BOOKSHELF_TIPS[tipIndex % BOOKSHELF_TIPS.length];
        setTipIndex((i) => i + 1);
        showToast(tip, 'house');
        return;
      }

      if (id === 'clock') {
        soundEngine.playEnterOffice();
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        showToast(`นาฬิกาลูกตุ้มคลาสสิกบอกเวลา ${hh}:${mm} น. — เสียงลูกตุ้มแกว่งนุ่มนวลสบายหู`, 'house');
        return;
      }

      if (id === 'tv') {
        soundEngine.playInteract();
        setIsTvOpen(true);
        return;
      }

      if (id === 'pinboard') {
        soundEngine.playInteract();
        setIsPinboardOpen(true);
        return;
      }

      if (id === 'drive_table') {
        soundEngine.playInteract();
        setIsDriveOpen(true);
        return;
      }

      if (id === 'antigravity_desk') {
        soundEngine.playEnterOffice();
        setIsAntigravityOpen(true);
        return;
      }

      if (id === 'ai_studio_desk') {
        soundEngine.playEnterOffice();
        setIsAiStudioOpen(true);
        return;
      }

      if (isDiningChairSeatId(id)) {
        soundEngine.playInteract();
        const seatPositionLabel: Record<typeof id, string> = {
          dining_chair_nw: 'ฝั่งบนซ้าย',
          dining_chair_ne: 'ฝั่งบนขวา',
          dining_chair_sw: 'ฝั่งล่างซ้าย',
          dining_chair_se: 'ฝั่งล่างขวา',
        };
        setPlayerSeat((curr) => {
          const next = curr === id ? null : id;
          if (next === id) {
            showToast(
              `นั่งเก้าอี้โต๊ะอาหาร (${seatPositionLabel[id]}) พร้อมหน้าฉลองมื้อไก่งวงคริสต์มาสวันครอบครัวอบอุ่นแล้วครับ (กด WASD / E / Esc เพื่อลุก)`,
              'player'
            );
          }
          return next;
        });
        return;
      }

      if (id === 'dining_table') {
        soundEngine.playCoffeeSip();
        showToast(
          'ไก่งวงอบคริสต์มาสตัวใหญ่สีทองหอมกรุ่นกลางโต๊ะ สัญลักษณ์แห่งวันครอบครัวแสนอบอุ่น! (คลิกที่เก้าอี้ทั้ง 4 ตัวเพื่อนั่งทานได้เลย)',
          'player'
        );
      }
    },
    [showMinaBubble, showToast, tipIndex]
  );

  const handleAddCustomTvItem = ({
    title,
    channel,
    videoId,
  }: {
    title: string;
    channel: string;
    videoId: string;
  }) => {
    const newItem: TvFeedItem = {
      id: `custom-${Date.now()}`,
      title,
      channel,
      category: 'รายการของฉัน',
      videoId,
      isCustom: true,
    };
    setCustomTvFeed((prev) => [newItem, ...prev]);
    setActiveTvItem(newItem);
    soundEngine.playInteract();
  };

  const handleDeleteCustomTvItem = (id: string) => {
    setCustomTvFeed((prev) => prev.filter((item) => item.id !== id));
    setActiveTvItem((curr) => (curr?.id === id ? null : curr));
  };

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setGoogleAuthError(null);
    try {
      const { user, accessToken } = await signInWithGoogleForYouTube();
      setGoogleUser(user);
      setYoutubeToken(accessToken);
      soundEngine.playInteract();
      showToast(
        `เชื่อมต่อบัญชี YouTube (${user.displayName || user.email || 'Google'}) เรียบร้อยแล้วครับ`,
        'house'
      );
    } catch (err) {
      const errCode = (err as { code?: string })?.code ?? '';
      if (errCode === 'auth/popup-closed-by-user') {
        setGoogleAuthError('ยกเลิกหน้าต่างเข้าสู่ระบบ Google แล้ว สามารถกดเชื่อมต่อใหม่ได้ทุกเมื่อ');
      } else if (errCode === 'auth/popup-blocked') {
        setGoogleAuthError('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตป๊อปอัปแล้วลองกด Sign in with Google อีกครั้ง');
      } else {
        setGoogleAuthError(
          err instanceof Error
            ? err.message
            : 'ไม่สามารถเข้าสู่ระบบ Google ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
        );
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
    } finally {
      setGoogleUser(null);
      setYoutubeToken(null);
      setGoogleAuthError(null);
      soundEngine.playInteract();
    }
  };

  const handleYouTubeTokenExpired = useCallback(() => {
    clearYouTubeAccessToken();
    setYoutubeToken(null);
  }, []);

  const handleToggleWorkspace = () => {
    if (gameState !== 'WORKING') return;
    soundEngine.playInteract();
    setGameState('PLAYING');
    showMinaBubble('ถ้ามีอะไรให้ช่วย เดินมาเรียกได้เสมอนะครับ', 3200);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  };

  const streamAssistantResponse = useCallback(
    async (historyToSend: ChatMessage[], mode: WorkMode) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          mode,
          createdAt: Date.now(),
        },
      ]);

      const latestUserMessage = [...historyToSend].reverse().find((m) => m.role === 'user');
      const taskSummary = summarizeMinaTask(latestUserMessage?.content ?? '', mode);

      setIsStreaming(true);
      setApiError(null);
      setAssistantMood('thinking');
      handleUpdateCharacterActivity('mina', {
        busy: true,
        taskLabel: taskSummary,
        errorReason: null,
        errorCode: null,
      });

      let accumulated = '';
      let receivedProposal = false;

      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyToSend.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            mode,
            timeOfDay,
            localDate,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errMsg = 'ไม่สามารถเชื่อมต่อกับผู้ช่วย AI ได้ในขณะนี้';
          try {
            const payload = (await res.json()) as { error?: string };
            if (payload.error) errMsg = payload.error;
          } catch {
            // Keep default message
          }
          throw new Error(errMsg);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('ไม่พบสตรีมข้อมูลตอบกลับจากเซิร์ฟเวอร์');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const rawEvent of events) {
            const dataLine = rawEvent
              .split('\n')
              .find((l) => l.startsWith('data: '));
            if (!dataLine) continue;

            const parsed = JSON.parse(dataLine.slice(6)) as {
              type: 'chunk' | 'done' | 'error' | 'task_proposal' | 'usage';
              text?: string;
              error?: string;
              task?: { title: string; notes?: string; dueDate?: string };
            };

            if (parsed.type === 'error') {
              throw new Error(parsed.error || 'เกิดข้อผิดพลาดระหว่างรับคำตอบจาก Gemini API');
            }

            if (parsed.type === 'usage') {
              void fetchCharacterStatuses();
              continue;
            }

            if (parsed.type === 'task_proposal' && parsed.task?.title) {
              receivedProposal = true;
              const taskPayload = parsed.task;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        taskProposal: {
                          title: taskPayload.title,
                          notes: taskPayload.notes,
                          dueDate: taskPayload.dueDate,
                          status: 'pending',
                        },
                      }
                    : m
                )
              );
            }

            if (parsed.type === 'chunk' && parsed.text) {
              accumulated += parsed.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: accumulated } : m
                )
              );
            }
          }
        }

        if (!accumulated.trim() && !receivedProposal) {
          throw new Error('ไม่ได้รับข้อความตอบกลับจากผู้ช่วย AI กรุณาลองส่งใหม่อีกครั้ง');
        }

        soundEngine.playMessageReceived();
        setAssistantMood('speaking');
        handleUpdateCharacterActivity('mina', {
          busy: false,
          taskLabel: null,
          errorReason: null,
          errorCode: null,
        });
        if (receivedProposal) {
          showMinaBubble('เตรียมงานแล้ว กดยืนยันได้เลยครับ!', 5000);
        } else {
          const shortPreview = accumulated
            .replace(/[#*`>\n]+/g, ' ')
            .trim()
            .slice(0, 24);
          showMinaBubble(shortPreview ? `${shortPreview}…` : 'เรียบร้อยแล้วครับ!', 5000);
        }
        window.setTimeout(() => {
          setAssistantMood((curr) => (curr === 'speaking' ? 'idle' : curr));
        }, 3500);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          handleUpdateCharacterActivity('mina', {
            busy: false,
            taskLabel: null,
          });
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Gemini API';
        setApiError(message);
        setAssistantMood('idle');
        handleUpdateCharacterActivity('mina', {
          busy: false,
          taskLabel: null,
          errorReason: message,
        });
        // Remove empty placeholder assistant message on error
        setMessages((prev) =>
          prev.filter(
            (m) => !(m.id === assistantMsgId && m.content === '' && !m.taskProposal)
          )
        );
      } finally {
        setIsStreaming(false);
        void fetchCharacterStatuses();
      }
    },
    [fetchCharacterStatuses, handleUpdateCharacterActivity, showMinaBubble, timeOfDay]
  );

  const handleConfirmChatTask = useCallback(
    async (
      messageId: string,
      payload: { title: string; notes?: string; dueDate?: string }
    ) => {
      if (!youtubeToken) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.taskProposal
              ? {
                  ...m,
                  taskProposal: {
                    ...m.taskProposal,
                    title: payload.title,
                    notes: payload.notes,
                    dueDate: payload.dueDate,
                    status: 'error',
                    errorMessage: 'กรุณากด Sign in with Google เพื่อเชื่อมต่อสิทธิ์ Google Tasks ก่อนครับ',
                  },
                }
              : m
          )
        );
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.taskProposal
            ? {
                ...m,
                taskProposal: {
                  ...m.taskProposal,
                  title: payload.title,
                  notes: payload.notes,
                  dueDate: payload.dueDate,
                  status: 'saving',
                  errorMessage: undefined,
                },
              }
            : m
        )
      );

      try {
        const created = await createTask(youtubeToken, '@default', payload);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.taskProposal
              ? {
                  ...m,
                  taskProposal: {
                    ...m.taskProposal,
                    title: created.title,
                    notes: created.notes ?? payload.notes,
                    dueDate: payload.dueDate,
                    status: 'added',
                    createdTaskId: created.id,
                    errorMessage: undefined,
                  },
                }
              : m
          )
        );

        soundEngine.playMessageReceived();
        setAssistantMood('pinning');
        setMinaMission({ id: Date.now(), taskTitle: created.title });
        showToast(
          `เพิ่มงาน “${created.title}” ลง Google Tasks แล้ว — มีน่ากำลังเดินไปปักหมุดที่กระดานโน้ต`,
          'mina'
        );
      } catch (err) {
        if (err instanceof GoogleTasksApiError && (err.status === 401 || err.status === 403)) {
          handleYouTubeTokenExpired();
        }
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'ไม่สามารถเพิ่มงานลง Google Tasks ได้ในขณะนี้';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.taskProposal
              ? {
                  ...m,
                  taskProposal: {
                    ...m.taskProposal,
                    status: 'error',
                    errorMessage,
                  },
                }
              : m
          )
        );
      }
    },
    [handleYouTubeTokenExpired, showToast, youtubeToken]
  );

  const handleCancelChatTask = useCallback((messageId: string) => {
    soundEngine.playInteract();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.taskProposal
          ? {
              ...m,
              taskProposal: {
                ...m.taskProposal,
                status: 'cancelled',
                errorMessage: undefined,
              },
            }
          : m
      )
    );
  }, []);

  const handleMinaMissionEvent = useCallback(
    (event: 'started' | 'pinned' | 'returned', _taskTitle: string) => {
      if (event === 'started') {
        setAssistantMood('pinning');
        showMinaBubble('กำลังเดินไปติดโน้ตที่กระดานครับ!', 3500);
      } else if (event === 'pinned') {
        setExtraPinCount((c) => c + 1);
        showMinaBubble('ปักหมุดงานบนกระดานเรียบร้อย!', 2800);
      } else if (event === 'returned') {
        setAssistantMood((curr) => (curr === 'pinning' ? 'idle' : curr));
        showMinaBubble('ติดโน้ตเสร็จแล้วครับ มีอะไรให้ช่วยต่อไหม?', 3600);
      }
    },
    [showMinaBubble]
  );

  const handleSendMessage = (text: string) => {
    soundEngine.playMessageSent();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      mode: workMode,
      createdAt: Date.now(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    void streamAssistantResponse(nextHistory, workMode);
  };

  const handleRetryLast = () => {
    if (isStreaming || messages.length === 0) return;
    // Retry from last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const trimmedHistory = messages.slice(0, actualIdx + 1);
    setMessages(trimmedHistory);
    void streamAssistantResponse(trimmedHistory, workMode);
  };

  const handleClearChat = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setMessages([]);
    setApiError(null);
    setAssistantMood('idle');
    showMinaBubble('เริ่มหัวข้อใหม่กันได้เลยครับ!');
  };

  const handleSaveDraft = (msg: ChatMessage) => {
    const firstLine = msg.content
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').replace(/[*`]/g, '').trim())
      .find((l) => l.length > 0);
    const title = firstLine ? firstLine.slice(0, 48) : 'เอกสารร่างจากมีน่า';

    const newDraft: SavedDraft = {
      id: `draft-${Date.now()}`,
      title,
      content: msg.content,
      mode: msg.mode,
      createdAt: Date.now(),
    };
    setDrafts((prev) => [newDraft, ...prev]);
    soundEngine.playInteract();
    showToast('บันทึกคำตอบลงในคลังฉบับร่างเรียบร้อยครับ', 'mina');
  };

  const handleDeleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  if (gameState === 'TITLE_MENU') {
    return <TitleScreen onStart={handleStartGame} />;
  }

  const isWorking = gameState === 'WORKING';

  return (
    <div
      ref={appRootRef}
      className="flex h-screen w-screen flex-col overflow-hidden bg-[#1C1917] text-[#F5EFE6]"
    >
      {!isFullscreenMap && (
        <TopHud
          zone={zone}
          gameState={gameState}
          timeOfDay={timeOfDay}
          muted={muted}
          showHelp={showHelp}
          onChangeTimeOfDay={(tod) => {
            soundEngine.playInteract();
            setTimeOfDay(tod);
          }}
          onToggleMute={handleToggleMute}
          onToggleHelp={() => setShowHelp((s) => !s)}
          onToggleWorkspace={handleToggleWorkspace}
          onToggleFullscreenMap={toggleFullscreenMap}
        />
      )}

      {/* Main Split Stage: 2D Pixel House + Slide-in Home Office AI Workspace */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left/Center: 2D Pixel Art House Viewport */}
        <main
          className={`relative flex min-h-0 flex-1 flex-col items-center justify-center ${
            isFullscreenMap ? 'p-0' : 'p-2 sm:p-3'
          }`}
        >
          <div className="relative flex h-full w-full flex-col items-center justify-center">
            {/* Compact Camera Focus & Zoom Bar (never overlaps canvas furniture) */}
            {!isFullscreenMap && (
              <div className="mb-2.5 flex w-full flex-wrap items-center justify-between gap-2 px-1">
                <div
                  role="group"
                  aria-label="เลือกจุดโฟกัสกล้อง"
                  className="flex flex-wrap items-center gap-1 rounded-lg border border-[#2F2823] bg-[#211C18] p-1"
                >
                  {(
                    [
                      { id: 'follow', label: 'ตามตัว', icon: Crosshair },
                      { id: 'overview', label: 'ทั้งบ้าน', icon: Maximize2 },
                      { id: 'living', label: 'พักผ่อน' },
                      { id: 'office', label: 'ทำงาน' },
                      { id: 'kitchen', label: 'ครัว' },
                      { id: 'bathroom', label: 'ห้องน้ำ' },
                    ] as Array<{ id: CameraPresetId; label: string; icon?: typeof Crosshair }>
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = cameraUi.activePreset === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.currentTarget.blur();
                          soundEngine.playInteract();
                          setCameraCommand({ id: Date.now(), type: 'preset', preset: item.id });
                        }}
                        className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                          active
                            ? 'bg-[#D97736] text-[#FAF6F0]'
                            : 'text-[#B8ABA0] hover:bg-[#2C251F] hover:text-[#FAF6F0]'
                        }`}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <div
                    role="group"
                    aria-label="ปรับระดับการซูมแผนที่"
                    className="flex items-center gap-1 rounded-lg border border-[#2F2823] bg-[#211C18] p-1"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setCameraCommand({ id: Date.now(), type: 'zoom_step', delta: -0.18 });
                      }}
                      disabled={cameraUi.zoomPercent <= Math.round(CAMERA_MIN_ZOOM * 100)}
                      aria-label="ซูมออก"
                      title="ซูมออก (-)"
                      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[#D8CEC2] transition-colors hover:bg-[#2F2823] hover:text-[#FAF6F0] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setCameraCommand({ id: Date.now(), type: 'reset_zoom' });
                      }}
                      title="รีเซ็ตซูม 100%"
                      className="min-w-[46px] cursor-pointer rounded-md px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-[#E5DCD0] transition-colors hover:bg-[#2F2823]"
                    >
                      {cameraUi.zoomPercent}%
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setCameraCommand({ id: Date.now(), type: 'zoom_step', delta: 0.18 });
                      }}
                      disabled={cameraUi.zoomPercent >= Math.round(CAMERA_MAX_ZOOM * 100)}
                      aria-label="ซูมเข้า"
                      title="ซูมเข้า (+)"
                      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[#D8CEC2] transition-colors hover:bg-[#2F2823] hover:text-[#FAF6F0] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      enterFullscreenMap();
                    }}
                    aria-label="แสดงแมพทั้งแมพแบบเต็มจอ"
                    title="แสดงแมพทั้งแมพแบบเต็มจอ (F)"
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#2F2823] bg-[#211C18] px-2.5 text-xs font-medium text-[#D8CEC2] transition-colors duration-150 hover:border-[#D97736] hover:bg-[#2C241E] hover:text-[#FAF6F0]"
                  >
                    <Expand className="h-3.5 w-3.5" />
                    <span>เต็มจอ</span>
                  </button>
                </div>
              </div>
            )}

            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
              <div className="relative h-full w-full">
                <GameCanvas
                  gameState={gameState}
                  playerSeat={playerSeat}
                  timeOfDay={timeOfDay}
                  assistantMood={assistantMood}
                  minaBubbleText={minaBubbleText}
                  minaMission={minaMission}
                  minaSummonCommand={minaSummonCommand}
                  cameraCommand={cameraCommand}
                  isMinaMenuOpen={Boolean(minaActionMenu)}
                  extraPinCount={extraPinCount}
                  isTvOn={isTvOpen}
                  isDriveOpen={isDriveOpen}
                  isAntigravityOpen={isAntigravityOpen}
                  isAiStudioOpen={isAiStudioOpen}
                  characterStatuses={characterStatuses}
                  isModalOpen={
                    isTvOpen ||
                    isPinboardOpen ||
                    isDriveOpen ||
                    isAntigravityOpen ||
                    isAiStudioOpen
                  }
                  isFullscreenMap={isFullscreenMap}
                  onZoneChange={handleZoneChange}
                  onNearestChange={setNearestInteractable}
                  onInteract={handleInteract}
                  onStandUp={() => setPlayerSeat(null)}
                  onRequestMinaMenu={handleRequestMinaMenu}
                  onDismissMinaMenu={handleDismissMinaMenu}
                  onMinaSummonArrived={handleMinaSummonArrived}
                  onMinaMissionEvent={handleMinaMissionEvent}
                  onMinaProximityEvent={handleMinaProximityEvent}
                  onAntigravityProximityEvent={handleAntigravityProximityEvent}
                  onAiStudioProximityEvent={handleAiStudioProximityEvent}
                  onCameraChange={setCameraUi}
                />

                {/* Minimal 2-button floating chooser when clicking Mina at her computer desk */}
                {minaActionMenu &&
                  !isWorking &&
                  !isTvOpen &&
                  !isPinboardOpen &&
                  !isDriveOpen &&
                  !isAntigravityOpen &&
                  !isAiStudioOpen && (
                  <div
                    role="menu"
                    aria-label="เลือกวิธีเริ่มสนทนากับมีน่า"
                    style={{
                      left: `${Math.round(Math.max(12, Math.min(76, minaActionMenu.normX * 100 - 12)))}%`,
                      top: `${Math.round(minaActionMenu.normY * 100)}%`,
                    }}
                    className="absolute z-20 flex -translate-y-1/2 flex-col gap-1.5 rounded-lg border border-[#54453A] bg-[#241E1A]/95 p-1.5 shadow-xl backdrop-blur-xs"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelectMinaSummonMode('walk_then_chat')}
                      className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-[#473B32] bg-[#2E2620] px-3 py-1.5 text-xs font-medium text-[#FAF6F0] transition-colors hover:border-[#D97736] hover:bg-[#3A2E25]"
                    >
                      <Footprints className="h-3.5 w-3.5 shrink-0 text-[#E5985B]" />
                      <span>เดินมาหาแล้วคุย</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelectMinaSummonMode('chat_then_walk')}
                      className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-[#473B32] bg-[#2E2620] px-3 py-1.5 text-xs font-medium text-[#FAF6F0] transition-colors hover:border-[#6B9080] hover:bg-[#2B332F]"
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#8CB8A5]" />
                      <span>เริ่มคุยทันที</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom contextual action bar (never overlaps canvas furniture) */}
            {!isFullscreenMap && (
              <div className="mt-2.5 flex min-h-10 w-full flex-wrap items-center justify-between gap-3 px-1 text-xs text-[#A89C90]">
                {!isWorking && playerSeat ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playInteract();
                      setPlayerSeat(null);
                    }}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#D97736] px-3.5 py-2 text-xs font-semibold text-[#FAF6F0] transition-colors hover:bg-[#C6682A]"
                  >
                    <span className="font-pixel rounded bg-[#231D19]/40 px-1.5 py-0.5 text-[10px]">
                      E
                    </span>
                    <span>
                      {playerSeat === 'workdesk'
                        ? 'กำลังนั่งหน้าคอมพิวเตอร์ — ลุกจากโต๊ะ'
                        : playerSeat === 'sofa'
                          ? 'กำลังนั่งพักบนโซฟา — ลุกจากโซฟา'
                          : 'กำลังนั่งที่โต๊ะอาหารคริสต์มาส — ลุกจากเก้าอี้'}
                    </span>
                  </button>
                ) : !isWorking && nearestInteractable ? (
                  <button
                    type="button"
                    onClick={() => handleInteract(nearestInteractable.id)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#D97736] px-3.5 py-2 text-xs font-semibold text-[#FAF6F0] transition-colors hover:bg-[#C6682A]"
                  >
                    <span className="font-pixel rounded bg-[#231D19]/40 px-1.5 py-0.5 text-[10px]">
                      E
                    </span>
                    <span>
                      {nearestInteractable.label} — {nearestInteractable.actionLabel}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-[#B8ABA0]">
                    <Compass className="h-3.5 w-3.5 text-[#D9A066]" />
                    <span>
                      {isWorking
                        ? 'กำลังยืนสนทนากับมีน่า (กด Esc เพื่อจบการสนทนา)'
                        : zone === 'living'
                          ? 'นั่งพักบนโซฟา ดูทีวี YouTube หรือเดินลงด้านล่างเข้าห้องครัว'
                          : zone === 'office'
                            ? 'ห้องทำงาน — เดินเข้าใกล้ มีน่า, Antigravity หรือ Google AI Studio เพื่อดูสถานะและเริ่มคุยงาน'
                            : zone === 'kitchen'
                              ? 'ห้องครัวครอบครัว — นั่งเก้าอี้โต๊ะอาหารทั้ง 4 ตัว ฉลองมื้อไก่งวงคริสต์มาสวันครอบครัวอบอุ่น'
                              : 'ห้องน้ำและห้องอาบน้ำ — วางเมาส์ค้างบนสิ่งของประมาณ 2 วินาที เพื่อดูชื่อและรายละเอียด'}
                    </span>
                  </div>
                )}

                <span className="hidden text-[#7D7065] sm:inline">
                  คลิกซ้ายค้างแล้วลากเพื่อดึงดูรอบแมพ (ปล่อยเมาส์เพื่อกลับมาที่ตัวละคร) · สกรอลล์ซูม
                </span>
              </div>
            )}
          </div>

          {/* Minimal exit button & contextual interact cue in fullscreen mode (all other top buttons hidden) */}
          {isFullscreenMap && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  exitFullscreenMap();
                }}
                aria-label="ออกจากมุมมองเต็มจอ"
                title="ออกจากมุมมองเต็มจอ (Esc / F)"
                className="absolute top-3 right-3 z-20 inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#3B3129] bg-[#181512]/75 px-2.5 text-xs font-medium text-[#FAF6F0] opacity-60 shadow-lg backdrop-blur-xs transition-all duration-150 hover:border-[#D97736] hover:bg-[#2E251F] hover:opacity-100"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span>ออกจากเต็มจอ</span>
              </button>

              {!isWorking && (playerSeat || nearestInteractable) && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
                  {playerSeat ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playInteract();
                        setPlayerSeat(null);
                      }}
                      className="pointer-events-auto inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#D97736] px-3.5 py-2 text-xs font-semibold text-[#FAF6F0] shadow-xl transition-colors hover:bg-[#C6682A]"
                    >
                      <span className="font-pixel rounded bg-[#231D19]/40 px-1.5 py-0.5 text-[10px]">
                        E
                      </span>
                      <span>
                        {playerSeat === 'workdesk'
                          ? 'กำลังนั่งหน้าคอมพิวเตอร์ — ลุกจากโต๊ะ'
                          : playerSeat === 'sofa'
                            ? 'กำลังนั่งพักบนโซฟา — ลุกจากโซฟา'
                            : 'กำลังนั่งที่โต๊ะอาหารคริสต์มาส — ลุกจากเก้าอี้'}
                      </span>
                    </button>
                  ) : (
                    nearestInteractable && (
                      <button
                        type="button"
                        onClick={() => handleInteract(nearestInteractable.id)}
                        className="pointer-events-auto inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#D97736] px-3.5 py-2 text-xs font-semibold text-[#FAF6F0] shadow-xl transition-colors hover:bg-[#C6682A]"
                      >
                        <span className="font-pixel rounded bg-[#231D19]/40 px-1.5 py-0.5 text-[10px]">
                          E
                        </span>
                        <span>
                          {nearestInteractable.label} — {nearestInteractable.actionLabel}
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}
            </>
          )}

          {/* Cozy Dialogue / Activity Toast */}
          {toast && (
            <div
              role="status"
              className="pointer-events-none absolute top-5 left-1/2 z-20 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-[#4A3E35] bg-[#241E1A]/95 px-4 py-2.5 text-sm text-[#FAF6F0] shadow-xl backdrop-blur-xs"
            >
              {toast.speaker === 'player' ? (
                <img
                  src={ASSETS.playerPortrait}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="pixelated h-7 w-7 shrink-0 rounded border border-[#5B4D42] object-cover"
                />
              ) : toast.speaker === 'mina' ? (
                <img
                  src={ASSETS.minaPortrait}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="pixelated h-7 w-7 shrink-0 rounded border border-[#5B4D42] object-cover"
                />
              ) : (
                <Coffee className="h-4 w-4 shrink-0 text-[#D9A066]" />
              )}
              <span className="leading-snug">{toast.text}</span>
            </div>
          )}

          {/* Controls Help Overlay */}
          {showHelp && (
            <div className="absolute top-4 right-4 z-30 w-80 rounded-xl border border-[#443A32] bg-[#221D19]/96 p-5 text-sm text-[#E5DCD0] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#362E28] pb-3">
                <h3 className="font-display font-semibold text-[#FAF6F0]">
                  คู่มือการเล่น Cozy Desk
                </h3>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  aria-label="ปิดคู่มือ"
                  className="cursor-pointer rounded p-1 text-[#A89C90] hover:text-[#FAF6F0]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#CFC4B6]">
                <li>
                  <strong className="text-[#FAF6F0]">WASD / ปุ่มลูกศร:</strong> เดินไปรอบห้องพักผ่อน ห้องทำงาน ห้องครัว และห้องน้ำ
                </li>
                <li>
                  <strong className="text-[#FAF6F0]">คลิกบนพื้นหรือเฟอร์นิเจอร์:</strong> เดินไปยังจุดนั้นอัตโนมัติ (ข้ามประตูให้เอง)
                </li>
                <li>
                  <strong className="text-[#FAF6F0]">ปุ่ม E หรือคลิกสิ่งของ:</strong> โต้ตอบกาแฟ โซฟา ทีวี (YouTube) กระดานโน้ต (Google Tasks) โต๊ะเอกสารกลางห้อง (Google Drive) หน้าต่าง หรือชั้นหนังสือ
                </li>
                <li>
                  <strong className="text-[#FAF6F0]">ทีม AI ในห้องทำงาน (มีน่า / Antigravity / Google AI Studio):</strong> เดินเข้าใกล้รัศมีตัวละครเพื่อดูป้ายสถานะ Token, งานที่กำลังทำ หรือเหตุผลเมื่อใช้งานไม่ได้ แล้วกด E หรือคลิกที่โต๊ะเพื่อเปิดใช้งาน
                </li>
                <li>
                  <strong className="text-[#FAF6F0]">ซูมและเลือกจุดโฟกัสกล้อง:</strong> หมุนลูกกลิ้งเมาส์ (หรือปุ่ม +/-) เพื่อซูม, ลากบนแผนที่หรือคลิกขวาเพื่อเลือกจุดโฟกัสเอง, กด 0 ดูทั้งบ้าน, กด F แสดงแมพทั้งแมพแบบเต็มจอ หรือกด C เพื่อกลับมาตามตัวละคร
                </li>
                <li>
                  <strong className="text-[#FAF6F0]">สำรวจสิ่งของ (ห้องน้ำ):</strong> วางเมาส์ทาบค้างไว้บนวัตถุในห้องน้ำประมาณ 2 วินาที เพื่อแสดงชื่อและรายละเอียดของสิ่งนั้น
                </li>
                <li>
                  <strong className="text-[#FAF6F0]">ปุ่ม Esc:</strong> จบการสนทนากลับไปเดินเล่นในบ้าน
                </li>
              </ul>
            </div>
          )}
        </main>

        {/* Right: Home Office Gemini Workspace Drawer */}
        {isWorking && (
          <div className="h-[58vh] w-full shrink-0 lg:h-full lg:w-[440px] xl:w-[480px]">
            <WorkspacePanel
              messages={messages}
              drafts={drafts}
              workMode={workMode}
              assistantMood={assistantMood}
              isStreaming={isStreaming}
              error={apiError}
              googleUser={googleUser}
              accessToken={youtubeToken}
              isSigningInGoogle={isSigningInGoogle}
              googleAuthError={googleAuthError}
              onGoogleSignIn={() => void handleGoogleSignIn()}
              onChangeWorkMode={setWorkMode}
              onSendMessage={handleSendMessage}
              onRetryLast={handleRetryLast}
              onClearChat={handleClearChat}
              onSaveDraft={handleSaveDraft}
              onDeleteDraft={handleDeleteDraft}
              onConfirmChatTask={handleConfirmChatTask}
              onCancelChatTask={handleCancelChatTask}
              onOpenPinboard={() => {
                soundEngine.playInteract();
                setIsPinboardOpen(true);
              }}
              onCloseWorkspace={handleToggleWorkspace}
            />
          </div>
        )}
      </div>
      {isTvOpen && (
        <TvModal
          feedItems={allTvFeed}
          activeItem={activeTvItem}
          googleUser={googleUser}
          accessToken={youtubeToken}
          isSigningIn={isSigningInGoogle}
          authError={googleAuthError}
          onGoogleSignIn={() => void handleGoogleSignIn()}
          onGoogleSignOut={() => void handleGoogleSignOut()}
          onTokenExpired={handleYouTubeTokenExpired}
          onSelectItem={(item) => {
            soundEngine.playInteract();
            setActiveTvItem(item);
          }}
          onBackToFeed={() => {
            soundEngine.playInteract();
            setActiveTvItem(null);
          }}
          onAddCustomItem={handleAddCustomTvItem}
          onDeleteCustomItem={handleDeleteCustomTvItem}
          onClose={() => {
            soundEngine.playInteract();
            setIsTvOpen(false);
          }}
        />
      )}
      {isPinboardOpen && (
        <TasksPinboardModal
          googleUser={googleUser}
          accessToken={youtubeToken}
          isSigningIn={isSigningInGoogle}
          authError={googleAuthError}
          onGoogleSignIn={() => void handleGoogleSignIn()}
          onGoogleSignOut={() => void handleGoogleSignOut()}
          onTokenExpired={handleYouTubeTokenExpired}
          onClose={() => {
            soundEngine.playInteract();
            setIsPinboardOpen(false);
          }}
        />
      )}
      {isDriveOpen && (
        <DriveTableModal
          googleUser={googleUser}
          accessToken={youtubeToken}
          isSigningIn={isSigningInGoogle}
          authError={googleAuthError}
          onGoogleSignIn={() => void handleGoogleSignIn()}
          onGoogleSignOut={() => void handleGoogleSignOut()}
          onTokenExpired={handleYouTubeTokenExpired}
          onClose={() => {
            soundEngine.playInteract();
            setIsDriveOpen(false);
          }}
        />
      )}
      <AntigravityModal
        isOpen={isAntigravityOpen}
        statusSnapshot={characterStatuses.antigravity}
        onTaskActivityChange={(activity) =>
          handleUpdateCharacterActivity('antigravity', activity)
        }
        onBackgroundComplete={(taskSummary) => {
          showToast(`Antigravity ทำงานเสร็จแล้ว: ${taskSummary}`, 'house');
        }}
        onRefreshStatus={() => void fetchCharacterStatuses()}
        onClose={() => {
          soundEngine.playInteract();
          setIsAntigravityOpen(false);
        }}
      />
      <AiStudioModal
        isOpen={isAiStudioOpen}
        statusSnapshot={characterStatuses.ai_studio}
        onTaskActivityChange={(activity) =>
          handleUpdateCharacterActivity('ai_studio', activity)
        }
        onBackgroundComplete={(taskSummary) => {
          showToast(`Google AI Studio ทำงานเสร็จแล้ว: ${taskSummary}`, 'house');
        }}
        onRefreshStatus={() => void fetchCharacterStatuses()}
        onClose={() => {
          soundEngine.playInteract();
          setIsAiStudioOpen(false);
        }}
      />
    </div>
  );
}
