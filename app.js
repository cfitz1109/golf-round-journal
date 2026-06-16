const STORAGE_KEY = "golfJournal:v1";
const state = loadState();
const holeTableSort = { key: "hole", direction: "asc" };

const demoRound = {
  id: crypto.randomUUID(),
  date: new Date().toISOString().slice(0, 10),
  course: "Demo Golf Club",
  tees: "White",
  holesPlayed: 18,
  score: 82,
  front: 41,
  back: 41,
  fairways: "7/14",
  gir: "9/18",
  putts: 32,
  penalties: 1,
  sg: {
    total: -4.2,
    teeToGreen: -3.1,
    tee: -1.2,
    approach: -1.4,
    wedge: 0.3,
    around: -0.8,
    sand: null,
    putting: -1.1,
  },
  notes: {
    feels:
      "Demo feel: smooth tempo, balanced finish, and one clear target before each swing.",
    worked:
      "Demo round with steady scoring, a useful tee-shot baseline, and enough hole data to exercise the insights table.",
    leaks:
      "Demo leak: approach proximity and short-game conversion need attention.",
    practicePriority:
      "Use this only as a sample. Replace it by importing your private backup JSON or saving real rounds on this device.",
    mood: "Demo context: neutral practice round.",
  },
  holes: [
    { hole: 1, par: 4, score: 5, fairway: true, gir: false, putts: 2, penalties: 0 },
    { hole: 2, par: 3, score: 3, fairway: null, gir: true, putts: 2, penalties: 0 },
    { hole: 3, par: 4, score: 4, fairway: true, gir: true, putts: 2, penalties: 0 },
    { hole: 4, par: 4, score: 5, fairway: false, gir: false, putts: 2, penalties: 1 },
    { hole: 5, par: 3, score: 3, fairway: null, gir: true, putts: 2, penalties: 0 },
    { hole: 6, par: 5, score: 6, fairway: false, gir: false, putts: 2, penalties: 0 },
    { hole: 7, par: 4, score: 4, fairway: true, gir: true, putts: 2, penalties: 0 },
    { hole: 8, par: 5, score: 5, fairway: true, gir: true, putts: 2, penalties: 0 },
    { hole: 9, par: 4, score: 6, fairway: false, gir: false, putts: 3, penalties: 0 },
    { hole: 10, par: 4, score: 4, fairway: true, gir: true, putts: 2, penalties: 0 },
    { hole: 11, par: 3, score: 4, fairway: null, gir: false, putts: 2, penalties: 0 },
    { hole: 12, par: 4, score: 4, fairway: true, gir: true, putts: 2, penalties: 0 },
    { hole: 13, par: 4, score: 5, fairway: false, gir: false, putts: 2, penalties: 0 },
    { hole: 14, par: 5, score: 5, fairway: true, gir: true, putts: 2, penalties: 0 },
    { hole: 15, par: 4, score: 4, fairway: true, gir: true, putts: 2, penalties: 0 },
    { hole: 16, par: 3, score: 3, fairway: null, gir: true, putts: 2, penalties: 0 },
    { hole: 17, par: 5, score: 6, fairway: false, gir: false, putts: 2, penalties: 0 },
    { hole: 18, par: 4, score: 5, fairway: false, gir: false, putts: 2, penalties: 0 },
  ],
  screenshots: ["Demo scorecard"],
  createdAt: new Date().toISOString(),
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { rounds: [], practice: [], insights: [], migrations: [] };

  try {
    const parsed = JSON.parse(saved);
    return {
      rounds: Array.isArray(parsed.rounds) ? parsed.rounds : [],
      practice: Array.isArray(parsed.practice) ? parsed.practice : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      migrations: Array.isArray(parsed.migrations) ? parsed.migrations : [],
    };
  } catch {
    return { rounds: [], practice: [], insights: [], migrations: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}


function byDateDesc(a, b) {
  return new Date(b.date) - new Date(a.date);
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function pctFromFraction(value) {
  if (!value || !value.includes("/")) return null;
  const [made, total] = value.split("/").map(Number);
  if (!Number.isFinite(made) || !Number.isFinite(total) || total === 0) return null;
  return Math.round((made / total) * 1000) / 10;
}

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return Number(value).toFixed(digits).replace(/\.0$/, "");
}

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function scoreToPar(hole) {
  if (!Number.isFinite(hole.score) || !Number.isFinite(hole.par)) return null;
  return hole.score - hole.par;
}

function scoreForTrend(round) {
  if (!Number.isFinite(round.score)) return null;
  return round.holesPlayed === 9 ? round.score * 2 : round.score;
}

function puttsForTrend(round) {
  if (!Number.isFinite(round.putts)) return null;
  return round.holesPlayed === 9 ? round.putts * 2 : round.putts;
}

function strokesGainedForTrend(round, category) {
  const value = round.sg?.[category];
  if (!Number.isFinite(value)) return null;
  return round.holesPlayed === 9 ? value * 2 : value;
}

function roundPar(round) {
  const holePar = (round.holes || []).reduce((sum, hole) => sum + (Number.isFinite(hole.par) ? hole.par : 0), 0);
  if (holePar) return holePar;
  return round.holesPlayed === 9 ? 36 : 72;
}

function roundToPar(round) {
  if (!Number.isFinite(round.score)) return null;
  return round.score - roundPar(round);
}

function scoreDisplay(round) {
  if (!Number.isFinite(round.score)) return "--";
  if (round.holesPlayed === 9) return `${round.score} (${round.nine === "back" ? "B9" : "F9"})`;
  return String(round.score);
}

function latestRound() {
  return [...state.rounds].sort(byDateDesc)[0];
}

function emptyState() {
  return document.querySelector("#empty-state").content.firstElementChild.cloneNode(true);
}

function activateView(viewName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `${viewName}-view`);
  });
}

