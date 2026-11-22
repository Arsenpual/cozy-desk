import type { GoogleTask } from '../types/game';
import { getLocalIsoDate } from './sleepLogsApi';

export type MinaTaskScheduleStatus = 'pending' | 'ready_for_review';

export interface ParsedMinaTaskMeta {
  assignedToMina: boolean;
  assignedViaTitle: boolean;
  matchedAlias: string | null;
  cleanTaskTitle: string;
  scheduledTime: string | null; // "HH:mm" in 24h local time
  status: MinaTaskScheduleStatus;
  completedAtLabel: string | null;
  userPromptNotes: string;
  minaSummary: string | null;
  minaSummaryHeader: string | null;
  scheduledDateIso: string | null; // "YYYY-MM-DD"
  scheduledAtMs: number | null;
  isImmediateRun: boolean;
  isDueNow: boolean;
}

const MINA_HEADER_REGEX =
  /^\[AI:Mina(?:\s*\|\s*เวลา\s*(\d{2}:\d{2}))?(?:\s*\|\s*สถานะ:\s*([^|\]]+))?\]\s*/i;

const MINA_SUMMARY_REGEX =
  /\n*--- สรุปผลงานจากมีน่า(?:\s*\(([^)]+)\))?\s*---\n([\s\S]*?)\n--- จบสรุปมีน่า ---\s*$/;

// Matches assistant name embedded in Task title:
// e.g. ร่างอีเมล์ "มีน่า", ร่างอีเมล์ "นีน่า", ร่างอีเมล์ (มีน่า), @มีน่า ร่างอีเมล์, #นีน่า, มีน่า: ร่างอีเมล์, "Mina"
const MINA_TITLE_PATTERNS: RegExp[] = [
  /["'“”‘’]\s*(มีน่า|นีน่า|mina|nina)\s*["'“”‘’]/i,
  /[(\[{]\s*(มีน่า|นีน่า|mina|nina)\s*[)\]}]/i,
  /(?:^|\s)[@#](มีน่า|นีน่า|mina|nina)(?=$|\s|[,.:;!?])/i,
  /^\s*(?:ให้)?(มีน่า|นีน่า|mina|nina)\s*[:：\-–—]\s*/i,
  /(?:^|\s)(?:ให้)?(มีน่า|นีน่า)\s*$/i,
];

// Optional inline time in title, e.g. "09:30", "14:00 น.", "09.30 น."
const INLINE_TIME_REGEX = /(?:เวลา\s*)?(\d{1,2})[:.](\d{2})(?:\s*น\.?)?(?=$|\s|[)\]}])/i;

