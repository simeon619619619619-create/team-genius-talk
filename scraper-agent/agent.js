/**
 * Simora Local Scraper Agent
 *
 * Runs on your machine, listens for scrape tasks from Simora,
 * uses real Chrome via Puppeteer to scrape businesses.
 *
 * Usage:
 *   cd scraper-agent
 *   npm install
 *   node agent.js
 */

import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer";

// ─── CONFIG ───
const SUPABASE_URL = "https://tbnxkhbokvkwjeqnxsov.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibnh4aGJva3Zrd2plcW54c292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MTI0NTcsImV4cCI6MjA1Nzk4ODQ1N30.CM_IDCMFTfPwJWRWMqZ_JTDxVv2vfyAPi2R1J-Kgvs0";

// Login with your Simora account
const EMAIL = process.env.SIMORA_EMAIL || "info@eufashioninstitute.com";
const PASSWORD = process.env.SIMORA_PASSWORD;

if (!PASSWORD) {
  console.error("❌ Set SIMORA_PASSWORD environment variable:");
  console.error("   SIMORA_PASSWORD=yourpassword node agent.js");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const POLL_INTERVAL = 5000; // Check every 5 seconds
let browser = null;

// ─── AUTH ───
async function login() {
  console.log(`🔑 Logging in as ${EMAIL}...`);
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) {
    console.error("❌ Login failed:", error.message);
    process.exit(1);
  }
  console.log("✅ Logged in successfully");
  return data.user;
}

// ─── SCRAPE A SINGLE URL ───
async function scrapeUrl(page, url, timeout = 15000) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const text = document.body?.innerText || "";
      const html = document.documentElement?.innerHTML || "";

      // Extract emails
      const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const emails = [...new Set((text + " " + html).match(emailRe) || [])].filter(
        e => !e.includes("example") && !e.includes("sentry") && !e.includes("wixpress") && !e.endsWith(".png") && !e.endsWith(".jpg")
      );

      // Extract phones
      const phoneRe = /(?:\+359|0)[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{2,4}/g;
      const phones = [...new Set(text.match(phoneRe) || [])];

      // Extract social
      const igMatch = html.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
      const fbMatch = html.match(/facebook\.com\/([a-zA-Z0-9_.]+)/);

      // Title and description
      const title = document.title || "";
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
      const address = text.match(/(?:ул\.|бул\.|жк\.|кв\.)[^\n,.]{5,50}/)?.[0] || "";

      return { emails, phones, title, metaDesc, address, instagram: igMatch?.[1] || "", facebook: fbMatch?.[1] || "" };
    });

    return { url, ...data, ok: true };
  } catch (err) {
    return { url, ok: false, error: err.message, emails: [], phones: [] };
  }
}

// ─── SCRAPE CONTACT PAGES ───
async function scrapeContactPages(page, baseUrl) {
  const contactPaths = ["/contacts", "/contact", "/kontakti", "/контакти", "/за-контакти", "/about", "/за-нас"];
  let allEmails = [];
  let allPhones = [];

  for (const path of contactPaths) {
    try {
      const url = new URL(path, baseUrl).href;
      const result = await scrapeUrl(page, url, 8000);
      if (result.ok) {
        allEmails.push(...result.emails);
        allPhones.push(...result.phones);
      }
    } catch { /* skip */ }
  }

  return {
    emails: [...new Set(allEmails)],
    phones: [...new Set(allPhones)],
  };
}

