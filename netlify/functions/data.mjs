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
  {
    id: "2026-11-01-pergola-later",
    async run(store) {
      const f = (await store.get("items/p7-01", { type: "json" })) || { phase: "p7", status: "todo", order: 1, cat: "Υλικά + εργασία", est: 4000 };
      await store.setJSON("items/p7-01", {
        ...f,
        title: "Δάπεδα 60×120 γκρι ~89 τ.μ. εσωτερικά + τοποθέτηση (χωρίς πέργκολα)",
        est: Math.max(0, Number(f.est || 0) - 500),
      });
      const pg = (await store.get("items/p8-05", { type: "json" })) || { phase: "p8", status: "todo", order: 5, cat: "Υλικά + εργασία", est: 3000 };
      await store.setJSON("items/p8-05", {
        ...pg,
        title: "Πέργκολα σαλονιού + δάπεδο πέργκολας (ίδιο πλακάκι R11, ~12,5 τ.μ.)",
        est: Number(pg.est || 0) + 500,
        later: true,
      });
    },
  },
  {
    id: "2026-11-01-topo",
    async run(store) {
      const t = (await store.get("items/p1-02", { type: "json" })) || { phase: "p1", status: "todo", order: 2, cat: "Υπηρεσία", est: 500 };
      await store.setJSON("items/p1-02", {
        ...t,
        title: "Συμπλήρωση τοπογραφικού (έγινε για συμβόλαιο) ώστε να καλύπτει την οικοδομική άδεια",
        note: "Ρωτήστε πρώτα τον τοπογράφο που το έκανε: έχει ήδη τις μετρήσεις.",
      });
    },
  },
  {
    id: "2026-11-01-rolls-screens",
    async run(store) {
      if (!(await store.get("items/p5-07", { type: "json" })))
        await store.setJSON("items/p5-07", {
          phase: "p5", status: "todo", order: 4.5, cat: "Υλικά + εργασία",
          title: "Εξωτερικά ρολά με μοτέρ ×8 (τζαμαρία, Σ2/Σ3, κουζίνα ×2, υπνοδωμάτια ×3) + σίτες σε όλα τα ανοιγόμενα",
          est: 4500,
          note: "Ρολά ~3.500 € (κουτιά χωνευτά στη θερμοπρόσοψη) + σίτες ~1.000 €. Εκτίμηση μέχρι την προσφορά του αλουμινά.",
        });
    },
  },
  {
    id: "2026-11-01-smart-home",
    async run(store) {
      if (!(await store.get("items/p6-10", { type: "json" })))
        await store.setJSON("items/p6-10", {
          phase: "p6", status: "todo", order: 10, cat: "Υλικά",
          title: "Έξυπνο σπίτι: κέντρο Home Assistant, ρελέ ρολών ×8, έξυπνα dimmer φωτισμού ×9, 2 Wi-Fi access points, αισθητήρες",
          est: 1200,
          note: "Τις συσκευές τις αγοράζουμε εμείς· ο ηλεκτρολόγος βάζει ουδέτερο και βαθιά κουτιά (μελέτη 9). Την εφαρμογή τη φτιάχνουμε μαζί.",
        });
    },
  },
  {
    id: "2026-11-01-no-tall-windows",
    async run(store) {
      const upd = async (key, fn) => { const it = await store.get(key, { type: "json" }); if (it) await store.setJSON(key, fn(it)); };
      await upd("items/p5-04", (it) => ({ ...it, est: Math.max(0, Number(it.est || 0) - 1000),
        title: "Κουφώματα αλουμινίου με θερμοδιακοπή: τζαμαρία σαλονιού 4,4 μ., κουζίνα ×2, υπνοδωμάτια ×3, μπάνιο, πλυσταριό + πόρτα πλυσταριού (χωρίς τα 2 στενά δίπλα στο τζάκι)" }));
      await upd("items/p5-07", (it) => ({ ...it, est: 3800,
        title: "Εξωτερικά ρολά με μοτέρ ×6 (τζαμαρία, κουζίνα ×2, υπνοδωμάτια ×3) + σίτες ×8",
        note: "Ρολά ~3.000 € (κουτιά χωνευτά στη θερμοπρόσοψη) + σίτες ~800 €. Εκτίμηση μέχρι την προσφορά του αλουμινά." }));
      await upd("items/p5-02", (it) => ({ ...it, est: Number(it.est || 0) + 500,
        title: "Εσωτερικά χωρίσματα: διπλή γυψοσανίδα ανά πλευρά + ηχομόνωση, μαζί με 2 φωτιζόμενες ραφιέρες δίπλα στο τζάκι" }));
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
