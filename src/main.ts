import "./style.css";

type Role = "genuine" | "impostor";

type DriftMode = "steady" | "gradual";

type Outcome = "TP" | "TN" | "FP" | "FN";

interface Actor {
  id: string;
  label: string;
  role: Role;
  color: string;
  passwordSkill: number;
  dwellMean: number;
  dwellStd: number;
  flightMean: number;
  flightStd: number;
}

interface Attempt {
  idx: number;
  actor: string;
  actorColor: string;
  role: Role;
  outcome: Outcome;
  accepted: boolean;
  passwordCorrect: boolean;
  score: number;
  threshold: number;
  drift: number;
  error: 0 | 1;
  driftDetected: boolean;
  modelProbability: number;
}

interface ModelArtifact {
  model_name: string;
  trained_at_utc: string;
  dataset?: {
    name?: string;
    url?: string;
    subjects?: number;
    rows?: number;
    genuine_subject?: string;
    protocol?: string;
  };
  feature_order: string[];
  baseline_profile?: {
    dwell_ms: number;
    flight_ms: number;
  };
  scaler: {
    mean: number[];
    std: number[];
  };
  weights: number[];
  bias: number;
  threshold: number;
  metrics: {
    val_accuracy: number;
    val_far: number;
    val_frr: number;
    balanced_accuracy?: number;
  };
  training?: Record<string, unknown>;
}

interface PersonaProfile {
  name: string;
  password: string;
  speedCps: number;
  avgFlightMs: number;
  flightSeries: number[];
}

interface TypingCapture {
  startedAt: number | null;
  lastKeyAt: number | null;
  keyTimes: number[];
  flights: number[];
  elapsedMs: number;
  timerId: number | null;
  running: boolean;
}

interface LiveComparison {
  speedDelta: number;
  flightDelta: number;
  speedTol: number;
  flightTol: number;
  score: number;
  accepted: boolean;
  modelProbability: number;
  authFlights: number[];
}

interface GuideStep {
  title: string;
  hint: string;
  status: "pending" | "active" | "done";
}

const expectedPassword = "Jonga@2026";

const actors: Actor[] = [
  {
    id: "munashe",
    label: "Munashe (Genuine)",
    role: "genuine",
    color: "#2f855a",
    passwordSkill: 0.96,
    dwellMean: 104,
    dwellStd: 14,
    flightMean: 72,
    flightStd: 12,
  },
  {
    id: "labmate",
    label: "Labmate", 
    role: "impostor",
    color: "#b45309",
    passwordSkill: 0.38,
    dwellMean: 132,
    dwellStd: 26,
    flightMean: 94,
    flightStd: 22,
  },
  {
    id: "attacker_bot",
    label: "Attacker Script",
    role: "impostor",
    color: "#9f1239",
    passwordSkill: 0.62,
    dwellMean: 86,
    dwellStd: 10,
    flightMean: 55,
    flightStd: 8,
  },
  {
    id: "curious_friend",
    label: "Curious Friend",
    role: "impostor",
    color: "#1d4ed8",
    passwordSkill: 0.25,
    dwellMean: 148,
    dwellStd: 34,
    flightMean: 112,
    flightStd: 30,
  },
];

const actorOffsets = {
  munashe: { dwell: 0, flight: 0, dwellStd: 0, flightStd: 0 },
  labmate: { dwell: 26, flight: 160, dwellStd: 12, flightStd: 40 },
  attacker_bot: { dwell: -8, flight: -70, dwellStd: -4, flightStd: -2 },
  curious_friend: { dwell: 45, flight: 260, dwellStd: 20, flightStd: 80 },
} as const;

let profile = {
  dwellMean: 104,
  flightMean: 72,
};

let threshold = 0.78;
let driftPressure = 0.12;
let shockDrift = 0;
let driftMode: DriftMode = "steady";
let recoverCountdown = 0;
let driftEvents = 0;

let tp = 0;
let tn = 0;
let fp = 0;
let fn = 0;
let attempts = 0;

let modelArtifact: ModelArtifact | null = null;
let modelState: "loading" | "ready" | "error" = "loading";

const recentErrors: number[] = [];
const recentAttempts: Attempt[] = [];
const accuracyHistory: number[] = [];
const driftHistory: number[] = [];
const driftDetectionHistory: number[] = [];

let demoTimer: number | null = null;
let demoStep = 0;
let demoScript: Array<() => void> = [];
let liveDemoTimer: number | null = null;

let enrolledPersona: PersonaProfile | null = null;
let liveTyping = false;
let lastLiveComparison: LiveComparison | null = null;

const liveGuide: GuideStep[] = [
  {
    title: "Step 1: Create persona",
    hint: "Enter your name and type a password in enrollment field.",
    status: "active",
  },
  {
    title: "Step 2: Enroll rhythm",
    hint: "Click Enroll Persona to save speed and inter-key timing.",
    status: "pending",
  },
  {
    title: "Step 3: Re-type password",
    hint: "Type same password in auth field for final evaluation.",
    status: "pending",
  },
  {
    title: "Step 4: Drift decision",
    hint: "System grants or denies based on drift thresholds.",
    status: "pending",
  },
];

const enrollCapture: TypingCapture = {
  startedAt: null,
  lastKeyAt: null,
  keyTimes: [],
  flights: [],
  elapsedMs: 0,
  timerId: null,
  running: false,
};