// ─── GOOGLE SEARCH ───
async function googleSearch(page, query, maxResults = 20) {
  console.log(`  🔍 Google: "${query}"`);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}&hl=bg`;

  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(3000);

  // Check for CAPTCHA
  const pageText = await page.evaluate(() => document.body?.innerText || "");
  if (pageText.includes("unusual traffic") || pageText.includes("captcha")) {
    console.log("  ⚠️ Google CAPTCHA detected - waiting 30s...");
    await page.waitForTimeout(30000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
  }

  const links = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("a[href]").forEach(a => {
      const href = a.getAttribute("href") || "";
      const match = href.match(/\/url\?q=(https?:\/\/[^&]+)/);
      if (match) {
        const url = decodeURIComponent(match[1]);
        if (!url.includes("google.") && !url.includes("youtube.") && !url.includes("facebook.com") && !url.includes("instagram.com")) {
          results.push(url);
        }
      }
    });
    // Also try direct links
    document.querySelectorAll("a[data-ved]").forEach(a => {
      const href = a.href;
      if (href && href.startsWith("http") && !href.includes("google.") && !href.includes("youtube.")) {
        results.push(href);
      }
    });
    return [...new Set(results)];
  });

  console.log(`  📋 Found ${links.length} URLs`);
  return links.slice(0, maxResults);
}

// ─── PROCESS TASK ───
async function processTask(task) {
  console.log(`\n🚀 Processing task: "${task.niche}" in ${task.city}`);

  // Update status to running
  await supabase.from("scrape_tasks").update({
    status: "running",
    started_at: new Date().toISOString(),
  }).eq("id", task.id);

  try {
    if (!browser) {
      console.log("  🌐 Launching Chrome...");
      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=bg"],
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "bg-BG,bg;q=0.9,en;q=0.8" });

    // Search Google
    const query = `${task.niche} ${task.city} България фирми контакти телефон имейл`;
    const urls = await googleSearch(page, query, task.max_results || 20);

    const businesses = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`  📄 [${i + 1}/${urls.length}] ${url}`);

      const result = await scrapeUrl(page, url);
      if (!result.ok) continue;

      // Also scrape contact pages
      const contacts = await scrapeContactPages(page, url);
      const allEmails = [...new Set([...result.emails, ...contacts.emails])];
      const allPhones = [...new Set([...result.phones, ...contacts.phones])];

      if (result.title || allEmails.length > 0 || allPhones.length > 0) {
        const domain = new URL(url).hostname.replace("www.", "");
        const biz = {
          company_name: result.title?.split(/[|\-–—]/)[0]?.trim() || domain,
          website: url,
          email: allEmails[0] || null,
          phone: allPhones[0] || null,
          instagram: result.instagram ? `https://instagram.com/${result.instagram}` : null,
          facebook: result.facebook ? `https://facebook.com/${result.facebook}` : null,
          address: result.address || null,
          city: task.city,
          country: "България",
          description: result.metaDesc || null,
          niche_id: task.niche_id || null,
          tags: [task.niche],
          source: "local_scraper",
          verified: false,
          collected_by: task.user_id,
        };

        // Save to DB immediately
        const { error } = await supabase.from("business_directory").insert(biz);
        if (!error) {
          businesses.push(biz);
          console.log(`    ✅ ${biz.company_name} | ${biz.email || "no email"} | ${biz.phone || "no phone"}`);
        } else {
          console.log(`    ⚠️ Skip duplicate: ${biz.company_name}`);
        }

        // Update progress
        await supabase.from("scrape_tasks").update({
          results_count: businesses.length,
        }).eq("id", task.id);
      }

      // Small delay between requests
      await page.waitForTimeout(1000 + Math.random() * 2000);
    }

    await page.close();

    // Mark task done
    await supabase.from("scrape_tasks").update({
      status: "done",
      results_count: businesses.length,
      completed_at: new Date().toISOString(),
    }).eq("id", task.id);

    console.log(`✅ Task done: ${businesses.length} businesses found`);

  } catch (err) {
    console.error(`❌ Task error:`, err.message);
    await supabase.from("scrape_tasks").update({
      status: "error",
      error_message: err.message,
      completed_at: new Date().toISOString(),
    }).eq("id", task.id);
  }
}

// ─── MAIN LOOP ───
async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   Simora Local Scraper Agent v1.0    ║");
  console.log("╚══════════════════════════════════════╝");

  const user = await login();
  console.log(`👤 User: ${user.email}`);
  console.log(`⏳ Polling for tasks every ${POLL_INTERVAL / 1000}s...\n`);

  while (true) {
    try {
      // Fetch pending tasks for this user
      const { data: tasks, error } = await supabase
        .from("scrape_tasks")
        .select("*")
        .eq("status", "pending")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (error) {
        console.error("Poll error:", error.message);
      } else if (tasks && tasks.length > 0) {
        await processTask(tasks[0]);
      }
    } catch (err) {
      console.error("Loop error:", err.message);
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n👋 Shutting down...");
  if (browser) await browser.close();
  process.exit(0);
});

main();
