import type { InteractableObject, Rect, RoomZone } from '../types/game';

export const TILE = 32;
export const MAP_COLS = 20;
export const MAP_ROWS = 23;
export const WORLD_W = MAP_COLS * TILE; // 640
export const WORLD_H = MAP_ROWS * TILE; // 736

// Widescreen camera viewport (1.5x base resolution of 640x416 for crisp pixel & overview rendering)
export const VIEW_W = 960;
export const VIEW_H = 624;
export const CAMERA_BASE_SCALE = 1.5;
export const CAMERA_MIN_ZOOM = Math.min(
  VIEW_W / (WORLD_W * CAMERA_BASE_SCALE),
  VIEW_H / (WORLD_H * CAMERA_BASE_SCALE)
); // ~0.565 (fits entire 4-room house cleanly)
export const CAMERA_MAX_ZOOM = 2.0;
export const CAMERA_DEFAULT_ZOOM = 1.15;

// Crisp 2x full-map viewport dimensions (fits the entire 640x736 house at exact 2:1 integer scale)
export const FULLMAP_VIEW_W = WORLD_W * 2;
export const FULLMAP_VIEW_H = WORLD_H * 2;
export const FULLMAP_BASE_SCALE = 2;
export const FULLMAP_MIN_ZOOM = 1.0;

export const ROOM_CAMERA_TARGETS = {
  overview: { x: WORLD_W / 2, y: WORLD_H / 2, zoom: CAMERA_MIN_ZOOM },
  living: { x: 5.2 * TILE, y: 6.3 * TILE, zoom: 1.2 },
  office: { x: 14.8 * TILE, y: 6.3 * TILE, zoom: 1.2 },
  kitchen: { x: 5.2 * TILE, y: 17.5 * TILE, zoom: 1.28 },
  bathroom: { x: 14.8 * TILE, y: 17.5 * TILE, zoom: 1.28 },
} as const;

// Dividing wall column separating Living/Kitchen (left) and Office/Bathroom (right)
export const DIVIDER_COL = 10;
export const DOOR_ROW_START = 6;
export const DOOR_ROW_END = 8; // rows 6, 7, 8 are open walkable doorway between Living & Office

// Horizontal dividing wall separating Upper Wing (Living/Office) and Lower Wing (Kitchen/Bathroom)
export const MID_WALL_ROW = 12; // occupies rows 12..13 (2 tiles tall for 3/4 north wall face in lower rooms)
export const LOWER_FLOOR_ROW_START = 14;
export const LOWER_FLOOR_ROW_END = 21;
export const SOUTH_WALL_ROW = 22;

// Lower wing doorways (2 tiles wide/tall = 64px each)
export const KITCHEN_DOOR_COL_START = 5;
export const KITCHEN_DOOR_COL_END = 6; // cols 5..6 open archway between Living Lounge & Kitchen
export const BATH_DOOR_ROW_START = 16;
export const BATH_DOOR_ROW_END = 17; // rows 16..17 doorway on col 10 connecting Kitchen <-> Bathroom ONLY

export const PLAYER_START = {
  x: 6.1 * TILE,
  y: 9.2 * TILE,
};

// Player's own Home Office computer desk seat & stand-up coordinates (aligned dead-center with monitor)
export const WORK_SEAT_POS = {
  x: 14.16 * TILE,
  y: 5.08 * TILE,
};
export const WORK_STAND_POS = {
  x: 14.16 * TILE,
  y: 5.85 * TILE,
};

// Living Room cozy sofa seat & stand-up coordinates
export const SOFA_SEAT_POS = {
  x: 3.65 * TILE,
  y: 5.38 * TILE,
};
export const SOFA_STAND_POS = {
  x: 3.65 * TILE,
  y: 6.18 * TILE,
};

// Bathroom wet-zone shower room bounds & automatic showering coordinates
export const SHOWER_WET_ZONE_RECT: Rect = {
  x: 15.62 * TILE,
  y: 14.0 * TILE,
  w: (18.95 - 15.62) * TILE,
  h: (17.95 - 14.0) * TILE,
};

