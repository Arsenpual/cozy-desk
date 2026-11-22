import type {
  AssistantMood,
  CameraTransform,
  InspectHoverRenderState,
  InteractableObject,
  MinaNpcState,
  PlayerState,
  TimeOfDay,
} from '../types/game';
import {
  CAMERA_BASE_SCALE,
  CENTER_TABLE_RECT,
  DIVIDER_COL,
  DOOR_ROW_END,
  DOOR_ROW_START,
  getRoomZone,
  KITCHEN_DINING_RECT,
  MID_WALL_ROW,
  MINA_APPROACH_RADIUS,
  MINA_POS,
  SOUTH_WALL_ROW,
  TILE,
  VIEW_H,
  VIEW_W,
  WORK_SEAT_POS,
  WORLD_H,
  WORLD_W,
} from './houseMap';
import {
  drawBathroomFurniture,
  drawGlassShowerEnclosure,
  drawKitchenDiningTable,
  drawKitchenFurniture,
  drawLowerRoomFloors,
  drawLowerRoomWalls,
} from './lowerRoomsRenderer';

export interface RenderContextState {
  player: PlayerState;
  mina: MinaNpcState;
  extraPinCount: number;
  pinboardGlowTick: number;
  timeOfDay: TimeOfDay;
  assistantMood: AssistantMood;
  minaBubbleText: string | null;
  nearestInteractable: InteractableObject | null;
  clickTarget: { x: number; y: number; ttl: number } | null;
  tick: number;
  isWorking: boolean;
  isTvOn: boolean;
  isDriveOpen: boolean;
  camera: CameraTransform;
  inspectHover?: InspectHoverRenderState | null;
  viewW?: number;
  viewH?: number;
  baseScale?: number;
}

function pxRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawWoodFloor(ctx: CanvasRenderingContext2D) {
  // Living lounge oak floorboards (cols 1..9, rows 2..11)
  for (let row = 2; row <= 11; row++) {
    for (let col = 1; col <= 18; col++) {
      if (col === DIVIDER_COL && (row < DOOR_ROW_START || row > DOOR_ROW_END)) {
        continue;
      }
      const x = col * TILE;
      const y = row * TILE;
      const isOffice = col > DIVIDER_COL;

      const baseA = isOffice ? '#B5895A' : '#C99E6B';
      const baseB = isOffice ? '#AD8152' : '#C29663';
      const plankLine = isOffice ? '#8E663D' : '#9F7446';
      const highlight = isOffice ? '#C29768' : '#D4AB7A';

      pxRect(ctx, x, y, TILE, TILE, (col + row) % 2 === 0 ? baseA : baseB);
      // Horizontal plank dividers
      pxRect(ctx, x, y + 15, TILE, 1, plankLine);
      pxRect(ctx, x, y + 31, TILE, 1, plankLine);
      // Subtle top plank highlight
      pxRect(ctx, x, y + 1, TILE, 1, highlight);
      // Staggered vertical plank joints
      const jointX = ((row * 13 + col * 7) % 22) + 4;
      pxRect(ctx, x + jointX, y, 1, 15, plankLine);
      const jointX2 = ((row * 5 + col * 19) % 22) + 4;
      pxRect(ctx, x + jointX2, y + 16, 1, 15, plankLine);
    }
  }

  // Doorway wooden threshold trim
  const doorX = DIVIDER_COL * TILE;
  pxRect(ctx, doorX, DOOR_ROW_START * TILE, TILE, (DOOR_ROW_END - DOOR_ROW_START + 1) * TILE, '#8B603A');
  pxRect(ctx, doorX + 3, DOOR_ROW_START * TILE + 2, TILE - 6, (DOOR_ROW_END - DOOR_ROW_START + 1) * TILE - 4, '#A47548');
  pxRect(ctx, doorX + 6, DOOR_ROW_START * TILE + 6, TILE - 12, (DOOR_ROW_END - DOOR_ROW_START + 1) * TILE - 12, '#B68657');
}

function drawWalls(
  ctx: CanvasRenderingContext2D,
  timeOfDay: TimeOfDay,
  tick: number,
  extraPinCount: number,
  isPinboardActive: boolean
) {
  // Outer dark timber border shell
  pxRect(ctx, 0, 0, WORLD_W, 10, '#3B281E');
  pxRect(ctx, 0, SOUTH_WALL_ROW * TILE, WORLD_W, TILE, '#3B281E');
  pxRect(ctx, 0, 0, TILE, WORLD_H, '#3B281E');
  pxRect(ctx, 19 * TILE, 0, TILE, WORLD_H, '#3B281E');

  // Inner wood trim on side walls
  pxRect(ctx, TILE - 5, 10, 5, WORLD_H - TILE - 10, '#5B3E2B');
  pxRect(ctx, 19 * TILE, 10, 5, WORLD_H - TILE - 10, '#5B3E2B');

  // North interior walls (Living: warm cream, Office: soft warm sand)
  pxRect(ctx, TILE, 10, 9 * TILE, 2 * TILE - 10, '#E9DFCE');
  pxRect(ctx, 11 * TILE, 10, 8 * TILE, 2 * TILE - 10, '#E3D7C4');

  // Subtle wallpaper vertical stripes
  for (let x = TILE + 8; x < 19 * TILE; x += 16) {
    if (x >= DIVIDER_COL * TILE && x < (DIVIDER_COL + 1) * TILE) continue;
    pxRect(ctx, x, 10, 2, 2 * TILE - 22, 'rgba(130, 102, 74, 0.08)');
  }

  // Wooden wainscoting / baseboard along north wall
  pxRect(ctx, TILE, 2 * TILE - 14, 18 * TILE, 14, '#7A5438');
  pxRect(ctx, TILE, 2 * TILE - 14, 18 * TILE, 2, '#9A6E4D');
  pxRect(ctx, TILE, 2 * TILE - 2, 18 * TILE, 2, '#4A3121');

  // Upper dividing partition wall (col 10)
  const dx = DIVIDER_COL * TILE;
  // Upper divider segment (rows 0..5)
  pxRect(ctx, dx, 0, TILE, DOOR_ROW_START * TILE, '#4B3224');
  pxRect(ctx, dx + 3, 10, TILE - 6, DOOR_ROW_START * TILE - 14, '#6E4A33');
  pxRect(ctx, dx + 4, DOOR_ROW_START * TILE - 10, TILE - 8, 10, '#8D6042');
  // Lower segment of upper divider (rows 9..11, meeting horizontal dividing wall at row 12)
  const lowerY = (DOOR_ROW_END + 1) * TILE;
  const upperLowerH = MID_WALL_ROW * TILE - lowerY;
  pxRect(ctx, dx, lowerY, TILE, upperLowerH, '#4B3224');
  pxRect(ctx, dx + 3, lowerY + 4, TILE - 6, upperLowerH - 4, '#6E4A33');

  // Room label plaques on north wall (subtle painted wood)
  drawWindow(ctx, 2.2 * TILE, 14, 2.8 * TILE, 36, timeOfDay, tick);
  drawWindow(ctx, 16.8 * TILE, 14, 1.8 * TILE, 34, timeOfDay, tick);

  // Festive Christmas fairy light garland along the living room top wall
  drawChristmasWallGarland(ctx, TILE + 4, 11, 8.8 * TILE, tick);

  // Framed pixel winter landscape painting in living room with miniature holiday wreath
  pxRect(ctx, 5.14 * TILE, 17, 26, 24, '#593A25');
  pxRect(ctx, 5.14 * TILE + 3, 20, 20, 18, '#B8D4E3');
  pxRect(ctx, 5.14 * TILE + 3, 29, 20, 9, '#F1F5F9'); // Snowy hill
  pxRect(ctx, 5.14 * TILE + 7, 23, 7, 7, '#2D6A4F'); // Pine tree
  pxRect(ctx, 5.14 * TILE + 9, 21, 3, 3, '#40916C');
  pxRect(ctx, 5.14 * TILE + 17, 22, 3, 3, '#FDE047');
  // Mini festive wreath & red bow above painting
  pxRect(ctx, 5.14 * TILE + 9, 13, 8, 6, '#2D6A4F');
  pxRect(ctx, 5.14 * TILE + 11, 15, 4, 2, '#E9DFCE');
  pxRect(ctx, 5.14 * TILE + 12, 12, 2, 2, '#DC2626');

  // Classic mahogany grandfather pendulum clock beside the fireplace
  drawPendulumClock(ctx, 6.12 * TILE, 14, tick);

  // Cozy fireplace in living room (cols 7..8.8)
  drawFireplace(ctx, 7.0 * TILE, 16, tick);

  // Cork pinboard in office (cols 13..15.5)
  drawPinboard(ctx, 13.1 * TILE, 16, 2.8 * TILE, 28, extraPinCount, isPinboardActive, tick);
}

