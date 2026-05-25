import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

const SUPPORT_MESSAGE =
  "Welcome to Dubai Elite Investments L.L.C By Al Maktoum. This is your AI voice receptionist. I can help route inquiries about investment opportunities, strategic partnerships, and concierge introductions.";

const BRAND_NAME = "Dubai Elite Investments L.L.C By Al Maktoum";
const START_PROMPT =
  "Start your call with AI Voice Receptionist of Dubai Elite Investments L.L.C By Al Maktoum";

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function normalizeTranscriptRole(role) {
  if (role === "assistant" || role === "bot") {
    return "assistant";
  }

  return "user";
}

function useVapiCall() {
  const vapiRef = useRef(null);
  const greetingSentRef = useRef(false);
  const timerStartedRef = useRef(false);
  const [callStatus, setCallStatus] = useState("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [partialTranscript, setPartialTranscript] = useState(null);
  const [error, setError] = useState("");

  const isLive = callStatus === "live";
  const isConnecting = callStatus === "connecting";
  const isCalling = isConnecting || isLive;

  useEffect(() => {
    if (!timerStarted || !isCalling) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isCalling, timerStarted]);

  useEffect(() => {
    return () => {
      vapiRef.current?.removeAllListeners();
      vapiRef.current?.stop();
      vapiRef.current = null;
    };
  }, []);

  async function startCall() {
    const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;

    setError("");

    // Vite only exposes variables prefixed with VITE_ to the browser.
    // Use a Vapi public key here. Never expose VAPI_PRIVATE_KEY in frontend code.
    if (!publicKey || publicKey === "VAPI_PUBLIC_KEY_HERE") {
      setError("Missing VITE_VAPI_PUBLIC_KEY in your .env file.");
      return;
    }

    if (!assistantId || assistantId === "VAPI_ASSISTANT_ID_HERE") {
      setError("Missing VITE_VAPI_ASSISTANT_ID in your .env file.");
      return;
    }

    try {
      vapiRef.current?.removeAllListeners();
      vapiRef.current?.stop();

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;
      greetingSentRef.current = false;
      timerStartedRef.current = false;

      setCallStatus("connecting");
      setElapsedSeconds(0);
      setTimerStarted(false);
      setTranscripts([]);
      setPartialTranscript(null);
      setIsSpeaking(false);

      vapi.on("call-start", () => {
        setCallStatus("live");

        if (!greetingSentRef.current) {
          greetingSentRef.current = true;

          // Live Call Control can ask the assistant to say this immediately.
          // For the most reliable production greeting, also set this as the
          // assistant's first message/greeting inside the Vapi dashboard.
          window.setTimeout(() => {
            vapi.say(`${SUPPORT_MESSAGE}.`, false);
          }, 350);
        }
      });

      vapi.on("call-end", () => {
        setCallStatus("ended");
        setIsSpeaking(false);
        setPartialTranscript(null);
        timerStartedRef.current = false;
      });

      vapi.on("speech-start", () => {
        setIsSpeaking(true);

        if (!timerStartedRef.current) {
          timerStartedRef.current = true;
          setElapsedSeconds(0);
          setTimerStarted(true);
        }
      });

      vapi.on("speech-end", () => {
        setIsSpeaking(false);
      });

      vapi.on("message", (message) => {
        if (message?.type !== "transcript") {
          return;
        }

        const text = message.transcript?.trim();

        if (!text) {
          return;
        }

        const role = normalizeTranscriptRole(message.role);
        const transcript = {
          id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role,
          text,
        };

        if (message.transcriptType === "final") {
          setTranscripts((currentTranscripts) => [
            ...currentTranscripts,
            transcript,
          ]);
          setPartialTranscript(null);
          return;
        }

        setPartialTranscript(transcript);
      });

      vapi.on("error", (vapiError) => {
        console.error("Vapi error:", vapiError);
        setError(
          "Vapi call failed. Check credentials, assistant access, and microphone permissions.",
        );
        setCallStatus("ended");
        setIsSpeaking(false);
      });

      await vapi.start(assistantId, {
        clientMessages: ["transcript"],
      });
    } catch (vapiError) {
      console.error("Vapi start error:", vapiError);
      setError(
        "Could not start the Vapi call. Allow microphone access and verify your .env values.",
      );
      setCallStatus("ended");
      setIsSpeaking(false);
    }
  }

  function endCall() {
    vapiRef.current?.stop();
    setCallStatus("ended");
    setIsSpeaking(false);
    setPartialTranscript(null);
    timerStartedRef.current = false;
  }

  return {
    callStatus,
    isCalling,
    isConnecting,
    isLive,
    isSpeaking,
    elapsedSeconds,
    timerStarted,
    transcripts,
    partialTranscript,
    error,
    startCall,
    endCall,
  };
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="m6.75 6.75 10.5 10.5m0-10.5-10.5 10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M12 14.25a3.25 3.25 0 0 0 3.25-3.25V6.75a3.25 3.25 0 0 0-6.5 0V11A3.25 3.25 0 0 0 12 14.25Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M18 10.75a6 6 0 0 1-12 0M12 16.75V21m-3 0h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function DubaiEliteBackdrop() {
  const shouldReduceMotion = useReducedMotion();
  const stars = useMemo(
    () =>
      Array.from({ length: 44 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        top: `${(index * 53) % 100}%`,
        size: index % 7 === 0 ? 2 : 1,
        opacity: 0.25 + ((index * 13) % 45) / 100,
        duration: 3 + (index % 6),
      })),
    [],
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#050403]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(202,138,4,0.22),transparent_27%),radial-gradient(circle_at_9%_68%,rgba(180,118,25,0.36),transparent_25%),radial-gradient(circle_at_91%_70%,rgba(16,86,112,0.36),transparent_24%),linear-gradient(180deg,#050403_0%,#11100d_48%,#040403_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.04),transparent_28%,rgba(202,138,4,0.08)_48%,transparent_68%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[40%] bg-[radial-gradient(ellipse_at_bottom_left,rgba(214,161,54,0.68),transparent_31%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.42),transparent_32%)] opacity-90" />
      <div className="absolute -bottom-[25vw] left-[-14vw] h-[38vw] w-[46vw] rounded-[50%] border-t border-amber-100/50 bg-[radial-gradient(ellipse_at_top,rgba(222,184,92,0.72),rgba(150,92,26,0.42)_42%,rgba(2,8,31,0)_72%)] blur-[0.5px]" />
      <div className="absolute -bottom-[25vw] right-[-14vw] h-[38vw] w-[46vw] rounded-[50%] border-t border-cyan-100/40 bg-[radial-gradient(ellipse_at_top,rgba(23,190,214,0.52),rgba(21,89,114,0.48)_42%,rgba(2,8,31,0)_72%)] blur-[0.5px]" />
      {stars.map((star) => (
        <motion.span
          key={star.id}
          className="absolute rounded-full bg-amber-100"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : { opacity: [star.opacity, 0.9, star.opacity] }
          }
          transition={{
            duration: star.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function VoiceOrb({ active }) {
  const shouldReduceMotion = useReducedMotion();
  const listeningShape =
    "44% 56% 53% 47% / 47% 48% 52% 53%";
  const speakingShapes = [
    "44% 56% 53% 47% / 47% 48% 52% 53%",
    "50% 50% 45% 55% / 42% 56% 44% 58%",
    "56% 44% 51% 49% / 53% 43% 57% 47%",
    "47% 53% 58% 42% / 55% 48% 52% 45%",
    "44% 56% 53% 47% / 47% 48% 52% 53%",
  ];

  return (
    <motion.div
      className="relative h-40 w-40 sm:h-52 sm:w-52"
      role="img"
      aria-label={active ? "Animated AI voice signal active" : "AI voice signal idle"}
      animate={
        shouldReduceMotion
          ? undefined
          : {
              y: active ? [-4, 4, -4] : [0, -3, 0],
              scale: active ? [1, 1.035, 1] : [1, 1.015, 1],
            }
      }
      transition={{ duration: active ? 2.3 : 4.5, repeat: Infinity }}
    >
      <motion.div
        className="absolute -inset-5 rounded-full bg-[conic-gradient(from_120deg,rgba(168,85,247,0.34),rgba(238,190,103,0.32),rgba(6,182,212,0.36),rgba(168,85,247,0.34))] blur-2xl"
        animate={{ opacity: active ? [0.42, 0.86, 0.42] : [0.18, 0.38, 0.18] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-0 overflow-hidden border border-violet-100/75 bg-[#171229] shadow-[0_22px_80px_rgba(72,30,150,0.52),inset_12px_12px_34px_rgba(0,0,0,0.72)]"
        style={{ borderRadius: listeningShape }}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                borderRadius: active ? speakingShapes : [listeningShape],
                rotate: active ? [0, 4, -5, 3, 0] : [0, 2, 0],
                filter: active
                  ? [
                      "saturate(1.05) brightness(1)",
                      "saturate(1.38) brightness(1.2)",
                      "saturate(1.05) brightness(1)",
                    ]
                  : [
                      "saturate(0.92) brightness(0.95)",
                      "saturate(1.06) brightness(1.05)",
                      "saturate(0.92) brightness(0.95)",
                    ],
              }
        }
        transition={{ duration: active ? 1.35 : 5.5, repeat: Infinity }}
      >
        <motion.div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,244,214,0.72) 0.8px, transparent 1.25px)",
            backgroundSize: "6px 6px",
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  backgroundPosition: active
                    ? ["0px 0px", "14px 8px", "0px 0px"]
                    : ["0px 0px", "5px 4px", "0px 0px"],
                }
          }
          transition={{ duration: active ? 1.8 : 6, repeat: Infinity }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_30%,rgba(133,120,255,0.58),transparent_32%),radial-gradient(circle_at_72%_68%,rgba(236,72,153,0.52),transparent_35%),radial-gradient(circle_at_55%_48%,rgba(6,182,212,0.24),transparent_38%)]" />
        <motion.div
          className="absolute -inset-1 border border-violet-100/70"
          style={{ borderRadius: listeningShape }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  borderRadius: active ? speakingShapes : [listeningShape],
                  scale: active ? [1, 1.08, 0.98, 1.05, 1] : [1, 1.02, 1],
                  opacity: active ? [0.55, 1, 0.62] : [0.48, 0.72, 0.48],
                }
          }
          transition={{ duration: active ? 1.2 : 3.6, repeat: Infinity }}
        />
      </motion.div>
      <motion.div
        className="absolute inset-2 border border-fuchsia-200/35"
        style={{ borderRadius: listeningShape }}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                borderRadius: active ? speakingShapes : [listeningShape],
                scale: active ? [1.04, 1.16, 1.02] : [1.02, 1.08, 1.02],
                opacity: active ? [0.36, 0.84, 0.36] : [0.22, 0.44, 0.22],
              }
        }
        transition={{ duration: active ? 1.1 : 4.2, repeat: Infinity }}
      />
    </motion.div>
  );
}

