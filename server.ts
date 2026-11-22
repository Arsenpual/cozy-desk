import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type FunctionDeclaration,
  GoogleGenAI,
  ThinkingLevel,
  Type,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type WorkMode = 'qa' | 'brainstorm' | 'draft';
type AntigravityMode = 'code' | 'workspace' | 'arch';
type AiStudioMode = 'prompt' | 'build' | 'schema';
type AiStudioModelId = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
type AiStudioThinkingLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type TimeOfDay = 'morning' | 'afternoon' | 'evening';
type CharacterId = 'mina' | 'antigravity' | 'ai_studio';

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface IncomingGoogleTask {
  id?: string;
  title?: string;
  status?: string;
  due?: string;
  notes?: string;
}

interface IncomingGoogleTaskList {
  id?: string;
  title?: string;
  tasks?: IncomingGoogleTask[];
}

interface IncomingTasksContext {
  status?: 'connected' | 'not_signed_in' | 'auth_expired' | 'unavailable';
  lists?: IncomingGoogleTaskList[];
}

interface ChatRequestBody {
  messages?: IncomingMessage[];
  mode?: WorkMode;
  timeOfDay?: TimeOfDay;
  localDate?: string;
  tasksContext?: IncomingTasksContext;
}

interface AntigravityChatRequestBody {
  messages?: IncomingMessage[];
  mode?: AntigravityMode;
  focusFiles?: string[];
}

interface AiStudioChatRequestBody {
  messages?: IncomingMessage[];
  mode?: AiStudioMode;
  model?: AiStudioModelId;
  thinkingLevel?: AiStudioThinkingLevel;
  systemInstruction?: string;
}

interface QuotaConfigRequestBody {
  dailyLimit?: number;
  resetUsage?: boolean;
}

interface CharacterRuntimeState {
  id: CharacterId;
  name: string;
  activeRequests: number;
  currentTask: string | null;
  lastErrorReason: string | null;
  lastErrorCode: string | null;
  lastErrorUntil: number;
}