export const SHOWER_STAND_POS = {
  x: 17.42 * TILE,
  y: 15.65 * TILE,
};

export const SHOWER_SOAP_HOLDER_POS = {
  x: 18.22 * TILE,
  y: 15.1 * TILE,
};

// Large central Home Office document & reference work table (organic off-center placement with clear aisles all around)
export const CENTER_TABLE_RECT: Rect = {
  x: 12.22 * TILE,
  y: 7.42 * TILE,
  w: 2.95 * TILE,
  h: 2.02 * TILE,
};

// Family Kitchen wooden dining table & tucked chairs footprint (positioned for open corridor to bathroom door)
export const KITCHEN_DINING_RECT: Rect = {
  x: 4.85 * TILE,
  y: 18.25 * TILE,
  w: 2.95 * TILE,
  h: 1.85 * TILE,
};

// Mina's own workstation swivel chair on the right side of the Home Office
export const MINA_POS = {
  x: 16.82 * TILE,
  y: 7.8 * TILE,
};

// Tight proximity thresholds around Mina's desk (must be inside radius to access Mina)
export const MINA_APPROACH_RADIUS = 72;
export const MINA_LEAVE_RADIUS = 84;
export const MINA_MAX_ROAM_RADIUS = 46;
export const MINA_GREET_STOP_DIST = 28;

// Clear walkable route along the wide right office aisle to stand directly in front of drawPinboard
export const MINA_AISLE_X = 16.65 * TILE;
export const MINA_PINBOARD_SPOT = { x: 14.5 * TILE, y: 2.48 * TILE };

export const MINA_TO_PINBOARD_WAYPOINTS = [
  { x: MINA_AISLE_X, y: 5.25 * TILE },
  { x: MINA_AISLE_X, y: 2.48 * TILE },
  MINA_PINBOARD_SPOT,
];

export const MINA_RETURN_DESK_WAYPOINTS = [
  { x: MINA_AISLE_X, y: 2.48 * TILE },
  { x: MINA_AISLE_X, y: 5.25 * TILE },
  { x: MINA_POS.x, y: MINA_POS.y },
];