function drawPendulumClock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number
) {
  const cx = Math.round(x + 11);
  // Floor drop shadow at base
  pxRect(ctx, x + 1, y + 64, 21, 5, 'rgba(28,20,15,0.28)');

  // Ornate carved swan-neck crown & golden brass finial
  pxRect(ctx, x + 3, y + 2, 17, 5, '#4A2818');
  pxRect(ctx, x + 5, y + 1, 5, 3, '#6B3D24');
  pxRect(ctx, x + 13, y + 1, 5, 3, '#6B3D24');
  pxRect(ctx, x + 10, y - 2, 3, 4, '#E9C46A'); // Brass top finial
  pxRect(ctx, x + 11, y - 3, 1, 2, '#FFF3BE');

  // Upper clock hood housing
  pxRect(ctx, x + 1, y + 6, 21, 20, '#4E2B19');
  pxRect(ctx, x + 3, y + 8, 17, 16, '#6E4027');

  // Ornate gold bezel & ivory clock face
  pxRect(ctx, x + 4, y + 9, 15, 14, '#C99A49');
  pxRect(ctx, x + 5, y + 10, 13, 12, '#FAF6F0');
  // Cardinal Roman-style hour ticks (12, 3, 6, 9)
  pxRect(ctx, cx, y + 11, 1, 2, '#4A3121');
  pxRect(ctx, cx, y + 19, 1, 2, '#4A3121');
  pxRect(ctx, x + 6, y + 16, 2, 1, '#4A3121');
  pxRect(ctx, x + 15, y + 16, 2, 1, '#4A3121');

  // Live local time hour & minute hands
  const now = new Date();
  const minuteAngle = ((now.getMinutes() + now.getSeconds() / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = (((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const dialCy = y + 16;

  ctx.save();
  ctx.strokeStyle = '#231D19';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx + 0.5, dialCy + 0.5);
  ctx.lineTo(cx + 0.5 + Math.cos(hourAngle) * 3.2, dialCy + 0.5 + Math.sin(hourAngle) * 3.2);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 0.5, dialCy + 0.5);
  ctx.lineTo(cx + 0.5 + Math.cos(minuteAngle) * 4.8, dialCy + 0.5 + Math.sin(minuteAngle) * 4.8);
  ctx.stroke();
  ctx.restore();
  pxRect(ctx, cx, dialCy, 1, 1, '#B07D32'); // Center brass pin

  // Tall mahogany waist trunk with recessed glass pendulum window
  pxRect(ctx, x + 2, y + 26, 19, 30, '#4E2B19');
  pxRect(ctx, x + 3, y + 26, 2, 30, '#78482D'); // Left wood highlight
  pxRect(ctx, x + 18, y + 26, 2, 30, '#3D2113'); // Right bevel
  pxRect(ctx, x + 5, y + 28, 13, 26, '#23160F'); // Dark cabinet interior
  pxRect(ctx, x + 6, y + 29, 11, 24, '#2E1E16');

  // Smoothly swinging brass pendulum rod & gleaming gold bob
  const swingAngle = Math.sin(tick * 0.065) * 0.28;
  const pivotX = cx + 0.5;
  const pivotY = y + 30;
  const rodLen = 17;
  const bobX = pivotX + Math.sin(swingAngle) * rodLen;
  const bobY = pivotY + Math.cos(swingAngle) * rodLen;

  ctx.save();
  ctx.strokeStyle = '#C99A49';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();
  ctx.restore();

  const bx = Math.round(bobX) - 2;
  const by = Math.round(bobY) - 2;
  pxRect(ctx, bx, by, 5, 5, '#D4A03E'); // Brass bob disc
  pxRect(ctx, bx + 1, by + 1, 3, 3, '#F5CB69');
  pxRect(ctx, bx + 1, by + 1, 1, 1, '#FFF8DC'); // Specular glint

  // Subtle diagonal glass pane reflection
  pxRect(ctx, x + 6, y + 31, 2, 1, 'rgba(255,250,240,0.22)');
  pxRect(ctx, x + 8, y + 33, 2, 1, 'rgba(255,250,240,0.18)');
  pxRect(ctx, x + 10, y + 35, 2, 1, 'rgba(255,250,240,0.14)');

  // Stepped carved plinth base
  pxRect(ctx, x + 1, y + 56, 21, 9, '#4A2818');
  pxRect(ctx, x + 3, y + 58, 17, 5, '#6B3D24');
  pxRect(ctx, x + 5, y + 59, 13, 3, '#57311D');
  pxRect(ctx, x, y + 63, 23, 3, '#3B1F12');
}

function drawChristmasWallGarland(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  tick: number
) {
  const bulbColors = ['#EF4444', '#FACC15', '#4ADE80', '#60A5FA', '#FB923C'];
  const step = 18;
  let idx = 0;
  for (let gx = x; gx < x + w - 10; gx += step) {
    const sag = idx % 2 === 0 ? 0 : 2;
    // Pine swag segments
    pxRect(ctx, gx, y + sag, step, 2, '#2D5A3C');
    pxRect(ctx, gx + 3, y + sag + 1, step - 6, 2, '#3D7A52');
    // Red ribbon bows at intervals
    if (idx % 3 === 0) {
      pxRect(ctx, gx + 1, y + sag, 3, 3, '#DC2626');
      pxRect(ctx, gx + 2, y + sag + 3, 1, 2, '#B91C1C');
    }
    // Twinkling fairy light bulb
    const bulbColor = bulbColors[(idx + Math.floor(tick / 12)) % bulbColors.length];
    const isBright = (idx + Math.floor(tick / 8)) % 2 === 0;
    pxRect(ctx, gx + 9, y + sag + 2, 2, 2, bulbColor);
    if (isBright) {
      pxRect(ctx, gx + 8, y + sag + 1, 4, 4, 'rgba(255, 248, 200, 0.28)');
    }
    idx++;
  }
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  timeOfDay: TimeOfDay,
  tick: number
) {
  const skyTop =
    timeOfDay === 'morning' ? '#90C2DB' : timeOfDay === 'afternoon' ? '#D98E6C' : '#1E293B';
  const skyBot =
    timeOfDay === 'morning' ? '#D6ECF3' : timeOfDay === 'afternoon' ? '#F3D1B0' : '#334155';

  // Outer wood frame
  pxRect(ctx, x, y, w, h, '#5A3A26');
  pxRect(ctx, x + 3, y + 3, w - 6, h - 6, skyTop);
  pxRect(ctx, x + 3, y + h / 2, w - 6, h / 2 - 3, skyBot);

  if (timeOfDay === 'evening') {
    // Twinkling pixel stars & moon
    pxRect(ctx, x + 10, y + 7, 2, 2, '#FDE68A');
    pxRect(ctx, x + w - 16, y + 8, 5, 5, '#FEF3C7');
    pxRect(ctx, x + 24, y + 12, 2, 2, '#E2E8F0');
  } else {
    // Soft winter clouds
    pxRect(ctx, x + 8, y + 7, 14, 4, 'rgba(255,255,255,0.78)');
    pxRect(ctx, x + w - 24, y + 10, 12, 4, 'rgba(255,255,255,0.68)');
  }

  // Winter snowy landscape & snow-covered pine treetops visible outside
  const pineShade = timeOfDay === 'evening' ? '#27403B' : '#4E7365';
  pxRect(ctx, x + 4, y + h - 11, w - 8, 8, pineShade);
  pxRect(ctx, x + 4, y + h - 7, w - 8, 4, timeOfDay === 'evening' ? '#CBD5E1' : '#F8FAFC');
  pxRect(ctx, x + 9, y + h - 10, 10, 2, '#F1F5F9');
  pxRect(ctx, x + w - 22, y + h - 10, 12, 2, '#F1F5F9');

  // Animated gentle snowfall inside window glass (always snowing in morning, afternoon, and evening)
  const paneW = Math.max(12, w - 16);
  const paneH = Math.max(10, h - 9);
  const flakeCount = Math.max(10, Math.floor(w / 5));
  for (let i = 0; i < flakeCount; i++) {
    const speed = 0.22 + (i % 3) * 0.08;
    const fallY = ((i * 11 + tick * speed) % paneH);
    const sway = Math.sin(tick * 0.05 + i * 1.7) * 2.2;
    const fx = x + 8 + ((i * 19 + sway + paneW) % paneW);
    const fy = y + 4 + fallY;
    const size = i % 4 === 0 ? 2 : 1;
    const alpha = i % 3 === 0 ? 'rgba(255, 255, 255, 0.92)' : 'rgba(241, 245, 249, 0.75)';
    pxRect(ctx, fx, fy, size, size, alpha);
  }

  // Mullion grid bars
  pxRect(ctx, x + w / 2 - 1, y + 3, 3, h - 6, '#5A3A26');
  pxRect(ctx, x + 3, y + h / 2 - 1, w - 6, 3, '#5A3A26');
  // Frost / snow accumulated on middle crossbar
  pxRect(ctx, x + 9, y + h / 2 - 2, w / 2 - 11, 1, 'rgba(248, 250, 252, 0.85)');
  pxRect(ctx, x + w / 2 + 2, y + h / 2 - 2, w / 2 - 11, 1, 'rgba(248, 250, 252, 0.85)');
  // Curtains on edges
  pxRect(ctx, x + 2, y + 2, 6, h - 4, '#EFE7DA');
  pxRect(ctx, x + w - 8, y + 2, 6, h - 4, '#EFE7DA');
  // Sill with fresh snow drift accumulation
  pxRect(ctx, x - 3, y + h, w + 6, 4, '#7E5438');
  pxRect(ctx, x + 3, y + h - 4, w - 6, 2, '#F8FAFC');
  pxRect(ctx, x + 7, y + h - 5, 12, 1, '#FFFFFF');
  pxRect(ctx, x + w - 21, y + h - 5, 11, 1, '#FFFFFF');
}

function drawFireplace(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  // Mantle & chimney
  pxRect(ctx, x, y, 56, 48, '#D5C7B6');
  pxRect(ctx, x + 2, y + 2, 52, 44, '#E2D6C5');
  pxRect(ctx, x - 3, y + 14, 62, 6, '#7A5438');
  pxRect(ctx, x - 3, y + 14, 62, 2, '#9A6E4D');
  // Small clock on mantle
  pxRect(ctx, x + 23, y + 4, 10, 10, '#593A25');
  pxRect(ctx, x + 25, y + 6, 6, 6, '#FAF6F0');
  pxRect(ctx, x + 28, y + 7, 1, 3, '#29221D');
  // Red & white holiday candles flanking the mantle clock
  pxRect(ctx, x + 8, y + 8, 3, 6, '#DC2626');
  pxRect(ctx, x + 9, y + 6, 1, 2, '#FDE047');
  pxRect(ctx, x + 45, y + 8, 3, 6, '#DC2626');
  pxRect(ctx, x + 46, y + 6, 1, 2, '#FDE047');
  // Pine garland & holly berries draped across fireplace mantle
  pxRect(ctx, x - 1, y + 15, 58, 3, '#2D6A4F');
  pxRect(ctx, x + 3, y + 17, 14, 2, '#1B4332');
  pxRect(ctx, x + 21, y + 17, 14, 2, '#1B4332');
  pxRect(ctx, x + 39, y + 17, 14, 2, '#1B4332');
  pxRect(ctx, x + 10, y + 16, 2, 2, '#EF4444');
  pxRect(ctx, x + 27, y + 16, 2, 2, '#EF4444');
  pxRect(ctx, x + 45, y + 16, 2, 2, '#EF4444');
  // Hanging red Christmas stockings with fluffy white cuffs
  const stockings = [x + 5, x + 15, x + 42];
  for (const sx of stockings) {
    pxRect(ctx, sx, y + 18, 5, 2, '#FAF6F0'); // White cuff
    pxRect(ctx, sx, y + 20, 5, 6, '#DC2626'); // Red leg
    pxRect(ctx, sx - 1, y + 24, 6, 3, '#B91C1C'); // Toe
  }
  // Hearth firebox
  pxRect(ctx, x + 10, y + 24, 36, 24, '#2A1D17');
  // Logs
  pxRect(ctx, x + 15, y + 40, 26, 5, '#6B4226');
  // Animated pixel flame
  const flicker = Math.floor(tick / 10) % 3;
  pxRect(ctx, x + 19, y + 32 - flicker, 18, 9 + flicker, '#E86A2C');
  pxRect(ctx, x + 23, y + 34 - (flicker === 1 ? 2 : 0), 10, 7, '#F7B538');
  pxRect(ctx, x + 26, y + 37, 4, 4, '#FFF3B0');
  // Hearth stone floor pad
  pxRect(ctx, x - 2, y + 48, 60, 8, '#9B8F83');
}

function drawPinboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  extraPinCount: number,
  isActive: boolean,
  tick: number
) {
  if (isActive) {
    const pulse = 0.45 + Math.sin(tick * 0.22) * 0.35;
    ctx.save();
    ctx.strokeStyle = `rgba(245, 184, 65, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x) - 2, Math.round(y) - 2, Math.round(w) + 4, Math.round(h) + 4);
    ctx.restore();
  }

  pxRect(ctx, x, y, w, h, '#69462D');
  pxRect(ctx, x + 3, y + 3, w - 6, h - 6, '#B88758');
  // Tiny colorful pinned notes
  pxRect(ctx, x + 8, y + 6, 12, 10, '#FEF08A');
  pxRect(ctx, x + 13, y + 6, 2, 2, '#DC2626');
  pxRect(ctx, x + 24, y + 8, 16, 12, '#FAF6F0');
  pxRect(ctx, x + 26, y + 11, 11, 1, '#94A3B8');
  pxRect(ctx, x + 26, y + 14, 9, 1, '#94A3B8');
  pxRect(ctx, x + 46, y + 6, 14, 12, '#BFDBFE');
  pxRect(ctx, x + 65, y + 9, 12, 11, '#FDE68A');
  pxRect(ctx, x + 11, y + 18, 10, 5, '#D1FAE5');

  // Newly pinned notes added by Mina during this session
  const extraSlots = [
    { dx: 43, dy: 16, w: 12, h: 7, bg: '#FDBA74', pin: '#B91C1C' },
    { dx: 58, dy: 16, w: 11, h: 7, bg: '#86EFAC', pin: '#0F766E' },
    { dx: 74, dy: 16, w: 10, h: 7, bg: '#FDE047', pin: '#D97706' },
    { dx: 29, dy: 18, w: 11, h: 6, bg: '#F9A8D4', pin: '#9D174D' },
  ];
  const visibleExtra = Math.min(extraSlots.length, Math.max(0, extraPinCount));
  for (let i = 0; i < visibleExtra; i++) {
    const slot = extraSlots[i];
    pxRect(ctx, x + slot.dx, y + slot.dy, slot.w, slot.h, slot.bg);
    pxRect(ctx, x + slot.dx + Math.floor(slot.w / 2) - 1, y + slot.dy, 2, 2, slot.pin);
  }

  // Celebratory sparkle pixels on pinboard while Mina pins a task
  if (isActive && Math.floor(tick / 6) % 2 === 0) {
    pxRect(ctx, x + w - 8, y - 3, 2, 2, '#FEF08A');
    pxRect(ctx, x + 6, y - 4, 2, 2, '#FDE68A');
    pxRect(ctx, x + w / 2, y - 4, 2, 2, '#FAF6F0');
  }
}

function drawRugs(ctx: CanvasRenderingContext2D) {
  // Living room festive Christmas woven rug (crimson, forest pine & warm gold trim)
  const lx = 1.8 * TILE;
  const ly = 4.2 * TILE;
  const lw = 4.5 * TILE;
  const lh = 4.8 * TILE;
  pxRect(ctx, lx, ly, lw, lh, '#E8C57B');
  pxRect(ctx, lx + 3, ly + 3, lw - 6, lh - 6, '#9B2C2C');
  pxRect(ctx, lx + 8, ly + 8, lw - 16, lh - 16, '#2D5A3C');
  pxRect(ctx, lx + 13, ly + 13, lw - 26, lh - 26, '#FAF0CA');
  pxRect(ctx, lx + 17, ly + 17, lw - 34, lh - 34, '#B91C1C');
  pxRect(ctx, lx + 23, ly + 23, lw - 46, lh - 46, '#EDE2D0');

  // Home office calm sage rug (player area)
  const ox = 11.9 * TILE;
  const oy = 4.5 * TILE;
  const ow = 4.35 * TILE;
  const oh = 4.6 * TILE;
  pxRect(ctx, ox, oy, ow, oh, '#5A7D70');
  pxRect(ctx, ox + 4, oy + 4, ow - 8, oh - 8, '#6F9486');
  pxRect(ctx, ox + 10, oy + 10, ow - 20, oh - 20, '#5E8275');

  // Mina's warm workstation floor mat on the right side of the office
  const mx = 15.95 * TILE;
  const my = 6.45 * TILE;
  const mw = 1.45 * TILE;
  const mh = 2.75 * TILE;
  pxRect(ctx, mx, my, mw, mh, '#8C6B4E');
  pxRect(ctx, mx + 3, my + 3, mw - 6, mh - 6, '#A98562');
  pxRect(ctx, mx + 6, my + 6, mw - 12, mh - 12, '#9A7756');
}

function drawMinaProximityZone(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  isWorking: boolean,
  tick: number
) {
  const dist = Math.hypot(player.x - MINA_POS.x, player.y - MINA_POS.y);
  const inOffice = getRoomZone(player.x, player.y) === 'office';
  if (!inOffice) return;

  const isInside = dist <= MINA_APPROACH_RADIUS || isWorking;
  const pulse = 0.04 * Math.sin(tick * 0.08);
  const strokeAlpha = isInside ? 0.42 + pulse : 0.18;
  const fillAlpha = isInside ? 0.08 : 0.03;

  ctx.save();
  // Clip to the interior office floor so the ring stays cleanly inside walls & furniture edges
  ctx.beginPath();
  ctx.rect((DIVIDER_COL + 1.05) * TILE, 2.1 * TILE, 6.25 * TILE, 9.7 * TILE);
  ctx.clip();

  ctx.beginPath();
  ctx.arc(MINA_POS.x, MINA_POS.y, MINA_APPROACH_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(245, 184, 65, ${fillAlpha.toFixed(3)})`;
  ctx.fill();

  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = `rgba(245, 184, 65, ${strokeAlpha.toFixed(3)})`;
  ctx.stroke();
  ctx.restore();
}

function drawPottedPlant(ctx: CanvasRenderingContext2D, x: number, y: number, variant: 'monstera' | 'fern') {
  // Shadow
  pxRect(ctx, x + 3, y + 22, 22, 6, 'rgba(30,20,14,0.25)');
  // Terracotta pot
  pxRect(ctx, x + 6, y + 14, 16, 12, '#B65D3B');
  pxRect(ctx, x + 4, y + 12, 20, 4, '#CC6E4A');
  pxRect(ctx, x + 7, y + 14, 14, 2, '#4A3121');
  // Leaves
  if (variant === 'monstera') {
    pxRect(ctx, x + 2, y + 3, 10, 10, '#3D6B4F');
    pxRect(ctx, x + 13, y + 1, 12, 11, '#4D8461');
    pxRect(ctx, x + 8, y + 6, 11, 9, '#5E9C74');
    pxRect(ctx, x + 4, y + 5, 4, 3, '#72B389');
  } else {
    pxRect(ctx, x + 3, y + 4, 22, 9, '#4D7C6F');
    pxRect(ctx, x + 6, y + 1, 16, 10, '#629888');
    pxRect(ctx, x + 10, y + 3, 8, 5, '#7BB3A2');
  }
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  pxRect(ctx, x, y + h - 4, 32, 6, 'rgba(28,20,15,0.28)');
  pxRect(ctx, x, y, 32, h, '#5D3C27');
  pxRect(ctx, x + 3, y + 3, 26, h - 6, '#3F2718');

  const shelfColors = ['#C85A3F', '#5E8C7A', '#E2A84B', '#4B6B8A', '#D9C5A3', '#8C5E58'];
  const shelves = Math.floor((h - 8) / 14);
  for (let s = 0; s < shelves; s++) {
    const sy = y + 5 + s * 14;
    pxRect(ctx, x + 3, sy + 11, 26, 3, '#6F4930');
    for (let b = 0; b < 5; b++) {
      const bx = x + 5 + b * 5;
      const bh = 8 + ((s + b) % 3);
      pxRect(ctx, bx, sy + (11 - bh), 4, bh, shelfColors[(s * 3 + b) % shelfColors.length]);
    }
  }
}

function drawChristmasTree(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  // Soft festive tree skirt & drop shadow on floor
  pxRect(ctx, x + 2, y + 40, 42, 10, 'rgba(28, 20, 15, 0.26)');
  pxRect(ctx, x + 5, y + 38, 36, 9, '#B91C1C'); // Red tree skirt
  pxRect(ctx, x + 7, y + 39, 32, 7, '#DC2626');
  pxRect(ctx, x + 9, y + 40, 28, 5, '#FDE047'); // Gold trim inner ring

  // Sturdy wooden trunk
  pxRect(ctx, x + 19, y + 32, 8, 9, '#5C3A21');
  pxRect(ctx, x + 21, y + 32, 3, 9, '#7A4E2D');

  // Layered evergreen pine tiers (bottom to top) with snowy tips
  // Tier 1 (bottom)
  pxRect(ctx, x + 4, y + 25, 38, 10, '#1B4332');
  pxRect(ctx, x + 6, y + 24, 34, 9, '#2D6A4F');
  pxRect(ctx, x + 5, y + 33, 7, 2, '#F1F5F9');
  pxRect(ctx, x + 34, y + 33, 7, 2, '#F1F5F9');

  // Tier 2
  pxRect(ctx, x + 7, y + 17, 32, 10, '#1B4332');
  pxRect(ctx, x + 9, y + 16, 28, 9, '#2D6A4F');
  pxRect(ctx, x + 11, y + 17, 24, 6, '#40916C');
  pxRect(ctx, x + 8, y + 25, 6, 2, '#F1F5F9');
  pxRect(ctx, x + 32, y + 25, 6, 2, '#F1F5F9');

  // Tier 3
  pxRect(ctx, x + 11, y + 9, 24, 10, '#1B4332');
  pxRect(ctx, x + 13, y + 8, 20, 9, '#2D6A4F');
  pxRect(ctx, x + 15, y + 9, 16, 6, '#40916C');
  pxRect(ctx, x + 12, y + 17, 5, 2, '#F1F5F9');
  pxRect(ctx, x + 29, y + 17, 5, 2, '#F1F5F9');

  // Tier 4 (crown)
  pxRect(ctx, x + 15, y + 2, 16, 8, '#2D6A4F');
  pxRect(ctx, x + 17, y + 0, 12, 7, '#40916C');
  pxRect(ctx, x + 19, y - 3, 8, 5, '#52B788');

  // Golden tinsel garland ribbons draping diagonally across boughs
  pxRect(ctx, x + 15, y + 12, 15, 2, '#E9C46A');
  pxRect(ctx, x + 11, y + 21, 23, 2, '#E9C46A');
  pxRect(ctx, x + 8, y + 30, 29, 2, '#E9C46A');

  // Glowing golden star topper
  const starPulse = Math.floor(tick / 10) % 2 === 0;
  pxRect(ctx, x + 20, y - 8, 6, 6, '#F59E0B');
  pxRect(ctx, x + 21, y - 9, 4, 8, '#FACC15');
  pxRect(ctx, x + 19, y - 7, 8, 4, '#FACC15');
  pxRect(ctx, x + 22, y - 6, 2, 2, '#FEF9C3');
  if (starPulse) {
    pxRect(ctx, x + 17, y - 10, 12, 10, 'rgba(254, 240, 138, 0.25)');
  }

  // Colorful ornaments & twinkling fairy lights
  const ornaments = [
    { ox: 18, oy: 4, c: '#EF4444' },
    { ox: 26, oy: 6, c: '#38BDF8' },
    { ox: 14, oy: 14, c: '#FACC15' },
    { ox: 23, oy: 15, c: '#EF4444' },
    { ox: 30, oy: 13, c: '#FB923C' },
    { ox: 10, oy: 23, c: '#38BDF8' },
    { ox: 19, oy: 24, c: '#F472B6' },
    { ox: 27, oy: 22, c: '#FACC15' },
    { ox: 34, oy: 24, c: '#EF4444' },
    { ox: 9, oy: 31, c: '#FACC15' },
    { ox: 17, oy: 32, c: '#EF4444' },
    { ox: 26, oy: 31, c: '#60A5FA' },
    { ox: 35, oy: 32, c: '#4ADE80' },
  ];
  const phase = Math.floor(tick / 9);
  ornaments.forEach((o, i) => {
    const twinkle = (i + phase) % 3 === 0;
    pxRect(ctx, x + o.ox, y + o.oy, 3, 3, twinkle ? '#FEF9C3' : o.c);
  });

  // Wrapped Christmas gift boxes tucked under the tree
  // Gift 1: Red box with gold ribbon (left)
  pxRect(ctx, x + 2, y + 38, 11, 9, '#DC2626');
  pxRect(ctx, x + 6, y + 38, 2, 9, '#FACC15');
  pxRect(ctx, x + 2, y + 41, 11, 2, '#FACC15');
  pxRect(ctx, x + 5, y + 36, 4, 2, '#FDE047');

  // Gift 2: Emerald box with red ribbon (right)
  pxRect(ctx, x + 31, y + 37, 12, 10, '#15803D');
  pxRect(ctx, x + 36, y + 37, 2, 10, '#EF4444');
  pxRect(ctx, x + 31, y + 41, 12, 2, '#EF4444');
  pxRect(ctx, x + 35, y + 35, 4, 2, '#F87171');

  // Gift 3: Small blue gift box (center-front)
  pxRect(ctx, x + 17, y + 41, 9, 7, '#2563EB');
  pxRect(ctx, x + 21, y + 41, 2, 7, '#F8FAFC');
  pxRect(ctx, x + 17, y + 44, 9, 2, '#F8FAFC');
}

function drawLivingFurniture(ctx: CanvasRenderingContext2D, tick: number, isTvOn: boolean) {
  // Top-left potted plant replaced with festive decorated Christmas Tree & gifts
  drawChristmasTree(ctx, 1.15 * TILE, 2.0 * TILE, tick);
  drawPottedPlant(ctx, 1.2 * TILE, 10.1 * TILE, 'monstera');
  // Red holiday bow on bottom-left potted plant
  pxRect(ctx, 1.2 * TILE + 11, 10.1 * TILE + 15, 6, 3, '#DC2626');
  pxRect(ctx, 1.2 * TILE + 13, 10.1 * TILE + 18, 2, 3, '#B91C1C');

  // Bookshelf with miniature holiday topper accents
  drawBookshelf(ctx, 8.9 * TILE, 2.0 * TILE, 48);
  pxRect(ctx, 8.9 * TILE + 4, 2.0 * TILE - 5, 7, 5, '#DC2626'); // Tiny gift on bookshelf
  pxRect(ctx, 8.9 * TILE + 7, 2.0 * TILE - 5, 1, 5, '#FACC15');
  pxRect(ctx, 8.9 * TILE + 20, 2.0 * TILE - 6, 6, 6, '#2D6A4F'); // Tiny mini pine tree

  // Cozy cream sofa (x: 2.1*32, y: 4.5*32, w: 3.1*32, h: 1.25*32)
  const sx = 2.1 * TILE;
  const sy = 4.5 * TILE;
  const sw = 3.1 * TILE;
  const sh = 1.25 * TILE;
  pxRect(ctx, sx + 2, sy + sh - 2, sw - 4, 6, 'rgba(30,20,14,0.25)');
  // Wooden sofa legs & frame
  pxRect(ctx, sx, sy, sw, sh, '#C8B9A3');
  pxRect(ctx, sx + 3, sy + 3, sw - 6, 12, '#DFD2BE'); // Backrest
  pxRect(ctx, sx, sy + 4, 10, sh - 6, '#D6C8B2'); // Left arm
  pxRect(ctx, sx + sw - 10, sy + 4, 10, sh - 6, '#D6C8B2'); // Right arm
  // Seat cushions
  pxRect(ctx, sx + 11, sy + 15, (sw - 24) / 2, sh - 19, '#EFE6D8');
  pxRect(ctx, sx + 13 + (sw - 24) / 2, sy + 15, (sw - 24) / 2, sh - 19, '#EFE6D8');
  // Christmas accent pillows (pine green & holiday crimson with gold stripe)
  pxRect(ctx, sx + 13, sy + 9, 14, 10, '#2D6A4F');
  pxRect(ctx, sx + 19, sy + 9, 2, 10, '#E9C46A');
  pxRect(ctx, sx + sw - 29, sy + 9, 14, 10, '#C53030');
  pxRect(ctx, sx + sw - 29, sy + 13, 14, 2, '#F8FAFC');
  // Festive red-and-gold tartan throw blanket on arm
  pxRect(ctx, sx + sw - 11, sy + 12, 11, 18, '#B91C1C');
  pxRect(ctx, sx + sw - 11, sy + 16, 11, 3, '#2D6A4F');
  pxRect(ctx, sx + sw - 11, sy + 22, 11, 2, '#E9C46A');

  // Coffee table (x: 2.5*32, y: 6.7*32, w: 2.3*32, h: 1.1*32)
  const tx = 2.5 * TILE;
  const ty = 6.7 * TILE;
  const tw = 2.3 * TILE;
  const th = 1.1 * TILE;
  pxRect(ctx, tx + 3, ty + th, tw - 6, 5, 'rgba(30,20,14,0.25)');
  pxRect(ctx, tx, ty, tw, th, '#6A442A');
  pxRect(ctx, tx + 3, ty + 3, tw - 6, th - 8, '#855838');
  pxRect(ctx, tx + 4, ty + 4, tw - 8, 2, '#9E6B47');
  // Festive crimson & gold table runner
  pxRect(ctx, tx + 10, ty + 6, tw - 20, th - 14, '#9B2C2C');
  pxRect(ctx, tx + 12, ty + 8, tw - 24, th - 18, '#B91C1C');
  // Holiday plate with gingerbread cookies & candy cane on table
  pxRect(ctx, tx + 42, ty + 9, 18, 13, '#FAF6F0');
  pxRect(ctx, tx + 44, ty + 11, 14, 9, '#E2DDD5');
  pxRect(ctx, tx + 45, ty + 12, 5, 5, '#B46938'); // Gingerbread cookie
  pxRect(ctx, tx + 51, ty + 13, 5, 3, '#DC2626'); // Candy cane
  pxRect(ctx, tx + 53, ty + 13, 2, 3, '#FFFFFF');
  // Small glowing holiday candle centerpiece
  pxRect(ctx, tx + 31, ty + 11, 5, 7, '#FAF6F0');
  pxRect(ctx, tx + 30, ty + 16, 7, 3, '#2D6A4F');
  pxRect(ctx, tx + 33, ty + 8, 2, 3, '#FACC15');
  // Steaming festive red hot cocoa mug with marshmallows
  const mugX = tx + 14;
  const mugY = ty + 11;
  pxRect(ctx, mugX, mugY, 10, 10, '#DC2626');
  pxRect(ctx, mugX + 2, mugY + 2, 6, 5, '#593722');
  pxRect(ctx, mugX + 3, mugY + 3, 2, 2, '#FAF6F0'); // Mini marshmallow
  pxRect(ctx, mugX + 6, mugY + 4, 2, 2, '#FAF6F0');
  pxRect(ctx, mugX + 10, mugY + 3, 3, 5, '#DC2626');
  // Animated rising pixel steam
  const steamOffset = Math.floor(tick / 14) % 4;
  pxRect(ctx, mugX + 3 + (steamOffset % 2), mugY - 3 - steamOffset, 2, 3, 'rgba(255,250,240,0.65)');
  pxRect(ctx, mugX + 6 - (steamOffset % 2), mugY - 6 - ((steamOffset + 2) % 4), 2, 3, 'rgba(255,250,240,0.5)');

  // Living room walnut TV media console & retro-modern pixel TV (x: 2.5*32, y: 10.55*32, w: 2.4*32, h: 1.15*32)
  const tvx = 2.5 * TILE;
  const tvy = 10.55 * TILE;
  const tvw = 2.4 * TILE;
  const tvh = 1.15 * TILE;
  // Floor shadow
  pxRect(ctx, tvx + 2, tvy + tvh - 1, tvw - 4, 5, 'rgba(28,20,15,0.28)');
  // Walnut lowboard cabinet
  pxRect(ctx, tvx, tvy + 10, tvw, tvh - 10, '#5A3A24');
  pxRect(ctx, tvx + 2, tvy + 12, tvw - 4, tvh - 14, '#7A5033');
  pxRect(ctx, tvx + 3, tvy + 12, tvw - 6, 2, '#966544');
  // Cabinet shelf dividers & tiny media box
  pxRect(ctx, tvx + 6, tvy + 22, 24, 10, '#462C1B');
  pxRect(ctx, tvx + 46, tvy + 22, 24, 10, '#462C1B');
  pxRect(ctx, tvx + 33, tvy + 23, 10, 6, '#2D2825');
  // TV stand & bezel facing north/sofa
  pxRect(ctx, tvx + 28, tvy + 14, 20, 4, '#2A2522');
  pxRect(ctx, tvx + 10, tvy - 2, 56, 20, '#24201D');
  pxRect(ctx, tvx + 12, tvy, 52, 16, '#342F2C');
  // TV screen surface (animated cozy colors + subtle twinkling sparkles when on, dimmed standby when off)
  const framePhase = Math.floor(tick / 14) % 3;
  const twinklePhase = Math.floor(tick / 6) % 6;
  if (isTvOn) {
    pxRect(ctx, tvx + 14, tvy + 2, 48, 12, '#24455E');
    pxRect(ctx, tvx + 16, tvy + 4, 20, 8, framePhase === 0 ? '#E88D4F' : framePhase === 1 ? '#F2B866' : '#D96B43');
    pxRect(ctx, tvx + 38, tvy + 4, 22, 4, framePhase === 1 ? '#A5D8F3' : '#8ECAE6');
    pxRect(ctx, tvx + 38, tvy + 9, 16, 3, framePhase === 2 ? '#C2E8D8' : '#A7D7C5');
    // Subtle twinkling pixel glints across the TV screen
    if (twinklePhase % 2 === 0) {
      pxRect(ctx, tvx + 19 + (twinklePhase * 5) % 36, tvy + 3 + (twinklePhase % 3) * 3, 2, 2, 'rgba(255, 250, 225, 0.85)');
    }
    if (twinklePhase === 1 || twinklePhase === 4) {
      pxRect(ctx, tvx + 48 - (twinklePhase * 3), tvy + 5, 2, 2, 'rgba(186, 230, 253, 0.9)');
    }
    // Soft luminous screen shimmer halo above TV rim
    const rimAlpha = (0.14 + Math.sin(tick * 0.22) * 0.06).toFixed(3);
    pxRect(ctx, tvx + 13, tvy - 3, 50, 3, `rgba(186, 230, 253, ${rimAlpha})`);
    // Active power LED
    pxRect(ctx, tvx + 60, tvy + 15, 3, 2, '#4ADE80');
  } else {
    pxRect(ctx, tvx + 14, tvy + 2, 48, 12, '#1E252B');
    // Subtle YouTube play glyph on standby screen
    pxRect(ctx, tvx + 32, tvy + 5, 12, 6, '#B84233');
    pxRect(ctx, tvx + 37, tvy + 6, 3, 4, '#FAF6F0');
    // Standby LED
    pxRect(ctx, tvx + 60, tvy + 15, 3, 2, '#E06D53');
  }
}

function drawOfficeFurniture(
  ctx: CanvasRenderingContext2D,
  assistantMood: AssistantMood,
  minaPhase: MinaNpcState['phase'],
  tick: number,
  isPlayerAtOwnDesk: boolean
) {
  // Office potted fern & top-right bookcase
  drawPottedPlant(ctx, 11.15 * TILE, 2.1 * TILE, 'fern');
  drawBookshelf(ctx, 17.85 * TILE, 2.15 * TILE, 72);

  // Player ergonomic swivel chair tucked closely in front of desk and centered directly on the monitor
  const chX = Math.round(WORK_SEAT_POS.x) - 14;
  const chY = 149;
  pxRect(ctx, chX + 4, chY + 18, 20, 5, 'rgba(28,20,15,0.24)');
  pxRect(ctx, chX + 6, chY + 13, 16, 8, '#4A3F38');
  pxRect(ctx, chX + 5, chY + 3, 18, 12, '#7D5A44');
  pxRect(ctx, chX + 7, chY + 5, 14, 8, '#9A7259');

  // Player Wide Oak Work Desk (x: 12.25*32, y: 3.1*32, w: 4.0*32, h: 1.55*32)
  const dx = 12.25 * TILE;
  const dy = 3.1 * TILE;
  const dw = 4.0 * TILE;
  const dh = 1.55 * TILE;
  pxRect(ctx, dx + 2, dy + dh, dw - 4, 6, 'rgba(28,20,15,0.28)');
  pxRect(ctx, dx, dy, dw, dh, '#5C3A22');
  pxRect(ctx, dx + 3, dy + 3, dw - 6, dh - 10, '#8C5C38');
  pxRect(ctx, dx + 4, dy + 4, dw - 8, 3, '#A6724A');
  // Front drawers detail
  pxRect(ctx, dx + 4, dy + dh - 7, 28, 5, '#6D462B');
  pxRect(ctx, dx + dw - 32, dy + dh - 7, 28, 5, '#6D462B');

  // Warm brass desk lamp on left edge of player desk
  pxRect(ctx, dx + 9, dy + 22, 12, 6, '#593C28');
  pxRect(ctx, dx + 13, dy + 12, 3, 11, '#B08948');
  pxRect(ctx, dx + 7, dy + 5, 16, 10, '#F5B841');
  pxRect(ctx, dx + 9, dy + 7, 12, 6, '#FFF1B8');

  // Player Personal Computer Monitor (center-left of desk)
  const mx = dx + 42;
  const my = dy + 4;
  pxRect(ctx, mx + 12, my + 22, 14, 5, '#3E3A37');
  pxRect(ctx, mx, my, 38, 23, '#2E2B29');
  const screenBg = isPlayerAtOwnDesk ? '#1D3B52' : '#26343B';
  pxRect(ctx, mx + 3, my + 3, 32, 17, screenBg);
  const pulse = Math.floor(tick / 10) % 4;
  pxRect(ctx, mx + 6, my + 6, 14 + (isPlayerAtOwnDesk ? (pulse % 2) * 3 : 0), 2, '#7DD3FC');
  pxRect(ctx, mx + 6, my + 10, 22 - (isPlayerAtOwnDesk ? pulse * 2 : 0), 2, '#FDE68A');
  pxRect(ctx, mx + 6, my + 14, 18, 2, '#86EFAC');
  if (isPlayerAtOwnDesk && pulse % 2 === 0) {
    pxRect(ctx, mx + 26, my + 14, 4, 2, '#FAF6F0');
  }

  // Player keyboard & mouse
  pxRect(ctx, mx + 5, dy + 31, 24, 7, '#3D3733');
  pxRect(ctx, mx + 7, dy + 33, 20, 3, '#D6CEC4');
  pxRect(ctx, mx + 33, dy + 32, 6, 7, '#D6CEC4');

  // Notepad & pen on right side of player desk
  pxRect(ctx, dx + 91, dy + 16, 18, 14, '#FAF6F0');
  pxRect(ctx, dx + 94, dy + 19, 12, 2, '#94A3B8');
  pxRect(ctx, dx + 94, dy + 23, 9, 2, '#94A3B8');
  pxRect(ctx, dx + 112, dy + 18, 3, 12, '#D97736');

  // =========================================================================
  // MINA'S RIGHT-SIDE AI ASSISTANT WORKSTATION & FULL OFFICE EQUIPMENT
  // =========================================================================

  // 1. Office Multifunction Printer & Scanner Stand (north side of Mina's desk)
  const px = 17.65 * TILE;
  const py = 4.95 * TILE;
  const pw = 1.25 * TILE;
  const ph = 1.1 * TILE;
  pxRect(ctx, px + 2, py + ph - 1, pw - 4, 5, 'rgba(28,20,15,0.25)');
  // Wooden printer cart
  pxRect(ctx, px, py + 4, pw, ph - 4, '#5E3D27');
  pxRect(ctx, px + 3, py + 6, pw - 6, ph - 9, '#7C5337');
  // Reams of white A4 paper tucked on lower shelf
  pxRect(ctx, px + 6, py + ph - 9, 14, 5, '#FAF6F0');
  pxRect(ctx, px + 22, py + ph - 9, 12, 5, '#E2DDD5');
  // Printer body & flatbed scanner lid
  pxRect(ctx, px + 4, py + 2, pw - 8, 18, '#DDD6CA');
  pxRect(ctx, px + 6, py + 4, pw - 12, 10, '#3D3936'); // Scanner cover
  pxRect(ctx, px + 8, py + 6, pw - 16, 2, '#57524E');
  // Protruding white printed sheet & status LED
  pxRect(ctx, px + 1, py + 11, 7, 7, '#FAF6F0');
  pxRect(ctx, px + 3, py + 13, 3, 1, '#94A3B8');
  pxRect(ctx, px + 3, py + 15, 3, 1, '#94A3B8');
  pxRect(ctx, px + pw - 9, py + 15, 3, 2, Math.floor(tick / 25) % 2 === 0 ? '#4ADE80' : '#22C55E');

  // 2. Mina's Ergonomic Swivel Office Chair (at MINA_POS, facing right toward her computer)
  const mcX = Math.round(MINA_POS.x);
  const mcY = Math.round(MINA_POS.y);
  pxRect(ctx, mcX - 10, mcY + 8, 20, 6, 'rgba(28,20,15,0.26)');
  // Rolling caster base
  pxRect(ctx, mcX - 7, mcY + 7, 14, 3, '#3B342F');
  pxRect(ctx, mcX - 2, mcY + 5, 4, 6, '#2D2723');
  // Seat cushion (warm sage-teal office chair)
  pxRect(ctx, mcX - 8, mcY - 3, 16, 11, '#3D6358');
  pxRect(ctx, mcX - 6, mcY - 1, 12, 7, '#4F7E70');
  // Ergonomic backrest on the LEFT side (Mina faces right toward her desk)
  pxRect(ctx, mcX - 11, mcY - 7, 5, 16, '#2E4C43');
  pxRect(ctx, mcX - 10, mcY - 5, 3, 12, '#5C8F80');

  // 3. Mina's Dedicated Oak & Walnut AI Workstation Desk (right wall, vertical orientation)
  const mdx = 17.35 * TILE;
  const mdy = 6.2 * TILE;
  const mdw = 1.55 * TILE;
  const mdh = 3.2 * TILE;
  pxRect(ctx, mdx + 2, mdy + mdh, mdw - 3, 6, 'rgba(28,20,15,0.28)');
  // Desk frame & walnut top
  pxRect(ctx, mdx, mdy, mdw, mdh, '#563621');
  pxRect(ctx, mdx + 3, mdy + 3, mdw - 6, mdh - 8, '#875937');
  pxRect(ctx, mdx + 3, mdy + 3, 3, mdh - 8, '#A16E48'); // Left bevel highlight
  // Under-desk side drawer edge
  pxRect(ctx, mdx + 4, mdy + mdh - 6, mdw - 8, 4, '#6A4429');

  // Desk Lamp (top-right corner of Mina's desk)
  pxRect(ctx, mdx + mdw - 16, mdy + 6, 10, 10, '#593C28');
  pxRect(ctx, mdx + mdw - 13, mdy + 9, 4, 4, '#B08948');
  pxRect(ctx, mdx + mdw - 22, mdy + 5, 12, 11, '#F5B841');
  pxRect(ctx, mdx + mdw - 20, mdy + 7, 8, 7, '#FFF3BE');

  // Stationery Organizer / Pen Cup & Sticky Notes (upper-left of Mina's desk)
  pxRect(ctx, mdx + 6, mdy + 7, 9, 9, '#EFE5D5');
  pxRect(ctx, mdx + 7, mdy + 4, 2, 5, '#DC2626'); // Red pen
  pxRect(ctx, mdx + 10, mdy + 3, 2, 6, '#2563EB'); // Blue pen
  pxRect(ctx, mdx + 13, mdy + 5, 2, 4, '#D97706'); // Highlighter
  pxRect(ctx, mdx + 6, mdy + 19, 10, 8, '#FEF08A'); // Yellow sticky note pad
  pxRect(ctx, mdx + 7, mdy + 21, 7, 1, '#B45309');

  // Secondary Tablet / Reference Screen (upper-right, angled beside monitor)
  pxRect(ctx, mdx + 25, mdy + 19, 16, 12, '#2B2826');
  pxRect(ctx, mdx + 27, mdy + 21, 12, 8, '#1E3A4C');
  pxRect(ctx, mdx + 29, mdy + 23, 8, 2, '#93C5FD');
  pxRect(ctx, mdx + 29, mdy + 26, 6, 2, '#86EFAC');

  // Main Widescreen Computer Monitor (center-right of Mina's desk, facing left toward Mina)
  const monX = mdx + 27;
  const monY = mdy + 35;
  pxRect(ctx, monX + 9, monY + 11, 7, 12, '#3C3733'); // Monitor stand arm
  pxRect(ctx, monX, monY, 13, 34, '#24211F'); // Monitor bezel
  const minaScreenActive = minaPhase === 'working_at_desk' || assistantMood === 'thinking';
  pxRect(ctx, monX + 2, monY + 2, 8, 30, minaScreenActive ? '#1D3B52' : '#243138');
  // Animated screen lines scrolling while Mina works at her desk
  const codePulse = Math.floor(tick / 8) % 4;
  pxRect(ctx, monX + 3, monY + 5, 5, 4 + (minaScreenActive ? (codePulse % 2) * 2 : 0), '#7DD3FC');
  pxRect(ctx, monX + 3, monY + 13, 5, 6, '#FDE68A');
  pxRect(ctx, monX + 3, monY + 22, 5, 5 + (minaScreenActive && codePulse > 1 ? 2 : 0), '#86EFAC');
  // Subtle monitor glow cast onto desk toward Mina
  if (minaScreenActive) {
    pxRect(ctx, monX - 4, monY + 3, 4, 28, 'rgba(125, 211, 252, 0.16)');
  }

  // Desk Mat + Mechanical Keyboard & Mouse (directly in front of Mina's chair)
  pxRect(ctx, mdx + 5, mdy + 34, 18, 36, '#47695D'); // Sage desk mat
  pxRect(ctx, mdx + 8, mdy + 39, 9, 20, '#2F2B28'); // Keyboard housing
  pxRect(ctx, mdx + 10, mdy + 41, 5, 16, '#E7E0D5'); // Keycaps
  pxRect(ctx, mdx + 9, mdy + 62, 6, 5, '#E7E0D5'); // Wireless mouse

  // Document Inbox Paper Tray & Warm Ceramic Mug (lower part of Mina's desk)
  pxRect(ctx, mdx + 21, mdy + 74, 22, 18, '#5C3C24'); // Wooden inbox tray
  pxRect(ctx, mdx + 23, mdy + 76, 18, 13, '#FAF6F0'); // Stacked docs
  pxRect(ctx, mdx + 25, mdy + 79, 13, 1, '#94A3B8');
  pxRect(ctx, mdx + 25, mdy + 82, 11, 1, '#94A3B8');
  pxRect(ctx, mdx + 25, mdy + 85, 9, 1, '#D97736');
  // Mina's ceramic teacup with gentle steam
  pxRect(ctx, mdx + 8, mdy + 78, 8, 8, '#FAF6F0');
  pxRect(ctx, mdx + 10, mdy + 80, 4, 4, '#7C4A2D');
  const cupSteam = Math.floor(tick / 16) % 3;
  pxRect(ctx, mdx + 11, mdy + 74 - cupSteam, 2, 2, 'rgba(255,250,240,0.55)');

  // 4. Rolling 3-Drawer Wooden Filing Cabinet + Office Binders (south side of Mina's desk)
  const fcx = 17.55 * TILE;
  const fcy = 9.55 * TILE;
  const fcw = 1.35 * TILE;
  const fch = 1.4 * TILE;
  pxRect(ctx, fcx + 2, fcy + fch - 1, fcw - 4, 5, 'rgba(28,20,15,0.26)');
  pxRect(ctx, fcx, fcy, fcw, fch, '#5B3A24');
  pxRect(ctx, fcx + 3, fcy + 3, fcw - 6, fch - 6, '#7C5336');
  // 3 Drawer fronts with brass handles
  pxRect(ctx, fcx + 4, fcy + 14, fcw - 8, 8, '#6D472D');
  pxRect(ctx, fcx + 4, fcy + 24, fcw - 8, 8, '#6D472D');
  pxRect(ctx, fcx + 4, fcy + 34, fcw - 8, 8, '#6D472D');
  pxRect(ctx, fcx + 16, fcy + 17, 10, 2, '#E2C69E');
  pxRect(ctx, fcx + 16, fcy + 27, 10, 2, '#E2C69E');
  pxRect(ctx, fcx + 16, fcy + 37, 10, 2, '#E2C69E');
  // Upright colorful binders & mini succulent on top of cabinet
  pxRect(ctx, fcx + 5, fcy + 3, 5, 10, '#C85A3F');
  pxRect(ctx, fcx + 11, fcy + 2, 5, 11, '#4D7C6F');
  pxRect(ctx, fcx + 17, fcy + 3, 5, 10, '#3B5B7C');
  pxRect(ctx, fcx + 23, fcy + 4, 5, 9, '#E2A84B');
  // Tiny potted succulent on corner
  pxRect(ctx, fcx + 31, fcy + 6, 7, 6, '#B65D3B');
  pxRect(ctx, fcx + 32, fcy + 3, 5, 4, '#5E9C74');

  // 5. Small Office Wastebasket tucked neatly beside the printer stand
  const bx = 17.05 * TILE;
  const by = 5.1 * TILE;
  pxRect(ctx, bx + 1, by + 14, 15, 4, 'rgba(28,20,15,0.22)');
  pxRect(ctx, bx + 1, by + 1, 15, 15, '#5C534C');
  pxRect(ctx, bx + 3, by + 3, 11, 11, '#3D3732');
  pxRect(ctx, bx + 5, by + 5, 4, 4, '#FAF6F0'); // Crumpled paper
  pxRect(ctx, bx + 9, by + 8, 3, 3, '#E8DFD3');
}

function drawCenterDriveTable(
  ctx: CanvasRenderingContext2D,
  tick: number,
  isDriveOpen: boolean
) {
  const tx = Math.round(CENTER_TABLE_RECT.x);
  const ty = Math.round(CENTER_TABLE_RECT.y);
  const tw = Math.round(CENTER_TABLE_RECT.w); // ~94
  const th = Math.round(CENTER_TABLE_RECT.h); // ~65

  // Soft floor drop shadow & sturdy oak table legs
  pxRect(ctx, tx + 3, ty + th - 2, tw - 4, 7, 'rgba(28,20,15,0.28)');
  pxRect(ctx, tx + 5, ty + th - 6, 6, 9, '#4B2E1B');
  pxRect(ctx, tx + tw - 11, ty + th - 6, 6, 9, '#4B2E1B');

  // Main warm oak drafting / reference tabletop with subtle organic wood grain planks
  pxRect(ctx, tx, ty, tw, th - 4, '#5B3922'); // Outer timber rim
  pxRect(ctx, tx + 3, ty + 3, tw - 6, th - 12, '#8F603B'); // Tabletop surface
  pxRect(ctx, tx + 3, ty + 3, tw - 6, 3, '#AA774E'); // Top rim highlight
  pxRect(ctx, tx + 3, ty + th - 9, tw - 6, 5, '#6C4529'); // Front wooden apron
  // Subtle wood plank join lines
  pxRect(ctx, tx + 4, ty + 18, tw - 8, 1, 'rgba(72,44,24,0.22)');
  pxRect(ctx, tx + 4, ty + 35, tw - 8, 1, 'rgba(72,44,24,0.22)');
  pxRect(ctx, tx + 4, ty + 48, tw - 8, 1, 'rgba(72,44,24,0.18)');

  // Gentle warm glow around central documents when Google Drive modal is open
  if (isDriveOpen) {
    const glowA = 0.14 + Math.sin(tick * 0.12) * 0.04;
    pxRect(ctx, tx + 5, ty + 5, tw - 10, th - 16, `rgba(245, 196, 81, ${glowA.toFixed(2)})`);
  }

  // 1. Neatly stacked hardcover books (upper-left corner — orderly anchor)
  pxRect(ctx, tx + 7, ty + 7, 19, 13, '#3F6A57'); // Bottom forest-green hardcover
  pxRect(ctx, tx + 24, ty + 8, 2, 11, '#EFE5D5'); // Cream pages edge
  pxRect(ctx, tx + 8, ty + 9, 15, 10, '#A84A38'); // Middle terracotta book (slightly offset)
  pxRect(ctx, tx + 22, ty + 10, 2, 8, '#FAF6F0');
  pxRect(ctx, tx + 10, ty + 11, 13, 8, '#D49A42'); // Top ochre notebook
  pxRect(ctx, tx + 12, ty + 13, 7, 2, '#FAF6F0'); // Spine label

  // 2. Manila project dossier folder with subtle tri-color index tabs (upper-center, slightly angled)
  ctx.save();
  ctx.translate(tx + 46, ty + 15);
  ctx.rotate(0.06);
  pxRect(ctx, -14, -9, 28, 19, '#C99B58'); // Folder back
  pxRect(ctx, -12, -11, 8, 3, '#4D7C6F'); // Green index tab
  pxRect(ctx, -3, -11, 7, 3, '#E2A84B'); // Gold index tab
  pxRect(ctx, 5, -11, 7, 3, '#4E82B4'); // Sky-blue index tab
  pxRect(ctx, -13, -8, 26, 17, '#E6C68E'); // Folder front cover
  pxRect(ctx, -10, -5, 18, 12, '#FAF6F0'); // Peeking white sheet
  pxRect(ctx, -8, -2, 13, 1, '#94A3B8');
  pxRect(ctx, -8, 1, 10, 1, '#94A3B8');
  pxRect(ctx, -8, 4, 12, 1, '#D97736');
  // Tiny silver paperclip
  pxRect(ctx, 9, -7, 2, 5, '#CBD5E1');
  ctx.restore();

  // 3. Thick hardcover reference book lying casually askew (upper-right)
  ctx.save();
  ctx.translate(tx + 76, ty + 16);
  ctx.rotate(-0.11);
  pxRect(ctx, -11, -9, 21, 15, '#334E68'); // Deep navy hardcover
  pxRect(ctx, -9, -7, 17, 11, '#486581');
  pxRect(ctx, 8, -7, 2, 11, '#F5EFE6'); // Page thickness
  pxRect(ctx, -6, -4, 11, 2, '#E2C69E'); // Gold embossed title
  pxRect(ctx, -4, 6, 3, 5, '#DC6B54'); // Trailing bookmark ribbon
  ctx.restore();

  // 4. Open spiral notebook with handwritten notes & diagonal pencil (lower-left, lived-in angle)
  ctx.save();
  ctx.translate(tx + 21, ty + 39);
  ctx.rotate(-0.13);
  pxRect(ctx, -14, -10, 28, 19, '#57463A'); // Dark leather cover edges
  pxRect(ctx, -13, -9, 12, 17, '#FAF6F0'); // Left page
  pxRect(ctx, 1, -9, 12, 17, '#F5EFE6'); // Right page
  // Spiral wire spine dots
  pxRect(ctx, -1, -7, 2, 2, '#94A3B8');
  pxRect(ctx, -1, -2, 2, 2, '#94A3B8');
  pxRect(ctx, -1, 3, 2, 2, '#94A3B8');
  // Handwritten ink lines & highlighter streak
  pxRect(ctx, -11, -6, 8, 1, '#64748B');
  pxRect(ctx, -11, -3, 9, 1, '#64748B');
  pxRect(ctx, -11, 0, 7, 2, '#FDE68A'); // Yellow highlight
  pxRect(ctx, -11, 4, 8, 1, '#64748B');
  pxRect(ctx, 3, -6, 8, 1, '#64748B');
  pxRect(ctx, 3, -3, 6, 1, '#D97736');
  pxRect(ctx, 3, 0, 8, 1, '#64748B');
  pxRect(ctx, 3, 3, 7, 1, '#64748B');
  // Diagonal wooden pencil resting across right page
  pxRect(ctx, 4, -7, 3, 15, '#E29E3B');
  pxRect(ctx, 4, -9, 3, 2, '#E89B8B'); // Pink eraser
  pxRect(ctx, 5, 8, 1, 2, '#3B281E'); // Graphite tip
  ctx.restore();

  // 5. Overlapping loose A4 documents & crooked yellow sticky note (center-bottom — slightly messy!)
  ctx.save();
  ctx.translate(tx + 51, ty + 40);
  ctx.rotate(0.15);
  pxRect(ctx, -11, -8, 20, 15, '#EFE7DB'); // Bottom loose page
  pxRect(ctx, -9, -5, 14, 1, '#94A3B8');
  pxRect(ctx, -9, -2, 11, 1, '#94A3B8');
  ctx.restore();

  ctx.save();
  ctx.translate(tx + 56, ty + 37);
  ctx.rotate(-0.08);
  pxRect(ctx, -10, -8, 20, 16, '#FAF6F0'); // Top crisp sheet
  pxRect(ctx, -8, -5, 11, 2, '#4D7C6F'); // Header accent
  pxRect(ctx, -8, -1, 15, 1, '#94A3B8');
  pxRect(ctx, -8, 2, 13, 1, '#94A3B8');
  pxRect(ctx, -8, 5, 9, 1, '#94A3B8');
  // Crooked sticky note stuck onto top-right corner
  pxRect(ctx, 5, -9, 7, 7, '#FEF08A');
  pxRect(ctx, 6, -7, 4, 1, '#B45309');
  ctx.restore();

  // 6. Small paperback notebook + ceramic coffee cup + pen accent (lower-right)
  pxRect(ctx, tx + 72, ty + 33, 14, 10, '#C86D51'); // Small coral pocket notebook
  pxRect(ctx, tx + 74, ty + 35, 10, 2, '#FAF6F0');
  pxRect(ctx, tx + 81, ty + 34, 2, 8, '#3B281E'); // Elastic band

  // Cozy ceramic coffee mug with gentle steam
  pxRect(ctx, tx + 76, ty + 46, 9, 8, '#FAF6F0');
  pxRect(ctx, tx + 84, ty + 48, 2, 4, '#E8DFD3'); // Mug handle
  pxRect(ctx, tx + 78, ty + 48, 5, 4, '#6F4226'); // Coffee inside
  const steamRise = Math.floor(tick / 18) % 3;
  pxRect(ctx, tx + 79, ty + 43 - steamRise, 2, 2, 'rgba(255,250,240,0.48)');

  // Tiny stray pen near bottom-left edge
  pxRect(ctx, tx + 35, ty + 50, 9, 2, '#2563EB');
  pxRect(ctx, tx + 43, ty + 50, 2, 2, '#CBD5E1');
}

function drawMinaNpc(
  ctx: CanvasRenderingContext2D,
  mina: MinaNpcState,
  mood: AssistantMood,
  tick: number
) {
  const x = Math.round(mina.x);
  const y = Math.round(mina.y);
  const isSeatedWorking = mina.phase === 'working_at_desk' && !mina.isMoving;
  const stepPhase = mina.isMoving ? Math.floor(mina.walkFrame) % 4 : 0;
  const walkBob = mina.isMoving && (stepPhase === 1 || stepPhase === 3) ? -2 : 0;
  const legOffset = stepPhase === 1 ? 2 : stepPhase === 3 ? -2 : 0;
  const breathe = isSeatedWorking && Math.sin(tick * 0.08) > 0.35 ? 1 : 0;
  const bodyYOffset = mina.isMoving ? walkBob : breathe;
  const blink = tick % 190 > 183;

  // Floor shadow & walking/standing legs whenever she is up out of her swivel chair
  if (!isSeatedWorking) {
    pxRect(ctx, x - 9, y + 7, 18, 5, 'rgba(28,20,15,0.26)');
    pxRect(ctx, x - 6, y + 2 + (legOffset > 0 ? 1 : 0), 5, 7, '#4B3E36');
    pxRect(ctx, x + 1, y + 2 + (legOffset < 0 ? 1 : 0), 5, 7, '#4B3E36');
  }

  // Torso: cream knit cardigan + sage blouse underneath
  pxRect(ctx, x - 8, y - 8 + bodyYOffset, 16, 13, '#EFE5D5');
  if (mina.facing !== 'up') {
    const blouseShift = mina.facing === 'right' ? 2 : mina.facing === 'left' ? -2 : 0;
    pxRect(ctx, x - 3 + blouseShift, y - 7 + bodyYOffset, 6, 11, '#6B9080');
  } else {
    pxRect(ctx, x - 6, y - 7 + bodyYOffset, 12, 11, '#E5D8C5');
  }

  // Arms: seated typing at computer, pinning, carrying sticky note, waving greeting, thinking, or walking
  if (isSeatedWorking) {
    // Actively typing toward her computer keyboard on the right
    const typeShift = Math.floor(tick / 6) % 2;
    pxRect(ctx, x - 9, y - 5 + bodyYOffset, 3, 8, '#E5D8C5');
    pxRect(ctx, x + 6, y - 6 + typeShift, 11, 4, '#EFE5D5');
    pxRect(ctx, x + 16, y - 5 + typeShift, 4, 3, '#F4C6A3');
    pxRect(ctx, x + 6, y - 1 + (1 - typeShift), 11, 4, '#EFE5D5');
    pxRect(ctx, x + 16, y + (1 - typeShift), 4, 3, '#F4C6A3');
  } else if (mina.phase === 'pinning') {
    const reachUp = Math.floor(tick / 8) % 2 === 0 ? -15 : -12;
    pxRect(ctx, x - 11, y - 6, 3, 9, '#EFE5D5');
    pxRect(ctx, x + 8, y + reachUp, 4, 10, '#EFE5D5');
    pxRect(ctx, x + 8, y + reachUp - 2, 4, 3, '#F4C6A3');
    if (mina.pinProgress < 0.55) {
      pxRect(ctx, x + 6, y + reachUp - 6, 7, 5, '#FEF08A');
    }
  } else if (mina.isMoving) {
    pxRect(ctx, x - 11, y - 7 + bodyYOffset + (legOffset > 0 ? -1 : 0), 3, 9, '#EFE5D5');
    pxRect(ctx, x + 8, y - 7 + bodyYOffset + (legOffset < 0 ? -1 : 0), 3, 9, '#EFE5D5');
    if (mina.phase === 'walking_to_board') {
      pxRect(ctx, x + 9, y - 2 + bodyYOffset, 6, 5, '#FEF08A');
      pxRect(ctx, x + 11, y - 2 + bodyYOffset, 2, 1, '#DC2626');
    }
  } else if (mood === 'greeting') {
    const waveY = Math.floor(tick / 8) % 2 === 0 ? -12 : -9;
    pxRect(ctx, x - 11, y - 7 + bodyYOffset, 3, 9, '#EFE5D5');
    pxRect(ctx, x + 8, y + waveY, 4, 8, '#EFE5D5');
    pxRect(ctx, x + 8, y + waveY - 2, 4, 3, '#F4C6A3');
  } else if (mood === 'thinking') {
    const typeShift = Math.floor(tick / 6) % 2;
    pxRect(ctx, x - 10, y - 9 + typeShift, 4, 7, '#EFE5D5');
    pxRect(ctx, x + 6, y - 9 + (1 - typeShift), 4, 7, '#EFE5D5');
  } else if (mood === 'speaking') {
    // Expressive standing conversation gesture
    const talkShift = Math.floor(tick / 10) % 2 === 0 ? -2 : 0;
    pxRect(ctx, x - 11, y - 6 + bodyYOffset, 3, 9, '#EFE5D5');
    pxRect(ctx, x + 8, y - 8 + talkShift, 4, 8, '#EFE5D5');
    pxRect(ctx, x + 9, y - 9 + talkShift, 3, 3, '#F4C6A3');
  } else {
    pxRect(ctx, x - 11, y - 6 + bodyYOffset, 3, 9, '#EFE5D5');
    pxRect(ctx, x + 8, y - 6 + bodyYOffset, 3, 9, '#EFE5D5');
  }

  // Head & warm chestnut hair bun
  pxRect(ctx, x - 8, y - 22 + bodyYOffset, 16, 14, '#5B3420');
  if (mina.facing === 'up') {
    pxRect(ctx, x - 7, y - 21 + bodyYOffset, 14, 12, '#6E4027');
    pxRect(ctx, x - 3, y - 19 + bodyYOffset, 6, 6, '#4A2817');
    pxRect(ctx, x - 2, y - 18 + bodyYOffset, 4, 4, '#5B3420');
  } else {
    const eyeShift = mina.facing === 'left' ? -2 : mina.facing === 'right' ? 2 : 0;
    // Put hair bun behind her head when facing right/left
    const bunX = mina.facing === 'right' ? x - 10 : x + 5;
    pxRect(ctx, bunX, y - 17 + bodyYOffset, 5, 6, '#5B3420');
    pxRect(ctx, x - 6, y - 19 + bodyYOffset, 12, 11, '#F6CCB0'); // Face
    pxRect(ctx, x - 7, y - 22 + bodyYOffset, 14, 5, '#6E4027'); // Fringe

    // Round glasses & eyes
    if (!blink) {
      pxRect(ctx, x - 5 + eyeShift, y - 15 + bodyYOffset, 4, 4, '#3B281E');
      pxRect(ctx, x + 1 + eyeShift, y - 15 + bodyYOffset, 4, 4, '#3B281E');
      pxRect(ctx, x - 4 + eyeShift, y - 14 + bodyYOffset, 2, 2, '#FAF6F0');
      pxRect(ctx, x + 2 + eyeShift, y - 14 + bodyYOffset, 2, 2, '#FAF6F0');
      pxRect(ctx, x - 1 + eyeShift, y - 14 + bodyYOffset, 2, 1, '#3B281E');
    } else {
      pxRect(ctx, x - 4 + eyeShift, y - 13 + bodyYOffset, 3, 1, '#3B281E');
      pxRect(ctx, x + 1 + eyeShift, y - 13 + bodyYOffset, 3, 1, '#3B281E');
    }
    // Rosy cheeks
    pxRect(ctx, x - 5 + eyeShift, y - 11 + bodyYOffset, 2, 1, '#E89B8B');
    pxRect(ctx, x + 3 + eyeShift, y - 11 + bodyYOffset, 2, 1, '#E89B8B');
  }
}

function drawMinaBubbleOverlay(
  ctx: CanvasRenderingContext2D,
  mina: MinaNpcState,
  mood: AssistantMood,
  tick: number,
  bubbleText: string | null
) {
  const x = Math.round(mina.x);
  const y = Math.round(mina.y);

  if (mood === 'thinking') {
    const dots = '.'.repeat((Math.floor(tick / 14) % 3) + 1);
    drawSpeechBubble(ctx, x, y - 34, `กำลังคิด${dots}`, '#FAF6F0', '#D97736');
  } else if (bubbleText) {
    const border =
      mina.phase === 'walking_to_board' || mina.phase === 'pinning'
        ? '#D97736'
        : '#4D7C6F';
    drawSpeechBubble(ctx, x, y - 34, bubbleText, '#FAF6F0', border);
  }
}

function drawShoweringPlayerSilhouette(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  tick: number
) {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const phase = player.showerPhase ?? 'wetting';
  const elapsed = player.showerPhaseElapsed;
  const bob = Math.sin(tick * 0.14) > 0.3 ? -1 : 0;

  // Wet floor ripple shadow around feet
  pxRect(ctx, x - 9, y + 6, 18, 5, 'rgba(38, 74, 84, 0.28)');

  // Soft diffused lower/mid silhouette (no clothes, no explicit details; censored behind frosted glass)
  pxRect(ctx, x - 5, y + 1, 4, 7, 'rgba(205, 162, 136, 0.55)');
  pxRect(ctx, x + 1, y + 1, 4, 7, 'rgba(205, 162, 136, 0.55)');
  pxRect(ctx, x - 7, y - 9 + bob, 14, 11, 'rgba(218, 174, 148, 0.58)');

  // Arms based on shower phase
  if (phase === 'grab_soap' || phase === 'return_soap') {
    const t = Math.min(1, elapsed / 1.5);
    const reach = Math.round((t < 0.5 ? t * 2 : (1 - t) * 2) * 14);
    pxRect(ctx, x - 10, y - 7 + bob, 3, 8, 'rgba(218, 174, 148, 0.62)');
    pxRect(ctx, x + 7, y - 8 + bob, 4 + reach, 4, 'rgba(218, 174, 148, 0.68)');
  } else if (phase === 'scrub_soap') {
    const scrubShift = Math.round(Math.sin(tick * 0.35) * 3);
    pxRect(ctx, x - 11 + scrubShift, y - 9 + bob, 4, 8, 'rgba(218, 174, 148, 0.68)');
    pxRect(ctx, x + 7 - scrubShift, y - 9 + bob, 4, 8, 'rgba(218, 174, 148, 0.68)');
  } else {
    // Rinsing / wetting under shower water stream
    const rinseLift = Math.floor(tick / 10) % 2;
    pxRect(ctx, x - 10, y - 10 + bob + rinseLift, 3, 9, 'rgba(218, 174, 148, 0.62)');
    pxRect(ctx, x + 7, y - 10 + bob + (1 - rinseLift), 3, 9, 'rgba(218, 174, 148, 0.62)');
  }

  // Head & wet hair silhouette (remains recognizable near top of frosted glass)
  pxRect(ctx, x - 8, y - 22 + bob, 16, 13, 'rgba(90, 55, 36, 0.78)');
  pxRect(ctx, x - 6, y - 19 + bob, 12, 10, 'rgba(232, 190, 162, 0.75)');
  pxRect(ctx, x - 7, y - 22 + bob, 14, 5, 'rgba(106, 66, 43, 0.82)');
  // Closed/relaxed eyes while showering
  pxRect(ctx, x - 4, y - 14 + bob, 3, 1, 'rgba(45, 30, 22, 0.65)');
  pxRect(ctx, x + 1, y - 14 + bob, 3, 1, 'rgba(45, 30, 22, 0.65)');

  // Shampoo/soap foam cap on head & shoulders during scrub_soap
  if (phase === 'scrub_soap') {
    pxRect(ctx, x - 7, y - 23 + bob, 14, 4, 'rgba(255, 255, 255, 0.78)');
    pxRect(ctx, x - 5, y - 25 + bob, 10, 3, 'rgba(255, 255, 255, 0.72)');
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, tick: number) {
  if (player.isShowering) {
    drawShoweringPlayerSilhouette(ctx, player, tick);
    return;
  }
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const stepPhase = player.isMoving ? Math.floor(player.walkFrame) % 4 : 0;
  const bob = player.isMoving && (stepPhase === 1 || stepPhase === 3) ? -2 : 0;
  const legOffset = stepPhase === 1 ? 2 : stepPhase === 3 ? -2 : 0;
  const breathe = player.isSitting && Math.sin(tick * 0.06) > 0.45 ? 1 : 0;
  const yOff = player.isMoving ? bob : breathe;

  const isOnSofa = player.isSitting && player.seat === 'sofa';
  const sofaAct = isOnSofa ? player.sofaActivity : null;
  const sofaElapsed = isOnSofa ? player.sofaActivityElapsed : 0;
  // Tea sip timing: lift teacup smoothly for ~1.1s every ~3.4s
  const teaCycle = sofaElapsed % 3.4;
  const isSippingTea = sofaAct === 'tea' && teaCycle > 1.0 && teaCycle < 2.25;
  // Newspaper page-rustle timing
  const paperRustle = sofaAct === 'newspaper' && (sofaElapsed % 2.8) > 2.35 ? -1 : 0;
  // TV remote pointing timing (first 1.35s aims remote down and blinks IR LED)
  const isAimingRemote = sofaAct === 'tv_remote' && sofaElapsed < 1.35;

  // Shadow (subtle when seated on chair/sofa)
  if (!player.isSitting) {
    pxRect(ctx, x - 9, y + 7, 18, 6, 'rgba(28,20,15,0.28)');
  } else {
    pxRect(ctx, x - 8, y + 4, 16, 4, 'rgba(28,20,15,0.18)');
  }

  // Legs / shoes (tucked knees on sofa, hidden under desk, or walking legs)
  if (!player.isSitting) {
    pxRect(ctx, x - 6, y + 2 + (legOffset > 0 ? 1 : 0), 5, 7, '#3E4C59');
    pxRect(ctx, x + 1, y + 2 + (legOffset < 0 ? 1 : 0), 5, 7, '#3E4C59');
  } else if (isOnSofa) {
    // Relaxed seated knees & shoes resting at the front edge of the sofa cushion
    pxRect(ctx, x - 7, y + 2, 6, 5, '#3E4C59');
    pxRect(ctx, x + 1, y + 2, 6, 5, '#3E4C59');
    pxRect(ctx, x - 6, y + 6, 5, 2, '#2B231E');
    pxRect(ctx, x + 1, y + 6, 5, 2, '#2B231E');
  }

  // Torso: olive sage knit sweater (matching generated portrait)
  pxRect(ctx, x - 8, y - 9 + yOff, 16, 12, '#6A7B53');
  pxRect(ctx, x - 6, y - 9 + yOff, 12, 3, '#7C8F62');

  // Arms (drawn behind held sofa props when reading/drinking)
  if (player.isSitting && player.seat === 'workdesk') {
    const typeShift = Math.floor(tick / 7) % 2;
    pxRect(ctx, x - 10, y - 16 + typeShift, 4, 11, '#5C6C47');
    pxRect(ctx, x - 9, y - 18 + typeShift, 3, 3, '#F6CCB0');
    pxRect(ctx, x + 6, y - 16 + (1 - typeShift), 4, 11, '#5C6C47');
    pxRect(ctx, x + 6, y - 18 + (1 - typeShift), 3, 3, '#F6CCB0');
  } else if (isOnSofa) {
    if (sofaAct === 'tea') {
      // Left arm relaxed, right arm holds warm teacup (raises to sip!)
      pxRect(ctx, x - 11, y - 6 + yOff, 3, 7, '#5C6C47');
      pxRect(ctx, x - 10, y + yOff, 3, 2, '#F6CCB0');
      const cupLift = isSippingTea ? -5 : 0;
      pxRect(ctx, x + 7, y - 7 + yOff + Math.min(0, cupLift + 2), 4, 7, '#5C6C47');
      pxRect(ctx, x + 4, y - 5 + yOff + cupLift, 4, 3, '#F6CCB0');
    } else if (sofaAct === 'newspaper') {
      // Both arms forward holding open newspaper
      pxRect(ctx, x - 11, y - 7 + yOff + paperRustle, 4, 7, '#5C6C47');
      pxRect(ctx, x + 7, y - 7 + yOff + paperRustle, 4, 7, '#5C6C47');
    } else if (sofaAct === 'tv_remote') {
      // Left arm relaxed, right arm points TV remote down toward TV
      pxRect(ctx, x - 11, y - 6 + yOff, 3, 7, '#5C6C47');
      pxRect(ctx, x - 10, y + yOff, 3, 2, '#F6CCB0');
      const aimExtend = isAimingRemote ? 3 : 0;
      pxRect(ctx, x + 7, y - 6 + yOff, 4, 7 + aimExtend, '#5C6C47');
      pxRect(ctx, x + 7, y + yOff + aimExtend, 4, 3, '#F6CCB0');
    } else {
      pxRect(ctx, x - 11, y - 6 + yOff, 3, 7, '#5C6C47');
      pxRect(ctx, x + 8, y - 6 + yOff, 3, 7, '#5C6C47');
      pxRect(ctx, x - 10, y + yOff, 3, 2, '#F6CCB0');
      pxRect(ctx, x + 7, y + yOff, 3, 2, '#F6CCB0');
    }
  } else {
    pxRect(ctx, x - 11, y - 7 + yOff + (legOffset > 0 ? -1 : 0), 3, 9, '#5C6C47');
    pxRect(ctx, x + 8, y - 7 + yOff + (legOffset < 0 ? -1 : 0), 3, 9, '#5C6C47');
  }

  // Head & hair
  pxRect(ctx, x - 8, y - 22 + yOff, 16, 14, '#5A3724');
  if (player.facing !== 'up') {
    pxRect(ctx, x - 6, y - 19 + yOff, 12, 11, '#F6CCB0');
    pxRect(ctx, x - 7, y - 22 + yOff, 14, 5, '#6A422B');
    // Eyes based on facing direction & sofa reading glance
    let eyeShift = player.facing === 'left' ? -2 : player.facing === 'right' ? 2 : 0;
    if (sofaAct === 'newspaper') {
      eyeShift = Math.floor(sofaElapsed * 1.4) % 2 === 0 ? -1 : 1;
    }
    const blink = tick % 230 > 224 || isSippingTea;
    if (!blink) {
      pxRect(ctx, x - 4 + eyeShift, y - 15 + yOff, 2, 3, '#2D1E16');
      pxRect(ctx, x + 2 + eyeShift, y - 15 + yOff, 2, 3, '#2D1E16');
    } else {
      pxRect(ctx, x - 4 + eyeShift, y - 13 + yOff, 3, 1, '#2D1E16');
      pxRect(ctx, x + 1 + eyeShift, y - 13 + yOff, 3, 1, '#2D1E16');
    }
  } else {
    // Facing away (looking at monitor/north wall)
    pxRect(ctx, x - 7, y - 21 + yOff, 14, 12, '#6A422B');
    pxRect(ctx, x - 5, y - 10 + yOff, 10, 2, '#5A3724');
  }

  // Foreground sofa activity props (drawn cleanly in front of player torso/hands)
  if (sofaAct === 'tea') {
    const cupX = isSippingTea ? x - 1 : x + 3;
    const cupY = isSippingTea ? y - 11 + yOff : y - 6 + yOff;
    pxRect(ctx, cupX, cupY, 7, 6, '#FAF6F0'); // Cream ceramic teacup
    pxRect(ctx, cupX + 1, cupY + 1, 5, 2, '#B46938'); // Warm amber tea
    pxRect(ctx, cupX + 7, cupY + 1, 2, 3, '#EFE5D5'); // Cup handle
    // Gentle rising pixel steam from hot teacup
    const steam = Math.floor(tick / 12) % 4;
    pxRect(ctx, cupX + 2 + (steam % 2), cupY - 3 - steam, 2, 2, 'rgba(255,250,240,0.7)');
    if (steam > 1) {
      pxRect(ctx, cupX + 4, cupY - 6 - (steam % 2), 1, 2, 'rgba(255,250,240,0.45)');
    }
  } else if (sofaAct === 'newspaper') {
    const nx = x - 11;
    const ny = y - 10 + yOff + paperRustle;
    // Open broadsheet newspaper (left & right folded pages)
    pxRect(ctx, nx, ny, 22, 13, '#C7BBA8');
    pxRect(ctx, nx + 1, ny + 1, 9, 11, '#F5EFE6');
    pxRect(ctx, nx + 12, ny + 1, 9, 11, '#EFE7DC');
    pxRect(ctx, nx + 10, ny + 1, 2, 11, '#B3A490'); // Center fold crease
    // Tiny headline & news column pixel lines
    pxRect(ctx, nx + 2, ny + 2, 7, 2, '#3B312B');
    pxRect(ctx, nx + 2, ny + 5, 6, 1, '#7A6E63');
    pxRect(ctx, nx + 2, ny + 7, 7, 1, '#7A6E63');
    pxRect(ctx, nx + 2, ny + 9, 5, 1, '#7A6E63');
    pxRect(ctx, nx + 13, ny + 2, 7, 3, '#9BA8B4'); // Photo thumbnail
    pxRect(ctx, nx + 13, ny + 7, 7, 1, '#7A6E63');
    pxRect(ctx, nx + 13, ny + 9, 6, 1, '#7A6E63');
    // Hands gripping left & right edges of newspaper
    pxRect(ctx, nx - 1, ny + 5, 3, 3, '#F6CCB0');
    pxRect(ctx, nx + 20, ny + 5, 3, 3, '#F6CCB0');
  } else if (sofaAct === 'tv_remote') {
    const rx = x + 7;
    const ry = y + (isAimingRemote ? 2 : -1) + yOff;
    pxRect(ctx, rx, ry, 4, 8, '#262321'); // Sleek dark remote body
    pxRect(ctx, rx + 1, ry + 2, 2, 1, '#94A3B8'); // Tiny buttons
    pxRect(ctx, rx + 1, ry + 4, 2, 1, '#CBD5E1');
    // Red IR transmitter pulse when pressing button to turn on TV
    if (isAimingRemote && Math.floor(tick / 5) % 2 === 0) {
      pxRect(ctx, rx + 1, ry + 8, 2, 2, '#EF4444');
      pxRect(ctx, rx, ry + 11, 4, 1, 'rgba(252, 165, 165, 0.75)');
    }
  }
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  text: string,
  bgColor: string,
  borderColor: string
) {
  ctx.save();
  ctx.font = '600 11px "IBM Plex Sans Thai", sans-serif';
  const truncated = text.length > 26 ? `${text.slice(0, 25)}…` : text;
  const metrics = ctx.measureText(truncated);
  const padX = 8;
  const bw = Math.min(200, Math.max(58, Math.ceil(metrics.width) + padX * 2));
  const bh = 22;

  let bx = Math.round(anchorX - bw / 2);
  if (bx < 12) bx = 12;
  if (bx + bw > WORLD_W - 12) bx = WORLD_W - 12 - bw;
  const by = Math.max(8, Math.round(anchorY - bh));

  // Crisp pixel border box
  pxRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, borderColor);
  pxRect(ctx, bx, by, bw, bh, bgColor);
  // Pointer notch
  pxRect(ctx, anchorX - 3, by + bh, 6, 3, borderColor);
  pxRect(ctx, anchorX - 2, by + bh - 1, 4, 3, bgColor);

  ctx.fillStyle = '#29221D';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncated, bx + bw / 2, by + bh / 2 + 0.5);
  ctx.restore();
}

function drawInteractableHighlight(
  ctx: CanvasRenderingContext2D,
  item: InteractableObject,
  tick: number
) {
  const pulse = 0.55 + Math.sin(tick * 0.12) * 0.25;
  ctx.save();
  ctx.strokeStyle = `rgba(245, 184, 65, ${pulse.toFixed(2)})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    Math.round(item.x) - 2,
    Math.round(item.y) - 2,
    Math.round(item.w) + 4,
    Math.round(item.h) + 4
  );

  // Floating [E] prompt tag above object
  const cx = item.x + item.w / 2;
  const cy = Math.max(26, item.y - 8);
  const label = `[E] ${item.actionLabel}`;
  ctx.font = '600 11px "IBM Plex Sans Thai", sans-serif';
  const w = Math.ceil(ctx.measureText(label).width) + 14;
  const h = 20;
  let bx = Math.round(cx - w / 2);
  bx = Math.max(10, Math.min(WORLD_W - w - 10, bx));
  const by = Math.round(cy - h);

  pxRect(ctx, bx - 1, by - 1, w + 2, h + 2, '#D97736');
  pxRect(ctx, bx, by, w, h, '#231D19');
  ctx.fillStyle = '#FAF6F0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + w / 2, by + h / 2 + 0.5);
  ctx.restore();
}

function drawInspectHighlight(
  ctx: CanvasRenderingContext2D,
  inspect: InspectHoverRenderState,
  tick: number
) {
  const { object, progress, revealed } = inspect;
  if (!revealed && progress <= 0) return;

  const rx = Math.round(object.x) - 1;
  const ry = Math.round(object.y) - 1;
  const rw = Math.round(object.w) + 2;
  const rh = Math.round(object.h) + 2;

  ctx.save();
  if (revealed) {
    const pulse = 0.78 + Math.sin(tick * 0.14) * 0.16;
    ctx.fillStyle = 'rgba(153, 226, 208, 0.13)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = `rgba(153, 226, 208, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
  } else {
    const alpha = 0.25 + progress * 0.45;
    ctx.fillStyle = `rgba(153, 226, 208, ${(0.04 + progress * 0.06).toFixed(3)})`;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.setLineDash([3, 2]);
    ctx.strokeStyle = `rgba(153, 226, 208, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 1.25;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
  }
  ctx.restore();
}

function drawInspectDwellRing(
  ctx: CanvasRenderingContext2D,
  inspect: InspectHoverRenderState,
  viewW: number,
  viewH: number
) {
  if (inspect.revealed || inspect.progress <= 0) return;

  const cx = Math.max(16, Math.min(viewW - 16, inspect.pointerVx + 15));
  const cy = Math.max(16, Math.min(viewH - 16, inspect.pointerVy + 15));
  const r = 7;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * Math.min(1, inspect.progress);

  ctx.save();
  // Subtle dark disc backdrop for contrast against light ceramic tiles
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(28, 24, 21, 0.76)';
  ctx.fill();

  // Track ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(250, 246, 240, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Active fill arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = '#99E2D0';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawAtmosphereLighting(
  ctx: CanvasRenderingContext2D,
  timeOfDay: TimeOfDay,
  tick: number,
  isTvOn: boolean
) {
  ctx.save();

  // Sunlight diagonal beams through windows during morning & afternoon
  if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
    const beamColor =
      timeOfDay === 'morning' ? 'rgba(255, 248, 220, 0.13)' : 'rgba(255, 198, 120, 0.16)';
    ctx.fillStyle = beamColor;

    // Living room window sunbeam
    ctx.beginPath();
    ctx.moveTo(2.3 * TILE, 54);
    ctx.lineTo(4.9 * TILE, 54);
    ctx.lineTo(5.8 * TILE, 148);
    ctx.lineTo(2.9 * TILE, 148);
    ctx.closePath();
    ctx.fill();

    // Office window sunbeam
    ctx.beginPath();
    ctx.moveTo(16.9 * TILE, 52);
    ctx.lineTo(18.5 * TILE, 52);
    ctx.lineTo(18.8 * TILE, 130);
    ctx.lineTo(17.1 * TILE, 130);
    ctx.closePath();
    ctx.fill();
  }

  // Evening cozy darkness tint
  if (timeOfDay === 'evening') {
    ctx.fillStyle = 'rgba(18, 22, 38, 0.34)';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  } else if (timeOfDay === 'afternoon') {
    ctx.fillStyle = 'rgba(230, 140, 60, 0.06)';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  // Warm radial glow pools (Christmas tree, desk lamp, fireplace)
  const glowAlpha = timeOfDay === 'evening' ? 0.32 : 0.16;
  const lampFlicker = 1 + Math.sin(tick * 0.1) * 0.03;

  const lights = [
    { x: 1.85 * TILE, y: 2.75 * TILE, r: 84 * lampFlicker, color: `rgba(255, 208, 110, ${glowAlpha * 0.95})` },
    { x: 12.7 * TILE, y: 3.45 * TILE, r: 92 * lampFlicker, color: `rgba(255, 190, 92, ${glowAlpha})` },
    { x: 18.2 * TILE, y: 6.55 * TILE, r: 86 * lampFlicker, color: `rgba(255, 196, 108, ${glowAlpha * 0.95})` },
    { x: 7.9 * TILE, y: 1.9 * TILE, r: 80 * lampFlicker, color: `rgba(244, 120, 56, ${glowAlpha * 0.95})` },
    // Lower wing lighting: kitchen range hood, dining pendant, bathroom vanity sconces & shower overhead
    { x: 3.95 * TILE, y: 14.1 * TILE, r: 78, color: `rgba(255, 214, 138, ${glowAlpha * 0.85})` },
    { x: 6.3 * TILE, y: 19.1 * TILE, r: 106, color: `rgba(255, 206, 122, ${glowAlpha * 0.9})` },
    { x: 13.0 * TILE, y: 14.2 * TILE, r: 94, color: `rgba(244, 248, 255, ${glowAlpha * 0.88})` },
    { x: 17.2 * TILE, y: 15.6 * TILE, r: 78, color: `rgba(218, 244, 252, ${glowAlpha * 0.65})` },
  ];

  if (isTvOn) {
    const tvTwinkle = 0.19 + Math.sin(tick * 0.21) * 0.055 + Math.sin(tick * 0.47) * 0.025;
    const tvRadius = 80 + Math.sin(tick * 0.16) * 6;
    lights.push({
      x: 3.7 * TILE,
      y: 10.15 * TILE,
      r: tvRadius,
      color: `rgba(148, 210, 238, ${tvTwinkle.toFixed(3)})`,
    });
    // Secondary warm-tinted micro twinkle pulse near screen center
    lights.push({
      x: 3.7 * TILE,
      y: 10.45 * TILE,
      r: 34 + Math.cos(tick * 0.31) * 5,
      color: `rgba(255, 240, 200, ${(0.1 + Math.abs(Math.sin(tick * 0.28)) * 0.09).toFixed(3)})`,
    });
  }

  for (const l of lights) {
    const grad = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r);
    grad.addColorStop(0, l.color);
    grad.addColorStop(1, 'rgba(255, 190, 92, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle floor zone labels painted near bottom of each zone
  ctx.font = '600 10px "Prompt", "IBM Plex Sans Thai", sans-serif';
  ctx.fillStyle = timeOfDay === 'evening' ? 'rgba(250, 246, 240, 0.55)' : 'rgba(65, 42, 26, 0.45)';
  ctx.textAlign = 'left';
  ctx.fillText('ห้องพักผ่อน', 1.4 * TILE, 11.65 * TILE);
  ctx.fillText('ห้องครัว', 4.15 * TILE, 21.65 * TILE);
  ctx.textAlign = 'right';
  ctx.fillText('ห้องทำงาน · โต๊ะของมีน่า', 18.6 * TILE, 11.65 * TILE);
  ctx.fillStyle = timeOfDay === 'evening' ? 'rgba(232, 246, 248, 0.58)' : 'rgba(42, 68, 72, 0.48)';
  ctx.fillText('ห้องน้ำ · ห้องอาบน้ำ', 15.65 * TILE, 21.65 * TILE);

  ctx.restore();
}

export function renderHouseScene(
  ctx: CanvasRenderingContext2D,
  state: RenderContextState
) {
  const viewW = state.viewW ?? VIEW_W;
  const viewH = state.viewH ?? VIEW_H;
  const baseScale = state.baseScale ?? CAMERA_BASE_SCALE;

  ctx.imageSmoothingEnabled = false;
  // Cozy warm dark architectural backdrop outside house boundaries (visible when zoomed out)
  ctx.fillStyle = '#1B1612';
  ctx.fillRect(0, 0, viewW, viewH);

  const scale = state.camera.zoom * baseScale;
  ctx.save();
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(scale, scale);
  ctx.translate(-state.camera.x, -state.camera.y);

  // Subtle architectural outer rim shadow around the house perimeter
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(6, 6, WORLD_W, WORLD_H);

  // TV turns on visually either when the YouTube modal is open or when the player clicks the remote on the sofa
  const sofaWatchingTv =
    state.player.isSitting &&
    state.player.seat === 'sofa' &&
    state.player.sofaActivity === 'tv_remote' &&
    state.player.sofaActivityElapsed >= 0.85;
  const tvScreenActive = state.isTvOn || sofaWatchingTv;

  // 1. Floor, Rugs & Mina Proximity Zone
  drawWoodFloor(ctx);
  drawLowerRoomFloors(ctx);
  drawRugs(ctx);
  drawMinaProximityZone(ctx, state.player, state.isWorking, state.tick);

  // 2. Walls, Windows, Fireplace, Pinboard & Lower Wing Architectural Walls
  const isPinboardActive =
    state.mina.phase === 'pinning' || state.pinboardGlowTick > 0;
  const isShowerRunning =
    state.player.isShowering || state.player.showerPrivacyProgress > 0.05;
  drawWalls(ctx, state.timeOfDay, state.tick, state.extraPinCount, isPinboardActive);
  drawLowerRoomWalls(ctx, state.timeOfDay, state.tick, isShowerRunning);

  // 3. Click-to-move waypoint ring
  if (state.clickTarget && state.clickTarget.ttl > 0) {
    const alpha = Math.min(0.85, state.clickTarget.ttl / 25);
    ctx.save();
    ctx.strokeStyle = `rgba(245, 184, 65, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 2;
    const radius = 5 + Math.sin(state.tick * 0.25) * 2;
    ctx.beginPath();
    ctx.arc(state.clickTarget.x, state.clickTarget.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Furniture & depth-sorted characters
  drawLivingFurniture(ctx, state.tick, tvScreenActive);
  drawKitchenFurniture(ctx, state.tick);
  drawBathroomFurniture(ctx, state.tick, state.player);

  const minaBehindDesk = state.mina.x > DIVIDER_COL * TILE && state.mina.y < 3.4 * TILE;
  if (minaBehindDesk) {
    drawMinaNpc(ctx, state.mina, state.assistantMood, state.tick);
  }

  drawOfficeFurniture(
    ctx,
    state.assistantMood,
    state.mina.phase,
    state.tick,
    state.player.isSitting && state.player.seat === 'workdesk'
  );

  const centerTableSortY = CENTER_TABLE_RECT.y + CENTER_TABLE_RECT.h * 0.55;
  const kitchenDiningSortY = KITCHEN_DINING_RECT.y + KITCHEN_DINING_RECT.h * 0.55;
  const showerGlassSortY = 18.02 * TILE;

  const drawList: Array<{ y: number; draw: () => void }> = [
    { y: state.player.y, draw: () => drawPlayer(ctx, state.player, state.tick) },
    {
      y: centerTableSortY,
      draw: () => drawCenterDriveTable(ctx, state.tick, state.isDriveOpen),
    },
    {
      y: kitchenDiningSortY,
      draw: () => drawKitchenDiningTable(ctx),
    },
    {
      y: showerGlassSortY,
      draw: () => drawGlassShowerEnclosure(ctx, state.tick, state.player),
    },
  ];
  if (!minaBehindDesk) {
    drawList.push({
      y: state.mina.y,
      draw: () => drawMinaNpc(ctx, state.mina, state.assistantMood, state.tick),
    });
  }
  drawList.sort((a, b) => a.y - b.y);
  for (const item of drawList) {
    item.draw();
  }

  // 6. Cozy dynamic lighting
  drawAtmosphereLighting(ctx, state.timeOfDay, state.tick, tvScreenActive);

  // 7. Mina's floating speech bubble (always legible above furniture and lighting)
  drawMinaBubbleOverlay(
    ctx,
    state.mina,
    state.assistantMood,
    state.tick,
    state.minaBubbleText
  );

  // 8. Interactable highlight & [E] cue (drawn above lighting for crisp legibility)
  if (state.nearestInteractable && !state.isWorking && !state.isTvOn) {
    drawInteractableHighlight(ctx, state.nearestInteractable, state.tick);
  }

  // 9. World-space hover inspect highlight outline
  if (state.inspectHover) {
    drawInspectHighlight(ctx, state.inspectHover, state.tick);
  }

  ctx.restore();

  // 10. Screen-space subtle dwell progress ring near cursor during 2-second hover
  if (state.inspectHover && !state.inspectHover.revealed && state.inspectHover.progress > 0) {
    drawInspectDwellRing(ctx, state.inspectHover, viewW, viewH);
  }
}
