import { getStore } from "@netlify/blobs";
import seed from "./seed.json";

// One store for the whole house project; each record is one key ("items/p1-01", "wishes/w01", "meta/project").
const STORE = { name: "spiti-lagkada", consistency: "strong", region: "eu-central-1" };
const COLLECTIONS = ["items", "wishes", "questions", "meta"];
const PATH_RE = /^(items|wishes|questions|meta)\/[A-Za-z0-9_-]{1,60}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// One-off data fixes, applied once on the next read and recorded in meta/migrations.
const MIGRATIONS = [
  {
    id: "2026-11-01-alarm",
    async run(store) {
      const key = "items/p6-06";
      const it = (await store.get(key, { type: "json" })) || {};
      await store.setJSON(key, {
        phase: "p6", status: "todo", order: 6, est: 900, cat: "Υλικά + εργασία",
        ...it,
        title: "Συναγερμός Olympia Electronics (βασικό σετ) + πέρασμα γραμμών",
        quote: 700,
        note: "Σετ ~500 € + εργατικά μάστορα για τις γραμμές 200 €. Κάμερες εκτός.",
      });
    },
  },
];

async function migrate(store) {
  const done = (await store.get("meta/migrations", { type: "json" })) || { applied: [] };
  const todo = MIGRATIONS.filter((m) => !done.applied.includes(m.id));
  if (!todo.length) return;
  for (const m of todo) await m.run(store);
  await store.setJSON("meta/migrations", { applied: [...done.applied, ...todo.map((m) => m.id)] });
}

async function readAll(store) {
  const { blobs } = await store.list();
  if (blobs.length === 0) {
    // First run: load the data exported from the Claude app.
    for (const [key, value] of Object.entries(seed)) await store.setJSON(key, value);
    return readAll(store);
  }
  const out = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
  await Promise.all(
    blobs.map(async ({ key }) => {
      const [col, id] = key.split("/");
      if (!out[col]) return;
      const value = await store.get(key, { type: "json" });
      if (value) out[col].push({ id, ...value });
    })
  );
  return out;
}

export default async (req) => {
  const store = getStore(STORE);
  try {
    if (req.method === "GET") {
      await readAll(store);
      await migrate(store);
      return json(await readAll(store));
    }

    if (req.method === "PUT") {
      const { path, data } = await req.json();
      if (!PATH_RE.test(path || "") || typeof data !== "object" || data === null || Array.isArray(data))
        return json({ error: "Μη έγκυρη εγγραφή" }, 400);
      const body = JSON.stringify(data);
      if (body.length > 20000) return json({ error: "Η εγγραφή είναι πολύ μεγάλη" }, 413);
      const { id, ...clean } = data;
      await store.setJSON(path, clean);
      return json({ ok: true });
    }

    if (req.method === "DELETE") {
      const path = new URL(req.url).searchParams.get("path") || "";
      if (!PATH_RE.test(path)) return json({ error: "Μη έγκυρη εγγραφή" }, 400);
      await store.delete(path);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "Σφάλμα αποθήκευσης" }, 500);
  }
};

export const config = { path: "/api/data" };