// Static collision boxes in world coordinates
export const COLLIDERS: Rect[] = [
  // Outer walls
  { x: 0, y: 0, w: WORLD_W, h: 2 * TILE }, // North wall (rows 0-1)
  { x: 0, y: SOUTH_WALL_ROW * TILE, w: WORLD_W, h: TILE }, // South wall (row 22)
  { x: 0, y: 0, w: TILE, h: WORLD_H }, // West wall (col 0)
  { x: 19 * TILE, y: 0, w: TILE, h: WORLD_H }, // East wall (col 19)

  // Upper interior vertical dividing wall (col 10) with open doorway rows 6..8
  { x: DIVIDER_COL * TILE, y: 2 * TILE, w: TILE, h: 4 * TILE }, // rows 2..5
  { x: DIVIDER_COL * TILE, y: 9 * TILE, w: TILE, h: 3 * TILE }, // rows 9..11

  // Horizontal dividing wall (rows 12..13): open ONLY at Living <-> Kitchen (cols 5..6); solid between Office & Bathroom
  { x: 1 * TILE, y: MID_WALL_ROW * TILE, w: (KITCHEN_DOOR_COL_START - 1) * TILE, h: 2 * TILE }, // cols 1..4
  {
    x: (KITCHEN_DOOR_COL_END + 1) * TILE,
    y: MID_WALL_ROW * TILE,
    w: (19 - KITCHEN_DOOR_COL_END - 1) * TILE,
    h: 2 * TILE,
  }, // cols 7..18 (completely separates Home Office from Bathroom)

  // Lower interior vertical dividing wall (col 10, rows 14..21) with Kitchen <-> Bathroom doorway at rows 16..17
  {
    x: DIVIDER_COL * TILE,
    y: LOWER_FLOOR_ROW_START * TILE,
    w: TILE,
    h: (BATH_DOOR_ROW_START - LOWER_FLOOR_ROW_START) * TILE,
  }, // rows 14..15
  {
    x: DIVIDER_COL * TILE,
    y: (BATH_DOOR_ROW_END + 1) * TILE,
    w: TILE,
    h: (SOUTH_WALL_ROW - BATH_DOOR_ROW_END - 1) * TILE,
  }, // rows 18..21

  // Living Lounge furniture
  { x: 1.15 * TILE, y: 2.0 * TILE, w: 1.45 * TILE, h: 1.65 * TILE }, // Festive Christmas tree & gifts
  { x: 6.12 * TILE, y: 1.95 * TILE, w: 0.72 * TILE, h: 0.65 * TILE }, // Classic grandfather pendulum clock
  { x: 7.0 * TILE, y: 1.9 * TILE, w: 1.8 * TILE, h: 0.8 * TILE }, // Fireplace hearth
  { x: 8.9 * TILE, y: 2.0 * TILE, w: 1.0 * TILE, h: 1.5 * TILE }, // Living bookshelf
  { x: 2.1 * TILE, y: 4.5 * TILE, w: 3.1 * TILE, h: 1.25 * TILE }, // Cozy sofa
  { x: 2.5 * TILE, y: 6.7 * TILE, w: 2.3 * TILE, h: 1.1 * TILE }, // Coffee table
  { x: 1.2 * TILE, y: 10.2 * TILE, w: 0.9 * TILE, h: 1.0 * TILE }, // Bottom-left potted plant
  { x: 2.5 * TILE, y: 10.55 * TILE, w: 2.4 * TILE, h: 1.15 * TILE }, // Living room TV console

  // Home Office furniture
  { x: 11.15 * TILE, y: 2.1 * TILE, w: 0.85 * TILE, h: 0.95 * TILE }, // Office potted fern
  { x: 12.25 * TILE, y: 3.1 * TILE, w: 4.0 * TILE, h: 1.55 * TILE }, // Player computer work desk
  { ...CENTER_TABLE_RECT }, // Large central document & book work table (Google Drive)
  { x: 17.85 * TILE, y: 2.15 * TILE, w: 1.05 * TILE, h: 2.3 * TILE }, // Top-right office bookcase
  { x: 17.05 * TILE, y: 5.1 * TILE, w: 0.55 * TILE, h: 0.55 * TILE }, // Office wastebasket beside printer
  { x: 17.65 * TILE, y: 4.95 * TILE, w: 1.25 * TILE, h: 1.1 * TILE }, // Office printer & scanner stand
  { x: 17.35 * TILE, y: 6.2 * TILE, w: 1.55 * TILE, h: 3.2 * TILE }, // Mina's AI workstation desk
  { x: 17.55 * TILE, y: 9.55 * TILE, w: 1.35 * TILE, h: 1.4 * TILE }, // Rolling filing cabinet & binders

  // Lower-Left Room: Family Kitchen & Dining furniture
  { x: 1.12 * TILE, y: 13.75 * TILE, w: 1.38 * TILE, h: 1.45 * TILE }, // Double-door refrigerator
  { x: 2.55 * TILE, y: 13.9 * TILE, w: 2.35 * TILE, h: 1.25 * TILE }, // 4-burner gas stove, oven & north counter
  { x: 7.1 * TILE, y: 13.9 * TILE, w: 2.85 * TILE, h: 1.25 * TILE }, // Kitchen sink, dish rack & microwave counter
  { x: 1.1 * TILE, y: 15.2 * TILE, w: 1.15 * TILE, h: 3.35 * TILE }, // West prep counter (cutting board, rice cooker, toaster, fruit bowl)
  {
    x: KITCHEN_DINING_RECT.x,
    y: KITCHEN_DINING_RECT.y - 0.25 * TILE,
    w: KITCHEN_DINING_RECT.w,
    h: KITCHEN_DINING_RECT.h + 0.5 * TILE,
  }, // Family dining table & tucked chairs
  { x: 1.15 * TILE, y: 19.85 * TILE, w: 1.55 * TILE, h: 1.95 * TILE }, // Kitchen pantry cupboard
  { x: 2.85 * TILE, y: 20.65 * TILE, w: 0.72 * TILE, h: 0.95 * TILE }, // Kitchen step trash bin

  // Lower-Right Room: Reorganized Family Bathroom & Integrated Glass Shower Room (access via Kitchen only)
  { x: 11.35 * TILE, y: 13.85 * TILE, w: 3.35 * TILE, h: 1.25 * TILE }, // Wide family vanity sink & mirror cabinet (north-west)
  { x: 15.45 * TILE, y: 13.9 * TILE, w: 0.22 * TILE, h: 2.25 * TILE }, // Glass shower left upper partition (open entry rows 16.15..17.98)
  { x: 15.45 * TILE, y: 17.98 * TILE, w: 3.55 * TILE, h: 0.25 * TILE }, // Glass shower south partition & marble curb
  { x: 18.25 * TILE, y: 14.0 * TILE, w: 0.7 * TILE, h: 0.7 * TILE }, // Corner shower shampoo caddy
  { x: 11.08 * TILE, y: 18.35 * TILE, w: 0.72 * TILE, h: 1.2 * TILE }, // Wall towel rack & shelf (south-west)
  { x: 11.1 * TILE, y: 19.95 * TILE, w: 1.35 * TILE, h: 1.85 * TILE }, // Tall wooden linen & towel cabinet (south-west corner)
  { x: 13.3 * TILE, y: 20.35 * TILE, w: 1.35 * TILE, h: 1.45 * TILE }, // Ceramic flush toilet & bidet (private south wall)
  { x: 14.8 * TILE, y: 21.0 * TILE, w: 0.65 * TILE, h: 0.72 * TILE }, // Covered bamboo-lid bathroom pedal bin
  { x: 16.05 * TILE, y: 20.25 * TILE, w: 1.05 * TILE, h: 1.4 * TILE }, // Woven rattan laundry hamper
  { x: 17.3 * TILE, y: 19.95 * TILE, w: 1.6 * TILE, h: 1.85 * TILE }, // Front-load washing machine
];

