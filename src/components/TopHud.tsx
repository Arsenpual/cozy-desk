import {
  Expand,
  HelpCircle,
  LampDesk,
  Moon,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { GameState, RoomZone, TimeOfDay } from '../types/game';

interface TopHudProps {
  zone: RoomZone;
  gameState: GameState;
  timeOfDay: TimeOfDay;
  muted: boolean;
  showHelp: boolean;
  onChangeTimeOfDay: (time: TimeOfDay) => void;
  onToggleMute: () => void;
  onToggleHelp: () => void;
  onToggleWorkspace: () => void;
  onToggleFullscreenMap?: () => void;
}

const TIME_OPTIONS: Array<{ id: TimeOfDay; label: string; icon: typeof Sun }> = [
  { id: 'morning', label: 'เช้า', icon: Sun },
  { id: 'afternoon', label: 'บ่าย', icon: Sunset },
  { id: 'evening', label: 'ค่ำ', icon: Moon },
];

export function TopHud({
  zone,
  gameState,
  timeOfDay,
  muted,
  showHelp,
  onChangeTimeOfDay,
  onToggleMute,
  onToggleHelp,
  onToggleWorkspace,
  onToggleFullscreenMap,
}: TopHudProps) {
  const isWorking = gameState === 'WORKING';

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#2F2823] bg-[#181512] px-4 sm:px-6">
      {/* Left: Brand & quiet unboxed zone indicator */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-display shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-[#FAF6F0]">
          Cozy Desk
        </span>
        <span aria-hidden="true" className="text-[#594E45]">
          ·
        </span>
        <span className="truncate text-sm font-medium text-[#D8CEC2]">
          {zone === 'office'
            ? 'ห้องทำงาน'
            : zone === 'kitchen'
              ? 'ห้องครัว'
              : zone === 'bathroom'
                ? 'ห้องน้ำ'
                : 'ห้องพักผ่อน'}
        </span>
      </div>

      {/* Right: Functional controls only */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Time-of-day segmented control */}
        <div
          role="group"
          aria-label="เลือกช่วงเวลาแสงในบ้าน"
          className="hidden items-center gap-0.5 rounded-lg bg-[#241F1B] p-1 sm:flex"
        >
          {TIME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = timeOfDay === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeTimeOfDay(opt.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-[#3A312A] text-[#FAF6F0]'
                    : 'text-[#A89C90] hover:text-[#FAF6F0]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* End conversation button (only visible while actively talking with Mina inside her radius) */}
        {isWorking && (
          <button
            type="button"
            onClick={onToggleWorkspace}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#473D35] bg-[#29231E] px-3.5 text-xs font-semibold text-[#FAF6F0] transition-colors duration-150 hover:bg-[#342C26]"
          >
            <LampDesk className="h-3.5 w-3.5" />
            <span>จบการสนทนา</span>
          </button>
        )}

        {/* Fullscreen full-map view toggle */}
        {onToggleFullscreenMap && (
          <button
            type="button"
            onClick={onToggleFullscreenMap}
            aria-label="แสดงแมพทั้งแมพแบบเต็มจอ"
            title="แสดงแมพทั้งแมพแบบเต็มจอ (F)"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#2F2823] bg-[#211C18] text-[#D8CEC2] transition-colors duration-150 hover:border-[#D97736] hover:text-[#FAF6F0]"
          >
            <Expand className="h-4 w-4" />
          </button>
        )}

        {/* Mute toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'เปิดเสียงเอฟเฟกต์' : 'ปิดเสียงเอฟเฟกต์'}
          title={muted ? 'เปิดเสียงเอฟเฟกต์' : 'ปิดเสียงเอฟเฟกต์'}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#2F2823] bg-[#211C18] text-[#D8CEC2] transition-colors duration-150 hover:border-[#473D35] hover:text-[#FAF6F0]"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Controls help toggle */}
        <button
          type="button"
          onClick={onToggleHelp}
          aria-label="ดูวิธีควบคุมเกม"
          title="วิธีควบคุมเกม"
          className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors duration-150 ${
            showHelp
              ? 'border-[#D97736] bg-[#33271F] text-[#FAF6F0]'
              : 'border-[#2F2823] bg-[#211C18] text-[#D8CEC2] hover:border-[#473D35] hover:text-[#FAF6F0]'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
