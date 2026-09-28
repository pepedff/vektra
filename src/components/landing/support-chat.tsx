"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowDown, Headset, Send, X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { reply } from "@/lib/support/answer";
import { ARTICLES } from "@/lib/support/knowledge";
import { groundedPrompt, isModelEcho, phaseLabel, readModelStream, SYSTEM_PROMPT, type ModelPhase } from "@/lib/support/speak";

type Turn = { id: string; from: "user" | "bot"; text: string };

type ModelSession = {
  prompt: (input: string) => Promise<string>;
  promptStreaming?: (input: string) => AsyncIterable<string> | ReadableStream<string>;
  destroy?: () => void;
};

type LanguageModelApi = {
  availability: (options?: object) => Promise<string>;
  create: (options?: object) => Promise<ModelSession>;
};

const EASE = [0.16, 1, 0.3, 1] as const;

// Atalhos que aparecem antes da primeira pergunta
const TOPICS = [
  { label: "Licença", question: "Como ativo minha licença?" },
  { label: "PIX", question: "Paguei no PIX, e agora?" },
  { label: "Baixar extensão", question: "Onde baixo a extensão?" },
  { label: "Revenda", question: "Como funciona a revenda?" },
];

function languageModel(): LanguageModelApi | null {
  return (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel ?? null;
}

function isStream(source: AsyncIterable<string> | ReadableStream<string>): source is ReadableStream<string> {
  return typeof (source as ReadableStream<string>).getReader === "function";
}

async function asAsync(source: AsyncIterable<string> | ReadableStream<string>): Promise<AsyncIterable<string>> {
  if (!isStream(source)) return source;
  const reader = source.getReader();
  return {
    async *[Symbol.asyncIterator]() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield String(value);
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}

export type SupportChatHandle = { boot: () => void };

export const SupportChat = forwardRef<SupportChatHandle, { open: boolean; onClose: () => void }>(function SupportChat({ open, onClose }, ref) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<ModelPhase>({ kind: "boot" });
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [turns, setTurns] = useState<Turn[]>([
    { id: "welcome", from: "bot", text: "Oi! Pergunte sobre licença, PIX, download da extensão ou revenda." },
  ]);
  const sessionRef = useRef<ModelSession | null>(null);
  const bootRef = useRef(false);
  const idRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // true = acompanhar as novas mensagens
  const lastTopRef = useRef(0);
  const nextId = () => `t${++idRef.current}`;

  useEffect(() => {
    return () => {
      sessionRef.current?.destroy?.();
      sessionRef.current = null;
    };
  }, []);

  const boot = () => {
    if (bootRef.current) return;
    bootRef.current = true;
    const api = languageModel();
    if (!api) {
      setPhase({ kind: "base" });
      return;
    }
    setPhase({ kind: "boot" });
    void api
      .create({
        initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
        monitor(target: EventTarget) {
          target.addEventListener("downloadprogress", (event) => {
            const loaded = (event as Event & { loaded?: number }).loaded ?? 0;
            setPhase({ kind: "download", pct: Math.min(100, Math.round(loaded * 100)) });
          });
        },
      })
      .then(async (session) => {
        const probe = await session.prompt("Responda apenas: pronta");
        if (isModelEcho(probe)) {
          session.destroy?.();
          setPhase({ kind: "base" });
          return;
        }
        sessionRef.current = session;
        setPhase({ kind: "ready" });
      })
      .catch(() => setPhase({ kind: "base" }));
  };

  useImperativeHandle(ref, () => ({ boot }), []);

  // Ao abrir, volta a acompanhar o fim da conversa
  useEffect(() => {
    if (open) {
      stickRef.current = true;
      setAtBottom(true);
    }
  }, [open]);

  // Só rola sozinho se o usuário não subiu pra ler mensagens antigas
  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce || streamingId ? "auto" : "smooth" });
  }, [turns, thinking, open, reduce, streamingId]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (near) stickRef.current = true;
    else if (el.scrollTop < lastTopRef.current) stickRef.current = false; // só solta quando o usuário sobe
    lastTopRef.current = el.scrollTop;
    setAtBottom(near);
  };

  const jumpDown = () => {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  };

  const ask = async (preset?: string) => {
    const question = (preset ?? input).trim();
    if (!question || thinking) return;
    if (!preset) setInput("");
    stickRef.current = true;
    setTurns((prev) => [...prev, { id: nextId(), from: "user", text: question }]);
    const hit = reply(question, ARTICLES);
    const session = sessionRef.current;
    if (!hit.title || !session) {
      setTurns((prev) => [...prev, { id: nextId(), from: "bot", text: hit.text }]);
      return;
    }

    const id = nextId();
    const place = (turnId: string, text: string) => {
      setTurns((prev) => {
        if (prev.some((turn) => turn.id === turnId)) {
          return prev.map((turn) => (turn.id === turnId ? { ...turn, text } : turn));
        }
        return [...prev, { id: turnId, from: "bot", text }];
      });
    };
    setThinking(true);
    try {
      if (session.promptStreaming) {
        let started = false;
        const stream = await asAsync(session.promptStreaming(groundedPrompt(question, hit.text)));
        let echoed = false;
        const text = await readModelStream(stream, (partial) => {
          if (isModelEcho(partial)) {
            echoed = true;
            return;
          }
          if (!started) {
            started = true;
            setThinking(false);
            setStreamingId(id);
            setTurns((prev) => [...prev, { id, from: "bot", text: partial }]);
            return;
          }
          setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, text: partial } : turn)));
        });
        if (echoed || isModelEcho(text) || !text.trim()) place(id, hit.text);
      } else {
        const text = (await session.prompt(groundedPrompt(question, hit.text))).trim();
        place(id, isModelEcho(text) ? hit.text : text || hit.text);
      }
    } catch {
      place(id, hit.text);
    } finally {
      setThinking(false);
      setStreamingId(null);
    }
  };

  const panel: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.12 } },
      }
    : {
        hidden: { opacity: 0, y: 28, scale: 0.94, filter: "blur(8px)" },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: { type: "spring", stiffness: 380, damping: 30, mass: 0.8, staggerChildren: 0.07, delayChildren: 0.08 },
        },
        exit: { opacity: 0, y: 18, scale: 0.96, filter: "blur(6px)", transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
      };

  const section: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } };

  const chip: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 6, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 500, damping: 30 } } };

  const hasText = input.trim().length > 0;
  const showTopics = turns.length === 1 && !thinking;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="support-chat"
          variants={panel}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{ transformOrigin: "bottom right" }}
          className="fixed inset-x-3 bottom-3 z-50 flex h-[min(540px,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-[22px] border border-line bg-[#10151f] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.85)] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px]"
        >
          {/* Cabeçalho */}
          <motion.div variants={section} className="relative flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
              <Headset className="size-4" />
              <span className="absolute -right-0.5 -bottom-0.5 flex size-3 items-center justify-center rounded-full bg-[#10151f]">
                <span className="relative flex size-1.5">
                  {!reduce && phase.kind === "ready" && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-cyan"
                      animate={{ scale: [1, 2.6], opacity: [0.5, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  <motion.span
                    className="relative size-1.5 rounded-full bg-cyan"
                    animate={reduce || phase.kind === "ready" ? undefined : { opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                </span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-tight font-semibold">Suporte</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={phase.kind}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="truncate text-[11.5px] text-subtle"
                >
                  {phaseLabel(phase)}
                </motion.p>
              </AnimatePresence>
            </div>
            <motion.button
              type="button"
              aria-label="Fechar chat"
              onClick={onClose}
              whileHover={reduce ? undefined : { rotate: 90 }}
              whileTap={reduce ? undefined : { scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
            >
              <X className="size-4" />
            </motion.button>

            <AnimatePresence>
              {phase.kind === "download" && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.04]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { delay: 0.3 } }}
                >
                  <motion.div
                    className="h-full bg-cyan"
                    initial={{ width: 0 }}
                    animate={{ width: `${phase.pct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Mensagens: min-h-0 + flex-1 é o que permite a rolagem dentro do painel */}
          <motion.div variants={section} className="relative min-h-0 flex-1">
            <div
              ref={listRef}
              onScroll={onScroll}
              className="h-full space-y-2 overflow-y-auto overscroll-contain px-3 py-4 [mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-14px),transparent)]"
            >
              <AnimatePresence initial={false}>
                {turns.map((turn) => {
                  const mine = turn.from === "user";
                  return (
                    <motion.p
                      key={turn.id}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, x: mine ? 18 : -18, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                      transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 460, damping: 34, mass: 0.7 }}
                      style={{ transformOrigin: mine ? "bottom right" : "bottom left" }}
                      className={
                        mine
                          ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-blue/15 px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-fg"
                          : "w-fit max-w-[88%] rounded-2xl rounded-bl-md border border-line bg-white/[0.03] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-muted"
                      }
                    >
                      {turn.text}
                      {turn.id === streamingId && <Caret reduce={Boolean(reduce)} />}
                    </motion.p>
                  );
                })}
              </AnimatePresence>

              <AnimatePresence>
                {showTopics && (
                  <motion.div
                    key="topics"
                    className="flex flex-wrap gap-1.5 pt-1"
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } } }}
                  >
                    {TOPICS.map((topic) => (
                      <motion.button
                        key={topic.label}
                        type="button"
                        variants={chip}
                        whileHover={reduce ? undefined : { y: -2 }}
                        whileTap={reduce ? undefined : { scale: 0.94 }}
                        onClick={() => void ask(topic.question)}
                        className="rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-cyan/30 hover:bg-cyan/[0.06] hover:text-fg"
                      >
                        {topic.label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>{thinking && <Thinking key="thinking" reduce={Boolean(reduce)} />}</AnimatePresence>
            </div>

            {/* Botão pra voltar ao fim quando o usuário subiu */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <AnimatePresence>
                {!atBottom && (
                  <motion.button
                    type="button"
                    aria-label="Ir para a última mensagem"
                    onClick={jumpDown}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
                    whileTap={reduce ? undefined : { scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-line bg-[#0e131c] text-subtle shadow-[0_8px_20px_-8px_rgb(0_0_0/0.8)] transition-colors hover:text-fg"
                  >
                    <ArrowDown className="size-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Campo de mensagem */}
          <motion.form
            variants={section}
            className="shrink-0 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-[#0e131c] p-1.5 pl-3.5 transition-[border-color,box-shadow] duration-200 focus-within:border-blue/50 focus-within:ring-[3px] focus-within:ring-blue/10">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva sua dúvida"
                className="h-9 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle"
              />
              <motion.div
                animate={reduce ? undefined : { scale: hasText ? 1 : 0.94, opacity: hasText ? 1 : 0.55 }}
                whileTap={reduce || !hasText ? undefined : { scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
              >
                <Button
                  type="submit"
                  variant="action"
                  size="sm"
                  aria-label="Enviar"
                  disabled={!hasText || thinking}
                  icon={<Send className="size-3.5" />}
                >
                  Enviar
                </Button>
              </motion.div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

function Thinking({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: -14, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 460, damping: 32 }}
      style={{ transformOrigin: "bottom left" }}
      className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-white/[0.03] px-3.5 py-3"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-cyan"
          animate={reduce ? { opacity: 0.7 } : { y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
        />
      ))}
    </motion.div>
  );
}

function Caret({ reduce }: { reduce: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] rounded-full bg-cyan"
      animate={reduce ? { opacity: 0.8 } : { opacity: [1, 0.15, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
