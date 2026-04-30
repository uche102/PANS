import fs from "node:fs";

const filePath = process.argv[2] || "/home/uche/Downloads/pans_voters_merged_with_emails.csv";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

const csv = fs.readFileSync(filePath, "utf8");
const [headers, ...dataRows] = parseCsv(csv);
const normalizedHeaders = headers.map((header) => header.trim());
const required = ["reg_no", "name", "phone_number", "email", "level"];

for (const column of required) {
  if (!normalizedHeaders.includes(column)) {
    console.error(`Missing required CSV column: ${column}`);
    process.exit(1);
  }
}

const voters = dataRows
  .map((row) => Object.fromEntries(normalizedHeaders.map((header, index) => [header, row[index] || ""])))
  .map((row) => ({
    reg_no: row.reg_no.trim().toUpperCase(),
    name: row.name.trim(),
    phone_number: row.phone_number.trim(),
    email: row.email.trim().toLowerCase(),
    level: row.level.trim(),
  }))
  .filter((row) => row.reg_no && row.name && row.email);

for (let index = 0; index < voters.length; index += 500) {
  const batch = voters.slice(index, index + 500);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/voters?on_conflict=reg_no`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(batch),
  });

  if (!response.ok) {
    console.error(await response.text());
    process.exit(1);
  }
}

console.log(`Imported ${voters.length} voters from ${filePath}`);