function TranscriptStrip({ transcripts, partialTranscript }) {
  const latestTranscript = partialTranscript || transcripts.at(-1);

  return (
    <AnimatePresence mode="wait">
      {latestTranscript ? (
        <motion.div
          key={latestTranscript.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm leading-6 text-blue-100/80"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">
            {latestTranscript.role === "assistant" ? "Agent" : "You"}
          </span>
          <span className="ml-3">{latestTranscript.text}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PromptCopy({ isLive, promptText }) {
  if (isLive) {
    return (
      <p className="mx-auto max-w-[min(50rem,calc(100vw-4.5rem))] text-[clamp(1.05rem,4.9vw,2.05rem)] font-bold leading-tight tracking-[-0.035em] text-white [overflow-wrap:anywhere] [text-wrap:balance] sm:max-w-[min(50rem,calc(100vw-3rem))] sm:text-[clamp(1.55rem,2.65vw,2.05rem)]">
        {promptText}
      </p>
    );
  }

  return (
    <p
      aria-label={START_PROMPT}
      className="mx-auto max-w-[19rem] text-[1.13rem] font-bold leading-[1.25] tracking-[-0.025em] text-white sm:max-w-3xl sm:text-[clamp(1.55rem,2.65vw,2.05rem)] sm:leading-tight"
    >
      <span>Start your call with AI Voice Receptionist of</span>
      <span className="block">Dubai Elite Investments L.L.C</span>
      <span className="block">By Al Maktoum</span>
    </p>
  );
}

function App() {
  const {
    callStatus,
    isCalling,
    isConnecting,
    isLive,
    isSpeaking,
    elapsedSeconds,
    timerStarted,
    transcripts,
    partialTranscript,
    error,
    startCall,
    endCall,
  } = useVapiCall();

  const statusLabel = {
    idle: "Ready",
    connecting: "Connecting",
    live: isSpeaking ? "Speaking" : "Listening",
    ended: "Ended",
  }[callStatus];

  const promptText = isConnecting
    ? "Connecting to your Vapi agent..."
    : isLive
      ? "I'm listening, Armando..."
      : callStatus === "ended"
        ? "Call ended. Start again?"
        : "I'm listening, Armando...";

  return (
    <main className="min-h-screen overflow-x-hidden overflow-y-auto bg-[#050403] text-white sm:h-screen sm:overflow-hidden">
      <section
        className="relative min-h-screen overflow-hidden border-[4px] border-[#b8892e] px-4 py-5 sm:h-screen sm:px-8 sm:py-6 lg:px-12"
        aria-labelledby="hero-title"
      >
        <DubaiEliteBackdrop />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full min-w-0 max-w-[1600px] flex-col sm:h-full sm:min-h-0">
          <motion.header
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="min-w-0 shrink-0 pb-5 pt-5 text-center sm:pb-7 sm:pt-8"
          >
            <p className="mb-3 font-mono text-[0.68rem] font-bold uppercase tracking-[0.36em] text-amber-100/65">
              AI Voice Receptionist
            </p>
            <h1
              id="hero-title"
              className="mx-auto max-w-full font-display text-[clamp(1.95rem,8.1vw,4.8rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-[#fff7e6] drop-shadow-[0_0_34px_rgba(202,138,4,0.2)] lg:max-w-7xl lg:text-[clamp(3.1rem,6.7vw,6.5rem)]"
            >
              Voice AI of
              <span className="block bg-gradient-to-r from-[#fff2c8] via-[#d3a54c] to-[#f7e7b1] bg-clip-text text-transparent">
                Dubai Elite
                <span className="block sm:inline"> Investments</span>
              </span>
              <span className="block text-[0.32em] font-sans font-semibold uppercase tracking-[0.18em] text-amber-100/72">
                L.L.C By Al Maktoum
              </span>
            </h1>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="relative mx-auto flex min-h-0 w-[calc(100%-1rem)] min-w-0 max-w-[1600px] flex-1 flex-col overflow-hidden rounded-t-[1.7rem] border-2 border-amber-100/76 bg-[#0d0b08]/88 shadow-[0_0_0_1px_rgba(202,138,4,0.25),0_36px_140px_rgba(0,0,0,0.78)] backdrop-blur-xl sm:w-full"
          >
            <div className="flex h-16 shrink-0 items-center rounded-t-[1.45rem] border-b border-amber-100/12 bg-[#070604]/92 px-7 text-white/90 sm:h-[5.7rem] sm:px-12">
              <div className="min-w-0 text-left">
                <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.26em] text-amber-100/70">
                  Europe - GCC Bridge
                </p>
                <p className="mt-1 hidden text-sm font-medium text-amber-50/85 sm:block">
                  {BRAND_NAME}
                </p>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-8 text-center sm:px-10 sm:py-10 lg:py-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(163,98,252,0.16),transparent_28%),radial-gradient(circle_at_70%_62%,rgba(202,138,4,0.12),transparent_34%),linear-gradient(180deg,rgba(22,18,12,0.76),rgba(5,5,4,0.95))]" />

              <div className="relative z-10 flex w-full flex-col items-center">
                <VoiceOrb active={isCalling || isSpeaking} />

                <div className="mt-9 min-h-[5.25rem] text-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={promptText}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.28 }}
                    >
                      <PromptCopy isLive={isLive} promptText={promptText} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-6 flex items-center gap-3 rounded-full border border-amber-100/30 bg-[#15110b]/82 p-3 shadow-[inset_0_0_32px_rgba(255,255,255,0.05),0_16px_60px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={endCall}
                    disabled={!isCalling}
                    className="grid h-[4.35rem] w-[4.35rem] cursor-pointer place-items-center rounded-full bg-[#342b1b] text-amber-50 shadow-[0_12px_34px_rgba(0,0,0,0.22)] transition duration-200 hover:bg-[#493a21] focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="End Vapi call"
                  >
                    <XIcon />
                  </button>

                  <button
                    type="button"
                    onClick={isCalling ? undefined : startCall}
                    disabled={isConnecting}
                    className={[
                      "grid h-[4.35rem] w-[4.35rem] cursor-pointer place-items-center rounded-full text-white shadow-[0_12px_34px_rgba(0,0,0,0.22)] transition duration-200 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-wait",
                      isLive
                        ? "bg-[#c08a2d] hover:bg-[#e0ad4a]"
                        : "bg-[#4b3c22] hover:bg-[#66502b]",
                    ].join(" ")}
                    aria-label={isCalling ? "Vapi call active" : "Start Vapi call"}
                  >
                    <MicIcon />
                  </button>
                </div>

                <div
                  className="mt-5 flex items-center gap-3 font-mono text-sm font-semibold uppercase tracking-[0.22em] text-amber-100/82"
                  aria-live="polite"
                >
                  <span>{statusLabel}</span>
                  <span className="h-1 w-1 rounded-full bg-amber-200/70" />
                  <span>{timerStarted ? formatTimer(elapsedSeconds) : "0:00"}</span>
                </div>

                <TranscriptStrip
                  transcripts={transcripts}
                  partialTranscript={partialTranscript}
                />

                {error ? (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 max-w-xl rounded-2xl border border-red-200/20 bg-red-500/15 px-5 py-3 text-sm leading-6 text-red-50"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

export default App;
