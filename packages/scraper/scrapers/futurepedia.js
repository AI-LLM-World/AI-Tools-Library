const cheerio = require('cheerio');
const url = require('url');

// Simple polite fetch with rate limit and 429 backoff
async function politeFetch(u, opts = {}, attempt = 0) {
  const res = await fetch(u, opts);
  if (res.status === 429 && attempt < 5) {
    const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 200;
    await new Promise((r) => setTimeout(r, backoff));
    return politeFetch(u, opts, attempt + 1);
  }
  if (!res.ok && res.status >= 500 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    return politeFetch(u, opts, attempt + 1);
  }
  return res;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function normalizeTool(slug, item) {
  return {
    id: `futurepedia:${slug}`,
    source: 'futurepedia',
    tool_id: slug,
    name: item.name || '',
    description: item.description || '',
    category: item.category || '',
    website: item.website || '',
    tags: item.tags || [],
    raw_json: item.raw || null,
  };
}

async function scrapeToolPage(base, path) {
  const full = new URL(path, base).toString();
  const r = await politeFetch(full, { headers: { 'User-Agent': 'gstack-scraper/1.0 (+https://example.com)' } });
  if (!r.ok) return null;
  const html = await r.text();
  const $ = cheerio.load(html);

  // Name
  const name = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';

  // Description: try meta description or visible intro
  const description = $('meta[name="description"]').attr('content') || $('p').first().text().trim() || '';

  // Website link: look for Visit Site button/link
  let website = '';
  const visit = $('a').filter((i, el) => $(el).text().toLowerCase().includes('visit')).first();
  if (visit && visit.attr) website = visit.attr('href') || '';

  // Category: breadcrumb link or meta
  let category = '';
  const breadcrumb = $('a').filter((i, el) => $(el).attr('href') && $(el).attr('href').startsWith('/ai-tools/')).first();
  if (breadcrumb && breadcrumb.text) category = breadcrumb.text().trim();

  // Tags: elements with class or data attribute
  const tags = [];
  $('a, span').each((i, el) => {
    const cls = ($(el).attr('class') || '') + ' ' + ($(el).attr('data-testid') || '');
    const txt = $(el).text().trim();
    if (txt && /#/i.test(txt) === false && txt.length < 40 && (cls.includes('tag') || cls.includes('Tag') || $(el).attr('href') && $(el).attr('href').includes('/ai-tools/'))) {
      tags.push(txt);
    }
  });

  // slug from path
  const parts = path.split('/').filter(Boolean);
  const slug = parts[parts.length - 1];

  return normalizeTool(slug, { name, description, category, website, tags, raw: { html_snippet: html.slice(0, 4000) } });
}

async function run(opts = {}) {
  const base = 'https://www.futurepedia.io';
  const results = [];
  // Attempt to fetch sitemap and enumerate ai-tools category pages; fallback to built-in seeds.
  let categories = [];
  try {
    await sleep(1000);
    const sres = await politeFetch(base + '/sitemap.xml', { headers: { 'User-Agent': 'gstack-scraper/1.0' } });
    if (sres && sres.ok) {
      const stext = await sres.text();
      // extract <loc> entries
      const locs = Array.from(stext.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
      categories = locs.filter(l => l.startsWith(base + '/ai-tools')).map(l => new URL(l).pathname);
    }
  } catch (err) {
    // ignore sitemap failures
  }

  if (!categories || categories.length === 0) {
    categories = ['/ai-tools', '/ai-tools/productivity', '/ai-tools/marketing', '/ai-tools/image-generators', '/ai-tools/text-generators'];
  }

  const visited = new Set();

  for (const cat of categories) {
    try {
      // respect 1 req/s global rate
      await sleep(1000);
      const listUrl = new URL(cat, base).toString();
      const r = await politeFetch(listUrl, { headers: { 'User-Agent': 'gstack-scraper/1.0' } });
      if (!r || !r.ok) continue;
      const html = await r.text();
      const $ = cheerio.load(html);

      // find links to /tool/<slug>
      const anchors = new Set();
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('/tool/')) anchors.add(href.split('?')[0]);
      });

      for (const a of anchors) {
        if (visited.has(a)) continue;
        // rate limit 1 req/s between tool pages
        await sleep(1000);
        const tool = await scrapeToolPage(base, a);
        if (tool && tool.id && tool.name) {
          results.push(tool);
          visited.add(a);
        }
        if (results.length >= (opts.limit || 200)) break;
      }
    } catch (err) {
      // ignore category failures
    }
    if (results.length >= (opts.limit || 200)) break;
  }

  // De-dup by id and return
  const byId = new Map();
  for (const it of results) {
    if (it && it.id && !byId.has(it.id)) byId.set(it.id, it);
  }

  return Array.from(byId.values());
}

module.exports = { run };
