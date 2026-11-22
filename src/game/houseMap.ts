import type { DiningChairSeatId, FacingDirection, InteractableObject, Rect, RoomZone } from '../types/game';

export const TILE = 32;
// Asymmetric floorplan: Home Office (upper-right) is expanded +50% wider (12 interior cols: 11..22)
// while Living Room (9 cols: 1..9), Kitchen (9 cols: 1..9), and Bathroom (8 cols: 11..18) keep their original sizes.
export const OFFICE_EAST_WALL_COL = 23;
export const LOWER_EAST_WALL_COL = 19;
export const MAP_COLS = OFFICE_EAST_WALL_COL + 1; // 24
export const MAP_ROWS = 23;
export const WORLD_W = MAP_COLS * TILE; // 768
export const LOWER_WORLD_W = (LOWER_EAST_WALL_COL + 1) * TILE; // 640
export const WORLD_H = MAP_ROWS * TILE; // 736

// Widescreen camera viewport (1.5x base resolution of 640x416 for crisp pixel & overview rendering)
export const VIEW_W = 960;
export const VIEW_H = 624;
export const CAMERA_BASE_SCALE = 1.5;
export const CAMERA_MIN_ZOOM = Math.min(
  VIEW_W / (WORLD_W * CAMERA_BASE_SCALE),
  VIEW_H / (WORLD_H * CAMERA_BASE_SCALE)
); // ~0.565 (fits entire asymmetric 4-room house cleanly)
export const CAMERA_MAX_ZOOM = 2.0;
export const CAMERA_DEFAULT_ZOOM = 1.15;

// Crisp 2x full-map viewport dimensions
export const FULLMAP_VIEW_W = WORLD_W * 2;
export const FULLMAP_VIEW_H = WORLD_H * 2;
export const FULLMAP_BASE_SCALE = 2;
export const FULLMAP_MIN_ZOOM = 1.0;