function render() {
  renderToday();
  renderRounds();
  renderPractice();
  renderInsights();
}

function renderToday() {
  const latest = latestRound();
  const title = document.querySelector("#latest-title");
  const subtitle = document.querySelector("#latest-subtitle");
  const score = document.querySelector("#latest-score");
  const priority = document.querySelector("#priority-label");
  const priorityDetail = document.querySelector("#priority-detail");
  const feel = document.querySelector("#latest-feel");
  const notes = document.querySelector("#latest-notes");

  notes.innerHTML = "";

  if (!latest) {
    title.textContent = "No rounds yet";
    subtitle.textContent = "Add a round to start building your memory bank.";
    score.textContent = "--";
    priority.textContent = "Add data";
    priorityDetail.textContent = "Your biggest strokes gained leak will show here.";
    feel.textContent = "--";
    notes.append(emptyState());
    renderScoreChart([]);
    renderSgBars(null);
    return;
  }

  title.textContent = latest.course;
  subtitle.textContent = `${formatDate(latest.date)}${latest.tees ? ` · ${latest.tees} tees` : ""}`;
  score.textContent = latest.score ?? "--";

  const worst = worstStrokesGained(latest);
  priority.textContent = worst ? `${worst.label} ${formatSigned(worst.value)}` : "Review notes";
  priorityDetail.textContent = worst
    ? "Largest strokes gained gap from the latest round."
    : "Add strokes gained fields to unlock priority detection.";
  feel.textContent = firstLine(latest.notes?.feels) || "--";

  addNote(notes, "Swing feels", latest.notes?.feels);
  addNote(notes, "What worked", latest.notes?.worked);
  addNote(notes, "What cost shots", latest.notes?.leaks);
  addNote(notes, "Practice priority", latest.notes?.practicePriority);
  addNote(notes, "Mood / context", latest.notes?.mood);

  const recentRounds = [...state.rounds].sort(byDateDesc).slice(0, 5);
  renderScoreChart([...recentRounds].reverse());
  renderSgBars(averageStrokesGained(recentRounds));
}

function renderScoreChart(rounds) {
  const chart = document.querySelector("#score-chart");
  chart.innerHTML = "";
  if (!rounds.length) {
    chart.append(emptyState());
    return;
  }

  const scores = rounds.map(scoreForTrend).filter(Number.isFinite);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(1, max - min);

  rounds.forEach((round) => {
    const trendScore = scoreForTrend(round);
    if (!Number.isFinite(trendScore)) return;
    const bar = document.createElement("div");
    const height = 32 + ((trendScore - min) / range) * 70;
    bar.className = "chart-bar";
    bar.style.height = `${height}px`;
    bar.title = `${round.course}: ${scoreDisplay(round)}${round.holesPlayed === 9 ? `, ${trendScore} 18-hole pace` : ""}`;
    bar.innerHTML = `<span>${scoreDisplay(round)}</span>`;
    chart.append(bar);
  });
}

