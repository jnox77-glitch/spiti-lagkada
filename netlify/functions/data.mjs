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
    // Superseded by the next one (the 700 € was fire detection, not the alarm); kept so it never re-runs out of order.
    id: "2026-11-01-alarm",
    async run() {},
  },
  {
    id: "2026-11-01-budget-petros",
    async run(store) {
      const patch = async (key, base, changes) => {
        const it = (await store.get(key, { type: "json" })) || base;
        await store.setJSON(key, { ...it, ...changes });
      };
      const p6 = (order, est) => ({ phase: "p6", status: "todo", order, est, cat: "Υλικά + εργασία" });
      await patch("items/p6-04", p6(4, 5500), {
        title: "Ηλεκτρολογικά σύνολο: καλωδιώσεις, πίνακας, πρίζες, διακόπτες, κρυφός φωτισμός LED, προεγκατάσταση συναγερμού",
        quote: 5000,
        note: "Υλικά + εργασία, όλο το σπίτι.",
      });
      await patch("items/p6-05", p6(5, 1800), {
        title: "Φωτισμός LED — μέσα στα ηλεκτρολογικά (5.000 €)",
        quote: 0,
      });
      await patch("items/p6-06", p6(6, 900), {
        title: "Συναγερμός Ajax (ασύρματος) — αργότερα",
        quote: 600,
        later: true,
        note: "Τώρα μόνο προεγκατάσταση, μέσα στα ηλεκτρολογικά.",
      });
      await patch("items/p6-09", p6(9, 700), {
        title: "Πυρανίχνευση Olympia Electronics (βασικό σετ) + γραμμές από μάστορα",
        quote: 700,
        note: "Σετ ~500 € + εργατικά 200 €.",
      });
      await patch("items/p6-08", p6(8, 3500), {
        title: "Υδραυλικά & αποχετεύσεις εσωτερικά",
        quote: 2000,
        note: "Υλικά + εργασία.",
      });
    },
  },
  {
    id: "2026-11-01-plumbing-doors",
    async run(store) {
      const patch = async (key, base, changes) => {
        const it = (await store.get(key, { type: "json" })) || base;
        await store.setJSON(key, { ...it, ...changes });
      };
      await patch("items/p6-08", { phase: "p6", status: "todo", order: 8, est: 3500, cat: "Υλικά + εργασία" }, {
        title: "Υδραυλικά & αποχετεύσεις εσωτερικά",
        quote: 3500,
        note: "Υλικά + εργασία.",
      });
      await patch("items/p7-08", { phase: "p7", status: "todo", order: 8, est: 2000, cat: "Υλικά + εργασία" }, {
        title: "Εσωτερικές πόρτες ×4 με τοποθέτηση",
        quote: 1200,
      });
    },
  },
  {
    id: "2026-11-01-kitchen",
    async run(store) {
      const patch = async (key, base, changes) => {
        const it = (await store.get(key, { type: "json" })) || base;
        await store.setJSON(key, { ...it, ...changes });
      };
      await patch("items/p7-02", { phase: "p7", status: "todo", order: 2, est: 6000, cat: "Υλικά + εργασία" }, {
        title: "Κουζίνα: ντουλάπια & πάγκος",
        quote: 3500,
      });
      await patch("items/p7-03", { phase: "p7", status: "todo", order: 3, est: 2500, cat: "Υλικά" }, {
        title: "Ηλεκτρικές συσκευές κουζίνας — τις έχουμε",
        quote: 0,
      });
    },
  },
  {
    id: "2026-11-01-split-etics",
    async run(store) {
      const key = "items/p5-01";
      const it = (await store.get(key, { type: "json" })) || { phase: "p5", status: "todo", order: 1, cat: "Υλικά + εργασία" };
      await store.setJSON(key, {
        ...it,
        title: "Εξωτερικοί τοίχοι ξηράς δόμησης ~115 τ.μ. (σκελετός, τσιμεντοσανίδα, ορυκτοβάμβακας, γυψοσανίδα από μέσα)",
        est: 7000,
      });
      if (!(await store.get("items/p5-06", { type: "json" })))
        await store.setJSON("items/p5-06", {
          phase: "p5", status: "todo", order: 1.5, cat: "Υλικά + εργασία",
          title: "Θερμοπρόσοψη ETICS ~125 τ.μ.: 8 εκ. EPS γραφίτη, μαζί με κολώνες, δοκούς, στηθαία, σιλικονούχος σοβάς",
          est: 5500,
          note: "Χωριστό συνεργείο από την ξηρά δόμηση.",
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
