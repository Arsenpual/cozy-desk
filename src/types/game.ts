export type GameState = 'TITLE_MENU' | 'PLAYING' | 'WORKING';

export type RoomZone = 'living' | 'office' | 'kitchen' | 'bathroom';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export type WorkMode = 'qa' | 'brainstorm' | 'draft';

export type AssistantMood = 'idle' | 'greeting' | 'thinking' | 'speaking' | 'pinning';

export type FacingDirection = 'up' | 'down' | 'left' | 'right';

export type CameraFocusMode = 'follow' | 'free';

export type CameraPresetId = 'follow' | 'overview' | 'living' | 'office' | 'kitchen' | 'bathroom';

export interface CameraTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface CameraUiState {
  zoomPercent: number;
  focusMode: CameraFocusMode;
  activePreset: CameraPresetId | null;
}

export type CameraCommand =
  | { id: number; type: 'preset'; preset: CameraPresetId }
  | { id: number; type: 'zoom_step'; delta: number }
  | { id: number; type: 'reset_zoom' };

export type MinaMissionPhase =
  | 'working_at_desk'
  | 'approaching_player'
  | 'summoned_to_player'
  | 'greeting_player'
  | 'walking_to_board'
  | 'pinning'
  | 'walking_back';

export type MinaSummonMode = 'walk_then_chat' | 'chat_then_walk';

export interface MinaSummonCommand {
  id: number;
  mode: MinaSummonMode;
}

export interface MinaActionMenuAnchor {
  normX: number;
  normY: number;
}

export interface MinaNpcState {
  x: number;
  y: number;
  facing: FacingDirection;
  isMoving: boolean;
  walkFrame: number;
  phase: MinaMissionPhase;
  pinProgress: number;
}

export interface MinaPinMission {
  id: number;
  taskTitle: string;
}

export type TaskProposalStatus = 'pending' | 'saving' | 'added' | 'cancelled' | 'error';

export interface ChatTaskProposal {
  title: string;
  notes?: string;
  dueDate?: string;
  status: TaskProposalStatus;
  createdTaskId?: string;
  errorMessage?: string;
}

export type PlayerSeatId = 'workdesk' | 'sofa';

export type SofaActivity = 'tea' | 'newspaper' | 'tv_remote';

export type ShowerPhase = 'wetting' | 'grab_soap' | 'scrub_soap' | 'return_soap' | 'rinse';

export type InteractableId =
  | 'coffee'
  | 'sofa'
  | 'window'
  | 'bookshelf'
  | 'clock'
  | 'tv'
  | 'pinboard'
  | 'workdesk'
  | 'drive_table'
  | 'mina_desk';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  starred?: boolean;
  ownerName?: string;
  parents?: string[];
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
  updated?: string;
}

export interface TvFeedItem {
  id: string;
  title: string;
  channel: string;
  category: string;
  videoId: string;
  duration?: string;
  isLive?: boolean;
  isCustom?: boolean;
  publishedAt?: string;
  thumbnailUrl?: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  itemCount: number;
  thumbnailUrl?: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InteractableObject {
  id: InteractableId;
  zone: RoomZone;
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
  interactRadius: number;
}

export interface InspectableObject {
  id: string;
  zone: RoomZone;
  areaLabel: string;
  name: string;
  detail: string;
  x: number;
  y: number;
  w: number;
  h: number;
  priority?: number;
}

export interface InspectHoverRenderState {
  object: InspectableObject;
  /** 0..1 fill progress shown between hint delay and 2s reveal */
  progress: number;
  revealed: boolean;
  pointerVx: number;
  pointerVy: number;
}

export interface PlayerState {
  x: number;
  y: number;
  facing: FacingDirection;
  isMoving: boolean;
  walkFrame: number;
  isSitting: boolean;
  seat: PlayerSeatId | null;
  sofaActivity: SofaActivity | null;
  sofaActivityElapsed: number;
  isShowering: boolean;
  showerPhase: ShowerPhase | null;
  showerPhaseElapsed: number;
  showerPrivacyProgress: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: WorkMode;
  createdAt: number;
  taskProposal?: ChatTaskProposal;
}

export interface SavedDraft {
  id: string;
  title: string;
  content: string;
  mode: WorkMode;
  createdAt: number;
}

export interface WorldToast {
  id: number;
  text: string;
  speaker?: 'player' | 'mina' | 'house';
}

export const ASSETS = {
  minaPortrait: '/src/assets/images/pixel_assistant_mina_1795272162729.jpg',
  playerPortrait: '/src/assets/images/pixel_player_avatar_1795272163275.jpg',
  homeBanner: '/src/assets/images/pixel_home_title_banner_1795272163110.jpg',
} as const;