export const INTERACTABLES: InteractableObject[] = [
  {
    id: 'coffee',
    zone: 'living',
    label: 'โต๊ะกาแฟ',
    actionLabel: 'จิบกาแฟอุ่นๆ',
    x: 2.5 * TILE,
    y: 6.7 * TILE,
    w: 2.3 * TILE,
    h: 1.1 * TILE,
    interactRadius: 56,
  },
  {
    id: 'sofa',
    zone: 'living',
    label: 'โซฟาห้องนั่งเล่น',
    actionLabel: 'นั่งพักบนโซฟา',
    x: 2.1 * TILE,
    y: 4.5 * TILE,
    w: 3.1 * TILE,
    h: 1.25 * TILE,
    interactRadius: 60,
  },
  {
    id: 'window',
    zone: 'living',
    label: 'หน้าต่างรับแสง',
    actionLabel: 'เปลี่ยนช่วงเวลาแสง',
    x: 2.2 * TILE,
    y: 0.4 * TILE,
    w: 2.8 * TILE,
    h: 1.6 * TILE,
    interactRadius: 68,
  },
  {
    id: 'bookshelf',
    zone: 'living',
    label: 'ชั้นหนังสือ',
    actionLabel: 'หยิบอ่านโน้ตแรงบันดาลใจ',
    x: 8.9 * TILE,
    y: 2.0 * TILE,
    w: 1.0 * TILE,
    h: 1.5 * TILE,
    interactRadius: 56,
  },
  {
    id: 'clock',
    zone: 'living',
    label: 'นาฬิกาลูกตุ้มคลาสสิก',
    actionLabel: 'ดูเวลาปัจจุบัน',
    x: 6.12 * TILE,
    y: 0.45 * TILE,
    w: 0.72 * TILE,
    h: 2.1 * TILE,
    interactRadius: 62,
  },
  {
    id: 'tv',
    zone: 'living',
    label: 'ทีวีห้องพักผ่อน',
    actionLabel: 'เปิดฟีด YouTube',
    x: 2.5 * TILE,
    y: 10.55 * TILE,
    w: 2.4 * TILE,
    h: 1.15 * TILE,
    interactRadius: 68,
  },
  {
    id: 'pinboard',
    zone: 'office',
    label: 'กระดานโน้ตห้องทำงาน',
    actionLabel: 'เปิด Google Tasks',
    x: 13.1 * TILE,
    y: 16,
    w: 2.8 * TILE,
    h: 28,
    interactRadius: 88,
  },
  {
    id: 'workdesk',
    zone: 'office',
    label: 'โต๊ะทำงานส่วนตัว',
    actionLabel: 'นั่งหน้าคอมพิวเตอร์',
    x: 12.25 * TILE,
    y: 3.1 * TILE,
    w: 4.0 * TILE,
    h: 2.35 * TILE,
    interactRadius: 72,
  },
  {
    id: 'drive_table',
    zone: 'office',
    label: 'โต๊ะเอกสารกลางห้อง',
    actionLabel: 'เปิด Google Drive',
    x: CENTER_TABLE_RECT.x,
    y: CENTER_TABLE_RECT.y,
    w: CENTER_TABLE_RECT.w,
    h: CENTER_TABLE_RECT.h,
    interactRadius: 74,
  },
  {
    id: 'mina_desk',
    zone: 'office',
    label: 'มีน่า (ผู้ช่วย AI)',
    actionLabel: 'คุยงานกับมีน่า',
    x: 16.3 * TILE,
    y: 6.2 * TILE,
    w: 2.6 * TILE,
    h: 3.2 * TILE,
    interactRadius: 72,
  },
];