function renderSgBars(sg) {
  const wrap = document.querySelector("#sg-bars");
  wrap.innerHTML = "";
  if (!sg) return;

  [
    ["Tee", sg.tee],
    ["Approach", sg.approach],
    ["Wedge", sg.wedge],
    ["Around", sg.around],
    ["Sand", sg.sand],
    ["Putting", sg.putting],
  ].forEach(([label, value]) => {
    if (!Number.isFinite(value)) return;
    const row = document.createElement("div");
    const width = Math.min(100, Math.abs(value) * 11);
    row.className = "sg-row";
    row.innerHTML = `
      <span>${label}</span>
      <div class="sg-track">
        <div class="sg-fill ${value < 0 ? "negative" : ""}" style="width:${width}%"></div>
      </div>
      <strong>${formatSigned(value)}</strong>
    `;
    wrap.append(row);
  });
}

function averageStrokesGained(rounds) {
  const categories = ["total", "teeToGreen", "tee", "approach", "wedge", "around", "sand", "putting"];
  return categories.reduce((summary, category) => {
    summary[category] = average(rounds.map((round) => strokesGainedForTrend(round, category)));
    return summary;
  }, {});
}

function renderRounds() {
  const list = document.querySelector("#round-list");
  const count = document.querySelector("#round-count");
  const rounds = [...state.rounds].sort(byDateDesc);
  count.textContent = `${rounds.length} ${rounds.length === 1 ? "round" : "rounds"}`;
  list.innerHTML = "";

  if (!rounds.length) {
    list.append(emptyState());
    return;
  }

  rounds.forEach((round) => {
    const card = document.createElement("article");
    card.className = "round-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${round.course}</h3>
          <p>${formatDate(round.date)}${round.tees ? ` · ${round.tees}` : ""}</p>
        </div>
        <strong>${scoreDisplay(round)}</strong>
      </header>
      <div class="stat-strip">
        <span>Front 9<strong>${round.front ?? "--"}</strong></span>
        <span>Back 9<strong>${round.back ?? "--"}</strong></span>
        <span>SG OTT<strong>${formatSigned(round.sg?.tee)}</strong></span>
        <span>SG APP<strong>${formatSigned(round.sg?.approach)}</strong></span>
        <span>SG PUTT<strong>${formatSigned(round.sg?.putting)}</strong></span>
        <span>GIR<strong>${round.gir || "--"}</strong></span>
      </div>
      <p>${firstLine(round.notes?.practicePriority) || firstLine(round.notes?.feels) || "No notes yet."}</p>
    `;
    list.append(card);
  });
}

function renderPractice() {
  const list = document.querySelector("#practice-list");
  const count = document.querySelector("#practice-count");
  const sessions = [...state.practice].sort(byDateDesc);
  count.textContent = `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`;
  list.innerHTML = "";

  if (!sessions.length) {
    list.append(emptyState());
    return;
  }

  sessions.forEach((session) => {
    const card = document.createElement("article");
    card.className = "round-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${session.type}</h3>
          <p>${formatDate(session.date)}${session.themes ? ` · ${session.themes}` : ""}</p>
        </div>
      </header>
      <p>${session.notes || "No notes yet."}</p>
      ${session.transfer ? `<p><strong>Transfer:</strong> ${session.transfer}</p>` : ""}
    `;
    list.append(card);
  });
}

