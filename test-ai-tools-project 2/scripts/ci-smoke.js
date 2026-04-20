const axios = require("axios");

const baseUrl = process.env.BASE_URL || "http://localhost:4000";

async function waitForHealth(url, tries = 30, delayMs = 1000) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await axios.get(`${url}/health`, { timeout: 2000 });
      if (r.status === 200 && r.data && r.data.status === "ok") return true;
    } catch (err) {
      // ignore and retry
    }
    await new Promise((res) => setTimeout(res, delayMs));
  }
  return false;
}

async function main() {
  console.log(`Running CI smoke tests against ${baseUrl}`);

  const up = await waitForHealth(baseUrl);
  if (!up) {
    console.error("Service did not become healthy in time");
    process.exit(2);
  }

  try {
    const r = await axios.get(`${baseUrl}/api/tools`, { params: { limit: 1 }, timeout: 5000 });
    if (r.status !== 200) {
      console.error("/api/tools returned non-200 status", r.status);
      process.exit(3);
    }

    if (!Array.isArray(r.data.results)) {
      console.error("/api/tools did not return results array", r.data);
      process.exit(4);
    }

    console.log("/api/tools smoke test passed (results array present)");
  } catch (err) {
    console.error("/api/tools smoke test failed:", err && err.message ? err.message : err);
    process.exit(5);
  }

  // Admin endpoints may require auth; we treat 2xx/4xx (not 5xx) as non-fatal but log result.
  try {
    const r2 = await axios.get(`${baseUrl}/api/admin/submissions`, { timeout: 5000 });
    console.log(`/api/admin/submissions returned status ${r2.status}`);
    if (r2.status >= 500) {
      console.error("Admin endpoint returned server error");
      process.exit(6);
    }
  } catch (err) {
    if (err && err.response && err.response.status >= 500) {
      console.error("Admin endpoint returned server error", err.response.status);
      process.exit(7);
    }
    console.log("Admin endpoint check did not succeed but returned no server error; continuing.");
  }

  console.log("Smoke tests complete");
  process.exit(0);
}

main();