export function getRoomZone(x: number, y = 0): RoomZone {
  const isLowerWing = y >= (MID_WALL_ROW + 1) * TILE;
  const isEastSide = x >= (DIVIDER_COL + 0.45) * TILE;
  if (isLowerWing) {
    return isEastSide ? 'bathroom' : 'kitchen';
  }
  return isEastSide ? 'office' : 'living';
}

export function isPointInShowerWetZone(x: number, y: number): boolean {
  return (
    x >= SHOWER_WET_ZONE_RECT.x &&
    x <= SHOWER_WET_ZONE_RECT.x + SHOWER_WET_ZONE_RECT.w &&
    y >= SHOWER_WET_ZONE_RECT.y &&
    y <= SHOWER_WET_ZONE_RECT.y + SHOWER_WET_ZONE_RECT.h
  );
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function collidesWithWorld(cx: number, cy: number): boolean {
  // Player foot hitbox (smaller than visual sprite so walking feels smooth)
  const hitbox: Rect = {
    x: cx - 9,
    y: cy - 6,
    w: 18,
    h: 14,
  };
  for (const col of COLLIDERS) {
    if (rectsOverlap(hitbox, col)) {
      return true;
    }
  }
  return false;
}

export function findNearestInteractable(px: number, py: number): InteractableObject | null {
  let closest: InteractableObject | null = null;
  let bestDist = Infinity;

  for (const item of INTERACTABLES) {
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist <= item.interactRadius && dist < bestDist) {
      bestDist = dist;
      closest = item;
    }
  }
  return closest;
}

export function getInteractableAtPoint(wx: number, wy: number): InteractableObject | null {
  for (const item of INTERACTABLES) {
    if (wx >= item.x - 8 && wx <= item.x + item.w + 8 && wy >= item.y - 8 && wy <= item.y + item.h + 8) {
      return item;
    }
  }
  return null;
}