function renderInsights() {
  const select = document.querySelector("#course-filter");
  const courses = [...new Set(state.rounds.map((round) => round.course).filter(Boolean))].sort();
  const previous = select.value;
  select.innerHTML = `<option value="all">All courses</option>${courses
    .map((course) => `<option value="${course}">${course}</option>`)
    .join("")}`;
  select.value =
    previous === "all" || courses.includes(previous)
      ? previous
      : "all";

  const filtered =
    select.value === "all" ? state.rounds : state.rounds.filter((round) => round.course === select.value);
  const holes = filtered.flatMap((round) => round.holes || []);
  const scoredRounds = filtered.filter((round) => Number.isFinite(roundToPar(round)));
  const bestRound = [...scoredRounds].sort((a, b) => roundToPar(a) - roundToPar(b))[0];
  const worstRound = [...scoredRounds].sort((a, b) => roundToPar(b) - roundToPar(a))[0];
  document.querySelector("#best-to-par").textContent = bestRound
    ? `${scoreDisplay(bestRound)} ${formatSigned(roundToPar(bestRound))}`
    : "--";
  document.querySelector("#worst-to-par").textContent = worstRound
    ? `${scoreDisplay(worstRound)} ${formatSigned(roundToPar(worstRound))}`
    : "--";
  document.querySelector("#front-avg").textContent = formatNumber(average(filtered.map((round) => round.front)));
  document.querySelector("#back-avg").textContent = formatNumber(average(filtered.map((round) => round.back)));
  document.querySelector("#avg-putts").textContent = formatNumber(average(filtered.map(puttsForTrend)));
  document.querySelector("#par3-avg").textContent = formatNumber(
    average(holes.filter((hole) => hole.par === 3).map((hole) => hole.score)),
  );
  document.querySelector("#par4-avg").textContent = formatNumber(
    average(holes.filter((hole) => hole.par === 4).map((hole) => hole.score)),
  );
  document.querySelector("#par5-avg").textContent = formatNumber(
    average(holes.filter((hole) => hole.par === 5).map((hole) => hole.score)),
  );

  renderHoleTable(filtered);
  renderSavedInsights();

  const insights = buildInsights(filtered);
  const list = document.querySelector("#insight-list");
  list.innerHTML = "";
  if (!insights.length) {
    list.append(emptyState());
    return;
  }
  insights.forEach((insight) => addNote(list, insight.title, insight.body));
}

function renderSavedInsights() {
  const list = document.querySelector("#saved-insight-list");
  const count = document.querySelector("#saved-insight-count");
  const insights = [...(state.insights || [])].sort(byDateDesc);
  count.textContent = `${insights.length} saved`;
  list.innerHTML = "";

  if (!insights.length) {
    list.append(emptyState());
    return;
  }

  insights.forEach((insight) => {
    const note = document.createElement("article");
    note.className = "note";
    note.innerHTML = `
      <strong>${insight.title || "Saved insight"}</strong>
      <p>${insight.body || ""}</p>
      <small>${formatDate(insight.date)}${insight.category ? ` · ${insight.category}` : ""}</small>
    `;
    list.append(note);
  });
}

function renderHoleTable(rounds) {
  const body = document.querySelector("#hole-table-body");
  body.innerHTML = "";
  const holes = rounds.flatMap((round) => round.holes || []);

  if (!holes.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7">No hole-level data yet.</td>`;
    body.append(row);
    return;
  }

  const summaries = Array.from({ length: 18 }, (_, index) => summarizeHole(holes, index + 1));
  updateHoleSortButtons();

  if (holeTableSort.key === "hole" && holeTableSort.direction === "asc") {
    summaries.slice(0, 9).forEach((summary) => body.append(holeSummaryRow(summary)));
    body.append(nineSummaryRow("Front 9", rounds, "front"));
    summaries.slice(9).forEach((summary) => body.append(holeSummaryRow(summary)));
    body.append(nineSummaryRow("Back 9", rounds, "back"));
    return;
  }

  [...summaries].sort(compareHoleSummaries).forEach((summary) => body.append(holeSummaryRow(summary)));
}

function summarizeHole(holes, holeNumber) {
  const matches = holes.filter((hole) => hole.hole === holeNumber);
  const fairwayValues = matches.map((hole) => hole.fairway).filter((value) => typeof value === "boolean");
  const girValues = matches.map((hole) => hole.gir).filter((value) => typeof value === "boolean");
  return {
    hole: holeNumber,
    count: matches.length,
    par: matches.find((hole) => Number.isFinite(hole.par))?.par,
    avgScore: average(matches.map((hole) => hole.score)),
    avgToPar: average(matches.map(scoreToPar)),
    avgPutts: average(matches.map((hole) => hole.putts)),
    girPct: percentFromBooleans(girValues),
    fairwayPct: percentFromBooleans(fairwayValues),
  };
}

