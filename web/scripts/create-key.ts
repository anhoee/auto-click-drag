const baseUrl = process.env.LICENSE_SERVER_URL;
const adminToken = process.env.LICENSE_ADMIN_TOKEN;

if (!baseUrl || !adminToken) {
  console.error("Set LICENSE_SERVER_URL and LICENSE_ADMIN_TOKEN first.");
  process.exit(1);
}

const daysArg = process.argv.find((arg) => arg.startsWith("--days="));
const noteArg = process.argv.find((arg) => arg.startsWith("--note="));
const durationDays = daysArg ? Number(daysArg.slice("--days=".length)) : 30;
const note = noteArg ? noteArg.slice("--note=".length) : "";

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/keys`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Token": adminToken
  },
  body: JSON.stringify({ duration_days: durationDays, note })
});

const payload = await response.json();
if (!response.ok) {
  console.error(payload);
  process.exit(1);
}

console.log(payload.key);

export {};
