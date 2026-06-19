#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const roundsPath = process.argv[2] || path.join(root, "data/rounds.csv");
const holesPath = process.argv[3] || path.join(root, "data/holes.csv");
const strict = process.argv.includes("--strict");
const holeCountEnforcedFrom = process.env.GOLF_VALIDATE_HOLE_COUNT_FROM || "2026-06-19";

const ROUND_HEADER = [
  "date",
  "course",
  "tees",
  "holes",
  "nine",
  "score",
  "front_9",
  "back_9",
  "sg_total",
  "sg_t2g",
  "sg_ott",
  "sg_app",
  "sg_wedge",
  "sg_arg",
  "sg_sand",
  "sg_putting",
  "gir",
  "fairways",
  "putts",
  "penalties",
  "summary",
];

const HOLE_HEADER = [
  "date",
  "course",
  "tees",
  "round_score",
  "hole",
  "par",
  "score",
  "to_par",
  "fairway",
  "gir",
  "putts",
  "penalties",
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((c === "\n" || c === "\r") && !inQuotes) {
      if (c === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += c;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function readCsv(filePath) {
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  const [header = [], ...body] = rows;
  return {
    header,
    records: body.map((row, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(header.map((key, columnIndex) => [key, row[columnIndex] ?? ""])),
      width: row.length,
    })),
  };
}

function keyFor(row) {
  return `${row.date}|${row.course}|${row.tees}`;
}

function isInt(value) {
  return /^-?\d+$/.test(String(value));
}

function isDecimal(value) {
  return /^[-+]?\d+(\.\d+)?$/.test(String(value));
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function isFraction(value) {
  return value === "" || /^\d+\/\d+$/.test(String(value));
}

function addFailure(failures, file, row, message) {
  failures.push(`${file}${row ? ` row ${row}` : ""}: ${message}`);
}

function addWarning(warnings, file, row, message) {
  warnings.push(`${file}${row ? ` row ${row}` : ""}: ${message}`);
}

function validate() {
  const failures = [];
  const warnings = [];
  const roundsCsv = readCsv(roundsPath);
  const holesCsv = readCsv(holesPath);

  if (roundsCsv.header.join(",") !== ROUND_HEADER.join(",")) {
    addFailure(failures, roundsPath, null, `header must be exactly ${ROUND_HEADER.join(",")}`);
  }
  if (holesCsv.header.join(",") !== HOLE_HEADER.join(",")) {
    addFailure(failures, holesPath, null, `header must be exactly ${HOLE_HEADER.join(",")}`);
  }

  const roundKeys = new Map();
  for (const record of roundsCsv.records) {
    const row = record.values;
    const key = keyFor(row);

    if (roundKeys.has(key)) {
      addFailure(failures, roundsPath, record.rowNumber, `duplicate round key ${key}`);
    }
    roundKeys.set(key, row);

    if (!isIsoDate(row.date)) addFailure(failures, roundsPath, record.rowNumber, "date must be YYYY-MM-DD");
    if (row.course === "Falmouth CC" || row.course === "Falmouth") {
      addFailure(failures, roundsPath, record.rowNumber, 'Falmouth must be "Falmouth Country Club"');
    }
    if (!["9", "18"].includes(row.holes)) addFailure(failures, roundsPath, record.rowNumber, "holes must be 9 or 18");
    if (!["", "front", "back"].includes(row.nine)) {
      addFailure(failures, roundsPath, record.rowNumber, "nine must be front, back, or blank");
    }
    if (row.holes === "18" && row.nine !== "") {
      addFailure(failures, roundsPath, record.rowNumber, "nine must be blank for 18-hole rounds");
    }

    ["score", "front_9", "back_9", "putts", "penalties"].forEach((field) => {
      if (row[field] !== "" && !isInt(row[field])) {
        addFailure(failures, roundsPath, record.rowNumber, `${field} must be an integer or blank`);
      }
    });

    ["sg_total", "sg_t2g", "sg_ott", "sg_app", "sg_wedge", "sg_arg", "sg_sand", "sg_putting"].forEach((field) => {
      if (row[field] !== "" && !isDecimal(row[field])) {
        addFailure(failures, roundsPath, record.rowNumber, `${field} must be a signed decimal or blank`);
      }
    });

    ["gir", "fairways"].forEach((field) => {
      if (!isFraction(row[field])) {
        addFailure(failures, roundsPath, record.rowNumber, `${field} must be made/total or blank`);
      }
    });
  }

  const holesByRound = new Map();
  for (const record of holesCsv.records) {
    const row = record.values;
    const key = keyFor(row);

    if (!roundKeys.has(key)) {
      addFailure(failures, holesPath, record.rowNumber, `orphan hole row has no parent round key ${key}`);
    }

    if (!isIsoDate(row.date)) addFailure(failures, holesPath, record.rowNumber, "date must be YYYY-MM-DD");
    ["round_score", "hole", "par", "score", "putts", "penalties"].forEach((field) => {
      if (row[field] !== "" && !isInt(row[field])) {
        addFailure(failures, holesPath, record.rowNumber, `${field} must be an integer or blank`);
      }
    });
    if (row.to_par !== "" && !isInt(row.to_par)) {
      addFailure(failures, holesPath, record.rowNumber, "to_par must be an integer or blank");
    }

    ["fairway", "gir"].forEach((field) => {
      if (!["", "TRUE", "FALSE"].includes(row[field])) {
        addFailure(failures, holesPath, record.rowNumber, `${field} must be TRUE, FALSE, or blank`);
      }
    });

    if (row.par === "3" && row.fairway !== "") {
      addFailure(failures, holesPath, record.rowNumber, "par-3 fairway must be blank");
    }

    if (!holesByRound.has(key)) holesByRound.set(key, []);
    holesByRound.get(key).push(row);
  }

  for (const [key, row] of roundKeys.entries()) {
    const expected = Number(row.holes);
    const actual = holesByRound.get(key)?.length ?? 0;
    if (actual !== expected) {
      const roundIndex = roundsCsv.records.find((record) => record.values === row)?.rowNumber;
      const message = `hole count is ${actual}; expected ${expected} for ${key}`;
      if (strict || row.date >= holeCountEnforcedFrom) {
        addFailure(failures, roundsPath, roundIndex, message);
      } else {
        addWarning(warnings, roundsPath, roundIndex, `${message} (historical backfill warning)`);
      }
    }
  }

  if (failures.length) {
    console.error(`CSV validation failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (warnings.length) {
    console.warn(`CSV validation passed with ${warnings.length} warning${warnings.length === 1 ? "" : "s"}:`);
    warnings.forEach((warning) => console.warn(`- ${warning}`));
  }

  console.log(
    `CSV validation passed: ${roundsCsv.records.length} round rows, ${holesCsv.records.length} hole rows.`,
  );
}

validate();