function holeSummaryRow(summary) {
  const row = document.createElement("tr");
  const scoreClass = summary.avgToPar < 0 ? "good" : summary.avgToPar > 0.75 ? "bad" : "";
  row.innerHTML = `
    <td>${summary.hole}</td>
    <td><span class="par-pill">${summary.par ? `P${summary.par}` : "--"}</span></td>
    <td class="${scoreClass}">${formatNumber(summary.avgScore, 2)}</td>
    <td class="to-par-cell" style="${toParGradientStyle(summary.avgToPar)}">${formatSigned(summary.avgToPar)}</td>
    <td>${formatNumber(summary.avgPutts, 1)}</td>
    <td class="${percentClass(summary.girPct)}">${formatPercent(summary.girPct)}</td>
    <td class="${percentClass(summary.fairwayPct)}">${formatPercent(summary.fairwayPct)}</td>
  `;
  return row;
}

function toParGradientStyle(value) {
  if (!Number.isFinite(value)) return "";
  if (value < 0) {
    const intensity = Math.min(1, Math.abs(value) / 1.25);
    return `--to-par-bg: rgba(22, 163, 74, ${0.18 + intensity * 0.34}); --to-par-color: #14532d;`;
  }

  if (value === 0) {
    return "--to-par-bg: rgba(22, 163, 74, 0.1); --to-par-color: #334155;";
  }

  const intensity = Math.min(1, value / 2);
  const alpha = 0.14 + intensity * 0.48;
  const color = value >= 0.75 ? "#7f1d1d" : "#334155";
  return `--to-par-bg: rgba(220, 38, 38, ${alpha}); --to-par-color: ${color};`;
}

function compareHoleSummaries(a, b) {
  const direction = holeTableSort.direction === "asc" ? 1 : -1;
  const aValue = summarySortValue(a, holeTableSort.key);
  const bValue = summarySortValue(b, holeTableSort.key);

  if (!Number.isFinite(aValue) && !Number.isFinite(bValue)) return a.hole - b.hole;
  if (!Number.isFinite(aValue)) return 1;
  if (!Number.isFinite(bValue)) return -1;
  if (aValue === bValue) return a.hole - b.hole;
  return (aValue - bValue) * direction;
}

function summarySortValue(summary, key) {
  return {
    hole: summary.hole,
    par: summary.par,
    avgScore: summary.avgScore,
    avgToPar: summary.avgToPar,
    avgPutts: summary.avgPutts,
    girPct: summary.girPct,
    fairwayPct: summary.fairwayPct,
  }[key];
}

function updateHoleSortButtons() {
  document.querySelectorAll("[data-sort-key]").forEach((button) => {
    const active = button.dataset.sortKey === holeTableSort.key;
    button.classList.toggle("active", active);
    button.dataset.direction = active ? holeTableSort.direction : "";
    button.setAttribute(
      "aria-label",
      active ? `Sort by ${button.textContent}, ${holeTableSort.direction}ending` : `Sort by ${button.textContent}`,
    );
  });
}

function nineSummaryRow(label, rounds, nine) {
  const values = rounds
    .map((round) => (nine === "front" ? round.front : round.back))
    .filter(Number.isFinite);
  const row = document.createElement("tr");
  row.className = "nine-summary-row";
  row.innerHTML = `<td colspan="3">${label}</td><td colspan="4">${formatNumber(average(values), 1)} avg (${values.length} ${
    values.length === 1 ? "round" : "rounds"
  })</td>`;
  return row;
}

function percentFromBooleans(values) {
  if (!values.length) return null;
  return (values.filter(Boolean).length / values.length) * 100;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "--";
  return `${Math.round(value)}%`;
}

function percentClass(value) {
  if (!Number.isFinite(value)) return "";
  if (value >= 67) return "good";
  if (value <= 34) return "bad";
  return "";
}