const authCapture: TypingCapture = {
  startedAt: null,
  lastKeyAt: null,
  keyTimes: [],
  flights: [],
  elapsedMs: 0,
  timerId: null,
  running: false,
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

app.innerHTML = `
<main class="min-h-screen px-4 py-6 md:px-8">
  <section class="mx-auto max-w-7xl space-y-5">
    <header class="glass-panel overflow-hidden rounded-3xl p-6 md:p-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-amber-200/85">Capstone Defense Simulator</p>
          <h1 class="font-display text-3xl text-white md:text-5xl">Jonga Keystroke Drift Lab</h1>
          <p class="mt-2 max-w-3xl text-sm text-slate-200 md:text-base">Virtual login demo using password + behavioral biometrics with a drift watchdog and adaptive recovery.</p>
        </div>
        <span id="driftBadge" class="rounded-full border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100">Stable</span>
      </div>

      <div id="modelPanel" class="mt-5 rounded-2xl border border-slate-700/80 bg-slate-900/75 p-4">
        <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Deployed Model</p>
        <p id="modelSummary" class="mt-1 text-sm text-slate-200">Loading trained model artifact...</p>
      </div>
    </header>

    <section class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <article class="glass-panel rounded-3xl p-5 lg:col-span-5">
        <h2 class="font-display text-2xl text-white">Virtual Login Console</h2>
        <p class="mt-1 text-sm text-slate-300">Pick a persona, simulate an attempt, and narrate how drift impacts authentication.</p>

        <section class="mt-4 rounded-2xl border border-cyan-400/35 bg-cyan-900/15 p-4">
          <div class="flex items-center justify-between">
            <h3 class="font-display text-lg text-cyan-100">Live Persona Enrollment</h3>
            <span id="typingClock" class="rounded-full border border-cyan-300/40 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100">00:00.000</span>
          </div>
          <p class="mt-1 text-xs text-cyan-50/90">Type your own password rhythm and use it for final live evaluation.</p>

          <div class="mt-3 space-y-3">
            <input id="liveName" class="input-field" placeholder="Your persona name" value="Defense Candidate" />
            <input id="liveEnroll" type="password" class="input-field" placeholder="Type password to enroll" autocomplete="off" />
            <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
              <button id="enrollPersona" class="btn-main">Enroll Persona</button>
              <button id="clearEnroll" class="btn-muted">Clear Enrollment Field</button>
            </div>
            <div id="liveStats" class="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-200">No persona enrolled yet.</div>
          </div>

          <div class="mt-4 space-y-3 border-t border-cyan-400/20 pt-3">
            <input id="liveAuth" type="password" class="input-field" placeholder="Type password again for authentication" autocomplete="off" />
            <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
              <button id="authPersona" class="btn-danger">Authenticate with Drift Check</button>
              <button id="clearAuth" class="btn-muted">Clear Auth Field</button>
            </div>
            <div id="authResult" class="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-200">Waiting for final evaluation.</div>
          </div>

          <div class="mt-4 rounded-xl border border-violet-400/25 bg-violet-900/15 p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs uppercase tracking-[0.18em] text-violet-200">Live Demo Guide</p>
              <button id="startLiveShowcase" class="btn-muted text-xs">Auto Live Showcase</button>
            </div>
            <div id="guideSteps" class="mt-2 grid gap-2"></div>
          </div>
        </section>

        <div class="mt-5 space-y-4">
          <div>
            <label for="actorSelect" class="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">Persona</label>
            <select id="actorSelect" class="input-field"></select>
          </div>
          <div>
            <label for="passwordInput" class="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">Password Attempt</label>
            <input id="passwordInput" class="input-field" value="Jonga@2026" />
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button id="runAttempt" class="btn-main">Run Attempt</button>
            <button id="runCrowd" class="btn-muted">Crowd Burst (20)</button>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button id="presentationMode" class="btn-main">Start Presentation Mode</button>
            <button id="stopPresentation" class="btn-muted">Stop Presentation</button>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button id="toggleMode" class="btn-muted">Mode: Steady</button>
            <button id="shockDrift" class="btn-danger">Trigger Abrupt Drift</button>
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between text-xs text-slate-300">
              <span>Background Drift Intensity</span>
              <span id="driftLabel">12%</span>
            </div>
            <input id="driftSlider" type="range" min="0" max="100" value="12" class="w-full accent-amber-400" />
          </div>

          <button id="resetAll" class="btn-outline w-full">Reset Session</button>
        </div>
      </article>

      <article class="glass-panel rounded-3xl p-5 lg:col-span-7">
        <h2 class="font-display text-2xl text-white">Defense Metrics</h2>
        <div id="metricGrid" class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3"></div>

        <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <section class="panel-sub">
            <h3 class="font-display text-lg text-slate-100">Watchdog Pulse</h3>
            <p class="text-xs text-slate-300">Error trend used to trigger drift adaptation.</p>
            <div id="errorBars" class="mt-3 flex h-28 items-end gap-1"></div>
          </section>
          <section class="panel-sub">
            <h3 class="font-display text-lg text-slate-100">Latest Decision</h3>
            <div id="latestCard" class="mt-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
              No attempts yet.
            </div>
          </section>
          <section class="panel-sub">
            <h3 class="font-display text-lg text-slate-100">Live Drift Comparator</h3>
            <p class="text-xs text-slate-300">Enrollment baseline vs current typing attempt.</p>
            <svg id="liveDriftChart" class="mt-3 h-28 w-full rounded-xl border border-slate-700 bg-slate-950/80" viewBox="0 0 600 120" preserveAspectRatio="none"></svg>
          </section>
        </div>
      </article>
    </section>

    <section class="glass-panel rounded-3xl p-5">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-2xl text-white">Attempt Timeline</h2>
        <p class="text-xs uppercase tracking-[0.2em] text-slate-300">Last 14 events</p>
      </div>
      <div id="timeline" class="mt-4 grid gap-2"></div>
    </section>

    <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <article class="glass-panel rounded-3xl p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-2xl text-white">Accuracy Trend</h2>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-300">Last 60 attempts</p>
        </div>
        <svg id="accuracyChart" class="mt-4 h-48 w-full rounded-2xl border border-slate-700 bg-slate-950/80" viewBox="0 0 600 200" preserveAspectRatio="none"></svg>
      </article>

      <article class="glass-panel rounded-3xl p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-2xl text-white">Drift Pressure + Detection</h2>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-300">Live signal</p>
        </div>
        <svg id="driftChart" class="mt-4 h-48 w-full rounded-2xl border border-slate-700 bg-slate-950/80" viewBox="0 0 600 200" preserveAspectRatio="none"></svg>
      </article>
    </section>
  </section>
</main>
`;

const actorSelect = document.querySelector<HTMLSelectElement>("#actorSelect")!;
const passwordInput = document.querySelector<HTMLInputElement>("#passwordInput")!;
const runAttemptButton = document.querySelector<HTMLButtonElement>("#runAttempt")!;
const runCrowdButton = document.querySelector<HTMLButtonElement>("#runCrowd")!;
const presentationModeButton = document.querySelector<HTMLButtonElement>("#presentationMode")!;
const stopPresentationButton = document.querySelector<HTMLButtonElement>("#stopPresentation")!;
const toggleModeButton = document.querySelector<HTMLButtonElement>("#toggleMode")!;
const shockDriftButton = document.querySelector<HTMLButtonElement>("#shockDrift")!;
const resetAllButton = document.querySelector<HTMLButtonElement>("#resetAll")!;
const driftSlider = document.querySelector<HTMLInputElement>("#driftSlider")!;
const driftLabel = document.querySelector<HTMLSpanElement>("#driftLabel")!;
const liveNameInput = document.querySelector<HTMLInputElement>("#liveName")!;
const liveEnrollInput = document.querySelector<HTMLInputElement>("#liveEnroll")!;
const enrollPersonaButton = document.querySelector<HTMLButtonElement>("#enrollPersona")!;
const clearEnrollButton = document.querySelector<HTMLButtonElement>("#clearEnroll")!;
const liveAuthInput = document.querySelector<HTMLInputElement>("#liveAuth")!;
const authPersonaButton = document.querySelector<HTMLButtonElement>("#authPersona")!;
const clearAuthButton = document.querySelector<HTMLButtonElement>("#clearAuth")!;
const typingClock = document.querySelector<HTMLSpanElement>("#typingClock")!;
const liveStats = document.querySelector<HTMLDivElement>("#liveStats")!;
const authResult = document.querySelector<HTMLDivElement>("#authResult")!;
const guideSteps = document.querySelector<HTMLDivElement>("#guideSteps")!;
const startLiveShowcaseButton = document.querySelector<HTMLButtonElement>("#startLiveShowcase")!;

for (const actor of actors) {
  const option = document.createElement("option");
  option.value = actor.id;
  option.textContent = actor.label;
  actorSelect.append(option);
}

actorSelect.value = "munashe";

function clamp(num: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, num));
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function randomNormal(meanValue: number, stdDev: number): number {
  const u1 = Math.max(Math.random(), Number.EPSILON);
  const u2 = Math.max(Math.random(), Number.EPSILON);
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return meanValue + stdDev * z;
}

