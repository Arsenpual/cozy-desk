import 'dotenv/config';
import express from 'express';
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
type TimeOfDay = 'morning' | 'afternoon' | 'evening';

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages?: IncomingMessage[];
  mode?: WorkMode;
  timeOfDay?: TimeOfDay;
  localDate?: string;
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

function buildSystemInstruction(
  mode: WorkMode,
  timeOfDay: TimeOfDay,
  localDate: string
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
      'ความสามารถเสริม — เพิ่มงานลง Google Tasks บนกระดานโน้ตในห้องทำงาน:',
      '- หากผู้ใช้สั่งให้เพิ่มงาน สร้าง task จดสิ่งที่ต้องทำ เตือนความจำ หรือเพิ่มรายการลง Google Tasks (เช่น "ช่วยเพิ่มงาน...", "จด task ...", "เพิ่มลง Google Tasks...") ให้เรียกเครื่องมือ `propose_google_task` พร้อมสกัดชื่องาน รายละเอียดโน้ต และวันครบกำหนดรูปแบบ YYYY-MM-DD (คำนวณจากวันที่ปัจจุบันหากผู้ใช้พูดว่า วันนี้/พรุ่งนี้/มะรืน/วันศุกร์)',
      '- ตอบกลับสั้นๆ ว่าเตรียมรายการงานไว้ให้ตรวจสอบและกดยืนยันด้านล่างแล้ว และเมื่อกดยืนยันคุณจะเดินไปปักหมุดบนกระดานโน้ตให้ทันที',
      '- หากผู้ใช้เพียงถาม-ตอบ คิดไอเดีย หรือร่างเอกสารทั่วไปโดยไม่ได้สั่งเพิ่มงานลง Google Tasks ห้ามเรียกเครื่องมือ `propose_google_task`',
    ].join('\n'),
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
      res.status(classified.status).json({ error: classified.message });
      return;
    }

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
      const systemInstruction = buildSystemInstruction(mode, timeOfDay, localDate);
      let emittedAnyChunk = false;
      let emittedText = false;
      let emittedTaskProposal = false;

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

      if (!clientDisconnected && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    } catch (err) {
      if (clientDisconnected) {
        return;
      }
      const classified = classifyGeminiError(err);
      console.error('Gemini assistant streaming error:', classified.code, err);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: classified.message })}\n\n`);
      }
    } finally {
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