function buildInsights(rounds) {
  if (!rounds.length) return [];
  const recent = [...rounds].sort(byDateDesc).slice(0, 5);
  const sgCategories = ["tee", "approach", "wedge", "around", "sand", "putting"];
  const sgAverages = sgCategories
    .map((key) => ({
      key,
      label: labelForSg(key),
      value: average(recent.map((round) => round.sg?.[key])),
    }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => a.value - b.value);

  const insights = [];
  const avgScore = average(recent.map(scoreForTrend));
  if (Number.isFinite(avgScore)) {
    insights.push({
      title: "Recent scoring",
      body: `Your last ${recent.length} logged round${recent.length === 1 ? "" : "s"} average ${formatNumber(
        avgScore,
      )}.`,
    });
  }

  if (sgAverages.length) {
    const worst = sgAverages[0];
    const best = sgAverages[sgAverages.length - 1];
    insights.push({
      title: "Practice priority",
      body: `${worst.label} is the largest strokes gained gap recently at ${formatSigned(
        worst.value,
      )}. Keep checking whether practice notes connect to this category.`,
    });
    insights.push({
      title: "Current strength",
      body: `${best.label} is your strongest strokes gained category recently at ${formatSigned(best.value)}.`,
    });
  }

  const penaltyAvg = average(recent.map((round) => round.penalties));
  if (Number.isFinite(penaltyAvg) && penaltyAvg >= 2) {
    insights.push({
      title: "Penalty watch",
      body: `You are averaging ${formatNumber(penaltyAvg)} penalties recently. Track whether they come from start line, club choice, or commitment.`,
    });
  }

  const practice = [...state.practice].sort(byDateDesc).slice(0, 3);
  if (practice.length) {
    insights.push({
      title: "Practice thread",
      body: `Recent sessions are focused on ${practice.map((session) => session.themes || session.type).join(", ")}.`,
    });
  }

  return insights;
}

function addNote(container, title, body) {
  if (!body) return;
  const note = document.createElement("article");
  note.className = "note";
  note.innerHTML = `<strong>${title}</strong><p>${body}</p>`;
  container.append(note);
}

function worstStrokesGained(round) {
  if (!round.sg) return null;
  return [
    ["Tee", round.sg.tee],
    ["Approach", round.sg.approach],
    ["Wedge", round.sg.wedge],
    ["Around", round.sg.around],
    ["Sand", round.sg.sand],
    ["Putting", round.sg.putting],
  ]
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => a[1] - b[1])
    .map(([label, value]) => ({ label, value }))[0];
}

function labelForSg(key) {
  return {
    tee: "Tee shot",
    approach: "Approach",
    wedge: "Wedge",
    around: "Around the green",
    sand: "Sand",
    putting: "Putting",
  }[key];
}

function firstLine(value) {
  return value?.split("\n").map((line) => line.trim()).find(Boolean) || "";
}

function formatSigned(value) {
  if (!Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${formatNumber(value, 2)}`;
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${dateString}T12:00:00`),
  );
}

function serializeRound(form) {
  const data = new FormData(form);
  return {
    id: crypto.randomUUID(),
    date: data.get("date"),
    course: data.get("course")?.trim(),
    tees: data.get("tees")?.trim(),
    score: numberOrNull(data.get("score")),
    front: numberOrNull(data.get("front")),
    back: numberOrNull(data.get("back")),
    fairways: data.get("fairways")?.trim(),
    gir: data.get("gir")?.trim(),
    putts: numberOrNull(data.get("putts")),
    penalties: numberOrNull(data.get("penalties")),
      sg: {
        total: numberOrNull(data.get("sgTotal")),
        teeToGreen: numberOrNull(data.get("sgTeeToGreen")),
        tee: numberOrNull(data.get("sgTee")),
      approach: numberOrNull(data.get("sgApproach")),
      wedge: numberOrNull(data.get("sgWedge")),
      around: numberOrNull(data.get("sgAround")),
      sand: numberOrNull(data.get("sgSand")),
      putting: numberOrNull(data.get("sgPutting")),
    },
    notes: {
      feels: data.get("feels")?.trim(),
      worked: data.get("worked")?.trim(),
      leaks: data.get("leaks")?.trim(),
      practicePriority: data.get("practicePriority")?.trim(),
      mood: data.get("mood")?.trim(),
    },
    screenshots: [...form.elements.screenshots.files].map((file) => file.name),
    holes: parseHoleDetails(data.get("holeDetails")),
    derived: {
      fairwayPct: pctFromFraction(data.get("fairways")),
      girPct: pctFromFraction(data.get("gir")),
    },
    createdAt: new Date().toISOString(),
  };
}

