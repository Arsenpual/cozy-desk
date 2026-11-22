import type { PlayerState, TimeOfDay } from '../types/game';
import {
  BATH_DOOR_ROW_END,
  BATH_DOOR_ROW_START,
  DIVIDER_COL,
  KITCHEN_DINING_RECT,
  KITCHEN_DOOR_COL_END,
  KITCHEN_DOOR_COL_START,
  LOWER_EAST_WALL_COL,
  LOWER_FLOOR_ROW_END,
  LOWER_FLOOR_ROW_START,
  LOWER_WORLD_W,
  MID_WALL_ROW,
  SOUTH_WALL_ROW,
  TILE,
} from './houseMap';

export function isSoapInHolder(player?: PlayerState): boolean {
  if (!player || !player.isShowering || !player.showerPhase) {
    return true;
  }
  if (player.showerPhase === 'wetting' || player.showerPhase === 'rinse') {
    return true;
  }
  if (player.showerPhase === 'grab_soap') {
    return player.showerPhaseElapsed < 0.72;
  }
  if (player.showerPhase === 'return_soap') {
    return player.showerPhaseElapsed >= 0.75;
  }
  // 'scrub_soap' -> soap is in player's hand
  return false;
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

export function drawLowerRoomFloors(ctx: CanvasRenderingContext2D) {
  // 1. Kitchen warm checkerboard ceramic tiles (cols 1..9, rows 14..21)
  for (let row = LOWER_FLOOR_ROW_START; row <= LOWER_FLOOR_ROW_END; row++) {
    for (let col = 1; col < DIVIDER_COL; col++) {
      const x = col * TILE;
      const y = row * TILE;
      const isAlt = (col + row) % 2 === 0;
      const base = isAlt ? '#DDD0BA' : '#CEC0A8';
      const inner = isAlt ? '#E4D8C4' : '#D5C7AF';
      const grout = '#B4A48B';

      pxRect(ctx, x, y, TILE, TILE, grout);
      pxRect(ctx, x + 1, y + 1, TILE - 2, TILE - 2, base);
      // 2x2 sub-tile ceramic grid for refined architectural scale
      pxRect(ctx, x + 1, y + 1, 14, 14, inner);
      pxRect(ctx, x + 17, y + 17, 14, 14, inner);
      pxRect(ctx, x + 15, y, 2, TILE, grout);
      pxRect(ctx, x, y + 15, TILE, 2, grout);
      // Crisp subtle top-left ceramic sheen
      pxRect(ctx, x + 2, y + 2, 11, 1, 'rgba(255, 250, 240, 0.35)');
      pxRect(ctx, x + 18, y + 18, 11, 1, 'rgba(255, 250, 240, 0.3)');
    }
  }

  // 2. Bathroom crisp porcelain ceramic tiles (cols 11..18, rows 14..21)
  for (let row = LOWER_FLOOR_ROW_START; row <= LOWER_FLOOR_ROW_END; row++) {
    for (let col = DIVIDER_COL + 1; col <= 18; col++) {
      const x = col * TILE;
      const y = row * TILE;
      const isAlt = (col + row) % 2 === 0;
      const grout = '#A4B5B3';
      const tileA = isAlt ? '#D2DDDD' : '#C8D6D6';
      const tileB = isAlt ? '#DAE5E5' : '#D0DCDC';

      pxRect(ctx, x, y, TILE, TILE, grout);
      pxRect(ctx, x + 1, y + 1, 14, 14, tileA);
      pxRect(ctx, x + 17, y + 1, 14, 14, tileB);
      pxRect(ctx, x + 1, y + 17, 14, 14, tileB);
      pxRect(ctx, x + 17, y + 17, 14, 14, tileA);
      pxRect(ctx, x + 2, y + 2, 10, 1, 'rgba(255,255,255,0.42)');
      pxRect(ctx, x + 18, y + 18, 10, 1, 'rgba(255,255,255,0.36)');
    }
  }

  // 3. Integrated Glass Shower Room Recessed Wet-Zone Aqua Mosaic Floor (cols 15.52..18.98, rows 14.0..18.02)
  const shX = Math.round(15.52 * TILE);
  const shY = LOWER_FLOOR_ROW_START * TILE;
  const shW = Math.round(18.98 * TILE) - shX;
  const shH = Math.round(18.02 * TILE) - shY;
  pxRect(ctx, shX, shY, shW, shH, '#7E9FA6');
  const mSize = 8;
  for (let my = shY + 1; my < shY + shH - 2; my += mSize) {
    for (let mx = shX + 1; mx < shX + shW - 2; mx += mSize) {
      const idx = ((mx / mSize) | 0) + ((my / mSize) | 0);
      const col = idx % 3 === 0 ? '#9DC0C7' : idx % 3 === 1 ? '#92B6BE' : '#A6C8CF';
      pxRect(ctx, mx, my, mSize - 1, mSize - 1, col);
      pxRect(ctx, mx, my, mSize - 2, 1, 'rgba(255,255,255,0.22)');
    }
  }
  // Subtle recessed inner drop shadow along shower perimeter
  pxRect(ctx, shX, shY, shW, 3, 'rgba(32, 56, 64, 0.2)');
  pxRect(ctx, shX, shY, 3, shH, 'rgba(32, 56, 64, 0.16)');

  // Gleaming stainless steel square shower floor drain (center-east inside shower)
  const drainX = Math.round(17.45 * TILE);
  const drainY = Math.round(15.9 * TILE);
  pxRect(ctx, drainX - 7, drainY - 7, 14, 14, '#5D7075');
  pxRect(ctx, drainX - 6, drainY - 6, 12, 12, '#B6C5C9');
  pxRect(ctx, drainX - 4, drainY - 4, 8, 2, '#4A5A5E');
  pxRect(ctx, drainX - 4, drainY - 1, 8, 2, '#4A5A5E');
  pxRect(ctx, drainX - 4, drainY + 2, 8, 2, '#4A5A5E');

  // 4. Doorway floor thresholds
  // (a) Living Lounge <-> Kitchen open archway (cols 5..6, rows 12..13)
  const kDoorX = KITCHEN_DOOR_COL_START * TILE;
  const kDoorW = (KITCHEN_DOOR_COL_END - KITCHEN_DOOR_COL_START + 1) * TILE;
  const midY = MID_WALL_ROW * TILE;
  pxRect(ctx, kDoorX, midY, kDoorW, TILE, '#C29663');
  pxRect(ctx, kDoorX, midY + 15, kDoorW, 1, '#9F7446');
  pxRect(ctx, kDoorX, midY + 1, kDoorW, 1, '#D4AB7A');
  pxRect(ctx, kDoorX, midY + TILE, kDoorW, TILE, '#D8CBB4');
  pxRect(ctx, kDoorX, midY + TILE + 15, kDoorW, 2, '#B4A48B');
  pxRect(ctx, kDoorX + 31, midY + TILE, 2, TILE, '#B4A48B');
  // Oak doorway threshold beam across middle of passage
  pxRect(ctx, kDoorX, midY + 26, kDoorW, 12, '#7D5432');
  pxRect(ctx, kDoorX + 2, midY + 28, kDoorW - 4, 8, '#9A6B44');
  pxRect(ctx, kDoorX + 4, midY + 29, kDoorW - 8, 2, '#B38258');

  // (b) Kitchen <-> Bathroom vertical doorway threshold on col 10 (rows 16..17 — ONLY bathroom entrance)
  const bDoorX = DIVIDER_COL * TILE;
  const bDoorY = BATH_DOOR_ROW_START * TILE;
  const bDoorH = (BATH_DOOR_ROW_END - BATH_DOOR_ROW_START + 1) * TILE;
  pxRect(ctx, bDoorX, bDoorY, 16, bDoorH, '#D8CBB4'); // Kitchen ceramic half
  pxRect(ctx, bDoorX + 16, bDoorY, 16, bDoorH, '#CDDADA'); // Bathroom porcelain half
  // Vertical timber frame + cream marble bathroom sill strip
  pxRect(ctx, bDoorX + 10, bDoorY, 12, bDoorH, '#6A472D');
  pxRect(ctx, bDoorX + 12, bDoorY + 2, 8, bDoorH - 4, '#E8E4DC');
  pxRect(ctx, bDoorX + 13, bDoorY + 4, 2, bDoorH - 8, '#FAF8F4');

  // 5. Cozy floor mats & flat floor props (non-colliding)
  // Kitchen woven terracotta runner mat in front of stove & prep area
  const krx = Math.round(2.65 * TILE);
  const kry = Math.round(15.35 * TILE);
  pxRect(ctx, krx, kry, 68, 22, '#A86245');
  pxRect(ctx, krx + 3, kry + 3, 62, 16, '#C98360');
  pxRect(ctx, krx + 7, kry + 6, 54, 10, '#E3C9AE');
  pxRect(ctx, krx + 11, kry + 9, 46, 4, '#C98360');

  // Small striped mat in front of kitchen sink
  const smx = Math.round(7.25 * TILE);
  const smy = Math.round(15.35 * TILE);
  pxRect(ctx, smx, smy, 50, 20, '#5E7F72');
  pxRect(ctx, smx + 3, smy + 3, 44, 14, '#799D8E');
  pxRect(ctx, smx + 6, smy + 6, 38, 8, '#DDE7E2');

  // Plush sage bath mat right outside the glass shower sliding door
  const bmx = Math.round(13.95 * TILE);
  const bmy = Math.round(16.35 * TILE);
  pxRect(ctx, bmx + 1, bmy + 1, 38, 46, 'rgba(30, 45, 48, 0.14)');
  pxRect(ctx, bmx, bmy, 38, 45, '#597D74');
  pxRect(ctx, bmx + 3, bmy + 3, 32, 39, '#739A90');
  pxRect(ctx, bmx + 6, bmy + 6, 26, 33, '#88AEA4');
  for (let sy = bmy + 9; sy < bmy + 36; sy += 5) {
    pxRect(ctx, bmx + 8, sy, 22, 1, '#6C9288');
  }

  // Soft cream bath mat in front of north-west family vanity sink
  const vmx = Math.round(12.05 * TILE);
  const vmy = Math.round(15.22 * TILE);
  pxRect(ctx, vmx, vmy, 64, 18, '#B8ACA0');
  pxRect(ctx, vmx + 3, vmy + 3, 58, 12, '#ECE5DA');
  pxRect(ctx, vmx + 6, vmy + 6, 52, 6, '#DFD5C7');

  // Minimal white digital bathroom scale resting neatly in dry zone
  const scx = Math.round(12.55 * TILE);
  const scy = Math.round(18.8 * TILE);
  pxRect(ctx, scx + 1, scy + 2, 22, 20, 'rgba(30, 45, 48, 0.14)');
  pxRect(ctx, scx, scy, 22, 20, '#8FA1A3');
  pxRect(ctx, scx + 2, scy + 2, 18, 16, '#F2F6F6');
  pxRect(ctx, scx + 6, scy + 4, 10, 4, '#3B4B50');
  pxRect(ctx, scx + 8, scy + 5, 6, 2, '#99E2D0');
}

function drawWallSegmentTopBeam(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  pxRect(ctx, x, y, w, h, '#3B281E');
  pxRect(ctx, x + 2, y + 3, w - 4, h - 6, '#5B3E2B');
  pxRect(ctx, x + 3, y + 3, w - 6, 2, '#735039');
}

export function drawLowerRoomWalls(
  ctx: CanvasRenderingContext2D,
  timeOfDay: TimeOfDay,
  tick: number,
  isShowerRunning = false
) {
  const midY = MID_WALL_ROW * TILE;
  const wallFaceY = midY + 18;
  const wallFaceH = 2 * TILE - 18; // 46px tall north interior wall face for lower rooms

  // 1. Horizontal dividing wall top structural timber beam (open ONLY at Kitchen doorway cols 5..6; solid between Office & Bathroom)
  drawWallSegmentTopBeam(ctx, TILE - 5, midY, (KITCHEN_DOOR_COL_START - 1) * TILE + 5, 18);
  drawWallSegmentTopBeam(
    ctx,
    (KITCHEN_DOOR_COL_END + 1) * TILE,
    midY,
    (LOWER_EAST_WALL_COL - KITCHEN_DOOR_COL_END - 1) * TILE + 5,
    18
  );

  // Door jamb trim posts flanking the Living <-> Kitchen archway
  pxRect(ctx, KITCHEN_DOOR_COL_START * TILE - 4, midY, 4, 2 * TILE, '#5B3E2B');
  pxRect(ctx, (KITCHEN_DOOR_COL_END + 1) * TILE, midY, 4, 2 * TILE, '#5B3E2B');

  // 2. Kitchen North Interior Wall (cols 1..4 & cols 7..9)
  const kitchenWallSegments = [
    { x: TILE, w: (KITCHEN_DOOR_COL_START - 1) * TILE },
    { x: (KITCHEN_DOOR_COL_END + 1) * TILE, w: (DIVIDER_COL - KITCHEN_DOOR_COL_END - 1) * TILE },
  ];

  for (const seg of kitchenWallSegments) {
    // Upper butter-cream kitchen wall plaster
    pxRect(ctx, seg.x, wallFaceY, seg.w, 22, '#EFE6D5');
    // Lower white subway-tile kitchen backsplash
    pxRect(ctx, seg.x, wallFaceY + 22, seg.w, wallFaceH - 22, '#F4F0E6');
    for (let ty = wallFaceY + 22; ty < midY + 2 * TILE; ty += 6) {
      pxRect(ctx, seg.x, ty, seg.w, 1, '#D8D0C2');
      const offset = ((ty - wallFaceY) / 6) % 2 === 0 ? 0 : 6;
      for (let tx = seg.x + offset; tx < seg.x + seg.w; tx += 12) {
        pxRect(ctx, tx, ty, 1, 6, '#D8D0C2');
      }
    }
    // Crisp dark counter-backsplash edge trim
    pxRect(ctx, seg.x, midY + 2 * TILE - 2, seg.w, 2, '#7A5438');
  }

  // Kitchen Wall Fixtures:
  // (a) Upper oak wall cabinet over left prep counter (cols 2.45..3.15)
  const lCabX = Math.round(2.45 * TILE);
  pxRect(ctx, lCabX, wallFaceY + 2, 22, 22, '#5E3D26');
  pxRect(ctx, lCabX + 2, wallFaceY + 4, 18, 18, '#8B5E3C');
  pxRect(ctx, lCabX + 4, wallFaceY + 6, 14, 14, '#7C5233');
  pxRect(ctx, lCabX + 15, wallFaceY + 12, 2, 4, '#E8C57B');

  // (b) Stainless Steel Range Hood above 4-burner stove (cols 3.2..4.75)
  const hoodX = Math.round(3.22 * TILE);
  pxRect(ctx, hoodX + 12, wallFaceY, 24, 12, '#8F99A0'); // Flue chimney
  pxRect(ctx, hoodX + 15, wallFaceY, 6, 12, '#B6C0C7');
  pxRect(ctx, hoodX, wallFaceY + 11, 48, 12, '#737E86'); // Main tapered hood body
  pxRect(ctx, hoodX + 2, wallFaceY + 13, 44, 6, '#AEB8BF');
  pxRect(ctx, hoodX + 2, wallFaceY + 19, 44, 3, '#535D64');
  // Subtle warm under-hood task light strip
  pxRect(ctx, hoodX + 8, wallFaceY + 22, 32, 2, '#FFF3BE');

  // Hanging utensil bar & colorful spice jars on left kitchen backsplash
  pxRect(ctx, Math.round(2.55 * TILE), wallFaceY + 28, 20, 2, '#6E7378');
  pxRect(ctx, Math.round(2.65 * TILE), wallFaceY + 30, 3, 8, '#B88952'); // Wooden spoon
  pxRect(ctx, Math.round(2.85 * TILE), wallFaceY + 30, 3, 7, '#94A3B8'); // Slotted turner
  pxRect(ctx, Math.round(3.02 * TILE), wallFaceY + 30, 3, 8, '#D97736'); // Whisk/ladle

  // (c) Wide double-door upper oak dish cabinets above sink & microwave (cols 7.15..9.8)
  const rCabX = Math.round(7.15 * TILE);
  const rCabW = Math.round(2.68 * TILE);
  pxRect(ctx, rCabX, wallFaceY + 2, rCabW, 22, '#5E3D26');
  const doorW = Math.floor((rCabW - 8) / 3);
  for (let i = 0; i < 3; i++) {
    const dx = rCabX + 2 + i * (doorW + 2);
    pxRect(ctx, dx, wallFaceY + 4, doorW, 18, '#8B5E3C');
    pxRect(ctx, dx + 2, wallFaceY + 6, doorW - 4, 14, '#7D5334');
    pxRect(ctx, dx + doorW - 5, wallFaceY + 13, 2, 4, '#E8C57B');
  }
  // Small wall-mounted spice rack & mugs below right cabinets
  pxRect(ctx, rCabX + 8, wallFaceY + 29, 34, 3, '#6F492D');
  pxRect(ctx, rCabX + 11, wallFaceY + 24, 5, 5, '#D96B43');
  pxRect(ctx, rCabX + 18, wallFaceY + 24, 5, 5, '#5E9C74');
  pxRect(ctx, rCabX + 25, wallFaceY + 24, 5, 5, '#E9C46A');
  pxRect(ctx, rCabX + 32, wallFaceY + 24, 5, 5, '#FAF6F0');

  // 3. Bathroom Unbroken North Interior Wall (cols 11..18 — fully sound-separated from Home Office)
  const bathWallX = (DIVIDER_COL + 1) * TILE;
  const bathWallW = 8 * TILE;
  // Soft pale-mist painted upper plaster + glazed seafoam-white ceramic wall tiles
  pxRect(ctx, bathWallX, wallFaceY, bathWallW, 14, '#E6EFEF');
  pxRect(ctx, bathWallX, wallFaceY + 14, bathWallW, wallFaceH - 14, '#D6E4E4');
  for (let ty = wallFaceY + 14; ty < midY + 2 * TILE; ty += 8) {
    pxRect(ctx, bathWallX, ty, bathWallW, 1, '#B8CCCC');
    for (let tx = bathWallX; tx < bathWallX + bathWallW; tx += 12) {
      pxRect(ctx, tx, ty, 1, 8, '#B8CCCC');
    }
  }
  // Accent ceramic chair-rail trim
  pxRect(ctx, bathWallX, wallFaceY + 13, bathWallW, 2, '#9BB5B5');
  pxRect(ctx, bathWallX, midY + 2 * TILE - 2, bathWallW, 2, '#7D9999');

  // (a) Large Illuminated Family Vanity Mirror & Warm Brass Wall Sconces (cols 11.75..14.3)
  const mirX = Math.round(11.78 * TILE);
  const mirY = wallFaceY + 4;
  const mirW = 80;
  const mirH = 30;
  // Warm side wall sconces
  pxRect(ctx, mirX - 8, mirY + 8, 5, 10, '#C8A872');
  pxRect(ctx, mirX - 7, mirY + 6, 3, 6, '#FFF5CC');
  pxRect(ctx, mirX + mirW + 3, mirY + 8, 5, 10, '#C8A872');
  pxRect(ctx, mirX + mirW + 4, mirY + 6, 3, 6, '#FFF5CC');
  // Oak-and-brass framed family mirror with crisp reflective sheen
  pxRect(ctx, mirX, mirY, mirW, mirH, '#5E4432');
  pxRect(ctx, mirX + 2, mirY + 2, mirW - 4, mirH - 4, '#C5E1E8');
  pxRect(ctx, mirX + 3, mirY + 3, mirW - 6, mirH - 6, '#D9EEF3');
  // Diagonal glass reflection streaks
  pxRect(ctx, mirX + 10, mirY + 5, 5, 19, 'rgba(255,255,255,0.65)');
  pxRect(ctx, mirX + 19, mirY + 7, 3, 14, 'rgba(255,255,255,0.45)');
  pxRect(ctx, mirX + 54, mirY + 6, 4, 15, 'rgba(255,255,255,0.42)');
  pxRect(ctx, mirX + 61, mirY + 8, 2, 11, 'rgba(255,255,255,0.32)');
  // Slim glass mirror shelf ledge
  pxRect(ctx, mirX + 4, mirY + mirH + 1, mirW - 8, 3, '#A7C3C9');

  // (b) Frosted Bathroom Ventilation Window inside shower wall (cols 15.8..16.95)
  const fwX = Math.round(15.82 * TILE);
  const fwY = wallFaceY + 5;
  const fwW = 36;
  const fwH = 22;
  const frostTint =
    timeOfDay === 'morning' ? '#CBEAF2' : timeOfDay === 'afternoon' ? '#F3DEC0' : '#4C5F75';
  pxRect(ctx, fwX, fwY, fwW, fwH, '#6F8084');
  pxRect(ctx, fwX + 2, fwY + 2, fwW - 4, fwH - 4, frostTint);
  for (let sy = fwY + 5; sy < fwY + fwH - 2; sy += 4) {
    pxRect(ctx, fwX + 2, sy, fwW - 4, 1, 'rgba(255,255,255,0.5)');
  }
  pxRect(ctx, fwX + fwW / 2 - 1, fwY + 2, 2, fwH - 4, '#7B8D91');

  // (c) Chrome Rain Shower Head, Vertical Riser Pipe, Handheld Wand & Mixer (cols 17.35..18.3)
  const shPipeX = Math.round(17.7 * TILE);
  pxRect(ctx, shPipeX, wallFaceY + 5, 3, 32, '#8F9EA3');
  pxRect(ctx, shPipeX + 1, wallFaceY + 5, 1, 32, '#E2ECEF');
  pxRect(ctx, shPipeX - 6, wallFaceY + 4, 15, 3, '#9BAAB0');
  pxRect(ctx, shPipeX - 8, wallFaceY + 7, 19, 5, '#77878C');
  pxRect(ctx, shPipeX - 7, wallFaceY + 8, 17, 3, '#CFDCE0');
  if (isShowerRunning) {
    // Active automatic rain shower nozzle jets along the north wall face
    const streamShift = tick % 5;
    for (let sx = shPipeX - 6; sx <= shPipeX + 8; sx += 3) {
      pxRect(ctx, sx, wallFaceY + 12, 1, 2, '#E0F7FF');
      for (let sy = wallFaceY + 14 + ((sx + streamShift) % 4); sy < wallFaceY + 42; sy += 6) {
        pxRect(ctx, sx, sy, 1, 4, 'rgba(186, 238, 255, 0.85)');
      }
    }
  } else if (Math.floor(tick / 18) % 2 === 0) {
    pxRect(ctx, shPipeX - 3, wallFaceY + 13, 2, 2, 'rgba(220, 248, 255, 0.7)');
    pxRect(ctx, shPipeX + 4, wallFaceY + 14, 2, 2, 'rgba(220, 248, 255, 0.6)');
  }
  pxRect(ctx, shPipeX - 7, wallFaceY + 32, 17, 5, '#77878C');
  pxRect(ctx, shPipeX - 6, wallFaceY + 33, 15, 3, '#D5E1E5');
  // Automatic sensor indicator LED on mixer valve
  pxRect(
    ctx,
    shPipeX - 1,
    wallFaceY + 34,
    3,
    2,
    isShowerRunning ? '#38BDF8' : '#64748B'
  );
  pxRect(ctx, shPipeX + 9, wallFaceY + 31, 4, 2, '#5F6E73');
  pxRect(ctx, shPipeX + 11, wallFaceY + 20, 4, 10, '#CFDCE0');
  pxRect(ctx, shPipeX + 10, wallFaceY + 18, 6, 3, '#8F9EA3');
  pxRect(ctx, shPipeX + 12, wallFaceY + 30, 1, 8, '#8F9EA3');
  pxRect(ctx, shPipeX + 7, wallFaceY + 37, 6, 1, '#8F9EA3');

  // 4. Lower Vertical Dividing Wall (col 10, rows 12..22) with Kitchen <-> Bathroom doorway at rows 16..17
  const dx = DIVIDER_COL * TILE;
  // Upper segment (rows 12..15)
  const upperDoorY = BATH_DOOR_ROW_START * TILE;
  pxRect(ctx, dx, midY, TILE, upperDoorY - midY, '#4B3224');
  pxRect(ctx, dx + 3, midY + 4, TILE - 6, upperDoorY - midY - 10, '#6E4A33');
  pxRect(ctx, dx + 4, upperDoorY - 8, TILE - 8, 8, '#8D6042'); // Top doorway frame cap
  // Lower segment (rows 18..21)
  const lowerDoorY = (BATH_DOOR_ROW_END + 1) * TILE;
  const lowerSegH = SOUTH_WALL_ROW * TILE - lowerDoorY;
  pxRect(ctx, dx, lowerDoorY, TILE, lowerSegH, '#4B3224');
  pxRect(ctx, dx + 3, lowerDoorY + 4, TILE - 6, lowerSegH - 4, '#6E4A33');
  pxRect(ctx, dx + 4, lowerDoorY, TILE - 8, 4, '#8D6042'); // Bottom doorway jamb trim

  // South outer wall baseboard shadow & clean trim (for Lower Wing: Kitchen & Bathroom)
  pxRect(ctx, TILE - 5, SOUTH_WALL_ROW * TILE, LOWER_WORLD_W - 2 * TILE + 10, 6, '#5B3E2B');
}

export function drawKitchenFurniture(ctx: CanvasRenderingContext2D, tick: number) {
  // 1. Double-door Retro-Modern Refrigerator (cols 1.12..2.5, rows 13.75..15.2)
  const fx = Math.round(1.12 * TILE);
  const fy = Math.round(13.15 * TILE); // Tall vertical fridge extends onto kitchen north wall
  const fw = Math.round(1.38 * TILE); // ~44px
  const fh = Math.round(2.05 * TILE); // ~66px (footprint ends at 15.2 * TILE)
  pxRect(ctx, fx + 2, fy + fh - 1, fw - 2, 6, 'rgba(28, 20, 15, 0.25)');
  // Outer brushed cream/steel body
  pxRect(ctx, fx, fy, fw, fh, '#8E8B82');
  pxRect(ctx, fx + 2, fy + 2, fw - 4, fh - 4, '#E8E3D5');
  pxRect(ctx, fx + 3, fy + 3, fw - 6, 6, '#F6F2E8'); // Top roof bevel
  // Top freezer compartment & lower fridge door divider
  pxRect(ctx, fx + 2, fy + 27, fw - 4, 2, '#9A958B');
  pxRect(ctx, fx + 3, fy + 29, fw - 6, fh - 32, '#DFD9C9');
  // Vertical brushed stainless handles
  pxRect(ctx, fx + fw - 8, fy + 11, 3, 13, '#6F777E');
  pxRect(ctx, fx + fw - 7, fy + 12, 1, 11, '#E2E8F0');
  pxRect(ctx, fx + fw - 8, fy + 33, 3, 18, '#6F777E');
  pxRect(ctx, fx + fw - 7, fy + 34, 1, 16, '#E2E8F0');
  // Cute colorful fridge magnets & grocery note
  pxRect(ctx, fx + 7, fy + 34, 10, 11, '#FEF08A');
  pxRect(ctx, fx + 11, fy + 34, 2, 2, '#DC2626');
  pxRect(ctx, fx + 9, fy + 38, 6, 1, '#92400E');
  pxRect(ctx, fx + 9, fy + 41, 5, 1, '#92400E');
  pxRect(ctx, fx + 21, fy + 36, 4, 4, '#5E9C74');
  pxRect(ctx, fx + 8, fy + 14, 5, 5, '#E07A5F');

  // 2. North-Left Counter + 4-Burner Stove & Oven (cols 2.55..4.9, rows 13.9..15.15)
  const sx = Math.round(2.55 * TILE);
  const sy = Math.round(13.9 * TILE);
  const sw = Math.round(2.35 * TILE); // ~75px
  const sh = Math.round(1.25 * TILE); // ~40px
  pxRect(ctx, sx + 2, sy + sh - 1, sw - 4, 5, 'rgba(28, 20, 15, 0.24)');
  // Base warm oak cabinet + butcher-block counter left side
  pxRect(ctx, sx, sy, sw, sh, '#5B3A23');
  pxRect(ctx, sx + 2, sy + 2, 22, sh - 10, '#C79F70'); // Prep wood edge
  pxRect(ctx, sx + 3, sy + 3, 20, 2, '#DCBA90');
  pxRect(ctx, sx + 3, sy + sh - 8, 19, 6, '#7E5436');
  pxRect(ctx, sx + 10, sy + sh - 6, 5, 2, '#E8C57B');

  // 4-Burner Gas/Induction Stove & Oven unit (right 50px of north-left block)
  const stx = sx + 24;
  const stw = sw - 26;
  pxRect(ctx, stx, sy + 1, stw, sh - 2, '#4A4E54');
  pxRect(ctx, stx + 2, sy + 3, stw - 4, sh - 12, '#2B2E33'); // Dark cooktop glass/grate
  // 4 Cooktop burners
  const burners = [
    { bx: stx + 7, by: sy + 6 },
    { bx: stx + 27, by: sy + 6 },
    { bx: stx + 7, by: sy + 18 },
    { bx: stx + 27, by: sy + 18 },
  ];
  for (const b of burners) {
    pxRect(ctx, b.bx, b.by, 12, 9, '#1A1C1F');
    pxRect(ctx, b.bx + 2, b.by + 2, 8, 5, '#464B52');
    pxRect(ctx, b.bx + 4, b.by + 3, 4, 3, '#25282C');
  }
  // Simmering copper stockpot on top-left burner with gentle rising steam
  pxRect(ctx, stx + 5, sy + 4, 15, 11, '#A65532');
  pxRect(ctx, stx + 7, sy + 6, 11, 7, '#C97248');
  pxRect(ctx, stx + 10, sy + 8, 5, 3, '#E8A57B'); // Lid knob
  const potSteam = Math.floor(tick / 14) % 4;
  pxRect(ctx, stx + 11 + (potSteam % 2), sy - 1 - potSteam, 2, 3, 'rgba(255,250,240,0.65)');
  pxRect(ctx, stx + 14 - (potSteam % 2), sy - 4 - ((potSteam + 2) % 4), 2, 2, 'rgba(255,250,240,0.45)');

  // Cast-iron frying pan on front-right burner
  pxRect(ctx, stx + 26, sy + 16, 13, 10, '#1D1F22');
  pxRect(ctx, stx + 28, sy + 18, 9, 6, '#383C42');
  pxRect(ctx, stx + 38, sy + 20, 7, 2, '#26292E'); // Skillet handle
  // Oven front control panel & stainless bar handle
  pxRect(ctx, stx + 2, sy + sh - 8, stw - 4, 6, '#B8C0C7');
  pxRect(ctx, stx + 5, sy + sh - 6, 3, 2, '#2B2E33');
  pxRect(ctx, stx + 10, sy + sh - 6, 3, 2, '#2B2E33');
  pxRect(ctx, stx + 16, sy + sh - 6, 22, 2, '#4A5158'); // Oven handle
  pxRect(ctx, stx + 41, sy + sh - 6, 3, 2, '#D97736'); // Active heat LED

  // 3. North-Right Counter: Kitchen Sink, Dish Drying Rack, Microwave & Kettle (cols 7.1..9.95, rows 13.9..15.15)
  const kx = Math.round(7.1 * TILE);
  const ky = Math.round(13.9 * TILE);
  const kw = Math.round(2.85 * TILE); // ~91px
  const kh = Math.round(1.25 * TILE); // ~40px
  pxRect(ctx, kx + 2, ky + kh - 1, kw - 4, 5, 'rgba(28, 20, 15, 0.24)');
  pxRect(ctx, kx, ky, kw, kh, '#5B3A23');
  pxRect(ctx, kx + 2, ky + 2, kw - 4, kh - 10, '#E8E0D1'); // Pale quartz countertop
  pxRect(ctx, kx + 3, ky + 3, kw - 6, 2, '#F7F3EA');
  // Lower oak cabinet doors with brass knobs
  pxRect(ctx, kx + 3, ky + kh - 8, 26, 6, '#7E5436');
  pxRect(ctx, kx + 32, ky + kh - 8, 26, 6, '#7E5436');
  pxRect(ctx, kx + 61, ky + kh - 8, 26, 6, '#7E5436');
  pxRect(ctx, kx + 14, ky + kh - 6, 4, 2, '#E8C57B');
  pxRect(ctx, kx + 43, ky + kh - 6, 4, 2, '#E8C57B');
  pxRect(ctx, kx + 72, ky + kh - 6, 4, 2, '#E8C57B');

  // Stainless steel recessed sink basin + curved chrome gooseneck faucet
  pxRect(ctx, kx + 6, ky + 6, 28, 20, '#7F8C93');
  pxRect(ctx, kx + 8, ky + 8, 24, 16, '#A9B6BD');
  pxRect(ctx, kx + 10, ky + 10, 20, 12, '#8F9EA6');
  pxRect(ctx, kx + 18, ky + 15, 4, 4, '#4E5A60'); // Drain
  // Chrome faucet + dish soap & yellow sponge
  pxRect(ctx, kx + 18, ky + 2, 4, 8, '#D5DFE4');
  pxRect(ctx, kx + 19, ky + 3, 2, 6, '#FAFDFE');
  pxRect(ctx, kx + 28, ky + 3, 4, 4, '#5E9C74'); // Dish soap
  pxRect(ctx, kx + 10, ky + 4, 5, 3, '#F6CF71'); // Sponge

  // Dish drying rack beside sink with stacked ceramic plates
  pxRect(ctx, kx + 38, ky + 6, 18, 20, '#8E9AA0');
  pxRect(ctx, kx + 40, ky + 8, 14, 16, '#CFD7DC');
  pxRect(ctx, kx + 42, ky + 10, 2, 12, '#FAF6F0');
  pxRect(ctx, kx + 46, ky + 10, 2, 12, '#FAF6F0');
  pxRect(ctx, kx + 50, ky + 10, 2, 12, '#FAF6F0');

  // Compact Countertop Microwave Oven & Electric Kettle (right corner)
  pxRect(ctx, kx + 59, ky + 5, 28, 21, '#3D4247');
  pxRect(ctx, kx + 61, ky + 7, 17, 15, '#1D2226'); // Glass door
  pxRect(ctx, kx + 63, ky + 9, 5, 3, 'rgba(186, 230, 253, 0.25)');
  pxRect(ctx, kx + 80, ky + 8, 5, 4, '#22C55E'); // Clock display
  pxRect(ctx, kx + 80, ky + 14, 5, 7, '#64748B'); // Keypad

  // 4. West Wall L-Prep Counter (cols 1.1..2.25, rows 15.2..18.55)
  const wx = Math.round(1.1 * TILE);
  const wy = Math.round(15.2 * TILE);
  const ww = Math.round(1.15 * TILE); // ~37px
  const wh = Math.round(3.35 * TILE); // ~107px
  pxRect(ctx, wx + 2, wy + wh - 1, ww - 2, 5, 'rgba(28, 20, 15, 0.24)');
  pxRect(ctx, wx, wy, ww, wh, '#5B3A23');
  pxRect(ctx, wx + 2, wy + 2, ww - 6, wh - 6, '#E8E0D1'); // Quartz counter top
  pxRect(ctx, wx + ww - 4, wy + 2, 3, wh - 4, '#7E5436'); // Side cabinet bevel
  pxRect(ctx, wx + 3, wy + 3, 2, wh - 8, '#F7F3EA');

  // Electric Rice Cooker (top of west counter) with glowing warm LED
  pxRect(ctx, wx + 6, wy + 8, 20, 19, '#FAF6F0');
  pxRect(ctx, wx + 8, wy + 10, 16, 13, '#E2DDD5');
  pxRect(ctx, wx + 11, wy + 13, 10, 7, '#CFD5DB'); // Steam lid
  pxRect(ctx, wx + 22, wy + 16, 3, 3, '#F59E0B'); // Warm LED

  // Wooden Cutting Board + Knife + Fresh Tomatoes & Herbs (middle of west counter)
  pxRect(ctx, wx + 6, wy + 35, 22, 26, '#B88452');
  pxRect(ctx, wx + 8, wy + 37, 18, 22, '#CFA06E');
  pxRect(ctx, wx + 10, wy + 40, 5, 5, '#DC4C3E'); // Tomato
  pxRect(ctx, wx + 17, wy + 42, 6, 4, '#4D8461'); // Fresh greens
  pxRect(ctx, wx + 10, wy + 50, 12, 3, '#CBD5E1'); // Chef knife blade
  pxRect(ctx, wx + 21, wy + 50, 5, 3, '#3B281E'); // Knife handle

  // Two-Slice Toaster & Ceramic Fruit Bowl (lower end of west counter)
  pxRect(ctx, wx + 7, wy + 68, 17, 13, '#9BA5AD');
  pxRect(ctx, wx + 9, wy + 70, 13, 2, '#2B2E33'); // Toast slot 1
  pxRect(ctx, wx + 9, wy + 74, 13, 2, '#2B2E33'); // Toast slot 2
  pxRect(ctx, wx + 23, wy + 73, 2, 4, '#3B281E'); // Lever
  // Ceramic bowl with apples & orange
  pxRect(ctx, wx + 7, wy + 86, 18, 15, '#D8C7B0');
  pxRect(ctx, wx + 9, wy + 88, 14, 11, '#EFE7DA');
  pxRect(ctx, wx + 10, wy + 90, 5, 5, '#D9483B'); // Red apple
  pxRect(ctx, wx + 16, wy + 89, 5, 5, '#F4A236'); // Orange
  pxRect(ctx, wx + 13, wy + 94, 5, 4, '#84B852'); // Green apple

  // 5. South-West Kitchen Pantry Cupboard (cols 1.15..2.7, rows 19.85..21.8)
  const px = Math.round(1.15 * TILE);
  const py = Math.round(19.85 * TILE);
  const pw = Math.round(1.55 * TILE); // ~50px
  const ph = Math.round(1.95 * TILE); // ~62px
  pxRect(ctx, px + 2, py + ph - 1, pw - 4, 5, 'rgba(28, 20, 15, 0.25)');
  pxRect(ctx, px, py, pw, ph, '#5B3A23');
  pxRect(ctx, px + 3, py + 3, pw - 6, ph - 6, '#875A38');
  pxRect(ctx, px + 4, py + 4, pw - 8, 3, '#A4714A');
  // Pantry shelf display with glass jars & canisters on top + lower cabinet doors
  pxRect(ctx, px + 5, py + 9, pw - 10, 18, '#4A2F1C');
  pxRect(ctx, px + 7, py + 12, 7, 12, '#E9C46A'); // Pasta jar
  pxRect(ctx, px + 16, py + 14, 7, 10, '#FAF6F0'); // Flour canister
  pxRect(ctx, px + 25, py + 13, 6, 11, '#B85D3B'); // Coffee tin
  pxRect(ctx, px + 33, py + 15, 7, 9, '#6B9080'); // Tea jar
  // Lower cabinet doors
  pxRect(ctx, px + 5, py + 31, 18, ph - 36, '#744B2E');
  pxRect(ctx, px + 26, py + 31, 18, ph - 36, '#744B2E');
  pxRect(ctx, px + 20, py + 41, 2, 5, '#E8C57B');
  pxRect(ctx, px + 28, py + 41, 2, 5, '#E8C57B');

  // 6. Stainless Step Pedal Kitchen Trash Bin (cols 2.85..3.57, rows 20.65..21.6)
  const bx = Math.round(2.85 * TILE);
  const by = Math.round(20.65 * TILE);
  pxRect(ctx, bx + 2, by + 26, 20, 5, 'rgba(28, 20, 15, 0.24)');
  pxRect(ctx, bx + 2, by + 2, 19, 25, '#68737A');
  pxRect(ctx, bx + 4, by + 4, 15, 21, '#9BA6AE');
  pxRect(ctx, bx + 4, by + 4, 15, 7, '#CFD7DD'); // Lid
  pxRect(ctx, bx + 6, by + 2, 11, 2, '#535D63');
  pxRect(ctx, bx + 8, by + 25, 7, 3, '#2E3236'); // Foot pedal
}

function drawDiningChair(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 'south' | 'north') {
  pxRect(ctx, x + 2, y + 18, 20, 4, 'rgba(28, 20, 15, 0.2)');
  // Wooden seat pad
  pxRect(ctx, x + 2, y + 4, 20, 14, '#7E5333');
  pxRect(ctx, x + 4, y + 6, 16, 10, '#C7B49B'); // Cushioned cream seat
  if (facing === 'south') {
    // Backrest along top edge
    pxRect(ctx, x + 1, y, 22, 6, '#5A3820');
    pxRect(ctx, x + 3, y + 1, 18, 3, '#8D5F3D');
  } else {
    // Backrest along bottom edge
    pxRect(ctx, x + 1, y + 14, 22, 6, '#5A3820');
    pxRect(ctx, x + 3, y + 15, 18, 3, '#8D5F3D');
  }
}

export function drawKitchenDiningTable(ctx: CanvasRenderingContext2D) {
  const tx = Math.round(KITCHEN_DINING_RECT.x);
  const ty = Math.round(KITCHEN_DINING_RECT.y);
  const tw = Math.round(KITCHEN_DINING_RECT.w); // ~94px
  const th = Math.round(KITCHEN_DINING_RECT.h); // ~61px

  // 2 North tucked dining chairs (drawn behind tabletop)
  drawDiningChair(ctx, tx + 13, ty - 11, 'south');
  drawDiningChair(ctx, tx + tw - 37, ty - 11, 'south');

  // Table drop shadow & sturdy oak legs
  pxRect(ctx, tx + 3, ty + th - 2, tw - 6, 7, 'rgba(28, 20, 15, 0.25)');
  pxRect(ctx, tx + 5, ty + th - 6, 6, 9, '#4D2F1B');
  pxRect(ctx, tx + tw - 11, ty + th - 6, 6, 9, '#4D2F1B');

  // Warm Oak Family Dining Tabletop
  pxRect(ctx, tx, ty, tw, th - 4, '#5B3922');
  pxRect(ctx, tx + 3, ty + 3, tw - 6, th - 11, '#9A6942');
  pxRect(ctx, tx + 4, ty + 4, tw - 8, 3, '#B58056');
  pxRect(ctx, tx + 3, ty + th - 8, tw - 6, 4, '#6E462A');

  // Woven sage-cream table runner across center
  pxRect(ctx, tx + 4, ty + 20, tw - 8, 16, '#D8CCB8');
  pxRect(ctx, tx + 4, ty + 22, tw - 8, 12, '#E9E0D0');
  pxRect(ctx, tx + 4, ty + 26, tw - 8, 4, '#6E9183');

  // 4 Family ceramic place settings (plates + folded napkins)
  const plates = [
    { px: tx + 19, py: ty + 8 },
    { px: tx + tw - 31, py: ty + 8 },
    { px: tx + 19, py: ty + th - 22 },
    { px: tx + tw - 31, py: ty + th - 22 },
  ];
  for (const p of plates) {
    pxRect(ctx, p.px, p.py, 12, 10, '#FAF6F0');
    pxRect(ctx, p.px + 2, p.py + 2, 8, 6, '#ECE4D8');
    pxRect(ctx, p.px + 13, p.py + 2, 3, 6, '#C97B56'); // Terracotta napkin
  }

  // Centerpiece: ceramic wildflower vase & clear water pitcher
  const cx = tx + Math.floor(tw / 2);
  const cy = ty + Math.floor(th / 2) - 4;
  pxRect(ctx, cx - 10, cy - 4, 9, 10, '#5E8C7A'); // Ceramic vase
  pxRect(ctx, cx - 8, cy - 8, 5, 5, '#4A7A59'); // Stems
  pxRect(ctx, cx - 10, cy - 10, 3, 3, '#F6CF71'); // Yellow blossom
  pxRect(ctx, cx - 5, cy - 9, 3, 3, '#FAF6F0'); // White blossom
  pxRect(ctx, cx + 4, cy - 3, 8, 9, '#B7DCE6'); // Water pitcher
  pxRect(ctx, cx + 6, cy - 1, 4, 5, '#E0F2F7');

  // 2 South tucked dining chairs (drawn cleanly in front of south apron)
  drawDiningChair(ctx, tx + 13, ty + th - 9, 'north');
  drawDiningChair(ctx, tx + tw - 37, ty + th - 9, 'north');
}

export function drawBathroomFurniture(
  ctx: CanvasRenderingContext2D,
  tick: number,
  player?: PlayerState
) {
  // 1. Wide Family Vanity Sink Cabinet (north-west: cols 11.35..14.7, rows 13.85..15.1)
  const vx = Math.round(11.35 * TILE);
  const vy = Math.round(13.85 * TILE);
  const vw = Math.round(3.35 * TILE); // ~107px
  const vh = Math.round(1.25 * TILE); // ~40px
  pxRect(ctx, vx + 2, vy + vh - 1, vw - 4, 5, 'rgba(30, 45, 48, 0.22)');
  // Warm oak 3-door vanity cabinet base + white marble top
  pxRect(ctx, vx, vy, vw, vh, '#5C3D28');
  pxRect(ctx, vx + 2, vy + 2, vw - 4, vh - 11, '#EFECE6'); // Marble countertop
  pxRect(ctx, vx + 3, vy + 3, vw - 6, 2, '#FFFFFF');
  // 3 oak cabinet doors & brass handles
  pxRect(ctx, vx + 3, vy + vh - 9, 31, 7, '#875D3E');
  pxRect(ctx, vx + 37, vy + vh - 9, 33, 7, '#875D3E');
  pxRect(ctx, vx + 73, vy + vh - 9, 31, 7, '#875D3E');
  pxRect(ctx, vx + 16, vy + vh - 7, 5, 2, '#E8C57B');
  pxRect(ctx, vx + 51, vy + vh - 7, 5, 2, '#E8C57B');
  pxRect(ctx, vx + 86, vy + vh - 7, 5, 2, '#E8C57B');
  // Mini potted bathroom fern & rolled guest hand towels on left side of marble counter
  pxRect(ctx, vx + 7, vy + 10, 10, 10, '#C97B56');
  pxRect(ctx, vx + 6, vy + 5, 12, 7, '#4D8461');
  pxRect(ctx, vx + 8, vy + 3, 8, 4, '#6AA67F');
  pxRect(ctx, vx + 21, vy + 11, 10, 11, '#FAF6F0'); // Rolled hand towels
  pxRect(ctx, vx + 22, vy + 15, 8, 2, '#D8CEBF');
  // Centered recessed white porcelain sink basin & chrome faucet
  pxRect(ctx, vx + 37, vy + 7, 34, 18, '#B8C6CA');
  pxRect(ctx, vx + 39, vy + 9, 30, 14, '#FFFFFF');
  pxRect(ctx, vx + 42, vy + 11, 24, 10, '#E7F1F3');
  pxRect(ctx, vx + 52, vy + 15, 4, 4, '#7E9095'); // Basin drain
  pxRect(ctx, vx + 52, vy + 3, 4, 7, '#BCCAD0'); // Chrome faucet
  pxRect(ctx, vx + 53, vy + 4, 2, 5, '#FAFDFE');
  // Hand soap pump & toothbrush tumbler on right side of marble counter
  pxRect(ctx, vx + 77, vy + 9, 7, 9, '#6B9080');
  pxRect(ctx, vx + 79, vy + 6, 3, 3, '#E2E8F0');
  pxRect(ctx, vx + 90, vy + 10, 8, 9, '#DFD4C4');
  pxRect(ctx, vx + 91, vy + 5, 2, 6, '#38BDF8'); // Blue toothbrush
  pxRect(ctx, vx + 95, vy + 6, 2, 5, '#FB7185'); // Coral toothbrush

  // 2. Corner Shower Glass Caddy Shelf with Shampoo & Soap Bottles (inside shower top-right)
  const cx = Math.round(18.25 * TILE);
  const cy = Math.round(14.0 * TILE);
  pxRect(ctx, cx, cy, 22, 22, 'rgba(180, 225, 235, 0.45)');
  pxRect(ctx, cx, cy + 20, 22, 2, '#6A838A');
  pxRect(ctx, cx, cy, 2, 22, '#6A838A');
  pxRect(ctx, cx + 4, cy + 4, 5, 11, '#3B82A0'); // Shampoo bottle
  pxRect(ctx, cx + 5, cy + 2, 3, 2, '#FAF6F0');
  pxRect(ctx, cx + 11, cy + 6, 5, 9, '#E8A85A'); // Body wash
  pxRect(ctx, cx + 17, cy + 11, 4, 6, '#F4E29C'); // Bath sponge

  // 2b. Dedicated Wall-Mounted Soap Dish / Soap Holder (ที่เก็บสบู่) below caddy on east shower wall
  const shx = Math.round(18.18 * TILE);
  const shy = Math.round(14.95 * TILE);
  // Chrome wall bracket & porcelain slotted soap tray
  pxRect(ctx, shx + 1, shy + 11, 18, 3, 'rgba(30, 45, 48, 0.22)');
  pxRect(ctx, shx, shy, 19, 12, '#647C84');
  pxRect(ctx, shx + 2, shy + 2, 15, 8, '#E6F0F2');
  pxRect(ctx, shx + 4, shy + 4, 11, 4, '#C6D9DD'); // Slotted soap well
  if (isSoapInHolder(player)) {
    // Bar of soap (ก้อนสบู่) resting in the soap holder
    pxRect(ctx, shx + 4, shy + 2, 11, 6, '#F48C72');
    pxRect(ctx, shx + 5, shy + 3, 9, 4, '#FDA890');
    pxRect(ctx, shx + 6, shy + 3, 4, 1, '#FFF3EE'); // Soap bar sheen
  } else {
    // Empty soap holder with tiny residual white soap suds dot while player is using the soap
    pxRect(ctx, shx + 6, shy + 5, 3, 2, 'rgba(255, 255, 255, 0.78)');
    pxRect(ctx, shx + 11, shy + 4, 2, 2, 'rgba(255, 255, 255, 0.65)');
  }

  // 3. West Wall Towel Rack & Small Shelf (south-west below Kitchen->Bathroom doorway: rows 18.35..19.55)
  const trx = Math.round(11.08 * TILE);
  const tryY = Math.round(18.35 * TILE);
  pxRect(ctx, trx + 2, tryY + 36, 18, 4, 'rgba(30, 45, 48, 0.2)');
  pxRect(ctx, trx, tryY, 20, 38, '#6B4930');
  pxRect(ctx, trx + 2, tryY + 2, 16, 34, '#8D6344');
  // Chrome towel rails with draped fluffy cream & sage bath towels
  pxRect(ctx, trx + 4, tryY + 5, 13, 11, '#F4EFE6');
  pxRect(ctx, trx + 4, tryY + 13, 13, 2, '#D8CEBF');
  pxRect(ctx, trx + 4, tryY + 20, 13, 13, '#739A90');
  pxRect(ctx, trx + 4, tryY + 29, 13, 2, '#587A71');

  // 4. Tall Wooden Linen & Towel Storage Cabinet (south-west corner: cols 11.1..12.45, rows 19.95..21.8)
  const lcx = Math.round(11.1 * TILE);
  const lcy = Math.round(19.95 * TILE);
  const lcw = Math.round(1.35 * TILE); // ~43px
  const lch = Math.round(1.85 * TILE); // ~59px
  pxRect(ctx, lcx + 2, lcy + lch - 1, lcw - 4, 5, 'rgba(30, 45, 48, 0.24)');
  pxRect(ctx, lcx, lcy, lcw, lch, '#5B3E2A');
  pxRect(ctx, lcx + 3, lcy + 3, lcw - 6, lch - 6, '#8B6244');
  // Open shelves with neatly folded bath towels & extra tissue rolls
  pxRect(ctx, lcx + 5, lcy + 7, lcw - 10, 14, '#4B3222');
  pxRect(ctx, lcx + 7, lcy + 14, 15, 5, '#FAF6F0'); // White folded towel
  pxRect(ctx, lcx + 7, lcy + 9, 14, 5, '#739A90'); // Sage folded towel
  pxRect(ctx, lcx + 25, lcy + 11, 9, 8, '#FAF6F0'); // Spare toilet roll
  // Slatted cabinet lower door
  pxRect(ctx, lcx + 5, lcy + 25, lcw - 10, lch - 30, '#785237');
  for (let sy = lcy + 29; sy < lcy + lch - 8; sy += 5) {
    pxRect(ctx, lcx + 8, sy, lcw - 16, 2, '#62412A');
  }
  // Cute mini humidity-loving fern on top corner
  pxRect(ctx, lcx + 28, lcy + 1, 9, 7, '#C97B56');
  pxRect(ctx, lcx + 27, lcy - 4, 11, 6, '#4D8461');
  pxRect(ctx, lcx + 29, lcy - 6, 7, 4, '#6AA67F');

  // 5. Ceramic Flush Toilet, Toilet Paper Holder & Chrome Bidet Sprayer (private south wall, facing North)
  const wcx = Math.round(13.3 * TILE);
  const wcy = Math.round(20.35 * TILE);
  const wcw = Math.round(1.35 * TILE); // ~43px
  const wch = Math.round(1.45 * TILE); // ~46px
  // Subtle floor shadow under bowl
  pxRect(ctx, wcx + 4, wcy + wch - 2, wcw - 8, 5, 'rgba(30, 45, 48, 0.22)');
  // Contoured oval porcelain toilet bowl & closed seat lid extending North
  pxRect(ctx, wcx + 7, wcy + 2, 29, 28, '#B8C6CA');
  pxRect(ctx, wcx + 9, wcy + 4, 25, 24, '#FFFFFF');
  pxRect(ctx, wcx + 12, wcy + 7, 19, 18, '#EDF4F5');
  pxRect(ctx, wcx + 11, wcy, 21, 4, '#E2ECEE'); // Rounded north rim
  // Porcelain cistern tank flush against south wall
  pxRect(ctx, wcx + 3, wcy + 29, 37, 16, '#BAC8CC');
  pxRect(ctx, wcx + 5, wcy + 31, 33, 12, '#F7FAFA');
  pxRect(ctx, wcx + 18, wcy + 35, 7, 3, '#94A6AB'); // Dual-flush chrome button
  // Toilet paper roll on left side of cistern + chrome bidet spray wand on right side
  pxRect(ctx, wcx - 4, wcy + 31, 7, 10, '#FAF6F0');
  pxRect(ctx, wcx - 3, wcy + 34, 4, 4, '#D6CFC4');
  pxRect(ctx, wcx + 40, wcy + 32, 5, 9, '#9AAAB0');
  pxRect(ctx, wcx + 41, wcy + 33, 3, 6, '#E2ECEF');

  // 6. Covered Bamboo-Lid Bathroom Pedal Bin (beside toilet: cols 14.8..15.45, rows 21.0..21.72)
  const bbx = Math.round(14.8 * TILE);
  const bby = Math.round(21.0 * TILE);
  pxRect(ctx, bbx + 2, bby + 20, 17, 4, 'rgba(30, 45, 48, 0.2)');
  pxRect(ctx, bbx + 1, bby + 1, 18, 20, '#C6C1B8');
  pxRect(ctx, bbx + 3, bby + 3, 14, 16, '#EFECE6');
  pxRect(ctx, bbx + 3, bby + 3, 14, 6, '#C49A6C'); // Warm bamboo lid

  // 7. Woven Rattan Laundry Hamper (cols 16.05..17.1, rows 20.25..21.65)
  const hx = Math.round(16.05 * TILE);
  const hy = Math.round(20.25 * TILE);
  const hw = Math.round(1.05 * TILE); // ~34px
  const hh = Math.round(1.4 * TILE); // ~45px
  pxRect(ctx, hx + 2, hy + hh - 1, hw - 4, 5, 'rgba(30, 45, 48, 0.22)');
  pxRect(ctx, hx, hy, hw, hh, '#7A5434');
  pxRect(ctx, hx + 2, hy + 2, hw - 4, hh - 4, '#B58455');
  for (let wy = hy + 14; wy < hy + hh - 3; wy += 5) {
    pxRect(ctx, hx + 3, wy, hw - 6, 2, '#9A6C42');
  }
  pxRect(ctx, hx + 4, hy + 4, hw - 8, 9, '#EDE7DC');
  pxRect(ctx, hx + 7, hy + 5, 11, 6, '#93B8C4');
  pxRect(ctx, hx + 18, hy + 6, 8, 6, '#F4EFE6');

  // 8. Front-Load Washing Machine (cols 17.3..18.9, rows 19.95..21.8)
  const wmx = Math.round(17.3 * TILE);
  const wmy = Math.round(19.95 * TILE);
  const wmw = Math.round(1.6 * TILE); // ~51px
  const wmh = Math.round(1.85 * TILE); // ~59px
  pxRect(ctx, wmx + 2, wmy + wmh - 1, wmw - 4, 5, 'rgba(30, 45, 48, 0.26)');
  pxRect(ctx, wmx, wmy, wmw, wmh, '#8B9BA0');
  pxRect(ctx, wmx + 2, wmy + 2, wmw - 4, wmh - 4, '#F1F5F6');
  pxRect(ctx, wmx + 3, wmy + 3, wmw - 6, 18, '#E4ECEE');
  pxRect(ctx, wmx + 6, wmy + 5, 10, 12, '#3B82B8');
  pxRect(ctx, wmx + 8, wmy + 3, 6, 3, '#FAF6F0');
  pxRect(ctx, wmx + 22, wmy + 6, 20, 11, '#E8DFD1');
  pxRect(ctx, wmx + 24, wmy + 8, 16, 7, '#739A90');
  pxRect(ctx, wmx + 2, wmy + 22, wmw - 4, 9, '#D5E0E3');
  pxRect(ctx, wmx + 5, wmy + 24, 11, 5, '#F8FAFC');
  pxRect(ctx, wmx + 23, wmy + 24, 6, 5, '#596A70');
  pxRect(ctx, wmx + 35, wmy + 25, 8, 3, '#253137');
  pxRect(ctx, wmx + 37, wmy + 26, 4, 1, Math.floor(tick / 24) % 2 === 0 ? '#4ADE80' : '#22C55E');
  pxRect(ctx, wmx + 13, wmy + 33, 25, 21, '#687980');
  pxRect(ctx, wmx + 16, wmy + 35, 19, 17, '#2A3942');
  pxRect(ctx, wmx + 19, wmy + 38, 13, 11, '#3B5260');
  pxRect(ctx, wmx + 20, wmy + 39, 4, 3, 'rgba(219, 244, 255, 0.55)');
}

/**
 * Draws the frameless tempered glass walls, automatic shower water streams,
 * and smart opaque/frosted privacy glass enclosure that closes automatically only while showering.
 * Rendered after characters so walking inside the shower places the player behind the privacy glass.
 */
export function drawGlassShowerEnclosure(
  ctx: CanvasRenderingContext2D,
  tick: number,
  player?: PlayerState
) {
  const gx = Math.round(15.45 * TILE); // Left glass partition X (~494)
  const gyTop = Math.round(13.9 * TILE); // Top meets bathroom north wall (~445)
  const gyDoorTop = Math.round(16.12 * TILE); // Top of sliding door opening (~516)
  const gyBot = Math.round(17.98 * TILE); // South glass curb Y (~575)
  const gxRight = Math.round(18.98 * TILE); // Meets east outer wall (~607)
  const southW = gxRight - gx;

  const privacy = Math.max(0, Math.min(1, player?.showerPrivacyProgress ?? 0));
  const isShowering = Boolean(player?.isShowering || privacy > 0.02);
  const shPipeX = Math.round(17.7 * TILE);
  const wallFaceY = MID_WALL_ROW * TILE + 18;
  const drainX = Math.round(17.45 * TILE);
  const drainY = Math.round(15.9 * TILE);

  // 0. Automatic Rain Shower Water Streams & Floor Splash (น้ำฝักบัวไหลอัตโนมัติเมื่อเดินเข้าโซนเปียก)
  if (isShowering) {
    const streamTopY = wallFaceY + 13;
    const streamBotY = Math.round(16.05 * TILE);
    const phase = tick % 6;
    const columns = [-8, -5, -2, 1, 4, 7, 10];
    for (let c = 0; c < columns.length; c++) {
      const sx = shPipeX + columns[c];
      const sway = ((c + Math.floor(tick / 4)) % 2 === 0 ? 0 : 1);
      for (let sy = streamTopY + ((c * 3 + phase) % 6); sy < streamBotY; sy += 7) {
        const len = sy < gyTop ? 4 : 5;
        const alpha = sy < gyTop ? 0.86 : 0.62;
        pxRect(ctx, sx + sway, sy, 1, len, `rgba(195, 242, 255, ${(alpha * Math.max(0.35, privacy)).toFixed(2)})`);
      }
    }

    // Water ripples & splashes pooling around the floor drain
    const splashStep = Math.floor(tick / 4) % 3;
    pxRect(ctx, drainX - 9 - splashStep, drainY - 2, 4, 1, 'rgba(210, 248, 255, 0.72)');
    pxRect(ctx, drainX + 6 + splashStep, drainY + 1, 4, 1, 'rgba(210, 248, 255, 0.72)');
    pxRect(ctx, drainX - 4, drainY + 6 + splashStep, 6, 1, 'rgba(210, 248, 255, 0.65)');
    pxRect(ctx, drainX - 3, drainY - 7 - splashStep, 5, 1, 'rgba(210, 248, 255, 0.6)');
  }

  // 1. Smart Privacy Frosted Glass Screen covering the shower zone ONLY while showering
  //    (สร้างกระจกทึบปิดเฉพาะตอนอาบน้ำ ป้องกันภาพเปลือย ให้เห็นได้แค่ลางๆ ว่ากำลังอาบน้ำ หยิบสบู่ ถูสบู่ เก็บสบู่)
  if (privacy > 0.01 && player) {
    const stallX = gx + 5;
    const stallY = gyTop;
    const stallW = gxRight - stallX;
    const stallH = gyBot - stallY;

    // (a) Main frosted opaque glass veil across the wet zone
    const baseFrostAlpha = (0.58 * privacy).toFixed(3);
    pxRect(ctx, stallX, stallY, stallW, stallH, `rgba(186, 216, 223, ${baseFrostAlpha})`);

    // Subtle frosted fluted-glass horizontal & vertical texture lines
    for (let fy = stallY + 3; fy < gyBot - 2; fy += 5) {
      pxRect(
        ctx,
        stallX + 2,
        fy,
        stallW - 4,
        2,
        `rgba(226, 244, 248, ${(0.28 * privacy).toFixed(3)})`
      );
      pxRect(
        ctx,
        stallX + 2,
        fy + 2,
        stallW - 4,
        1,
        `rgba(134, 168, 176, ${(0.22 * privacy).toFixed(3)})`
      );
    }
    for (let fx = stallX + 10; fx < gxRight - 6; fx += 14) {
      pxRect(
        ctx,
        fx,
        stallY + 2,
        1,
        stallH - 4,
        `rgba(240, 252, 255, ${(0.2 * privacy).toFixed(3)})`
      );
    }

    // (b) High-opacity pixel-frosted privacy censor grid directly over the character's mid/lower body
    //     so there is zero nudity while keeping the upper silhouette & hand actions faintly visible
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    const censorX = Math.max(stallX + 2, px - 12);
    const censorY = Math.max(stallY + 4, py - 11);
    const censorW = Math.min(24, gxRight - censorX - 2);
    const censorH = 18;
    for (let cy = 0; cy < censorH; cy += 3) {
      for (let cx = 0; cx < censorW; cx += 3) {
        const isLight = ((cx / 3 + cy / 3 + Math.floor(tick / 10)) | 0) % 2 === 0;
        const blockColor = isLight
          ? `rgba(206, 231, 236, ${(0.84 * privacy).toFixed(3)})`
          : `rgba(176, 208, 216, ${(0.88 * privacy).toFixed(3)})`;
        pxRect(ctx, censorX + cx, censorY + cy, 3, 3, blockColor);
      }
    }

    // (c) Faint through-glass silhouette & action indicators (เห็นได้แค่ลางๆ ว่ากำลังอาบน้ำ หยิบสบู่ ถูสบู่ เก็บสบู่)
    const phase = player.showerPhase ?? 'wetting';
    const elapsed = player.showerPhaseElapsed;
    const shx = Math.round(18.18 * TILE);
    const shy = Math.round(14.95 * TILE);

    // Faint soap dish outline visible through the frosted glass on the right wall
    pxRect(ctx, shx, shy, 18, 10, `rgba(110, 142, 150, ${(0.45 * privacy).toFixed(2)})`);
    if (isSoapInHolder(player)) {
      pxRect(ctx, shx + 4, shy + 2, 10, 5, `rgba(248, 150, 126, ${(0.62 * privacy).toFixed(2)})`);
    }

    // Faint reaching arm & moving soap bar silhouette during grab_soap / return_soap / scrub_soap
    if (phase === 'grab_soap') {
      const t = Math.min(1, elapsed / 1.5);
      // Reaching toward soap holder (0..0.5), then bringing soap back to body (0.5..1.0)
      const reachT = t < 0.5 ? t * 2 : (1 - t) * 2;
      const handX = Math.round(px + 6 + (shx + 4 - (px + 6)) * reachT);
      const handY = Math.round(py - 7 + (shy + 3 - (py - 7)) * reachT);
      // Faint arm bridge from shoulder to hand
      const armX = Math.min(px + 5, handX);
      const armW = Math.max(4, handX - (px + 4));
      pxRect(ctx, armX, handY, armW, 4, `rgba(165, 132, 114, ${(0.46 * privacy).toFixed(2)})`);
      if (t >= 0.45) {
        // Soap bar faintly visible in hand moving from holder to body
        pxRect(ctx, handX - 2, handY - 1, 7, 5, `rgba(250, 154, 130, ${(0.68 * privacy).toFixed(2)})`);
        pxRect(ctx, handX - 1, handY, 5, 3, `rgba(255, 224, 212, ${(0.55 * privacy).toFixed(2)})`);
      }
    } else if (phase === 'scrub_soap') {
      // Scrubbing left-right across body with soap bar & abundant white soapy lather bubbles
      const scrubWave = Math.sin(tick * 0.35);
      const soapX = Math.round(px - 2 + scrubWave * 7);
      const soapY = Math.round(py - 9 + Math.cos(tick * 0.25) * 3);
      // Faint scrubbing hands + soap bar
      pxRect(ctx, soapX - 2, soapY, 9, 5, `rgba(165, 132, 114, ${(0.45 * privacy).toFixed(2)})`);
      pxRect(ctx, soapX, soapY - 1, 7, 5, `rgba(250, 154, 130, ${(0.65 * privacy).toFixed(2)})`);
      // Fluffy white soap suds / foam bubbles visible through the frosted glass
      const foamSpots = [
        { dx: -8, dy: -18, s: 5 },
        { dx: 3, dy: -19, s: 4 },
        { dx: -9, dy: -9, s: 6 },
        { dx: 4, dy: -8, s: 5 },
        { dx: -4, dy: -12, s: 6 },
        { dx: -6, dy: -4, s: 5 },
        { dx: 3, dy: -4, s: 5 },
      ];
      foamSpots.forEach((f, idx) => {
        const bob = Math.sin(tick * 0.2 + idx * 1.3) * 1.5;
        pxRect(
          ctx,
          Math.round(px + f.dx + bob),
          Math.round(py + f.dy),
          f.s,
          f.s - 1,
          `rgba(255, 255, 255, ${(0.66 * privacy).toFixed(2)})`
        );
      });
      // Floating soap bubbles rising inside shower
      const b1Y = py - 20 - ((tick + 5) % 16);
      const b2Y = py - 16 - ((tick + 13) % 16);
      pxRect(ctx, px - 11 + (tick % 3), b1Y, 3, 3, `rgba(255, 255, 255, ${(0.72 * privacy).toFixed(2)})`);
      pxRect(ctx, px + 9 - (tick % 3), b2Y, 3, 3, `rgba(240, 253, 255, ${(0.68 * privacy).toFixed(2)})`);
    } else if (phase === 'return_soap') {
      const t = Math.min(1, elapsed / 1.5);
      // Extending arm back to soap holder (0..0.5), releasing soap onto holder, then retracting arm (0.5..1.0)
      const reachT = t < 0.5 ? t * 2 : (1 - t) * 2;
      const handX = Math.round(px + 6 + (shx + 4 - (px + 6)) * reachT);
      const handY = Math.round(py - 7 + (shy + 3 - (py - 7)) * reachT);
      const armX = Math.min(px + 5, handX);
      const armW = Math.max(4, handX - (px + 4));
      pxRect(ctx, armX, handY, armW, 4, `rgba(165, 132, 114, ${(0.46 * privacy).toFixed(2)})`);
      if (t < 0.52) {
        // Soap bar in hand on its way back to the soap holder
        pxRect(ctx, handX - 2, handY - 1, 7, 5, `rgba(250, 154, 130, ${(0.68 * privacy).toFixed(2)})`);
      }
    } else if (phase === 'rinse') {
      // Rinsing foam off under the shower stream (fading foam bubbles washing downward)
      const fade = Math.max(0, 1 - elapsed / 2.0);
      if (fade > 0.1) {
        const dropY = Math.round((elapsed * 10) % 12);
        pxRect(ctx, px - 6, py - 10 + dropY, 4, 3, `rgba(255, 255, 255, ${(0.5 * fade * privacy).toFixed(2)})`);
        pxRect(ctx, px + 3, py - 8 + dropY, 4, 3, `rgba(255, 255, 255, ${(0.45 * fade * privacy).toFixed(2)})`);
      }
    }

    // Faint overhead water droplets shimmering across the frosted glass
    for (let c = -6; c <= 8; c += 4) {
      const wy = stallY + 4 + ((tick * 2 + c * 7 + 40) % (stallH - 18));
      pxRect(
        ctx,
        shPipeX + c,
        wy,
        1,
        5,
        `rgba(230, 250, 255, ${(0.52 * privacy).toFixed(2)})`
      );
    }

    // Warm rising steam clouds near top of frosted shower enclosure
    const steamDrift = Math.floor(tick / 12) % 6;
    pxRect(
      ctx,
      stallX + 12 + (steamDrift % 3),
      stallY + 6 - steamDrift,
      18,
      5,
      `rgba(245, 252, 255, ${(0.34 * privacy).toFixed(2)})`
    );
    pxRect(
      ctx,
      stallX + 46 - (steamDrift % 3),
      stallY + 10 - ((steamDrift + 3) % 6),
      20,
      5,
      `rgba(245, 252, 255, ${(0.3 * privacy).toFixed(2)})`
    );

    // Diagonal frosted glass reflection streaks across the closed privacy screen
    pxRect(ctx, stallX + 14, stallY + 18, 18, 3, `rgba(255, 255, 255, ${(0.36 * privacy).toFixed(2)})`);
    pxRect(ctx, stallX + 22, stallY + 24, 12, 3, `rgba(255, 255, 255, ${(0.24 * privacy).toFixed(2)})`);
    pxRect(ctx, stallX + 58, stallY + 68, 20, 3, `rgba(255, 255, 255, ${(0.32 * privacy).toFixed(2)})`);
    pxRect(ctx, stallX + 66, stallY + 74, 14, 3, `rgba(255, 255, 255, ${(0.22 * privacy).toFixed(2)})`);
  }

  // 2. Left fixed tempered glass partition panel (rows 13.9..16.12)
  const leftPanelH = gyDoorTop - gyTop;
  const leftGlassColor =
    privacy > 0.05
      ? `rgba(176, 212, 220, ${(0.44 + 0.44 * privacy).toFixed(2)})`
      : 'rgba(182, 226, 236, 0.44)';
  pxRect(ctx, gx, gyTop, 7, leftPanelH, leftGlassColor);
  pxRect(ctx, gx, gyTop, 2, leftPanelH, '#4E636A'); // Outer aluminum frame
  pxRect(ctx, gx + 5, gyTop, 2, leftPanelH, '#678088'); // Inner glass edge
  // Diagonal glass reflection highlights
  pxRect(ctx, gx + 2, gyTop + 12, 3, 10, 'rgba(255, 255, 255, 0.52)');
  pxRect(ctx, gx + 2, gyTop + 42, 3, 8, 'rgba(255, 255, 255, 0.4)');

  // 3. Sliding glass door across doorway opening (rows 16.12..17.98) — closes & turns opaque when showering!
  const doorFullH = gyBot - gyDoorTop;
  const closedDoorH = Math.round(doorFullH * privacy);
  // Overhead slim chrome sliding-door track spanning the doorway opening
  pxRect(ctx, gx + 1, gyDoorTop, 4, doorFullH, 'rgba(198, 234, 242, 0.16)');
  if (closedDoorH > 2) {
    // Closed opaque/frosted sliding glass door panel
    pxRect(ctx, gx, gyDoorTop, 7, closedDoorH, 'rgba(172, 208, 216, 0.92)');
    pxRect(ctx, gx, gyDoorTop, 2, closedDoorH, '#455A61'); // Outer door frame
    pxRect(ctx, gx + 5, gyDoorTop, 2, closedDoorH, '#5F7880'); // Inner door frame
    for (let dy = gyDoorTop + 4; dy < gyDoorTop + closedDoorH - 3; dy += 6) {
      pxRect(ctx, gx + 2, dy, 3, 2, 'rgba(235, 248, 252, 0.65)');
    }
    // Chrome handle slides down with the closed door
    const handleY = Math.max(gyDoorTop + 4, gyDoorTop + closedDoorH - 18);
    pxRect(ctx, gx - 2, handleY, 2, 12, '#E2EEF2');
    pxRect(ctx, gx + 7, handleY, 2, 12, '#E2EEF2');
  } else {
    // Open doorway chrome vertical handle resting on upper partition edge
    pxRect(ctx, gx - 2, gyDoorTop - 16, 2, 12, '#D8E5E9');
    pxRect(ctx, gx + 7, gyDoorTop - 16, 2, 12, '#D8E5E9');
  }
  pxRect(ctx, gx + 2, gyDoorTop, 2, 4, '#5E747C'); // Top door guide
  pxRect(ctx, gx + 2, gyBot - 4, 2, 4, '#5E747C'); // Bottom door threshold guide

  // 4. South tempered glass wall & raised tiled water curb (cols 15.65..18.98, y=17.98*TILE)
  // Subtle drop shadow onto bathroom floor
  pxRect(ctx, gx, gyBot + 7, southW, 4, 'rgba(30, 45, 48, 0.18)');
  // Raised white-marble water containment curb
  pxRect(ctx, gx, gyBot + 2, southW, 6, '#8FA5AA');
  pxRect(ctx, gx + 2, gyBot + 3, southW - 4, 4, '#E8F0F1');
  // Standing glass wall (becomes frosted opaque when showering)
  const southGlassColor =
    privacy > 0.05
      ? `rgba(176, 212, 220, ${(0.34 + 0.56 * privacy).toFixed(2)})`
      : 'rgba(182, 226, 236, 0.34)';
  pxRect(ctx, gx, gyBot - 16, southW, 19, southGlassColor);
  pxRect(ctx, gx, gyBot - 16, southW, 2, '#536A72'); // Top chrome rail
  pxRect(ctx, gx, gyBot - 14, southW, 1, 'rgba(255, 255, 255, 0.55)'); // Top glass specular edge
  // Diagonal glass reflection streaks along front glass wall
  const shimmer = Math.floor(tick / 45) % 2;
  pxRect(ctx, gx + 16 + shimmer * 2, gyBot - 13, 12, 3, 'rgba(255, 255, 255, 0.42)');
  pxRect(ctx, gx + 24 + shimmer * 2, gyBot - 9, 10, 3, 'rgba(255, 255, 255, 0.28)');
  pxRect(ctx, gx + 68, gyBot - 13, 14, 3, 'rgba(255, 255, 255, 0.38)');
  pxRect(ctx, gx + 76, gyBot - 9, 10, 3, 'rgba(255, 255, 255, 0.25)');
  // Matte-charcoal corner bracket joining left & south glass panels
  pxRect(ctx, gx, gyBot - 17, 7, 25, '#4A5F66');
  pxRect(ctx, gx + 2, gyBot - 15, 3, 21, '#78929B');

  // 5. Floating action status pill above the frosted shower booth while showering
  if (player?.isShowering && privacy > 0.25) {
    const phase = player.showerPhase ?? 'wetting';
    const statusText =
      phase === 'grab_soap'
        ? 'หยิบสบู่จากที่เก็บสบู่'
        : phase === 'scrub_soap'
          ? 'กำลังถูสบู่...'
          : phase === 'return_soap'
            ? 'วางเก็บสบู่กลับที่เก็บสบู่'
            : phase === 'rinse'
              ? 'ล้างตัวใต้น้ำฝักบัวอัตโนมัติ'
              : 'อาบน้ำอัตโนมัติ · ปิดกระจกทึบ';

    ctx.save();
    ctx.font = '600 10px "IBM Plex Sans Thai", sans-serif';
    const textW = Math.ceil(ctx.measureText(statusText).width);
    const bw = textW + 16;
    const bh = 18;
    const bx = Math.round(gx + (southW - bw) / 2);
    const by = Math.round(gyTop - 44);

    pxRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, '#5B8E9B');
    pxRect(ctx, bx, by, bw, bh, 'rgba(24, 38, 42, 0.92)');
    // Active aqua status dot
    pxRect(ctx, bx + 5, by + 7, 4, 4, '#7DD3FC');
    ctx.fillStyle = '#F0F9FF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusText, bx + 12, by + bh / 2 + 0.5);
    ctx.restore();
  }
}
