import { useEffect, useMemo, useRef, useState } from "react";
import GhButton from "@/components/shared/GhButton";
import GhCard from "@/components/shared/GhCard";
import { CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { useQuizAttempts } from "@/hooks/useQuizAttempts";
import { toast } from "@/hooks/use-toast";

/**
 * Quiz v2:
 *  - Multi-type: radio (single correct index), checkbox (correct indices[]), bool, free
 *  - Shuffle, time limit, passing score, max attempts
 *  - Persisted via quiz_attempts table
 */
export type QuizQuestionType = "radio" | "checkbox" | "bool" | "free";

export interface QuizQuestion {
  type?: QuizQuestionType;
  question: string;
  options?: string[];
  /** Single correct index (radio / bool) */
  correct?: number;
  /** Multi correct indices (checkbox) */
  correctIndices?: number[];
  /** Free text expected answer (case-insensitive trim) */
  expected?: string;
}

interface QuizSettings {
  passingScore?: number;       // default 70
  maxAttempts?: number;        // default 3
  timeLimitMinutes?: number;   // optional
  shuffleQuestions?: boolean;  // default false
}

interface QuizPlayerProps {
  questions: QuizQuestion[];
  moduleName: string;
  moduleId?: string;                     // when set, attempts are persisted
  settings?: QuizSettings;
  onComplete?: (score: number, total: number, passed: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isCorrect(q: QuizQuestion, answer: unknown): boolean {
  const type: QuizQuestionType = q.type ?? "radio";
  if (type === "radio" || type === "bool") {
    return typeof answer === "number" && answer === q.correct;
  }
  if (type === "checkbox") {
    const sel = Array.isArray(answer) ? [...(answer as number[])].sort() : [];
    const exp = [...(q.correctIndices ?? [])].sort();
    return sel.length === exp.length && sel.every((v, i) => v === exp[i]);
  }
  if (type === "free") {
    const a = String(answer ?? "").trim().toLowerCase();
    const e = String(q.expected ?? "").trim().toLowerCase();
    return !!e && a === e;
  }
  return false;
}

export default function QuizPlayer({
  questions: rawQuestions,
  moduleName,
  moduleId,
  settings,
  onComplete,
}: QuizPlayerProps) {
  const passingScore = settings?.passingScore ?? 70;
  const maxAttempts = settings?.maxAttempts ?? 3;
  const timeLimitMin = settings?.timeLimitMinutes;
  const shouldShuffle = settings?.shuffleQuestions ?? false;

  const { attempts, submit, attemptCount, bestScore } = useQuizAttempts(moduleId);

  const questions = useMemo(
    () => (shouldShuffle ? shuffle(rawQuestions) : rawQuestions),
    [rawQuestions, shouldShuffle]
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [finished, setFinished] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    timeLimitMin ? timeLimitMin * 60 : null
  );
  const startedAt = useRef<number>(Date.now());

  // Timer
  useEffect(() => {
    if (secondsLeft === null || finished) return;
    if (secondsLeft <= 0) {
      handleFinish();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, finished]);

  if (!questions || questions.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-6">Aucune question disponible</div>;
  }

  const reachedAttemptLimit = moduleId ? attemptCount >= maxAttempts : false;
  const q = questions[currentIdx];
  const qType: QuizQuestionType = q.type ?? "radio";

  const setAnswer = (val: unknown) => setAnswers((a) => ({ ...a, [currentIdx]: val }));

  const computeScore = () => {
    let score = 0;
    const detail = questions.map((qu, i) => {
      const ok = isCorrect(qu, answers[i]);
      if (ok) score++;
      return { question: qu.question, answer: answers[i] ?? null, correct: ok };
    });
    return { score, detail };
  };

  async function handleFinish() {
    if (submitted) return;
    setSubmitted(true);
    const { score, detail } = computeScore();
    const total = questions.length;
    const pct = total > 0 ? (score / total) * 100 : 0;
    const passed = pct >= passingScore;
    const duration = Math.round((Date.now() - startedAt.current) / 1000);
    setFinished(true);

    if (moduleId) {
      try {
        await submit({
          module_id: moduleId,
          score,
          total_questions: total,
          passed,
          answers: detail,
          duration_seconds: duration,
        });
      } catch (e) {
        toast({
          title: "Tentative non sauvegardée",
          description: e instanceof Error ? e.message : "Erreur inconnue",
          variant: "destructive",
        });
      }
    }
    onComplete?.(score, total, passed);
  }

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      handleFinish();
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  // Block run if attempt limit reached
  if (reachedAttemptLimit && !finished) {
    return (
      <GhCard title={`Quiz — ${moduleName}`}>
        <div className="text-center py-6 space-y-3">
          <AlertTriangle size={36} className="mx-auto text-gh-amber" />
          <div className="text-sm font-semibold text-foreground">Nombre maximum de tentatives atteint</div>
          <div className="text-xs text-muted-foreground">
            {attemptCount}/{maxAttempts} tentatives — meilleur score : <span className="font-mono">{bestScore.toFixed(0)}%</span>
          </div>
        </div>
      </GhCard>
    );
  }

  // Finished screen
  if (finished) {
    const { score } = computeScore();
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= passingScore;
    return (
      <GhCard title={`Résultat — ${moduleName}`}>
        <div className="text-center py-6 space-y-3">
          <div className={`text-5xl font-mono font-bold ${passed ? "text-gh-green" : "text-gh-rose"}`}>{pct}%</div>
          <div className="text-sm text-foreground font-semibold">{score}/{questions.length} bonnes réponses</div>
          <div className={`text-sm ${passed ? "text-gh-green" : "text-gh-rose"}`}>
            {passed ? "Félicitations, quiz validé !" : `Score insuffisant (≥${passingScore}% requis)`}
          </div>
          {moduleId && (
            <div className="text-[11px] text-muted-foreground mt-2">
              Tentative {Math.min(attemptCount + 1, maxAttempts)}/{maxAttempts}
            </div>
          )}
        </div>
      </GhCard>
    );
  }

  const answer = answers[currentIdx];
  const canAdvance =
    qType === "free"
      ? typeof answer === "string" && answer.trim().length > 0
      : qType === "checkbox"
        ? Array.isArray(answer) && (answer as number[]).length > 0
        : typeof answer === "number";

  return (
    <GhCard title={`Quiz — ${moduleName}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Question {currentIdx + 1}/{questions.length}</span>
          <div className="flex items-center gap-3">
            {moduleId && (
              <span>Tentative {attemptCount + 1}/{maxAttempts}</span>
            )}
            {secondsLeft !== null && (
              <span className={`inline-flex items-center gap-1 font-mono ${secondsLeft < 30 ? "text-gh-rose" : ""}`}>
                <Clock size={11} />
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all rounded-full"
               style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="text-sm font-semibold text-foreground">{q.question}</p>

        {(qType === "radio" || qType === "bool") && (
          <div className="space-y-2">
            {(q.options ?? (qType === "bool" ? ["Vrai", "Faux"] : [])).map((opt, i) => {
              const selected = answer === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswer(i)}
                  className={`w-full text-start px-3 py-2.5 rounded-lg border text-sm text-foreground transition-colors ${
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {qType === "checkbox" && (
          <div className="space-y-2">
            {(q.options ?? []).map((opt, i) => {
              const sel = Array.isArray(answer) ? (answer as number[]) : [];
              const checked = sel.includes(i);
              return (
                <label
                  key={i}
                  className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-sm text-foreground cursor-pointer transition-colors ${
                    checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? [...sel, i] : sel.filter((x) => x !== i);
                      setAnswer(next);
                    }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        )}

        {qType === "free" && (
          <textarea
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Votre réponse…"
            rows={3}
            className="w-full bg-secondary border border-border rounded-lg p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {moduleId && bestScore > 0 && (
              <span className="inline-flex items-center gap-1">
                <RefreshCw size={11} /> Meilleur : {bestScore.toFixed(0)}%
              </span>
            )}
          </div>
          <GhButton onClick={handleNext} disabled={!canAdvance}>
            {currentIdx + 1 >= questions.length ? "Terminer" : "Question suivante"}
          </GhButton>
        </div>
      </div>
    </GhCard>
  );
}