function parseHoleDetails(value) {
  if (!value?.trim()) return [];
  return value
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hole, par, score, fairway, gir, putts, penalties] = line.split(",").map((part) => part.trim());
      return {
        hole: numberOrNull(hole),
        par: numberOrNull(par),
        score: numberOrNull(score),
        fairway: parseBooleanish(fairway),
        gir: parseBooleanish(gir),
        putts: numberOrNull(putts),
        penalties: numberOrNull(penalties) || 0,
      };
    })
    .filter((hole) => Number.isFinite(hole.hole) && Number.isFinite(hole.par) && Number.isFinite(hole.score));
}

function parseBooleanish(value) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (["y", "yes", "true", "1", "hit"].includes(normalized)) return true;
  if (["n", "no", "false", "0", "miss"].includes(normalized)) return false;
  return null;
}

function serializePractice(form) {
  const data = new FormData(form);
  return {
    id: crypto.randomUUID(),
    date: data.get("date"),
    type: data.get("type"),
    themes: data.get("themes")?.trim(),
    notes: data.get("notes")?.trim(),
    transfer: data.get("transfer")?.trim(),
    createdAt: new Date().toISOString(),
  };
}

function backupFilename() {
  return `golf-journal-${new Date().toISOString().slice(0, 10)}.json`;
}

function backupBlob() {
  const payload = {
    ...state,
    exportedAt: new Date().toISOString(),
    app: "Golf Round Journal",
    version: 1,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function backupData() {
  const blob = backupBlob();
  const filename = backupFilename();

  if (typeof File === "function" && navigator.canShare && navigator.share) {
    const file = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Golf Journal Backup",
          text: "Save this JSON backup somewhere durable, like iCloud Drive.",
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
  }

  downloadBlob(blob, filename);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activateView(tab.dataset.view));
});

document.querySelector("#round-form").addEventListener("submit", (event) => {
  event.preventDefault();
  state.rounds.push(serializeRound(event.currentTarget));
  saveState();
  event.currentTarget.reset();
  render();
  activateView("today");
});

document.querySelector("#practice-form").addEventListener("submit", (event) => {
  event.preventDefault();
  state.practice.push(serializePractice(event.currentTarget));
  saveState();
  event.currentTarget.reset();
  render();
});

document.querySelector("#demo-data").addEventListener("click", () => {
  const existingIndex = state.rounds.findIndex(
    (round) => round.date === demoRound.date && round.course === demoRound.course && round.score === demoRound.score,
  );
  if (existingIndex >= 0) {
    state.rounds[existingIndex] = { ...demoRound, id: state.rounds[existingIndex].id };
  } else {
    state.rounds.push({ ...demoRound, id: crypto.randomUUID() });
  }
  saveState();
  render();
});

document.querySelector("#course-filter").addEventListener("change", renderInsights);

document.querySelectorAll("[data-sort-key]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.sortKey;
    if (holeTableSort.key === key) {
      holeTableSort.direction = holeTableSort.direction === "asc" ? "desc" : "asc";
    } else {
      holeTableSort.key = key;
      holeTableSort.direction = key === "girPct" || key === "fairwayPct" ? "desc" : "asc";
    }
    renderInsights();
  });
});

document.querySelector("#export-data").addEventListener("click", backupData);

document.querySelector("#import-data").addEventListener("change", async (event) => {
  const [file] = event.currentTarget.files;
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    state.rounds = Array.isArray(imported.rounds) ? imported.rounds : state.rounds;
    state.practice = Array.isArray(imported.practice) ? imported.practice : state.practice;
    state.insights = Array.isArray(imported.insights) ? imported.insights : state.insights;
    state.migrations = Array.isArray(imported.migrations) ? imported.migrations : state.migrations;
    saveState();
    render();
  } finally {
    event.currentTarget.value = "";
  }
});

document.querySelector("#copy-summary").addEventListener("click", async () => {
  const insights = [...document.querySelectorAll("#insight-list .note")]
    .map((note) => `${note.querySelector("strong").textContent}: ${note.querySelector("p").textContent}`)
    .join("\n");
  if (insights) await navigator.clipboard.writeText(insights);
});

document.querySelectorAll('input[type="date"]').forEach((input) => {
  input.value = new Date().toISOString().slice(0, 10);
});

registerServiceWorker();
render();
