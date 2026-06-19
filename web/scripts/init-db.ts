import { ensureSchema } from "../lib/license";

await ensureSchema();
console.log("Database schema is ready.");
