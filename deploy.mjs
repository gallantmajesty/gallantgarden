import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = "prj_mCqr14GClpyjaWdM844hf3X0KloS";
const TEAM_ID = "team_sSKHeAJSeDNUAiSakopMEEQ1";
const DIST = join(import.meta.dirname, "dist");

function sha1(buf) {
  return createHash("sha1").update(buf).digest("hex");
}

function walk(dir, base = DIST) {
  const entries = [];
  for (const d of readdirSync(dir)) {
    const p = join(dir, d);
    const s = statSync(p);
    if (s.isDirectory()) entries.push(...walk(p, base));
    else {
      const rel = relative(base, p).replace(/\\/g, "/");
      const buf = readFileSync(p);
      entries.push({ file: rel, buf, size: s.size, sha: sha1(buf) });
    }
  }
  return entries;
}

console.log("Collecting files from dist/...");
const files = walk(DIST);
console.log(`Found ${files.length} files`);

const fileManifest = files.map((f) => ({
  file: f.file,
  sha: f.sha,
  size: f.size,
}));

console.log("Creating deployment...");
const res = await fetch(
  `https://api.vercel.com/v13/deployments?forceNew=1`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "focuslily",
      project: PROJECT_ID,
      target: "production",
      files: fileManifest,
    }),
  }
);

const data = await res.json();

if (!res.ok) {
  console.error("Deploy creation failed:", JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log("Deployment created:", data.url);
console.log("ID:", data.id);

const uploadList = data.uploading ?? [];

if (uploadList.length === 0) {
  console.log("All files already on Vercel — deployment should go live automatically.");
  console.log("URL:", `https://${data.url}`);
} else {
  console.log(`Uploading ${uploadList.length} files...`);
  
  for (const item of uploadList) {
    const entry = files.find((f) => f.file === item.file);
    if (!entry) {
      console.error(`  SKIP: ${item.file} not found locally`);
      continue;
    }
    const kb = (entry.size / 1024).toFixed(0);
    process.stdout.write(`  ${entry.file} (${kb}KB)... `);

    const uploadRes = await fetch(item.reqUrls[0], {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-content-sha1": entry.sha,
      },
      body: entry.buf,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error(`FAIL ${uploadRes.status}: ${err.slice(0, 200)}`);
    } else {
      console.log("OK");
    }
  }

  console.log("\nDeployment URL:", `https://${data.url}`);
}
