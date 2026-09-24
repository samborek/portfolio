'use strict';

// Build discovery files from the same published pages as the site.
hexo.extend.generator.register('discovery', function (locals) {
  const root = this.config.url.replace(/\/$/, '');
  const escapeXml = (value) => value.replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  }[c]));
  const pages = locals.pages.toArray().filter(page =>
    page.published !== false && page.sitemap !== false && page.path.endsWith('.html'));
  const urls = [...new Set([root + '/', ...pages.map(page =>
    root + '/' + (page.path === 'index.html' ? '' : page.path))])].sort();
  return [
    { path: 'robots.txt', data: `User-agent: *\nAllow: /\n\nSitemap: ${root}/sitemap.xml\n` },
    { path: 'sitemap.xml', data: '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n') + '\n</urlset>\n' }
  ];
});