function sigmoidNumber(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function modelProbabilityFromFeatures(dwellDelta: number, flightDelta: number): number {
  if (!modelArtifact) {
    return clamp(Math.exp(-(dwellDelta / 40 + flightDelta / 35)), 0, 1);
  }

  const meanD = modelArtifact.scaler.mean[0] ?? 0;
  const meanF = modelArtifact.scaler.mean[1] ?? 0;
  const stdD = modelArtifact.scaler.std[0] && modelArtifact.scaler.std[0] > 1e-9 ? modelArtifact.scaler.std[0] : 1;
  const stdF = modelArtifact.scaler.std[1] && modelArtifact.scaler.std[1] > 1e-9 ? modelArtifact.scaler.std[1] : 1;

  const x0 = (dwellDelta - meanD) / stdD;
  const x1 = (flightDelta - meanF) / stdF;

  const w0 = modelArtifact.weights[0] ?? 0;
  const w1 = modelArtifact.weights[1] ?? 0;
  const z = w0 * x0 + w1 * x1 + modelArtifact.bias;
  return clamp(sigmoidNumber(z), 0, 1);
}

async function loadModelArtifact(): Promise<void> {
  modelState = "loading";
  try {
    const response = await fetch("/model/keystroke_model.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = (await response.json()) as ModelArtifact;
    modelArtifact = payload;
    modelState = "ready";

    if (payload.baseline_profile) {
      profile = {
        dwellMean: payload.baseline_profile.dwell_ms,
        flightMean: payload.baseline_profile.flight_ms,
      };
    }

    threshold = payload.threshold;

    const baseDwell = profile.dwellMean;
    const baseFlight = profile.flightMean;

    actors.forEach((actor) => {
      const offset = actorOffsets[actor.id as keyof typeof actorOffsets];
      if (!offset) {
        return;
      }
      actor.dwellMean = Math.max(20, baseDwell + offset.dwell);
      actor.flightMean = Math.max(10, baseFlight + offset.flight);
      actor.dwellStd = Math.max(4, actor.dwellStd + offset.dwellStd);
      actor.flightStd = Math.max(4, actor.flightStd + offset.flightStd);
    });
  } catch {
    modelArtifact = null;
    modelState = "error";
  }
  render();
}

function getActorById(actorId: string): Actor {
  return actors.find((actor) => actor.id === actorId) ?? actors[0];
}

function getCurrentDrift(role: Role): number {
  const roleFactor = role === "genuine" ? 1 : 0.35;
  return clamp((driftPressure + shockDrift) * roleFactor, 0, 1);
}

function computeOutcome(genuineExpected: boolean, accepted: boolean): Outcome {
  if (genuineExpected && accepted) {
    return "TP";
  }
  if (!genuineExpected && !accepted) {
    return "TN";
  }
  if (!genuineExpected && accepted) {
    return "FP";
  }
  return "FN";
}

function updateCounters(outcome: Outcome): void {
  if (outcome === "TP") {
    tp += 1;
  }
  if (outcome === "TN") {
    tn += 1;
  }
  if (outcome === "FP") {
    fp += 1;
  }
  if (outcome === "FN") {
    fn += 1;
  }
}

function setGuideState(activeIndex: number, doneUpto: number): void {
  liveGuide.forEach((step, idx) => {
    if (idx <= doneUpto) {
      step.status = "done";
    } else if (idx === activeIndex) {
      step.status = "active";
    } else {
      step.status = "pending";
    }
  });
  renderGuide();
}

function renderGuide(): void {
  guideSteps.innerHTML = liveGuide
    .map((step) => {
      const tone =
        step.status === "done"
          ? "border-emerald-400/50 bg-emerald-500/10"
          : step.status === "active"
            ? "border-amber-400/50 bg-amber-500/10"
            : "border-slate-700 bg-slate-900/70";
      const badge =
        step.status === "done"
          ? "text-emerald-300"
          : step.status === "active"
            ? "text-amber-300"
            : "text-slate-400";
      const statusText =
        step.status === "done" ? "done" : step.status === "active" ? "live" : "pending";
      return `
        <article class="rounded-lg border ${tone} px-3 py-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-semibold text-slate-100">${step.title}</p>
            <span class="text-[10px] uppercase tracking-[0.18em] ${badge}">${statusText}</span>
          </div>
          <p class="mt-1 text-[11px] text-slate-300">${step.hint}</p>
        </article>
      `;
    })
    .join("");
}

function registerAttempt(input: {
  actor: string;
  actorColor: string;
  role: Role;
  accepted: boolean;
  passwordCorrect: boolean;
  score: number;
  thresholdValue: number;
  drift: number;
  modelProbability: number;
  genuineExpected: boolean;
}): void {
  const outcome = computeOutcome(input.genuineExpected, input.accepted);
  const error: 0 | 1 = outcome === "TP" || outcome === "TN" ? 0 : 1;

  updateCounters(outcome);

  const driftTriggered = detectDrift(error);
  if (driftTriggered) {
    driftEvents += 1;
    recoverCountdown = 10;
  } else {
    recoverCountdown = Math.max(0, recoverCountdown - 1);
  }

  const attempt: Attempt = {
    idx: attempts,
    actor: input.actor,
    actorColor: input.actorColor,
    role: input.role,
    outcome,
    accepted: input.accepted,
    passwordCorrect: input.passwordCorrect,
    score: input.score,
    threshold: input.thresholdValue,
    drift: input.drift,
    error,
    driftDetected: driftTriggered,
    modelProbability: input.modelProbability,
  };

  const totalNow = tp + tn + fp + fn;
  const accuracyNow = totalNow > 0 ? (tp + tn) / totalNow : 0;
  accuracyHistory.push(accuracyNow);
  driftHistory.push(input.drift);
  driftDetectionHistory.push(driftTriggered ? 1 : 0);

  if (accuracyHistory.length > 60) {
    accuracyHistory.shift();
    driftHistory.shift();
    driftDetectionHistory.shift();
  }

  recentAttempts.unshift(attempt);
  if (recentAttempts.length > 14) {
    recentAttempts.pop();
  }

  render();
}

function detectDrift(error: 0 | 1): boolean {
  recentErrors.push(error);
  if (recentErrors.length > 24) {
    recentErrors.shift();
  }
  if (recentErrors.length < 24) {
    return false;
  }

  const half = recentErrors.length / 2;
  const oldMean = mean(recentErrors.slice(0, half));
  const newMean = mean(recentErrors.slice(half));
  return newMean - oldMean > 0.18;
}

function adjustModel(
  actor: Actor,
  passwordCorrect: boolean,
  dwellObserved: number,
  flightObserved: number,
): void {
  if (actor.role !== "genuine" || !passwordCorrect) {
    return;
  }
  const learningRate = recoverCountdown > 0 ? 0.28 : 0.08;
  profile.dwellMean = profile.dwellMean + learningRate * (dwellObserved - profile.dwellMean);
  profile.flightMean = profile.flightMean + learningRate * (flightObserved - profile.flightMean);
}

function runOneAttempt(actor: Actor): void {
  attempts += 1;

  if (driftMode === "gradual") {
    driftPressure = clamp(driftPressure + 0.01, 0, 0.95);
    driftSlider.value = String(Math.round(driftPressure * 100));
    driftLabel.textContent = `${Math.round(driftPressure * 100)}%`;
  }

  shockDrift = clamp(shockDrift - 0.06, 0, 1);

  const typedPassword = passwordInput.value.trim();
  const knowsRightPassword = typedPassword === expectedPassword;
  const passwordProbability = actor.role === "genuine" ? actor.passwordSkill : actor.passwordSkill * 0.75;
  const passwordCorrect = knowsRightPassword && Math.random() < passwordProbability;

  const driftNow = getCurrentDrift(actor.role);
  const dwellObserved = Math.max(
    20,
    randomNormal(
      actor.dwellMean * (1 + driftNow * 0.30),
      actor.dwellStd * (1 + driftNow * 1.2),
    ),
  );
  const flightObserved = Math.max(
    10,
    randomNormal(
      actor.flightMean * (1 + driftNow * 0.40),
      actor.flightStd * (1 + driftNow * 1.4),
    ),
  );

  const distance =
    Math.abs(dwellObserved - profile.dwellMean) / 40 +
    Math.abs(flightObserved - profile.flightMean) / 35;
  const dwellDelta = Math.abs(dwellObserved - profile.dwellMean);
  const flightDelta = Math.abs(flightObserved - profile.flightMean);
  const modelProbability = modelProbabilityFromFeatures(dwellDelta, flightDelta);

  const similarity = clamp(Math.exp(-distance), 0, 1);
  const score = modelArtifact
    ? clamp(0.7 * modelProbability + 0.3 * similarity, 0, 1)
    : similarity;

  const baseThreshold = modelArtifact?.threshold ?? 0.78;
  threshold = recoverCountdown > 0 ? Math.max(0.65, baseThreshold - 0.1) : baseThreshold;
  const accepted = passwordCorrect && score >= threshold;
  const genuineExpected = actor.role === "genuine" && passwordCorrect;

  adjustModel(actor, passwordCorrect, dwellObserved, flightObserved);

  registerAttempt({
    actor: actor.label,
    actorColor: actor.color,
    role: actor.role,
    accepted,
    passwordCorrect,
    score,
    thresholdValue: threshold,
    drift: driftNow,
    modelProbability,
    genuineExpected,
  });
}

function buildPolyline(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    return `0,${height - values[0] * height} ${width},${height - values[0] * height}`;
  }
  const stepX = width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - value * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function formatClock(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(safe / 60000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((safe % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const millis = (safe % 1000).toString().padStart(3, "0");
  return `${minutes}:${seconds}.${millis}`;
}

function meanOrZero(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdOrZero(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const m = meanOrZero(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function resetCapture(capture: TypingCapture): void {
  capture.startedAt = null;
  capture.lastKeyAt = null;
  capture.keyTimes = [];
  capture.flights = [];
  capture.elapsedMs = 0;
  if (capture.timerId !== null) {
    window.clearInterval(capture.timerId);
  }
  capture.timerId = null;
  capture.running = false;
}

function startCapture(capture: TypingCapture): void {
  resetCapture(capture);
  capture.startedAt = performance.now();
  capture.running = true;
  capture.timerId = window.setInterval(() => {
    if (!capture.startedAt) {
      return;
    }
    capture.elapsedMs = performance.now() - capture.startedAt;
    if (liveTyping) {
      typingClock.textContent = formatClock(capture.elapsedMs);
    }
  }, 16);
}

function recordKeystroke(capture: TypingCapture): void {
  const now = performance.now();
  if (!capture.running) {
    startCapture(capture);
  }

  capture.keyTimes.push(now);
  if (capture.lastKeyAt !== null) {
    capture.flights.push(now - capture.lastKeyAt);
  }
  capture.lastKeyAt = now;

  if (capture.startedAt) {
    capture.elapsedMs = now - capture.startedAt;
    if (liveTyping) {
      typingClock.textContent = formatClock(capture.elapsedMs);
    }
  }
}

function finalizeCapture(capture: TypingCapture): { speedCps: number; avgFlightMs: number; flightStdMs: number; elapsedMs: number; flights: number[] } {
  if (capture.timerId !== null) {
    window.clearInterval(capture.timerId);
    capture.timerId = null;
  }
  capture.running = false;
  const elapsedMs = capture.elapsedMs;
  const seconds = Math.max(elapsedMs / 1000, 0.001);
  const speedCps = capture.keyTimes.length / seconds;
  const avgFlightMs = meanOrZero(capture.flights);
  const flightStdMs = stdOrZero(capture.flights);

  return {
    speedCps,
    avgFlightMs,
    flightStdMs,
    elapsedMs,
    flights: [...capture.flights],
  };
}

function drawLiveDriftChart(): void {
  const chart = document.querySelector<SVGElement>("#liveDriftChart");
  if (!chart) {
    return;
  }

  if (!enrolledPersona || !lastLiveComparison) {
    chart.innerHTML = '<text x="20" y="64" fill="#94a3b8" font-size="12">Enroll and authenticate to compare keystroke drift.</text>';
    return;
  }

  const base = enrolledPersona.flightSeries.slice(0, 24);
  const probe = lastLiveComparison.authFlights.slice(0, 24);
  const maxVal = Math.max(...base, ...probe, 1);
  const scaleY = (v: number): number => 110 - (v / maxVal) * 90;

  const pairCount = Math.max(base.length, probe.length);
  const step = pairCount > 1 ? 580 / (pairCount - 1) : 580;
  const line = (values: number[]): string =>
    values
      .map((v, i) => `${10 + i * step},${scaleY(v)}`)
      .join(" ");

  const baseLine = line(base);
  const probeLine = line(probe);

  chart.innerHTML = `
    <line x1="10" y1="110" x2="590" y2="110" stroke="#334155" stroke-width="1" />
    <polyline fill="none" stroke="#22d3ee" stroke-width="2.5" points="${baseLine}" />
    <polyline fill="none" stroke="#f97316" stroke-width="2.5" points="${probeLine}" />
    <text x="16" y="16" fill="#67e8f9" font-size="11">enrollment</text>
    <text x="104" y="16" fill="#fb923c" font-size="11">auth attempt</text>
  `;
}

function renderCharts(): void {
  const accuracyChart = document.querySelector<SVGElement>("#accuracyChart");
  const driftChart = document.querySelector<SVGElement>("#driftChart");

  if (!accuracyChart || !driftChart) {
    return;
  }

  const width = 600;
  const height = 200;

  if (accuracyHistory.length < 2) {
    accuracyChart.innerHTML = '<text x="24" y="104" fill="#94a3b8" font-size="14">Run attempts to draw accuracy trend.</text>';
  } else {
    const linePoints = buildPolyline(accuracyHistory, width, height);
    accuracyChart.innerHTML = `
      <line x1="0" y1="160" x2="600" y2="160" stroke="#334155" stroke-width="1" />
      <line x1="0" y1="120" x2="600" y2="120" stroke="#1e293b" stroke-width="1" />
      <line x1="0" y1="80" x2="600" y2="80" stroke="#1e293b" stroke-width="1" />
      <line x1="0" y1="40" x2="600" y2="40" stroke="#1e293b" stroke-width="1" />
      <polyline fill="none" stroke="#fbbf24" stroke-width="3" points="${linePoints}" />
      <text x="12" y="22" fill="#f8fafc" font-size="13">Accuracy ${(accuracyHistory[accuracyHistory.length - 1] * 100).toFixed(1)}%</text>
    `;
  }

  if (driftHistory.length < 2) {
    driftChart.innerHTML = '<text x="24" y="104" fill="#94a3b8" font-size="14">Drift and detection signal appears here.</text>';
  } else {
    const driftPoints = buildPolyline(driftHistory, width, height);
    const marks = driftDetectionHistory
      .map((flag, index) => {
        if (flag === 0 || driftDetectionHistory.length <= 1) {
          return "";
        }
        const stepX = width / (driftDetectionHistory.length - 1);
        const x = index * stepX;
        return `<circle cx="${x.toFixed(2)}" cy="28" r="5" fill="#fb7185" />`;
      })
      .join("");

    driftChart.innerHTML = `
      <line x1="0" y1="160" x2="600" y2="160" stroke="#334155" stroke-width="1" />
      <line x1="0" y1="120" x2="600" y2="120" stroke="#1e293b" stroke-width="1" />
      <line x1="0" y1="80" x2="600" y2="80" stroke="#1e293b" stroke-width="1" />
      <line x1="0" y1="40" x2="600" y2="40" stroke="#1e293b" stroke-width="1" />
      <polyline fill="none" stroke="#22d3ee" stroke-width="3" points="${driftPoints}" />
      ${marks}
      <text x="12" y="22" fill="#f8fafc" font-size="13">Drift ${(driftHistory[driftHistory.length - 1] * 100).toFixed(0)}% • detections ${driftEvents}</text>
    `;
  }
}

function stopPresentationMode(): void {
  if (demoTimer !== null) {
    window.clearInterval(demoTimer);
    demoTimer = null;
  }
  presentationModeButton.textContent = "Start Presentation Mode";
}

function renderPersonaStatus(): void {
  if (!enrolledPersona) {
    liveStats.innerHTML = "No persona enrolled yet.";
    drawLiveDriftChart();
    return;
  }

  liveStats.innerHTML = `
    <p><span class="font-semibold text-white">${enrolledPersona.name}</span> enrolled</p>
    <p class="mt-1">Password length: <span class="text-amber-200">${enrolledPersona.password.length}</span></p>
    <p class="mt-1">Typing speed: <span class="text-cyan-200">${enrolledPersona.speedCps.toFixed(2)} keys/sec</span></p>
    <p class="mt-1">Average flight: <span class="text-cyan-200">${enrolledPersona.avgFlightMs.toFixed(1)} ms</span></p>
  `;
  drawLiveDriftChart();
}

function handleEnrollPersona(): void {
  const personaName = liveNameInput.value.trim() || "Live User";
  const password = liveEnrollInput.value;

  if (password.length < 6) {
    authResult.innerHTML = '<span class="text-rose-300">Use at least 6 characters for enrollment.</span>';
    return;
  }

  const stats = finalizeCapture(enrollCapture);
  if (stats.flights.length < 3) {
    authResult.innerHTML = '<span class="text-rose-300">Please type normally. Need more key transitions for profile quality.</span>';
    return;
  }

  enrolledPersona = {
    name: personaName,
    password,
    speedCps: stats.speedCps,
    avgFlightMs: stats.avgFlightMs,
    flightSeries: stats.flights,
  };

  typingClock.textContent = formatClock(stats.elapsedMs);
  lastLiveComparison = null;
  setGuideState(2, 1);
  renderPersonaStatus();
  authResult.innerHTML = '<span class="text-emerald-300">Persona enrolled. Now type the password again in the authentication field.</span>';
}

function handleAuthenticatePersona(): void {
  if (!enrolledPersona) {
    authResult.innerHTML = '<span class="text-rose-300">Enroll persona first.</span>';
    return;
  }

  const typed = liveAuthInput.value;
  const passwordCorrect = typed === enrolledPersona.password;
  const stats = finalizeCapture(authCapture);

  const speedDelta = Math.abs(stats.speedCps - enrolledPersona.speedCps);
  const flightDelta = Math.abs(stats.avgFlightMs - enrolledPersona.avgFlightMs);

  const speedTol = Math.max(enrolledPersona.speedCps * 0.35, 0.6);
  const flightTol = Math.max(enrolledPersona.avgFlightMs * 0.38, 24);

  const speedScore = clamp(1 - speedDelta / (speedTol * 1.25), 0, 1);
  const flightScore = clamp(1 - flightDelta / (flightTol * 1.25), 0, 1);
  const driftIntensity = clamp(flightDelta / Math.max(enrolledPersona.avgFlightMs, 1), 0, 1);

  const modelProbability = modelProbabilityFromFeatures(speedDelta * 14, flightDelta);
  const similarity = clamp(0.5 * speedScore + 0.5 * flightScore, 0, 1);
  const score = clamp(0.65 * modelProbability + 0.35 * similarity, 0, 1);
  const baseThreshold = modelArtifact?.threshold ?? 0.78;
  const adaptiveThreshold = recoverCountdown > 0 ? Math.max(0.65, baseThreshold - 0.1) : baseThreshold;
  threshold = adaptiveThreshold;

  const accepted = passwordCorrect && speedDelta <= speedTol && flightDelta <= flightTol && score >= adaptiveThreshold;

  lastLiveComparison = {
    speedDelta,
    flightDelta,
    speedTol,
    flightTol,
    score,
    accepted,
    modelProbability,
    authFlights: stats.flights,
  };

  attempts += 1;
  registerAttempt({
    actor: `${enrolledPersona.name} (Live)`,
    actorColor: accepted ? "#34d399" : "#fb7185",
    role: "genuine",
    accepted,
    passwordCorrect,
    score,
    thresholdValue: adaptiveThreshold,
    drift: driftIntensity,
    modelProbability,
    genuineExpected: true,
  });

  typingClock.textContent = formatClock(stats.elapsedMs);

  if (accepted) {
    authResult.innerHTML = `
      <span class="text-emerald-300 font-semibold">ACCESS GRANTED</span>
      <br/>speed Δ ${speedDelta.toFixed(2)} (tol ${speedTol.toFixed(2)}), flight Δ ${flightDelta.toFixed(1)}ms (tol ${flightTol.toFixed(1)}ms)
      <br/>score ${score.toFixed(3)} vs threshold ${adaptiveThreshold.toFixed(3)}
    `;
  } else {
    const reason = !passwordCorrect
      ? "password mismatch"
      : speedDelta > speedTol
        ? "typing speed drift too high"
        : flightDelta > flightTol
          ? "inter-key drift too high"
          : "biometric score below threshold";

    authResult.innerHTML = `
      <span class="text-rose-300 font-semibold">ACCESS DENIED BY DRIFT CHECK</span>
      <br/>Reason: ${reason}
      <br/>speed Δ ${speedDelta.toFixed(2)} (tol ${speedTol.toFixed(2)}), flight Δ ${flightDelta.toFixed(1)}ms (tol ${flightTol.toFixed(1)}ms)
      <br/>score ${score.toFixed(3)} vs threshold ${adaptiveThreshold.toFixed(3)}
    `;
  }

  setGuideState(3, 3);
  renderPersonaStatus();
}

function startPresentationMode(): void {
  stopPresentationMode();
  demoStep = 0;

  demoScript = [
    () => {
      actorSelect.value = "munashe";
      passwordInput.value = expectedPassword;
      driftMode = "steady";
      toggleModeButton.textContent = "Mode: Steady";
      runOneAttempt(getActorById("munashe"));
    },
    () => {
      for (let i = 0; i < 8; i += 1) {
        runOneAttempt(getActorById("munashe"));
      }
    },
    () => {
      actorSelect.value = "labmate";
      passwordInput.value = expectedPassword;
      runOneAttempt(getActorById("labmate"));
      runOneAttempt(getActorById("attacker_bot"));
    },
    () => {
      shockDrift = 0.95;
      runOneAttempt(getActorById("munashe"));
      runOneAttempt(getActorById("munashe"));
    },
    () => {
      driftMode = "gradual";
      toggleModeButton.textContent = "Mode: Gradual";
      driftPressure = 0.24;
      driftSlider.value = "24";
      driftLabel.textContent = "24%";
      for (let i = 0; i < 18; i += 1) {
        const actor = i % 3 === 0 ? getActorById("munashe") : actors[Math.floor(Math.random() * actors.length)];
        runOneAttempt(actor);
      }
    },
    () => {
      driftMode = "steady";
      toggleModeButton.textContent = "Mode: Steady";
      actorSelect.value = "munashe";
      passwordInput.value = expectedPassword;
      for (let i = 0; i < 12; i += 1) {
        runOneAttempt(getActorById("munashe"));
      }
    },
  ];

  presentationModeButton.textContent = "Presentation Running...";
  demoTimer = window.setInterval(() => {
    if (demoStep >= demoScript.length) {
      stopPresentationMode();
      return;
    }
    demoScript[demoStep]();
    demoStep += 1;
  }, 1300);
}

function stopLiveShowcase(): void {
  if (liveDemoTimer !== null) {
    window.clearInterval(liveDemoTimer);
    liveDemoTimer = null;
  }
  startLiveShowcaseButton.textContent = "Auto Live Showcase";
}

function startLiveShowcase(): void {
  stopLiveShowcase();
  setGuideState(0, -1);

  const demoPassword = "DriftShield26";
  const stepActions: Array<() => void> = [
    () => {
      liveNameInput.value = "Panel Demo Persona";
      liveEnrollInput.value = demoPassword;
      startCapture(enrollCapture);
      const syntheticEnroll = [
        120, 98, 106, 112, 103, 95, 101, 116, 108, 111, 104,
      ];
      syntheticEnroll.forEach((gap, idx) => {
        if (idx === 0) {
          enrollCapture.keyTimes.push(performance.now());
          enrollCapture.lastKeyAt = performance.now();
          return;
        }
        const t = (enrollCapture.lastKeyAt ?? performance.now()) + gap;
        enrollCapture.keyTimes.push(t);
        enrollCapture.flights.push(gap);
        enrollCapture.lastKeyAt = t;
      });
      enrollCapture.elapsedMs = syntheticEnroll.reduce((a, b) => a + b, 0);
      typingClock.textContent = formatClock(enrollCapture.elapsedMs);
      setGuideState(1, 0);
    },
    () => {
      handleEnrollPersona();
    },
    () => {
      liveAuthInput.value = demoPassword;
      startCapture(authCapture);
      const syntheticAuth = [
        124, 102, 115, 119, 111, 98, 110, 121, 113, 118, 106,
      ];
      syntheticAuth.forEach((gap, idx) => {
        if (idx === 0) {
          authCapture.keyTimes.push(performance.now());
          authCapture.lastKeyAt = performance.now();
          return;
        }
        const t = (authCapture.lastKeyAt ?? performance.now()) + gap;
        authCapture.keyTimes.push(t);
        authCapture.flights.push(gap);
        authCapture.lastKeyAt = t;
      });
      authCapture.elapsedMs = syntheticAuth.reduce((a, b) => a + b, 0);
      typingClock.textContent = formatClock(authCapture.elapsedMs);
      setGuideState(3, 2);
    },
    () => {
      handleAuthenticatePersona();
      stopLiveShowcase();
    },
  ];

  let idx = 0;
  startLiveShowcaseButton.textContent = "Showcase Running...";
  liveDemoTimer = window.setInterval(() => {
    if (idx >= stepActions.length) {
      stopLiveShowcase();
      return;
    }
    stepActions[idx]();
    idx += 1;
  }, 1200);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function buildMetricCard(label: string, value: string, tone: string): string {
  return `<article class="metric-card ${tone}"><p class="metric-label">${label}</p><p class="metric-value">${value}</p></article>`;
}

function render(): void {
  const metricGrid = document.querySelector<HTMLDivElement>("#metricGrid");
  const errorBars = document.querySelector<HTMLDivElement>("#errorBars");
  const latestCard = document.querySelector<HTMLDivElement>("#latestCard");
  const timeline = document.querySelector<HTMLDivElement>("#timeline");
  const driftBadge = document.querySelector<HTMLSpanElement>("#driftBadge");
  const modelSummary = document.querySelector<HTMLParagraphElement>("#modelSummary");

  if (!metricGrid || !errorBars || !latestCard || !timeline || !driftBadge || !modelSummary) {
    return;
  }

  const total = tp + tn + fp + fn;
  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const far = fp + tn > 0 ? fp / (fp + tn) : 0;
  const frr = fn + tp > 0 ? fn / (fn + tp) : 0;

  metricGrid.innerHTML = [
    buildMetricCard("Attempts", String(total), "tone-neutral"),
    buildMetricCard("Accuracy", formatPct(accuracy), "tone-green"),
    buildMetricCard("FAR", formatPct(far), "tone-red"),
    buildMetricCard("FRR", formatPct(frr), "tone-amber"),
    buildMetricCard("Drift Events", String(driftEvents), "tone-cyan"),
    buildMetricCard("Model Threshold", threshold.toFixed(2), "tone-violet"),
  ].join("");

  const bars = recentErrors
    .map((errorValue) => {
      const height = errorValue === 1 ? 90 : 28;
      const barTone = errorValue === 1 ? "bg-rose-400" : "bg-emerald-300";
      return `<span class="w-2 rounded-full ${barTone}" style="height:${height}%"></span>`;
    })
    .join("");
  errorBars.innerHTML = bars || '<p class="text-xs text-slate-400">No signal yet.</p>';

  const latest = recentAttempts[0];
  if (!latest) {
    latestCard.textContent = "No attempts yet.";
  } else {
    latestCard.innerHTML = `
      <p><span class="font-semibold text-white">${latest.actor}</span> • ${latest.role}</p>
      <p class="mt-1">Decision: <span class="font-semibold ${latest.accepted ? "text-emerald-300" : "text-rose-300"}">${latest.accepted ? "ALLOW" : "BLOCK"}</span></p>
      <p class="mt-1">Biometric score: <span class="font-semibold text-amber-200">${latest.score.toFixed(3)}</span> vs threshold ${latest.threshold.toFixed(2)}</p>
      <p class="mt-1">Model probability: <span class="font-semibold text-cyan-300">${latest.modelProbability.toFixed(3)}</span></p>
      <p class="mt-1">Outcome class: <span class="font-semibold text-sky-300">${latest.outcome}</span> | Drift: ${(latest.drift * 100).toFixed(0)}%</p>
    `;
  }

  timeline.innerHTML = recentAttempts
    .map((entry) => {
      const tone = entry.outcome === "TP" || entry.outcome === "TN" ? "border-emerald-400/40" : "border-rose-400/40";
      const chip = entry.accepted ? "bg-emerald-500/25 text-emerald-200" : "bg-rose-500/25 text-rose-200";
      return `
        <article class="rounded-2xl border ${tone} bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p>#${entry.idx} • <span class="font-semibold">${entry.actor}</span></p>
            <span class="rounded-full px-2 py-1 text-xs ${chip}">${entry.accepted ? "ALLOW" : "BLOCK"}</span>
          </div>
          <div class="mt-2 h-1.5 w-24 rounded-full" style="background:${entry.actorColor}"></div>
          <p class="mt-1 text-xs text-slate-300">Outcome ${entry.outcome} • score ${entry.score.toFixed(3)} • drift ${(entry.drift * 100).toFixed(0)}% • password ${entry.passwordCorrect ? "correct" : "wrong"}</p>
        </article>
      `;
    })
    .join("");

  const isRecovering = recoverCountdown > 0;
  if (isRecovering) {
    driftBadge.className = "rounded-full border border-amber-300/50 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 pulse";
    driftBadge.textContent = `Drift Detected • Recovering (${recoverCountdown})`;
  } else {
    driftBadge.className = "rounded-full border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100";
    driftBadge.textContent = "Stable";
  }

  if (modelState === "loading") {
    modelSummary.innerHTML = '<span class="text-amber-200">Loading model artifact...</span>';
  } else if (modelState === "error") {
    modelSummary.innerHTML = '<span class="text-rose-300">Model file not found. Running fallback simulator logic.</span>';
  } else if (modelArtifact) {
    const datasetName = modelArtifact.dataset?.name ?? "Custom dataset";
    const subject = modelArtifact.dataset?.genuine_subject ?? "n/a";
    const rows = modelArtifact.dataset?.rows ?? 0;
    const subjects = modelArtifact.dataset?.subjects ?? 0;
    modelSummary.innerHTML = `
      <span class="font-semibold text-emerald-300">${modelArtifact.model_name}</span>
      • threshold ${modelArtifact.threshold.toFixed(2)}
      • val acc ${(modelArtifact.metrics.val_accuracy * 100).toFixed(1)}%
      • FAR ${(modelArtifact.metrics.val_far * 100).toFixed(1)}%
      • FRR ${(modelArtifact.metrics.val_frr * 100).toFixed(1)}%
      <br/>
      <span class="text-slate-300">${datasetName}</span>
      • genuine ${subject}
      • ${subjects} subjects
      • ${rows.toLocaleString()} rows
    `;
  }

  renderCharts();
}

runAttemptButton.addEventListener("click", () => {
  runOneAttempt(getActorById(actorSelect.value));
});

runCrowdButton.addEventListener("click", () => {
  for (let i = 0; i < 20; i += 1) {
    const actor = actors[Math.floor(Math.random() * actors.length)];
    runOneAttempt(actor);
  }
});

liveEnrollInput.addEventListener("keydown", (event) => {
  if (!enrollCapture.running) {
    typingClock.textContent = "00:00.000";
  }
  if (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") {
    liveTyping = true;
    recordKeystroke(enrollCapture);
    setGuideState(1, 0);
  }
});

liveAuthInput.addEventListener("keydown", (event) => {
  if (!authCapture.running) {
    typingClock.textContent = "00:00.000";
  }
  if (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") {
    liveTyping = true;
    recordKeystroke(authCapture);
    if (enrolledPersona) {
      setGuideState(3, 2);
    }
  }
});

liveEnrollInput.addEventListener("blur", () => {
  liveTyping = false;
});

liveAuthInput.addEventListener("blur", () => {
  liveTyping = false;
});

enrollPersonaButton.addEventListener("click", () => {
  handleEnrollPersona();
});

authPersonaButton.addEventListener("click", () => {
  handleAuthenticatePersona();
});

clearEnrollButton.addEventListener("click", () => {
  liveEnrollInput.value = "";
  resetCapture(enrollCapture);
  typingClock.textContent = "00:00.000";
  setGuideState(0, -1);
});

clearAuthButton.addEventListener("click", () => {
  liveAuthInput.value = "";
  resetCapture(authCapture);
  typingClock.textContent = "00:00.000";
  if (enrolledPersona) {
    setGuideState(2, 1);
  }
});

startLiveShowcaseButton.addEventListener("click", () => {
  startLiveShowcase();
});

presentationModeButton.addEventListener("click", () => {
  startPresentationMode();
});

stopPresentationButton.addEventListener("click", () => {
  stopPresentationMode();
});

toggleModeButton.addEventListener("click", () => {
  driftMode = driftMode === "steady" ? "gradual" : "steady";
  toggleModeButton.textContent = driftMode === "steady" ? "Mode: Steady" : "Mode: Gradual";
});

shockDriftButton.addEventListener("click", () => {
  shockDrift = 0.9;
});

driftSlider.addEventListener("input", () => {
  driftPressure = clamp(Number(driftSlider.value) / 100, 0, 1);
  driftLabel.textContent = `${Math.round(driftPressure * 100)}%`;
});

resetAllButton.addEventListener("click", () => {
  stopPresentationMode();
  stopLiveShowcase();
  enrolledPersona = null;
  lastLiveComparison = null;
  resetCapture(enrollCapture);
  resetCapture(authCapture);
  typingClock.textContent = "00:00.000";
  liveEnrollInput.value = "";
  liveAuthInput.value = "";
  authResult.innerHTML = "Waiting for final evaluation.";
  profile = modelArtifact?.baseline_profile
    ? {
        dwellMean: modelArtifact.baseline_profile.dwell_ms,
        flightMean: modelArtifact.baseline_profile.flight_ms,
      }
    : { dwellMean: 104, flightMean: 72 };
  threshold = modelArtifact?.threshold ?? 0.78;
  driftPressure = 0.12;
  shockDrift = 0;
  driftMode = "steady";
  recoverCountdown = 0;
  driftEvents = 0;
  tp = 0;
  tn = 0;
  fp = 0;
  fn = 0;
  attempts = 0;
  recentErrors.length = 0;
  recentAttempts.length = 0;
  accuracyHistory.length = 0;
  driftHistory.length = 0;
  driftDetectionHistory.length = 0;
  actorSelect.value = "munashe";
  passwordInput.value = expectedPassword;
  driftSlider.value = "12";
  driftLabel.textContent = "12%";
  toggleModeButton.textContent = "Mode: Steady";
  setGuideState(0, -1);
  renderPersonaStatus();
  render();
});

render();
setGuideState(0, -1);
renderPersonaStatus();
void loadModelArtifact();