function getNextMidnightMs(fromMs = Date.now()): number {
  const next = new Date(fromMs);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

const DEFAULT_DAILY_TOKEN_LIMIT = 250_000;

const quotaState = {
  tokensLimit: DEFAULT_DAILY_TOKEN_LIMIT,
  tokensUsed: 0,
  resetAt: getNextMidnightMs(),
};

const characterRuntime: Record<CharacterId, CharacterRuntimeState> = {
  mina: {
    id: 'mina',
    name: 'มีน่า',
    activeRequests: 0,
    currentTask: null,
    lastErrorReason: null,
    lastErrorCode: null,
    lastErrorUntil: 0,
  },
  antigravity: {
    id: 'antigravity',
    name: 'Antigravity',
    activeRequests: 0,
    currentTask: null,
    lastErrorReason: null,
    lastErrorCode: null,
    lastErrorUntil: 0,
  },
  ai_studio: {
    id: 'ai_studio',
    name: 'Google AI Studio',
    activeRequests: 0,
    currentTask: null,
    lastErrorReason: null,
    lastErrorCode: null,
    lastErrorUntil: 0,
  },
};

function ensureQuotaWindowFresh(): void {
  const now = Date.now();
  if (now >= quotaState.resetAt) {
    quotaState.tokensUsed = 0;
    quotaState.resetAt = getNextMidnightMs(now);
    for (const c of Object.values(characterRuntime)) {
      if (c.lastErrorCode === 'RESOURCE_EXHAUSTED' || c.lastErrorCode === 'QUOTA_EXHAUSTED') {
        c.lastErrorReason = null;
        c.lastErrorCode = null;
        c.lastErrorUntil = 0;
      }
    }
  }
}

function hasValidGeminiApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

function summarizeTaskLabel(raw: string, fallback: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  return cleaned.length > 38 ? `${cleaned.slice(0, 38)}…` : cleaned;
}

function beginCharacterTask(id: CharacterId, taskLabel: string): void {
  ensureQuotaWindowFresh();
  const c = characterRuntime[id];
  c.activeRequests += 1;
  c.currentTask = taskLabel;
  c.lastErrorReason = null;
  c.lastErrorCode = null;
  c.lastErrorUntil = 0;
}

function endCharacterTask(id: CharacterId): void {
  const c = characterRuntime[id];
  c.activeRequests = Math.max(0, c.activeRequests - 1);
  if (c.activeRequests === 0) {
    c.currentTask = null;
  }
}

function recordCharacterError(id: CharacterId, code: string | undefined, reason: string): void {
  const c = characterRuntime[id];
  c.lastErrorCode = code ?? 'ERROR';
  c.lastErrorReason = reason;
  // Keep transient errors visible for 2 minutes; persistent auth errors stay until resolved/retried
  const durationMs =
    code === 'API_KEY_INVALID' || code === 'PERMISSION_DENIED'
      ? 30 * 60 * 1000
      : code === 'RESOURCE_EXHAUSTED'
        ? 5 * 60 * 1000
        : 90 * 1000;
  c.lastErrorUntil = Date.now() + durationMs;
}

function recordTokenUsage(tokens: number): void {
  ensureQuotaWindowFresh();
  if (Number.isFinite(tokens) && tokens > 0) {
    quotaState.tokensUsed = Math.min(
      quotaState.tokensLimit * 2,
      quotaState.tokensUsed + Math.round(tokens)
    );
  }
}

function estimateFallbackTokens(inputChars: number, outputChars: number): number {
  return Math.max(40, Math.round((inputChars + outputChars) / 3.2));
}

function formatShortClock(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '00:00 น.';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
}

function buildCharacterStatusMap() {
  ensureQuotaWindowFresh();
  const now = Date.now();
  const apiKeyReady = hasValidGeminiApiKey();
  const remaining = Math.max(0, quotaState.tokensLimit - quotaState.tokensUsed);

  const result: Record<
    CharacterId,
    {
      id: CharacterId;
      name: string;
      status: 'ready' | 'busy' | 'unavailable';
      tokensRemaining: number;
      tokensUsed: number;
      tokensLimit: number;
      resetAt: number;
      currentTask: string | null;
      unavailableReason: string | null;
      unavailableCode: string | null;
    }
  > = {} as never;

  for (const id of ['mina', 'antigravity', 'ai_studio'] as CharacterId[]) {
    const c = characterRuntime[id];
    const hasActiveError = Boolean(c.lastErrorReason && now < c.lastErrorUntil);

    let status: 'ready' | 'busy' | 'unavailable' = 'ready';
    let unavailableReason: string | null = null;
    let unavailableCode: string | null = null;

    if (!apiKeyReady) {
      status = 'unavailable';
      unavailableCode = 'MISSING_API_KEY';
      unavailableReason = 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY';
    } else if (c.activeRequests > 0) {
      status = 'busy';
    } else if (remaining <= 0) {
      status = 'unavailable';
      unavailableCode = 'QUOTA_EXHAUSTED';
      unavailableReason = `Token หมด (รีเซ็ต ${formatShortClock(quotaState.resetAt)})`;
    } else if (hasActiveError) {
      status = 'unavailable';
      unavailableCode = c.lastErrorCode;
      unavailableReason = c.lastErrorReason;
    }

    result[id] = {
      id,
      name: c.name,
      status,
      tokensRemaining: remaining,
      tokensUsed: quotaState.tokensUsed,
      tokensLimit: quotaState.tokensLimit,
      resetAt: quotaState.resetAt,
      currentTask: status === 'busy' ? c.currentTask : null,
      unavailableReason,
      unavailableCode,
    };
  }

  return result;
}

function buildAiStudioSystemInstruction(
  mode: AiStudioMode,
  customInstruction?: string
): string {
  const modeGuidance: Record<AiStudioMode, string> = {
    prompt: [
      'โหมดปัจจุบัน: Prompt Lab (ออกแบบ ทดสอบ และปรับแต่ง Prompt)',
      '- ช่วยวิเคราะห์โจทย์ เขียน/รีไรต์ Prompt ให้คมชัด แยกโครงสร้าง Role / Context / Constraints / Output Format',
      '- แนะนำวิธีปรับจูนให้ผลลัพธ์แม่นยำและสม่ำเสมอขึ้น',
    ].join('\n'),
    build: [
      'โหมดปัจจุบัน: App Builder (วางโครงสร้างและออกแบบต้นแบบเว็บแอพ)',
      '- เสนอสถาปัตยกรรมคอมโพเนนต์ โฟลว์การใช้งาน UI และตัวอย่างโค้ด React + TypeScript + Tailwind CSS ที่พร้อมต่อยอด',
      '- ชี้จุดควรระวังด้าน UX และ Edge Cases อย่างกระชับ',
    ].join('\n'),
    schema: [
      'โหมดปัจจุบัน: JSON & Schema (ออกแบบ Structured Output / JSON Schema / TypeScript Interface)',
      '- สร้าง JSON Schema หรือ TypeScript Type ที่สะอาด ถูกต้องตามมาตรฐาน พร้อมตัวอย่าง JSON ที่ใช้งานได้จริง',
      '- อธิบายฟิลด์สำคัญสั้นๆ ในรูปแบบอ่านง่าย',
    ].join('\n'),
  };

  return [
    'คุณคือ "Google AI Studio" ตัวละครผู้เชี่ยวชาญด้าน Prompt Engineering, การสร้างต้นแบบแอพ และการออกแบบ Structured Schema ประจำสถานี AI Lab ในห้องทำงาน Cozy Desk',
    'บุคลิกของคุณ: ทันสมัย เป็นระบบ ฉับไว เป็นมิตร และเน้นผลลัพธ์ที่นำไปใช้จริงได้ทันที',
    'ภาษา: ตอบเป็นภาษาไทยอย่างเป็นธรรมชาติเป็นหลัก (ใช้ศัพท์เทคนิคและโค้ดภาษาอังกฤษตามมาตรฐาน)',
    modeGuidance[mode] ?? modeGuidance.prompt,
    customInstruction?.trim()
      ? `คำสั่งเพิ่มเติมจากผู้ใช้ (System Instruction):\n${customInstruction.trim().slice(0, 2000)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', '.gemini']);

async function listSafeWorkspaceFiles(dir = __dirname, prefix = '', depth = 0): Promise<string[]> {
  if (depth > 3) return [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        const sub = await listSafeWorkspaceFiles(path.join(dir, entry.name), rel, depth + 1);
        results.push(...sub);
      } else if (/\.(ts|tsx|js|jsx|json|css|html|md)$/i.test(entry.name)) {
        results.push(rel);
      }
      if (results.length >= 80) break;
    }
    return results.slice(0, 80);
  } catch {
    return [];
  }
}

async function readSafeWorkspaceFile(relPath: string): Promise<string | null> {
  try {
    const cleanRel = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!cleanRel || cleanRel.includes('..') || cleanRel.startsWith('.env')) {
      return null;
    }
    const firstSeg = cleanRel.split('/')[0];
    if (EXCLUDED_DIRS.has(firstSeg) || firstSeg.startsWith('.')) {
      return null;
    }
    const fullPath = path.resolve(__dirname, cleanRel);
    const rootWithSep = __dirname.endsWith(path.sep) ? __dirname : `${__dirname}${path.sep}`;
    if (!fullPath.startsWith(rootWithSep)) {
      return null;
    }
    const stat = await fs.stat(fullPath);
    if (!stat.isFile() || stat.size > 250_000) {
      return null;
    }
    const raw = await fs.readFile(fullPath, 'utf8');
    return raw.slice(0, 14_000);
  } catch {
    return null;
  }
}

function buildAntigravitySystemInstruction(
  mode: AntigravityMode,
  workspaceFiles: string[],
  fileContexts: Array<{ path: string; content: string }>
): string {
  const modeGuidance: Record<AntigravityMode, string> = {
    code: [
      'โหมดปัจจุบัน: Code & Debug (เขียนโค้ด แก้บัค และรีวิวโค้ด)',
      '- วิเคราะห์ปัญหาอย่างแม่นยำ พร้อมแสดงตัวอย่างโค้ด TypeScript / React / Node.js ที่สะอาด ปลอดภัย และไม่เสี่ยงเกิดบัค',
      '- ชี้จุดที่ควรระวัง (Edge Cases) และวิธีทดสอบอย่างกระชับ',
    ].join('\n'),
    workspace: [
      'โหมดปัจจุบัน: Workspace Explorer (สำรวจและอธิบายไฟล์ในโปรเจกต์บน localhost)',
      '- อ้างอิงจากรายชื่อไฟล์และเนื้อหาไฟล์ในโปรเจกต์ที่แนบให้ด้านล่างตามจริง',
      '- อธิบายการทำงานของแต่ละไฟล์ ความเชื่อมโยงของระบบ และจุดที่สามารถปรับปรุงต่อได้',
    ].join('\n'),
    arch: [
      'โหมดปัจจุบัน: Architecture & Localhost CLI (ออกแบบสถาปัตยกรรมและคำสั่งรันงาน)',
      '- แนะนำโครงสร้างระบบ การเชื่อมต่อ API บน localhost คำสั่ง CLI/Terminal และแนวทางที่เสถียรที่สุด',
      '- จัดลำดับขั้นตอนเป็นข้อๆ ที่นำไปรันหรือพัฒนาต่อได้ทันที',
    ].join('\n'),
  };

  const fileListBlock =
    workspaceFiles.length > 0
      ? `รายชื่อไฟล์ในโปรเจกต์บน localhost (${path.basename(__dirname)}):\n${workspaceFiles
          .map((f) => `- ${f}`)
          .join('\n')}`
      : '';

  const attachedFilesBlock =
    fileContexts.length > 0
      ? `เนื้อหาไฟล์จริงจากเครื่อง localhost ที่ถูกดึงมาตรวจสอบ:\n\n${fileContexts
          .map((f) => `### ไฟล์: \`${f.path}\`\n\`\`\`\n${f.content}\n\`\`\``)
          .join('\n\n')}`
      : '';

  return [
    'คุณคือ "Antigravity (AGY)" ตัวละคร AI Coding & Localhost Agent ประจำสถานี Dev Station ในห้องทำงานของแอพ Cozy Desk (รันอยู่บน http://localhost)',
    'บุคลิกของคุณ: เชี่ยวชาญด้านวิศวกรรมซอฟต์แวร์ เฉียบคม สุภาพ เป็นกันเอง เน้นความเสถียรของระบบ (Zero-Bug Mindset) และอธิบายเรื่องเทคนิคให้เข้าใจง่าย',
    'ภาษา: ตอบเป็นภาษาไทยอย่างเป็นธรรมชาติ (ใช้ศัพท์เทคนิคและโค้ดภาษาอังกฤษตามมาตรฐาน)',
    'รูปแบบการตอบ: ใช้ Markdown และ Code Block ที่มีระบุภาษาชัดเจน กระชับ ตรงประเด็น',
    modeGuidance[mode] ?? modeGuidance.code,
    fileListBlock,
    attachedFilesBlock,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-4-hydrogen';

const PROPOSE_GOOGLE_TASK_TOOL: FunctionDeclaration = {
  name: 'propose_google_task',
  description:
    'Prepare a new Google Task item to pin on the user home office pinboard (Google Tasks) whenever the user asks to add, create, schedule, remind, or record a task or to-do item.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description:
          'Clear, concise task title in the user language (Thai or English).',
      },
      notes: {
        type: Type.STRING,
        description:
          'Optional extra notes, details, or sub-steps for the task.',
      },
      dueDate: {
        type: Type.STRING,
        description:
          'Optional due date strictly formatted as YYYY-MM-DD if the user mentions a specific date or relative day (e.g., today, tomorrow, next Friday). Leave empty if no date was mentioned.',
      },
    },
    required: ['title'],
  },
};

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGoogleTasksContext(
  tasksContext: IncomingTasksContext | undefined,
  localDate: string
): string {
  const status = tasksContext?.status;

  if (!tasksContext || status === 'not_signed_in') {
    return [
      'สถานะ Google Tasks ปัจจุบัน: ผู้ใช้ยังไม่ได้เข้าสู่ระบบ Google (Sign in with Google)',
      '- หากผู้ใช้ถามถึงงานใน Google Tasks หรือขอให้สรุป/รายงานงานที่มีอยู่ ให้แจ้งอย่างสุภาพว่ายังมองไม่เห็นรายการงานเพราะยังไม่ได้เชื่อมต่อบัญชี Google และแนะนำให้กดปุ่ม "Sign in with Google" ก่อน (ห้ามเดาหรือแต่งชื่องานขึ้นมาเอง)',
    ].join('\n');
  }

  if (status === 'auth_expired') {
    return [
      'สถานะ Google Tasks ปัจจุบัน: เซสชัน Google หมดอายุหรือยังไม่มีสิทธิ์เข้าถึง Google Tasks',
      '- หากผู้ใช้ถามถึงรายการงาน ให้แจ้งอย่างสุภาพว่าสิทธิ์เชื่อมต่อ Google หมดอายุแล้ว กรุณากด "Sign in with Google" ใหม่อีกครั้งเพื่อให้มีน่าอ่านรายการงานล่าสุดได้',
    ].join('\n');
  }

  if (status === 'unavailable') {
    return [
      'สถานะ Google Tasks ปัจจุบัน: ไม่สามารถดึงข้อมูลจาก Google Tasks ได้ชั่วคราว',
      '- หากผู้ใช้ถามถึงรายการงาน ให้แจ้งว่าตอนนี้เชื่อมต่อดึงข้อมูลจาก Google Tasks ไม่สำเร็จชั่วคราว แนะนำให้ลองถามใหม่อีกครั้งหรือเปิดดูที่กระดานโน้ตในห้องทำงาน',
    ].join('\n');
  }

  const rawLists = Array.isArray(tasksContext.lists) ? tasksContext.lists.slice(0, 20) : [];
  let totalPending = 0;
  let totalCompleted = 0;
  let renderedTaskCount = 0;
  const MAX_RENDERED_TASKS = 150;

  const listBlocks: string[] = [];

  for (const list of rawLists) {
    const listTitle =
      typeof list?.title === 'string' && list.title.trim()
        ? list.title.trim().slice(0, 100)
        : 'รายการงาน';
    const rawTasks = Array.isArray(list?.tasks) ? list.tasks : [];

    const pendingTasks = rawTasks.filter((t) => t?.status !== 'completed');
    const completedTasks = rawTasks.filter((t) => t?.status === 'completed');

    totalPending += pendingTasks.length;
    totalCompleted += completedTasks.length;

    const orderedTasks = [...pendingTasks, ...completedTasks];
    const lines: string[] = [];

    for (const task of orderedTasks) {
      if (renderedTaskCount >= MAX_RENDERED_TASKS) break;
      const title =
        typeof task?.title === 'string' && task.title.trim()
          ? task.title.trim().slice(0, 200)
          : '(ไม่มีชื่องาน)';
      const isDone = task?.status === 'completed';
      const dueDate =
        typeof task?.due === 'string' && /^\d{4}-\d{2}-\d{2}/.test(task.due)
          ? task.due.slice(0, 10)
          : '';
      const notes =
        typeof task?.notes === 'string' && task.notes.trim()
          ? task.notes.trim().replace(/\s+/g, ' ').slice(0, 160)
          : '';

      let dueTag = '';
      if (dueDate) {
        if (!isDone && dueDate < localDate) {
          dueTag = ` | กำหนดส่ง: ${dueDate} (เลยกำหนด)`;
        } else if (!isDone && dueDate === localDate) {
          dueTag = ` | กำหนดส่ง: ${dueDate} (วันนี้)`;
        } else {
          dueTag = ` | กำหนดส่ง: ${dueDate}`;
        }
      }
      const notesTag = notes ? ` | โน้ต: ${notes}` : '';
      lines.push(`  - [${isDone ? '✓ เสร็จแล้ว' : 'ยังไม่เสร็จ'}] ${title}${dueTag}${notesTag}`);
      renderedTaskCount += 1;
    }

    if (lines.length === 0) {
      listBlocks.push(`• รายการ "${listTitle}" (ไม่มีงานในรายการนี้)`);
    } else {
      listBlocks.push(
        `• รายการ "${listTitle}" (ค้าง ${pendingTasks.length} / เสร็จแล้ว ${completedTasks.length}):\n${lines.join('\n')}`
      );
    }
  }

  const truncatedNote =
    totalPending + totalCompleted > renderedTaskCount
      ? `\n(หมายเหตุ: แสดง ${renderedTaskCount} จากทั้งหมด ${totalPending + totalCompleted} งาน)`
      : '';

  return [
    `ข้อมูล Google Tasks จริงล่าสุดทั้งหมดของผู้ใช้ (อัปเดตเรียลไทม์ ณ ${localDate} | งานค้างทั้งหมด ${totalPending} งาน, เสร็จแล้ว ${totalCompleted} งาน):`,
    listBlocks.length > 0 ? listBlocks.join('\n\n') : '(ยังไม่มีรายการงานใน Google Tasks)',
    truncatedNote,
    'แนวทางการรายงาน Google Tasks:',
    '- เมื่อผู้ใช้ถามถึงงาน (เช่น "มีงานอะไรบ้าง", "เช็ค Google Tasks", "สรุปงานวันนี้", "งานค้างมีอะไร", "รายงาน task ทั้งหมด") ให้รายงานจากข้อมูลจริงด้านบนทั้งหมด (รวมถึงงานที่ผู้ใช้เพิ่มจากมือถือ/เว็บ Google Tasks ไม่ใช่แค่ที่เพิ่มในแชท)',
    '- แยกหัวข้อหรือจัดรูปแบบให้อ่านง่าย เช่น แยกงานที่ยังไม่เสร็จ / งานเลยกำหนด / งานวันนี้ / งานที่เสร็จแล้ว หรือแยกตามชื่อ Task List หากมีหลายรายการ',
    '- หากไม่มีงานค้างอยู่เลย ให้แจ้งให้ชัดเจนว่าตอนนี้ไม่มีงานค้างใน Google Tasks',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildSystemInstruction(
  mode: WorkMode,
  timeOfDay: TimeOfDay,
  localDate: string,
  tasksContext?: IncomingTasksContext
): string {
  const timeContext: Record<TimeOfDay, string> = {
    morning: 'ตอนนี้เป็นช่วงเช้าในบ้าน บรรยากาศสดใสเหมาะกับการวางแผนและเริ่มงาน',
    afternoon: 'ตอนนี้เป็นช่วงบ่ายอุ่นๆ ในบ้าน บรรยากาศสบายๆ เหมาะกับการโฟกัสและต่อยอดงาน',
    evening: 'ตอนนี้เป็นช่วงค่ำในห้องทำงาน เปิดโคมไฟอุ่นๆ บรรยากาศสงบเหมาะกับการสรุปและร่างงาน',
  };

  const modeGuidance: Record<WorkMode, string> = {
    qa: [
      'โหมดปัจจุบัน: ถาม-ตอบช่วยทำงาน (Work Q&A)',
      '- ตอบคำถามอย่างตรงประเด็น กระชับ ชัดเจน และนำไปใช้งานได้จริง',
      '- หากคำถามซับซ้อน ให้แบ่งคำตอบเป็นข้อๆ หรือขั้นตอนที่ทำตามได้ง่าย',
      '- ปิดท้ายด้วยข้อเสนอแนะสั้นๆ 1 ประโยคว่าจะช่วยต่อยอดอะไรได้อีกหากเหมาะสม',
    ].join('\n'),
    brainstorm: [
      'โหมดปัจจุบัน: คิดไอเดียและระดมสมอง (Brainstorm)',
      '- เสนอไอเดียหลากหลายมุมมองอย่างน้อย 3–5 แนวทาง พร้อมชื่อแนวคิดสั้นๆ และเหตุผล/จุดเด่น',
      '- จัดโครงสร้างให้อ่านง่ายด้วยหัวข้อย่อยและรายการตัวเลข',
      '- ชวนผู้ใช้เลือกไอเดียที่ชอบเพื่อลงรายละเอียดต่อในรอบถัดไป',
    ].join('\n'),
    draft: [
      'โหมดปัจจุบัน: ร่างเอกสารและข้อความ (Document Drafting)',
      '- ร่างข้อความหรือเอกสารให้สมบูรณ์พร้อมนำไปคัดลอกใช้งานได้ทันที (เช่น อีเมล โครงร่างงาน สรุปประชุม บทความ หรือโพสต์)',
      '- ใช้ภาษาที่เป็นธรรมชาติ เหมาะสมกับบริบทงาน และจัดย่อหน้าหรือหัวข้ออย่างเป็นระเบียบ',
      '- หากมีข้อมูลที่ผู้ใช้ควรเติมเอง ให้ใส่เครื่องหมาย [ระบุ...] ชัดเจน',
    ].join('\n'),
  };

  return [
    'คุณคือ "มีน่า (Mina)" ผู้ช่วยทำงานประจำโต๊ะคอมพิวเตอร์ในห้องทำงานของบ้านจำลอง 2D ที่อบอุ่น',
    timeContext[timeOfDay] ?? timeContext.afternoon,
    `วันที่ปัจจุบันของผู้ใช้คือ ${localDate}`,
    'บุคลิกของคุณ: อบอุ่น เป็นกันเอง สุภาพ ฉลาดจัดระเบียบ และพูดจาเป็นธรรมชาติเหมือนเพื่อนร่วมโต๊ะทำงานที่พึ่งพาได้',
    'ภาษา: ตอบเป็นภาษาไทยอย่างเป็นธรรมชาติเป็นหลัก (หรือตอบตามภาษาที่ผู้ใช้พิมพ์มาหากผู้ใช้สื่อสารเป็นภาษาอังกฤษ)',
    'รูปแบบการตอบ: ใช้ Markdown แบบอ่านง่าย (หัวข้อย่อย ตัวหนา รายการขีด/ตัวเลข) หลีกเลี่ยงการใช้คำฟุ่มเฟือยเกินจำเป็น',
    [
      'ความสามารถเสริม — ดู/รายงาน และเพิ่มงานลง Google Tasks บนกระดานโน้ตในห้องทำงาน:',
      '- คุณสามารถมองเห็นรายการ Google Tasks จริงทั้งหมดของผู้ใช้จากข้อมูลล่าสุดที่แนบไว้ด้านล่าง และสามารถรายงาน/สรุปให้ผู้ใช้ได้ทันทีเมื่อถูกถาม',
      '- หากผู้ใช้สั่งให้เพิ่มงาน สร้าง task จดสิ่งที่ต้องทำ เตือนความจำ หรือเพิ่มรายการลง Google Tasks (เช่น "ช่วยเพิ่มงาน...", "จด task ...", "เพิ่มลง Google Tasks...") ให้เรียกเครื่องมือ `propose_google_task` พร้อมสกัดชื่องาน รายละเอียดโน้ต และวันครบกำหนดรูปแบบ YYYY-MM-DD (คำนวณจากวันที่ปัจจุบันหากผู้ใช้พูดว่า วันนี้/พรุ่งนี้/มะรืน/วันศุกร์)',
      '- ตอบกลับสั้นๆ ว่าเตรียมรายการงานไว้ให้ตรวจสอบและกดยืนยันด้านล่างแล้ว และเมื่อกดยืนยันคุณจะเดินไปปักหมุดบนกระดานโน้ตให้ทันที',
      '- หากผู้ใช้เพียงถาม-ตอบ ถามดูรายการงานที่มีอยู่ คิดไอเดีย หรือร่างเอกสารทั่วไปโดยไม่ได้สั่งเพิ่มงานใหม่ลง Google Tasks ห้ามเรียกเครื่องมือ `propose_google_task`',
    ].join('\n'),
    formatGoogleTasksContext(tasksContext, localDate),
    modeGuidance[mode] ?? modeGuidance.qa,
  ].join('\n\n');
}

function isAbortOrTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: number | string; message?: string };
  return (
    e.name === 'AbortError' ||
    e.name === 'TimeoutError' ||
    e.code === 20 ||
    (typeof e.message === 'string' &&
      (e.message.toLowerCase().includes('aborted') ||
        e.message.toLowerCase().includes('timeout')))
  );
}

function classifyGeminiError(err: unknown): { status: number; message: string; code?: string } {
  const errObj = err as { status?: number; code?: string | number; message?: string } | null;
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  const statusNum = typeof errObj?.status === 'number' ? errObj.status : undefined;

  if (isAbortOrTimeoutError(err)) {
    return {
      status: 504,
      code: 'TIMEOUT',
      message: 'ผู้ช่วย AI ใช้เวลาประมวลผลนานกว่าปกติ กรุณากด “ส่งใหม่” อีกครั้งครับ',
    };
  }
  if (
    raw === 'MISSING_API_KEY' ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key') ||
    lower.includes('unauthenticated') ||
    statusNum === 401
  ) {
    return {
      status: 401,
      code: 'API_KEY_INVALID',
      message: 'ยังไม่ได้ตั้งค่าหรือคีย์ Gemini API ไม่ถูกต้อง กรุณาตรวจสอบ API Key ในเมนู Settings > Secrets ของ AI Studio',
    };
  }
  if (lower.includes('permission_denied') || lower.includes('403') || statusNum === 403) {
    return {
      status: 403,
      code: 'PERMISSION_DENIED',
      message: 'สิทธิ์การเข้าถึง Gemini API ถูกปฏิเสธ กรุณาตรวจสอบการตั้งค่า API Key ในเมนู Settings > Secrets',
    };
  }
  if (
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    statusNum === 429
  ) {
    return {
      status: 429,
      code: 'RESOURCE_EXHAUSTED',
      message: 'ใช้งานเกินโควต้าของ Gemini API ชั่วคราว กรุณารอสักครู่แล้วลองส่งใหม่อีกครั้ง',
    };
  }
  if (lower.includes('not_found') || lower.includes('404') || statusNum === 404) {
    return {
      status: 404,
      code: 'NOT_FOUND',
      message: 'ไม่พบโมเดลที่ร้องขอบน Gemini API กรุณาลองใหม่อีกครั้งภายหลัง',
    };
  }
  return {
    status: statusNum ?? 500,
    code: String(statusNum ?? errObj?.code ?? 'UNKNOWN'),
    message: 'ไม่สามารถเชื่อมต่อกับผู้ช่วย AI ได้ในขณะนี้ กรุณาลองส่งข้อความใหม่อีกครั้ง',
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      model: PRIMARY_MODEL,
    });
  });

  app.get('/api/characters/status', (_req, res) => {
    res.json({
      ok: true,
      characters: buildCharacterStatusMap(),
      updatedAt: Date.now(),
    });
  });

  app.post('/api/characters/quota-config', (req, res) => {
    ensureQuotaWindowFresh();
    const body = (req.body ?? {}) as QuotaConfigRequestBody;
    if (typeof body.dailyLimit === 'number' && Number.isFinite(body.dailyLimit)) {
      quotaState.tokensLimit = Math.max(10_000, Math.min(10_000_000, Math.round(body.dailyLimit)));
    }
    if (body.resetUsage) {
      quotaState.tokensUsed = 0;
      quotaState.resetAt = getNextMidnightMs();
      for (const c of Object.values(characterRuntime)) {
        if (c.lastErrorCode === 'RESOURCE_EXHAUSTED' || c.lastErrorCode === 'QUOTA_EXHAUSTED') {
          c.lastErrorReason = null;
          c.lastErrorCode = null;
          c.lastErrorUntil = 0;
        }
      }
    }
    res.json({
      ok: true,
      characters: buildCharacterStatusMap(),
      updatedAt: Date.now(),
    });
  });

  app.post('/api/aistudio/chat', async (req, res) => {
    const body = (req.body ?? {}) as AiStudioChatRequestBody;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const mode: AiStudioMode =
      body.mode === 'build' || body.mode === 'schema' ? body.mode : 'prompt';
    const selectedModel: AiStudioModelId =
      body.model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
    const thinkingLevelKey: AiStudioThinkingLevel =
      body.thinkingLevel === 'LOW' || body.thinkingLevel === 'HIGH'
        ? body.thinkingLevel
        : 'MEDIUM';
    const customSysInst =
      typeof body.systemInstruction === 'string' ? body.systemInstruction : '';

    const filtered = rawMessages
      .filter(
        (m): m is IncomingMessage =>
          Boolean(m) &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-20);

    const sanitizedMessages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const m of filtered) {
      const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
      const text = m.content.trim().slice(0, 6000);
      const prev = sanitizedMessages[sanitizedMessages.length - 1];
      if (prev && prev.role === role) {
        prev.parts[0].text = `${prev.parts[0].text}\n\n${text}`.slice(0, 8000);
      } else {
        sanitizedMessages.push({ role, parts: [{ text }] });
      }
    }

    if (
      sanitizedMessages.length === 0 ||
      sanitizedMessages[sanitizedMessages.length - 1].role !== 'user'
    ) {
      res.status(400).json({ error: 'กรุณาพิมพ์ Prompt ก่อนส่งให้ Google AI Studio ครับ' });
      return;
    }

    let geminiClient: GoogleGenAI;
    try {
      geminiClient = createGeminiClient();
    } catch (err) {
      const classified = classifyGeminiError(err);
      recordCharacterError('ai_studio', classified.code, classified.message);
      res.status(classified.status).json({ error: classified.message });
      return;
    }

    const latestPrompt = sanitizedMessages[sanitizedMessages.length - 1].parts[0].text;
    const taskFallback =
      mode === 'build'
        ? 'ออกแบบต้นแบบแอพ'
        : mode === 'schema'
          ? 'สร้าง JSON Schema'
          : 'ทดลอง Prompt Lab';
    beginCharacterTask('ai_studio', summarizeTaskLabel(latestPrompt, taskFallback));

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    let clientDisconnected = false;
    const clientAbort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        clientAbort.abort();
      }
    });

    const keepAliveTimer = setInterval(() => {
      if (!clientDisconnected && !res.writableEnded) {
        res.write(': keepalive\n\n');
      }
    }, 8000);

    try {
      const systemInstruction = buildAiStudioSystemInstruction(mode, customSysInst);
      const thinkingEnum =
        thinkingLevelKey === 'LOW'
          ? ThinkingLevel.LOW
          : thinkingLevelKey === 'HIGH'
            ? ThinkingLevel.HIGH
            : ThinkingLevel.MEDIUM;

      const inputChars =
        systemInstruction.length +
        sanitizedMessages.reduce((acc, m) => acc + m.parts[0].text.length, 0);
      let outputChars = 0;
      let reportedTotalTokens = 0;

      const stream = await geminiClient.models.generateContentStream({
        model: selectedModel,
        contents: sanitizedMessages,
        config:
          selectedModel === 'gemini-4-hydrogen'
            ? {
                systemInstruction,
                abortSignal: clientAbort.signal,
                thinkingConfig: { thinkingLevel: thinkingEnum },
              }
            : {
                systemInstruction,
                abortSignal: clientAbort.signal,
              },
      });

      for await (const chunk of stream) {
        if (clientDisconnected || res.writableEnded) break;
        const usageTotal = chunk.usageMetadata?.totalTokenCount;
        if (typeof usageTotal === 'number' && usageTotal > reportedTotalTokens) {
          reportedTotalTokens = usageTotal;
        }
        const text = chunk.text ?? '';
        if (text) {
          outputChars += text.length;
          res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
        }
      }

      const usedTokens =
        reportedTotalTokens > 0
          ? reportedTotalTokens
          : estimateFallbackTokens(inputChars, outputChars);
      recordTokenUsage(usedTokens);

      if (!clientDisconnected && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'usage', tokensUsed: usedTokens })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    } catch (err) {
      if (clientDisconnected) return;
      const classified = classifyGeminiError(err);
      recordCharacterError('ai_studio', classified.code, classified.message);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: classified.message })}\n\n`);
      }
    } finally {
      endCharacterTask('ai_studio');
      clearInterval(keepAliveTimer);
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  app.get('/api/antigravity/status', async (_req, res) => {
    const files = await listSafeWorkspaceFiles();
    res.json({
      ok: true,
      agent: 'Antigravity Localhost Agent',
      host: `http://localhost:${PORT}`,
      endpoint: '/api/antigravity/chat',
      workspace: path.basename(__dirname),
      model: PRIMARY_MODEL,
      fileCount: files.length,
      files,
    });
  });

  app.post('/api/antigravity/chat', async (req, res) => {
    const body = (req.body ?? {}) as AntigravityChatRequestBody;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const mode: AntigravityMode =
      body.mode === 'workspace' || body.mode === 'arch' ? body.mode : 'code';
    const requestedFiles = Array.isArray(body.focusFiles)
      ? body.focusFiles.filter((f): f is string => typeof f === 'string')
      : [];

    const filtered = rawMessages
      .filter(
        (m): m is IncomingMessage =>
          Boolean(m) &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-20);

    const sanitizedMessages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const m of filtered) {
      const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
      const text = m.content.trim().slice(0, 6000);
      const prev = sanitizedMessages[sanitizedMessages.length - 1];
      if (prev && prev.role === role) {
        prev.parts[0].text = `${prev.parts[0].text}\n\n${text}`.slice(0, 8000);
      } else {
        sanitizedMessages.push({ role, parts: [{ text }] });
      }
    }

    if (
      sanitizedMessages.length === 0 ||
      sanitizedMessages[sanitizedMessages.length - 1].role !== 'user'
    ) {
      res.status(400).json({ error: 'กรุณาพิมพ์คำสั่งหรือคำถามก่อนส่งให้ Antigravity ครับ' });
      return;
    }

    let geminiClient: GoogleGenAI;
    try {
      geminiClient = createGeminiClient();
    } catch (err) {
      const classified = classifyGeminiError(err);
      recordCharacterError('antigravity', classified.code, classified.message);
      res.status(classified.status).json({ error: classified.message });
      return;
    }

    const agyTaskLabel = summarizeTaskLabel(
      sanitizedMessages[sanitizedMessages.length - 1].parts[0].text,
      mode === 'workspace'
        ? 'สำรวจไฟล์โปรเจกต์'
        : mode === 'arch'
          ? 'วิเคราะห์สถาปัตยกรรม'
          : 'ตรวจโค้ด & แก้บัค'
    );
    beginCharacterTask('antigravity', agyTaskLabel);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    let clientDisconnected = false;
    const clientAbort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        clientAbort.abort();
      }
    });

    const keepAliveTimer = setInterval(() => {
      if (!clientDisconnected && !res.writableEnded) {
        res.write(': keepalive\n\n');
      }
    }, 8000);

    try {
      const workspaceFiles = await listSafeWorkspaceFiles();
      const lastUserText = sanitizedMessages[sanitizedMessages.length - 1].parts[0].text.toLowerCase();

      // Match up to 3 relevant workspace files (from explicit focusFiles or mentioned by filename in prompt)
      const matchedPaths: string[] = [];
      for (const reqFile of requestedFiles) {
        if (workspaceFiles.includes(reqFile) && !matchedPaths.includes(reqFile)) {
          matchedPaths.push(reqFile);
        }
      }
      for (const wf of workspaceFiles) {
        if (matchedPaths.length >= 3) break;
        const base = path.posix.basename(wf).toLowerCase();
        if (
          !matchedPaths.includes(wf) &&
          (lastUserText.includes(wf.toLowerCase()) ||
            (base.length >= 5 && lastUserText.includes(base)))
        ) {
          matchedPaths.push(wf);
        }
      }

      const fileContexts: Array<{ path: string; content: string }> = [];
      for (const relPath of matchedPaths.slice(0, 3)) {
        const content = await readSafeWorkspaceFile(relPath);
        if (content) {
          fileContexts.push({ path: relPath, content });
        }
      }

      if (fileContexts.length > 0 && !clientDisconnected && !res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            type: 'inspected_files',
            files: fileContexts.map((f) => f.path),
          })}\n\n`
        );
      }

      const systemInstruction = buildAntigravitySystemInstruction(
        mode,
        workspaceFiles,
        fileContexts
      );

      let emittedAnyChunk = false;
      let agyOutputChars = 0;
      let agyReportedTokens = 0;
      const agyInputChars =
        systemInstruction.length +
        sanitizedMessages.reduce((acc, m) => acc + m.parts[0].text.length, 0);

      const runStream = async (
        modelName: string,
        useLowThinking: boolean,
        firstChunkTimeoutMs: number
      ) => {
        const attemptAbort = new AbortController();
        const forwardAbort = () => attemptAbort.abort();
        if (clientAbort.signal.aborted) {
          attemptAbort.abort();
        } else {
          clientAbort.signal.addEventListener('abort', forwardAbort);
        }

        let receivedFirstEvent = false;
        const firstChunkTimer = setTimeout(() => {
          if (!receivedFirstEvent) {
            attemptAbort.abort();
          }
        }, firstChunkTimeoutMs);

        try {
          const stream = await geminiClient.models.generateContentStream({
            model: modelName,
            contents: sanitizedMessages,
            config: useLowThinking
              ? {
                  systemInstruction,
                  abortSignal: attemptAbort.signal,
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                }
              : {
                  systemInstruction,
                  abortSignal: attemptAbort.signal,
                },
          });

          for await (const chunk of stream) {
            if (!receivedFirstEvent) {
              receivedFirstEvent = true;
              clearTimeout(firstChunkTimer);
            }
            if (clientDisconnected || res.writableEnded) {
              break;
            }
            const usageTotal = chunk.usageMetadata?.totalTokenCount;
            if (typeof usageTotal === 'number' && usageTotal > agyReportedTokens) {
              agyReportedTokens = usageTotal;
            }
            const text = chunk.text ?? '';
            if (text) {
              emittedAnyChunk = true;
              agyOutputChars += text.length;
              res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
            }
          }
        } finally {
          clearTimeout(firstChunkTimer);
          clientAbort.signal.removeEventListener('abort', forwardAbort);
        }
      };

      try {
        await runStream(PRIMARY_MODEL, false, 20000);
      } catch (primaryErr) {
        if (clientDisconnected) return;
        const primaryClassified = classifyGeminiError(primaryErr);
        if (
          emittedAnyChunk ||
          primaryClassified.status === 401 ||
          primaryClassified.status === 403
        ) {
          throw primaryErr;
        }
        await runStream(FALLBACK_MODEL, true, 30000);
      }

      const usedTokens =
        agyReportedTokens > 0
          ? agyReportedTokens
          : estimateFallbackTokens(agyInputChars, agyOutputChars);
      recordTokenUsage(usedTokens);

      if (!clientDisconnected && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'usage', tokensUsed: usedTokens })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    } catch (err) {
      if (clientDisconnected) return;
      const classified = classifyGeminiError(err);
      recordCharacterError('antigravity', classified.code, classified.message);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: classified.message })}\n\n`);
      }
    } finally {
      endCharacterTask('antigravity');
      clearInterval(keepAliveTimer);
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  app.get('/api/youtube/oembed', async (req, res) => {
    const rawId = typeof req.query.videoId === 'string' ? req.query.videoId.trim() : '';
    if (!/^[a-zA-Z0-9_-]{11}$/.test(rawId)) {
      res.status(400).json({ error: 'Invalid YouTube video ID' });
      return;
    }

    try {
      const targetUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${rawId}`
      )}&format=json`;
      const upstream = await fetch(targetUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (!upstream.ok) {
        res.status(404).json({ error: 'Video metadata unavailable' });
        return;
      }
      const data = (await upstream.json()) as {
        title?: string;
        author_name?: string;
      };
      res.json({
        title: typeof data.title === 'string' ? data.title : `YouTube Video (${rawId})`,
        channel: typeof data.author_name === 'string' ? data.author_name : 'YouTube',
      });
    } catch {
      res.status(502).json({ error: 'Failed to fetch YouTube metadata' });
    }
  });

  app.post('/api/assistant/chat', async (req, res) => {
    const body = (req.body ?? {}) as ChatRequestBody;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const mode: WorkMode =
      body.mode === 'brainstorm' || body.mode === 'draft' ? body.mode : 'qa';
    const timeOfDay: TimeOfDay =
      body.timeOfDay === 'morning' || body.timeOfDay === 'evening'
        ? body.timeOfDay
        : 'afternoon';
    const localDate =
      typeof body.localDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.localDate)
        ? body.localDate
        : new Date().toISOString().slice(0, 10);

    const filtered = rawMessages
      .filter(
        (m): m is IncomingMessage =>
          Boolean(m) &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-20);

    // Ensure valid alternating user/model turns for Gemini multi-turn chat
    const sanitizedMessages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const m of filtered) {
      const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
      const text = m.content.trim().slice(0, 6000);
      const prev = sanitizedMessages[sanitizedMessages.length - 1];
      if (prev && prev.role === role) {
        prev.parts[0].text = `${prev.parts[0].text}\n\n${text}`.slice(0, 8000);
      } else {
        sanitizedMessages.push({ role, parts: [{ text }] });
      }
    }

    if (
      sanitizedMessages.length === 0 ||
      sanitizedMessages[sanitizedMessages.length - 1].role !== 'user'
    ) {
      res.status(400).json({ error: 'กรุณาพิมพ์ข้อความก่อนส่งให้ผู้ช่วย AI ครับ' });
      return;
    }

    let geminiClient: GoogleGenAI;
    try {
      geminiClient = createGeminiClient();
    } catch (err) {
      const classified = classifyGeminiError(err);
      recordCharacterError('mina', classified.code, classified.message);
      res.status(classified.status).json({ error: classified.message });
      return;
    }

    const minaTaskLabel = summarizeTaskLabel(
      sanitizedMessages[sanitizedMessages.length - 1].parts[0].text,
      mode === 'brainstorm'
        ? 'ระดมไอเดียงาน'
        : mode === 'draft'
          ? 'ร่างเอกสารงาน'
          : 'ตอบคำถามช่วยงาน'
    );
    beginCharacterTask('mina', minaTaskLabel);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    let clientDisconnected = false;
    const clientAbort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        clientAbort.abort();
      }
    });

    // Keep SSE connection alive across proxies while Gemini prepares first token
    const keepAliveTimer = setInterval(() => {
      if (!clientDisconnected && !res.writableEnded) {
        res.write(': keepalive\n\n');
      }
    }, 8000);

    try {
      const systemInstruction = buildSystemInstruction(
        mode,
        timeOfDay,
        localDate,
        body.tasksContext
      );
      let emittedAnyChunk = false;
      let emittedText = false;
      let emittedTaskProposal = false;
      let minaOutputChars = 0;
      let minaReportedTokens = 0;
      const minaInputChars =
        systemInstruction.length +
        sanitizedMessages.reduce((acc, m) => acc + m.parts[0].text.length, 0);

      const runStream = async (
        modelName: string,
        useLowThinking: boolean,
        firstChunkTimeoutMs: number
      ) => {
        const attemptAbort = new AbortController();
        const forwardAbort = () => attemptAbort.abort();
        if (clientAbort.signal.aborted) {
          attemptAbort.abort();
        } else {
          clientAbort.signal.addEventListener('abort', forwardAbort);
        }

        // Only guard time-to-first-chunk so active long responses are never aborted mid-stream
        let receivedFirstEvent = false;
        const firstChunkTimer = setTimeout(() => {
          if (!receivedFirstEvent) {
            attemptAbort.abort();
          }
        }, firstChunkTimeoutMs);

        try {
          const tools = [{ functionDeclarations: [PROPOSE_GOOGLE_TASK_TOOL] }];
          const stream = await geminiClient.models.generateContentStream({
            model: modelName,
            contents: sanitizedMessages,
            config: useLowThinking
              ? {
                  systemInstruction,
                  tools,
                  abortSignal: attemptAbort.signal,
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                }
              : {
                  systemInstruction,
                  tools,
                  abortSignal: attemptAbort.signal,
                },
          });

          for await (const chunk of stream) {
            if (!receivedFirstEvent) {
              receivedFirstEvent = true;
              clearTimeout(firstChunkTimer);
            }
            if (clientDisconnected || res.writableEnded) {
              break;
            }

            const usageTotal = chunk.usageMetadata?.totalTokenCount;
            if (typeof usageTotal === 'number' && usageTotal > minaReportedTokens) {
              minaReportedTokens = usageTotal;
            }

            const fnCalls = chunk.functionCalls;
            if (fnCalls && fnCalls.length > 0) {
              for (const fnCall of fnCalls) {
                if (fnCall.name === 'propose_google_task' && !emittedTaskProposal) {
                  const args = (fnCall.args ?? {}) as Record<string, unknown>;
                  const rawTitle =
                    typeof args.title === 'string' ? args.title.trim().slice(0, 160) : '';
                  if (rawTitle) {
                    const rawNotes =
                      typeof args.notes === 'string' && args.notes.trim()
                        ? args.notes.trim().slice(0, 1000)
                        : undefined;
                    const rawDue =
                      typeof args.dueDate === 'string' &&
                      /^\d{4}-\d{2}-\d{2}$/.test(args.dueDate.trim())
                        ? args.dueDate.trim()
                        : undefined;

                    emittedTaskProposal = true;
                    emittedAnyChunk = true;
                    res.write(
                      `data: ${JSON.stringify({
                        type: 'task_proposal',
                        task: {
                          title: rawTitle,
                          ...(rawNotes ? { notes: rawNotes } : {}),
                          ...(rawDue ? { dueDate: rawDue } : {}),
                        },
                      })}\n\n`
                    );
                  }
                }
              }
            }

            // Extract text cleanly without triggering non-text part warnings when functionCall parts are present
            let text = '';
            if (fnCalls && fnCalls.length > 0) {
              const parts = chunk.candidates?.[0]?.content?.parts ?? [];
              text = parts
                .filter(
                  (p): p is { text: string } =>
                    typeof p.text === 'string' && !(p as { thought?: boolean }).thought
                )
                .map((p) => p.text)
                .join('');
            } else {
              text = chunk.text ?? '';
            }

            if (text) {
              emittedText = true;
              emittedAnyChunk = true;
              minaOutputChars += text.length;
              res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
            }
          }
        } finally {
          clearTimeout(firstChunkTimer);
          clientAbort.signal.removeEventListener('abort', forwardAbort);
        }
      };

      try {
        await runStream(PRIMARY_MODEL, false, 20000);
      } catch (primaryErr) {
        if (clientDisconnected) {
          return;
        }
        const primaryClassified = classifyGeminiError(primaryErr);

        // Do not fallback on invalid key / permission errors or if chunks were already sent
        if (
          emittedAnyChunk ||
          primaryClassified.status === 401 ||
          primaryClassified.status === 403
        ) {
          throw primaryErr;
        }

        // Recoverable stall/error before any chunk was sent: transparently switch to fallback model
        console.log(
          `[Cozy Desk] Primary model (${PRIMARY_MODEL}) unavailable (${primaryClassified.code}); switching to ${FALLBACK_MODEL}`
        );
        await runStream(FALLBACK_MODEL, true, 30000);
      }

      if (emittedTaskProposal && !emittedText && !clientDisconnected && !res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            type: 'chunk',
            text: 'รับทราบครับ! มีน่าเตรียมรายการงานสำหรับ **Google Tasks** ให้เรียบร้อยแล้ว ตรวจสอบและกดยืนยันด้านล่างได้เลย เดี๋ยวมีน่าเดินไปปักหมุดบนกระดานโน้ตให้ทันทีครับ',
          })}\n\n`
        );
      }

      const usedTokens =
        minaReportedTokens > 0
          ? minaReportedTokens
          : estimateFallbackTokens(minaInputChars, minaOutputChars);
      recordTokenUsage(usedTokens);

      if (!clientDisconnected && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'usage', tokensUsed: usedTokens })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    } catch (err) {
      if (clientDisconnected) {
        return;
      }
      const classified = classifyGeminiError(err);
      recordCharacterError('mina', classified.code, classified.message);
      console.error('Gemini assistant streaming error:', classified.code, err);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: classified.message })}\n\n`);
      }
    } finally {
      endCharacterTask('mina');
      clearInterval(keepAliveTimer);
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cozy Desk server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Cozy Desk server:', err);
  process.exit(1);
});
