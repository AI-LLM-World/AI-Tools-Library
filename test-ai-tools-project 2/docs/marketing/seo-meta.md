Title: SEO Metadata Templates
Location: docs/marketing/seo-meta.md

Purpose:
- Provide ready-to-use SEO meta tag templates, OpenGraph/Twitter card examples, JSON-LD structured data snippets, and a sitemap example for the AI Tool Library. These are content artifacts the CTO can implement into the frontend templates or build-time generator.

1) Global title & description strategy
- Title template (homepage): "AI Tool Library — Discover & Compare AI Tools"
- Title template (tool detail): "{tool.name} — {short_description} | AI Tool Library"
- Meta description (homepage): "Browse the AI Tool Library: curated AI tools, categories, and community submissions. Discover tools, read examples, and submit a tool in minutes."
- Meta description (tool detail): use the tool's short_description + example_use (120-160 chars).

2) Homepage meta tags (example)
<meta name="title" content="AI Tool Library — Discover & Compare AI Tools">
<meta name="description" content="Browse the AI Tool Library: curated AI tools, categories, and community submissions. Discover tools, read examples, and submit a tool in minutes.">

OpenGraph / Twitter (homepage)
<meta property="og:type" content="website">
<meta property="og:title" content="AI Tool Library — Discover & Compare AI Tools">
<meta property="og:description" content="Browse the AI Tool Library: curated AI tools, categories, and community submissions. Discover tools, read examples, and submit a tool in minutes.">
<meta property="og:url" content="https://yourdomain.example/">
<meta property="og:image" content="https://yourdomain.example/assets/og-home.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="AI Tool Library — Discover & Compare AI Tools">
<meta name="twitter:description" content="Browse the AI Tool Library: curated AI tools, categories, and community submissions. Discover tools, read examples, and submit a tool in minutes.">

3) Tool detail meta tags (template)
<title>{tool.name} — {short_description} | AI Tool Library</title>
<meta name="description" content="{short_description} — {example_use}">
<meta property="og:type" content="article">
<meta property="og:title" content="{tool.name} — {short_description}">
<meta property="og:description" content="{short_description} — {example_use}">
<meta property="og:url" content="https://yourdomain.example/tools/{tool.id}">
<meta property="og:image" content="{tool.image || 'https://yourdomain.example/assets/og-tool.png'}">

4) JSON-LD structured data (tool detail example)
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{tool.name}",
  "applicationCategory": "{tool.category}",
  "description": "{short_description}",
  "url": "https://yourdomain.example/tools/{tool.id}",
  "image": "{tool.image}",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
</script>

5) Sitemap example (add to /sitemap.xml)
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.example/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Example tool entry -->
  <url>
    <loc>https://yourdomain.example/tools/synth-music</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>

6) Implementation notes for CTO
- Use the title/description templates for server-side rendering or at build time. If frontend is SPA, implement a server-side prerender/build step for SEO-critical pages (homepage, category, tool detail).
- Generate sitemap.xml from data/ai_tools.json at build time and place at /sitemap.xml.
- Ensure robots.txt exists and points to sitemap: "Sitemap: https://yourdomain.example/sitemap.xml"
- Coordinate on canonical URLs and preferred domain (www vs non-www) before implementation.

7) Example: Synth Music (from data/ai_tools.json)
- Title: "Synth Music — Generate background music for videos with mood controls | AI Tool Library"
- Description: "Generate background music for videos with mood controls. Produce royalty-free background tracks for marketing videos."

8) Next steps (CMO + CTO)
- CMO: review and approve title & description copy for homepage and a sample of top 10 tool entries.
- CTO: implement meta tags in templates and generate sitemap.xml from ai_tools.json; notify CMO when deployed so we can validate via Google Search Console and test OpenGraph sharing.

(End of file)