export const ROOM_CAMERA_TARGETS = {
  overview: { x: WORLD_W / 2, y: WORLD_H / 2, zoom: CAMERA_MIN_ZOOM },
  living: { x: 5.2 * TILE, y: 6.3 * TILE, zoom: 1.2 },
  office: { x: 16.8 * TILE, y: 6.4 * TILE, zoom: 1.08 },
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
  x: 17.56 * TILE,
  y: 4.92 * TILE,
};
export const WORK_STAND_POS = {
  x: 17.56 * TILE,
  y: 5.72 * TILE,
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

// Large central Home Office document & reference work table (centered in expanded 12-col office with generous aisles)
export const CENTER_TABLE_RECT: Rect = {
  x: 15.0 * TILE,
  y: 7.25 * TILE,
  w: 3.35 * TILE,
  h: 2.05 * TILE,
};

// Family Kitchen wooden dining table & tucked chairs footprint (positioned for open corridor to bathroom door)
export const KITCHEN_DINING_RECT: Rect = {
  x: 4.85 * TILE,
  y: 18.25 * TILE,
  w: 2.95 * TILE,
  h: 1.85 * TILE,
};

export interface DiningChairSpot {
  seatPos: { x: number; y: number };
  standPos: { x: number; y: number };
  facing: FacingDirection;
}

export const DINING_CHAIR_SPOTS: Record<DiningChairSeatId, DiningChairSpot> = {
  dining_chair_nw: {
    seatPos: {
      x: Math.round(KITCHEN_DINING_RECT.x) + 25,
      y: Math.round(KITCHEN_DINING_RECT.y) - 1,
    },
    standPos: {
      x: Math.round(KITCHEN_DINING_RECT.x) + 25,
      y: Math.round(KITCHEN_DINING_RECT.y) - 24,
    },
    facing: 'down',
  },
  dining_chair_ne: {
    seatPos: {
      x: Math.round(KITCHEN_DINING_RECT.x) + Math.round(KITCHEN_DINING_RECT.w) - 25,
      y: Math.round(KITCHEN_DINING_RECT.y) - 1,
    },
    standPos: {
      x: Math.round(KITCHEN_DINING_RECT.x) + Math.round(KITCHEN_DINING_RECT.w) - 25,
      y: Math.round(KITCHEN_DINING_RECT.y) - 24,
    },
    facing: 'down',
  },
  dining_chair_sw: {
    seatPos: {
      x: Math.round(KITCHEN_DINING_RECT.x) + 25,
      y: Math.round(KITCHEN_DINING_RECT.y) + Math.round(KITCHEN_DINING_RECT.h) + 1,
    },
    standPos: {
      x: Math.round(KITCHEN_DINING_RECT.x) + 25,
      y: Math.round(KITCHEN_DINING_RECT.y) + Math.round(KITCHEN_DINING_RECT.h) + 24,
    },
    facing: 'up',
  },
  dining_chair_se: {
    seatPos: {
      x: Math.round(KITCHEN_DINING_RECT.x) + Math.round(KITCHEN_DINING_RECT.w) - 25,
      y: Math.round(KITCHEN_DINING_RECT.y) + Math.round(KITCHEN_DINING_RECT.h) + 1,
    },
    standPos: {
      x: Math.round(KITCHEN_DINING_RECT.x) + Math.round(KITCHEN_DINING_RECT.w) - 25,
      y: Math.round(KITCHEN_DINING_RECT.y) + Math.round(KITCHEN_DINING_RECT.h) + 24,
    },
    facing: 'up',
  },
};

export function isDiningChairSeatId(id: string | null | undefined): id is DiningChairSeatId {
  return (
    id === 'dining_chair_nw' ||
    id === 'dining_chair_ne' ||
    id === 'dining_chair_sw' ||
    id === 'dining_chair_se'
  );
}

// Mina's own workstation swivel chair in the dedicated East AI Suite of the expanded Home Office
export const MINA_POS = {
  x: 20.72 * TILE,
  y: 7.75 * TILE,
};

// Antigravity Localhost Coding Agent position & player interaction spot (south-west tech zone of Home Office)
export const AGY_POS = {
  x: 13.0 * TILE,
  y: 10.6 * TILE,
};
export const AGY_STAND_POS = {
  x: 13.95 * TILE,
  y: 10.6 * TILE,
};

// Google AI Studio Lab Station & character position (south-center bay of expanded Home Office)
export const AISTUDIO_DESK_RECT: Rect = {
  x: 15.6 * TILE,
  y: 10.75 * TILE,
  w: 2.55 * TILE,
  h: 1.05 * TILE,
};
export const AISTUDIO_POS = {
  x: 16.88 * TILE,
  y: 10.38 * TILE,
};
export const AISTUDIO_STAND_POS = {
  x: 16.88 * TILE,
  y: 9.82 * TILE,
};

// Tight proximity thresholds around Mina's desk (must be inside radius to access Mina)
export const MINA_APPROACH_RADIUS = 52;
export const MINA_LEAVE_RADIUS = 64;
export const MINA_MAX_ROAM_RADIUS = 40;
export const MINA_GREET_STOP_DIST = 28;

// Tight proximity thresholds around Antigravity's localhost station (must be inside radius to engage & access)
export const AGY_APPROACH_RADIUS = 52;
export const AGY_LEAVE_RADIUS = 64;

// Tight proximity thresholds around Google AI Studio's lab station (clear separation from Antigravity & Mina)
export const AISTUDIO_APPROACH_RADIUS = 52;
export const AISTUDIO_LEAVE_RADIUS = 64;

// Clear walkable route to stand directly in front of the unobstructed north-west Office Pinboard
export const MINA_AISLE_X = 19.65 * TILE;
export const MINA_PINBOARD_SPOT = { x: 13.65 * TILE, y: 2.52 * TILE };

export const MINA_TO_PINBOARD_WAYPOINTS = [
  { x: MINA_AISLE_X, y: 5.55 * TILE },
  { x: 14.5 * TILE, y: 5.55 * TILE },
  MINA_PINBOARD_SPOT,
];

export const MINA_RETURN_DESK_WAYPOINTS = [
  { x: 14.5 * TILE, y: 5.55 * TILE },
  { x: MINA_AISLE_X, y: 5.55 * TILE },
  { x: MINA_POS.x, y: MINA_POS.y },
];

// Static collision boxes in world coordinates
export const COLLIDERS: Rect[] = [
  // Outer walls (asymmetric L-shaped / stepped East wing for +50% expanded Home Office)
  { x: 0, y: 0, w: WORLD_W, h: 2 * TILE }, // North wall (rows 0-1, cols 0..23)
  { x: 0, y: SOUTH_WALL_ROW * TILE, w: LOWER_WORLD_W, h: TILE }, // Lower wing South wall (row 22, cols 0..19)
  { x: 0, y: 0, w: TILE, h: WORLD_H }, // West wall (col 0)
  { x: OFFICE_EAST_WALL_COL * TILE, y: 0, w: TILE, h: (MID_WALL_ROW + 1) * TILE }, // Expanded Office East wall (col 23, rows 0..12)
  {
    x: LOWER_EAST_WALL_COL * TILE,
    y: MID_WALL_ROW * TILE,
    w: TILE,
    h: (SOUTH_WALL_ROW - MID_WALL_ROW + 1) * TILE,
  }, // Bathroom East wall (col 19, rows 12..22)
  {
    x: (LOWER_EAST_WALL_COL + 1) * TILE,
    y: (MID_WALL_ROW + 1) * TILE,
    w: (MAP_COLS - LOWER_EAST_WALL_COL - 1) * TILE,
    h: (MAP_ROWS - MID_WALL_ROW - 1) * TILE,
  }, // Exterior non-walkable void outside Bathroom & below extended Office East wing (cols 20..23, rows 13..22)

  // Upper interior vertical dividing wall (col 10) with open doorway rows 6..8
  { x: DIVIDER_COL * TILE, y: 2 * TILE, w: TILE, h: 4 * TILE }, // rows 2..5
  { x: DIVIDER_COL * TILE, y: 9 * TILE, w: TILE, h: 3 * TILE }, // rows 9..11

  // Horizontal dividing wall (rows 12..13): open ONLY at Living <-> Kitchen (cols 5..6);
  // solid between Office & Bathroom (cols 7..18) AND forms the South outer wall of the extended Office wing (cols 19..23)
  { x: 1 * TILE, y: MID_WALL_ROW * TILE, w: (KITCHEN_DOOR_COL_START - 1) * TILE, h: 2 * TILE }, // cols 1..4
  {
    x: (KITCHEN_DOOR_COL_END + 1) * TILE,
    y: MID_WALL_ROW * TILE,
    w: (OFFICE_EAST_WALL_COL - KITCHEN_DOOR_COL_END - 1) * TILE,
    h: 2 * TILE,
  }, // cols 7..22 (separates Home Office from Bathroom & seals south edge of Office East extension)

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

  // Expanded & Reorganized Home Office furniture (cols 11..22, rows 2..11)
  { x: 11.18 * TILE, y: 2.08 * TILE, w: 0.85 * TILE, h: 0.95 * TILE }, // North-west office potted fern
  { x: 11.15 * TILE, y: 3.45 * TILE, w: 0.95 * TILE, h: 1.85 * TILE }, // West-wall walnut refreshment & reference credenza
  { x: 15.65 * TILE, y: 2.95 * TILE, w: 4.1 * TILE, h: 1.55 * TILE }, // Player executive computer work desk (north-center)
  { ...CENTER_TABLE_RECT }, // Large central document & book work table (Google Drive island)
  { x: 20.55 * TILE, y: 2.08 * TILE, w: 1.0 * TILE, h: 2.15 * TILE }, // North-east reference library bookcase (left)
  { x: 21.75 * TILE, y: 2.08 * TILE, w: 1.05 * TILE, h: 2.15 * TILE }, // North-east reference library bookcase (right)
  { x: 20.92 * TILE, y: 4.95 * TILE, w: 0.55 * TILE, h: 0.55 * TILE }, // Office wastebasket beside printer
  { x: 21.55 * TILE, y: 4.8 * TILE, w: 1.3 * TILE, h: 1.1 * TILE }, // Office multifunction printer & scanner stand
  { x: 21.25 * TILE, y: 6.15 * TILE, w: 1.6 * TILE, h: 3.25 * TILE }, // Mina's AI workstation desk (East wing)
  { x: 21.45 * TILE, y: 9.55 * TILE, w: 1.4 * TILE, h: 1.4 * TILE }, // Rolling filing cabinet & binders
  { x: 19.35 * TILE, y: 10.75 * TILE, w: 0.85 * TILE, h: 0.95 * TILE }, // South-east office potted monstera plant
  { x: 11.15 * TILE, y: 9.75 * TILE, w: 1.48 * TILE, h: 1.8 * TILE }, // Antigravity localhost terminal desk (south-west tech zone)
  { ...AISTUDIO_DESK_RECT }, // Google AI Studio Prompt Lab & App Builder desk (south-center bay)

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
    x: 12.15 * TILE,
    y: 15,
    w: 3.0 * TILE,
    h: 29,
    interactRadius: 88,
  },
  {
    id: 'workdesk',
    zone: 'office',
    label: 'โต๊ะทำงานส่วนตัว',
    actionLabel: 'นั่งหน้าคอมพิวเตอร์',
    x: 15.65 * TILE,
    y: 2.95 * TILE,
    w: 4.1 * TILE,
    h: 2.35 * TILE,
    interactRadius: 74,
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
    interactRadius: 76,
  },
  {
    id: 'mina_desk',
    zone: 'office',
    label: 'มีน่า (ผู้ช่วย AI)',
    actionLabel: 'คุยงานกับมีน่า',
    x: 20.2 * TILE,
    y: 6.15 * TILE,
    w: 2.65 * TILE,
    h: 3.25 * TILE,
    interactRadius: 76,
  },
  {
    id: 'antigravity_desk',
    zone: 'office',
    label: 'Antigravity (Localhost Agent)',
    actionLabel: 'เปิดคอนโซล Antigravity',
    x: 11.15 * TILE,
    y: 9.65 * TILE,
    w: 2.35 * TILE,
    h: 1.95 * TILE,
    interactRadius: 76,
  },
  {
    id: 'ai_studio_desk',
    zone: 'office',
    label: 'Google AI Studio',
    actionLabel: 'เปิดเวิร์กเบนช์ AI Studio',
    x: AISTUDIO_DESK_RECT.x,
    y: AISTUDIO_DESK_RECT.y - 0.65 * TILE,
    w: AISTUDIO_DESK_RECT.w,
    h: AISTUDIO_DESK_RECT.h + 0.65 * TILE,
    interactRadius: 76,
  },
  {
    id: 'dining_chair_nw',
    zone: 'kitchen',
    label: 'เก้าอี้โต๊ะอาหาร (บนซ้าย)',
    actionLabel: 'นั่งเก้าอี้โต๊ะอาหาร',
    x: Math.round(KITCHEN_DINING_RECT.x) + 12,
    y: Math.round(KITCHEN_DINING_RECT.y) - 13,
    w: 26,
    h: 22,
    interactRadius: 56,
  },
  {
    id: 'dining_chair_ne',
    zone: 'kitchen',
    label: 'เก้าอี้โต๊ะอาหาร (บนขวา)',
    actionLabel: 'นั่งเก้าอี้โต๊ะอาหาร',
    x: Math.round(KITCHEN_DINING_RECT.x) + Math.round(KITCHEN_DINING_RECT.w) - 38,
    y: Math.round(KITCHEN_DINING_RECT.y) - 13,
    w: 26,
    h: 22,
    interactRadius: 56,
  },
  {
    id: 'dining_chair_sw',
    zone: 'kitchen',
    label: 'เก้าอี้โต๊ะอาหาร (ล่างซ้าย)',
    actionLabel: 'นั่งเก้าอี้โต๊ะอาหาร',
    x: Math.round(KITCHEN_DINING_RECT.x) + 12,
    y: Math.round(KITCHEN_DINING_RECT.y) + Math.round(KITCHEN_DINING_RECT.h) - 10,
    w: 26,
    h: 23,
    interactRadius: 56,
  },
  {
    id: 'dining_chair_se',
    zone: 'kitchen',
    label: 'เก้าอี้โต๊ะอาหาร (ล่างขวา)',
    actionLabel: 'นั่งเก้าอี้โต๊ะอาหาร',
    x: Math.round(KITCHEN_DINING_RECT.x) + Math.round(KITCHEN_DINING_RECT.w) - 38,
    y: Math.round(KITCHEN_DINING_RECT.y) + Math.round(KITCHEN_DINING_RECT.h) - 10,
    w: 26,
    h: 23,
    interactRadius: 56,
  },
  {
    id: 'dining_table',
    zone: 'kitchen',
    label: 'โต๊ะอาหารคริสต์มาสครอบครัว',
    actionLabel: 'ฉลองมื้อไก่งวงคริสต์มาส',
    x: KITCHEN_DINING_RECT.x,
    y: KITCHEN_DINING_RECT.y,
    w: KITCHEN_DINING_RECT.w,
    h: KITCHEN_DINING_RECT.h,
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
  let best: InteractableObject | null = null;
  let bestArea = Infinity;

  for (const item of INTERACTABLES) {
    if (wx >= item.x - 4 && wx <= item.x + item.w + 4 && wy >= item.y - 4 && wy <= item.y + item.h + 4) {
      const area = item.w * item.h;
      if (area < bestArea) {
        bestArea = area;
        best = item;
      }
    }
  }
  if (best) return best;

  for (const item of INTERACTABLES) {
    if (wx >= item.x - 8 && wx <= item.x + item.w + 8 && wy >= item.y - 8 && wy <= item.y + item.h + 8) {
      return item;
    }
  }
  return null;
}