export function detectMinaMentionInTitle(title: string): {
  matched: boolean;
  alias: string | null;
  cleanTitle: string;
  inlineTime: string | null;
} {
  const raw = title.trim();
  if (!raw) {
    return { matched: false, alias: null, cleanTitle: '', inlineTime: null };
  }

  let matchedAlias: string | null = null;
  let cleaned = raw;

  for (const pattern of MINA_TITLE_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      matchedAlias = match[1]?.trim() || 'มีน่า';
      cleaned = cleaned.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }

  let inlineTime: string | null = null;
  if (matchedAlias) {
    const timeMatch = cleaned.match(INLINE_TIME_REGEX);
    if (timeMatch) {
      const hh = Number(timeMatch[1]);
      const mm = Number(timeMatch[2]);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        inlineTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        cleaned = cleaned.replace(INLINE_TIME_REGEX, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  return {
    matched: Boolean(matchedAlias),
    alias: matchedAlias,
    cleanTitle: cleaned || raw,
    inlineTime,
  };
}

export function formatThaiShortDateTime(date = new Date()): string {
  const dateLabel = date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  });
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${dateLabel} ${hh}:${mm} น.`;
}

export function getDefaultScheduleTime(offsetMinutes = 5): string {
  const target = new Date(Date.now() + offsetMinutes * 60_000);
  const hh = String(target.getHours()).padStart(2, '0');
  const mm = String(target.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseLocalDateTimeMs(dateIso: string | null, timeHm: string | null): number | null {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = dateIso.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  let hours = 0;
  let minutes = 0;
  if (timeHm && /^\d{2}:\d{2}$/.test(timeHm)) {
    const [hStr, mStr] = timeHm.split(':');
    hours = Math.min(23, Math.max(0, Number(hStr)));
    minutes = Math.min(59, Math.max(0, Number(mStr)));
  }

  const dt = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function parseMinaTaskMeta(task: GoogleTask, nowMs = Date.now()): ParsedMinaTaskMeta {
  const rawNotes = task.notes ?? '';
  const headerMatch = rawNotes.match(MINA_HEADER_REGEX);
  const titleDetection = detectMinaMentionInTitle(task.title ?? '');
  const assignedToMina = Boolean(headerMatch) || titleDetection.matched;

  if (!assignedToMina) {
    return {
      assignedToMina: false,
      assignedViaTitle: false,
      matchedAlias: null,
      cleanTaskTitle: task.title,
      scheduledTime: null,
      status: 'pending',
      completedAtLabel: null,
      userPromptNotes: rawNotes.trim(),
      minaSummary: null,
      minaSummaryHeader: null,
      scheduledDateIso: task.due ? task.due.slice(0, 10) : null,
      scheduledAtMs: null,
      isImmediateRun: false,
      isDueNow: false,
    };
  }

  const scheduledTime = headerMatch?.[1]?.trim() || titleDetection.inlineTime || null;
  const rawStatus = headerMatch?.[2]?.trim() || '';
  let status: MinaTaskScheduleStatus = 'pending';
  let completedAtLabel: string | null = null;

  if (rawStatus.includes('รอตรวจงาน')) {
    status = 'ready_for_review';
    const parts = rawStatus.split('·');
    if (parts.length > 1) {
      completedAtLabel = parts.slice(1).join('·').trim() || null;
    }
  }

  const bodyAfterHeader = headerMatch ? rawNotes.slice(headerMatch[0].length) : rawNotes;
  const summaryMatch = bodyAfterHeader.match(MINA_SUMMARY_REGEX);

  let userPromptNotes = bodyAfterHeader.trim();
  let minaSummary: string | null = null;
  let minaSummaryHeader: string | null = null;

  if (summaryMatch) {
    minaSummaryHeader = summaryMatch[1]?.trim() || completedAtLabel || null;
    minaSummary = summaryMatch[2]?.trim() || null;
    userPromptNotes = bodyAfterHeader.slice(0, summaryMatch.index).trim();
    if (status === 'pending' && minaSummary) {
      status = 'ready_for_review';
    }
  }

  const explicitDueIso = task.due ? task.due.slice(0, 10) : null;
  const scheduledDateIso =
    explicitDueIso ?? (scheduledTime ? getLocalIsoDate(new Date(nowMs)) : null);

  const scheduledAtMs = parseLocalDateTimeMs(scheduledDateIso, scheduledTime);
  const isImmediateRun = !explicitDueIso && !scheduledTime;

  const isDueNow =
    task.status !== 'completed' &&
    status === 'pending' &&
    (isImmediateRun || (scheduledAtMs !== null && nowMs >= scheduledAtMs));

  return {
    assignedToMina: true,
    assignedViaTitle: titleDetection.matched,
    matchedAlias: titleDetection.alias,
    cleanTaskTitle: titleDetection.cleanTitle,
    scheduledTime,
    status,
    completedAtLabel: completedAtLabel || minaSummaryHeader,
    userPromptNotes,
    minaSummary,
    minaSummaryHeader,
    scheduledDateIso,
    scheduledAtMs,
    isImmediateRun,
    isDueNow,
  };
}

export function buildMinaTaskNotes(options: {
  assignedToMina: boolean;
  scheduledTime?: string | null;
  status?: MinaTaskScheduleStatus;
  completedAtLabel?: string | null;
  userPromptNotes?: string;
  minaSummary?: string | null;
  minaSummaryHeader?: string | null;
}): string {
  const cleanPrompt = (options.userPromptNotes ?? '').trim();

  if (!options.assignedToMina) {
    return cleanPrompt;
  }

  const timePart =
    options.scheduledTime && /^\d{2}:\d{2}$/.test(options.scheduledTime.trim())
      ? ` | เวลา ${options.scheduledTime.trim()}`
      : '';
  const effectiveStatus: MinaTaskScheduleStatus = options.status ?? 'pending';
  const statusPart =
    effectiveStatus === 'ready_for_review'
      ? ` | สถานะ: รอตรวจงาน${options.completedAtLabel ? ` · ${options.completedAtLabel}` : ''}`
      : ' | สถานะ: รอเวลา';

  const header = `[AI:Mina${timePart}${statusPart}]`;
  const sections: string[] = [header];

  if (cleanPrompt) {
    sections.push(cleanPrompt);
  }

  const cleanSummary = (options.minaSummary ?? '').trim();
  if (cleanSummary) {
    const label = options.minaSummaryHeader || options.completedAtLabel || formatThaiShortDateTime();
    sections.push(
      `\n--- สรุปผลงานจากมีน่า (${label}) ---\n${cleanSummary}\n--- จบสรุปมีน่า ---`
    );
  }

  return sections.join('\n').trim();
}

export function appendMinaSummaryToTaskNotes(
  task: GoogleTask,
  summaryText: string,
  completedDate = new Date()
): string {
  const parsed = parseMinaTaskMeta(task, completedDate.getTime());
  const stamp = formatThaiShortDateTime(completedDate);
  return buildMinaTaskNotes({
    assignedToMina: true,
    scheduledTime: parsed.scheduledTime,
    status: 'ready_for_review',
    completedAtLabel: stamp,
    userPromptNotes: parsed.userPromptNotes,
    minaSummary: summaryText.trim(),
    minaSummaryHeader: stamp,
  });
}
