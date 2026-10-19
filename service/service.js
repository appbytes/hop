/* In-app service for Hop.
 *
 * resolve    { url, prefer }              -> { returnValue, videoId|null, title, via }
 * resolveAll { channels: [{ url, prefer }] } -> { returnValue, results: { url: { videoId, title, error } } }
 *
 * Finds the main live stream of a YouTube channel:
 *   1. channel id from the handle page (fetched as a link-preview bot, which gets a slim page)
 *   2. the channel's "Live" tab via YouTube's browse endpoint
 *   3. the title-hinted stream, else the most-watched one
 * Falls back to the canonical link of the channel's /live page.
 *
 * Only YouTube URLs are accepted, redirects are followed only within youtube.com,
 * every response is size-capped, and every callback fires at most once.
 */
var pkgInfo = require('./package.json');
var Service = require('webos-service');
var https = require('https');
var zlib = require('zlib');

var service = new Service(pkgInfo.name);

var BOT_UA = 'facebookexternalhit/1.1';
var PAGE_MAX_BYTES = 131072;        // handle page: the channel id sits within the first ~30 KB
var BROWSE_MAX_BYTES = 3 * 1048576; // live tab JSON: ~0.4 MB today, hard-capped at 3 MB
var SOCKET_TIMEOUT_MS = 8000;
var DEADLINE_MS = 12000;
var CACHE_MS = 2 * 60 * 1000;
var CACHE_MAX = 64;
var MAX_BATCH = 50;

var cache = {};        // url|prefer -> { videoId, title, via, at }
var channelIds = {};   // url -> UC...

// ---------------------------------------------------------------- helpers
function once(cb) {
  var called = false;
  return function () { if (called) return; called = true; cb.apply(null, arguments); };
}
function bounded(map, max) {
  var keys = Object.keys(map);
  if (keys.length < max) return;
  keys.sort(function (a, b) { return (map[a].at || 0) - (map[b].at || 0); });
  for (var i = 0; i < keys.length - max + 1; i++) delete map[keys[i]];
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Accept only https://www.youtube.com/@handle[/live] or /channel/UC...[/live]
function validChannelUrl(u) {
  var p;
  try { p = new URL(String(u)); } catch (e) { return null; }
  if (p.protocol !== 'https:' || p.hostname !== 'www.youtube.com') return null;
  if (!/^\/(@[A-Za-z0-9._-]{1,64}|channel\/UC[\w-]{22})(\/live)?\/?$/.test(p.pathname)) return null;
  return 'https://www.youtube.com' + p.pathname.replace(/\/$/, '');
}
function youtubeHost(h) { return h === 'youtube.com' || /\.youtube\.com$/.test(h); }

// Streamed GET that stops as soon as `test(buffer)` returns a value; youtube.com only.
function streamGet(target, hops, test, cb) {
  var done = once(cb);
  var parsed;
  try { parsed = new URL(target); } catch (e) { return done(new Error('bad url')); }
  if (parsed.protocol !== 'https:' || !youtubeHost(parsed.hostname)) return done(new Error('host not allowed'));
  var req = https.get({ hostname: parsed.hostname, path: parsed.pathname + parsed.search,
    headers: { 'User-Agent': BOT_UA, 'Accept-Language': 'en', 'Accept': 'text/html' } }, function (res) {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      if (hops >= 3) return done(new Error('too many redirects'));
      return done(null, { redirect: new URL(res.headers.location, target).toString() });
    }
    if (res.statusCode !== 200) { res.resume(); return done(new Error('HTTP ' + res.statusCode)); }
    var buf = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      buf += chunk;
      var v = test(buf);
      if (v) { done(null, v); req.destroy(); return; }
      if (buf.length > PAGE_MAX_BYTES) { done(new Error('not found in page')); req.destroy(); }
    });
    res.on('end', function () { done(new Error('not found in page')); });
    res.on('error', function (e) { done(e); });
  });
  req.setTimeout(SOCKET_TIMEOUT_MS, function () { done(new Error('timeout')); req.destroy(); });
  var deadline = setTimeout(function () { done(new Error('deadline')); req.destroy(); }, DEADLINE_MS);
  req.on('error', function (e) { done(e); });
  req.on('close', function () { clearTimeout(deadline); });
}
function followGet(target, test, cb) {
  (function go(t, hops) {
    streamGet(t, hops, test, function (err, r) {
      if (err) return cb(err);
      if (r.redirect) return go(r.redirect, hops + 1);
      cb(null, r);
    });
  })(target, 0);
}

// ---------------------------------------------------------------- 1. channel id
function channelIdFor(target, cb) {
  var hit = channelIds[target];
  if (hit) { hit.at = Date.now(); return cb(null, hit.id); }
  var m = /\/channel\/(UC[\w-]{22})/.exec(target);
  if (m) return cb(null, m[1]);
  followGet(target, function (buf) {
    var x = /"(?:externalChannelId|browseId|channelId)":"(UC[\w-]{22})"/.exec(buf) ||
            /itemprop="(?:channelId|identifier)" content="(UC[\w-]{22})"/.exec(buf);
    return x ? { channelId: x[1] } : null;
  }, function (err, r) {
    if (err) return cb(err);
    bounded(channelIds, CACHE_MAX);
    channelIds[target] = { id: r.channelId, at: Date.now() };
    cb(null, r.channelId);
  });
}

// ---------------------------------------------------------------- 2. live streams
function liveStreams(channelId, cb) {
  var done = once(cb);
  var body = JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: '2.20241001.00.00' } },
                              browseId: channelId, params: 'EgdzdHJlYW1z8gYECgJ6AA%3D%3D' });
  var req = https.request({ hostname: 'www.youtube.com', path: '/youtubei/v1/browse?prettyPrint=false', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip', 'User-Agent': 'Mozilla/5.0',
               'Content-Length': Buffer.byteLength(body) } }, function (res) {
    if (res.statusCode !== 200) { res.resume(); return done(new Error('browse HTTP ' + res.statusCode)); }
    var chunks = [], size = 0;
    var stream = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
    stream.on('data', function (c) {
      size += c.length;
      if (size > BROWSE_MAX_BYTES) { done(new Error('response too large')); req.destroy(); return; }
      chunks.push(c);
    });
    stream.on('error', function (e) { done(e); });
    stream.on('end', function () {
      var text = Buffer.concat(chunks).toString('utf8');
      chunks = null;
      done(null, parseLiveTab(text));
    });
  });
  req.setTimeout(SOCKET_TIMEOUT_MS, function () { done(new Error('timeout')); req.destroy(); });
  var deadline = setTimeout(function () { done(new Error('deadline')); req.destroy(); }, DEADLINE_MS);
  req.on('error', function (e) { done(e); });
  req.on('close', function () { clearTimeout(deadline); });
  req.end(body);
}

// Each stream is a lockupViewModel; scan each one up to the start of the next.
function parseLiveTab(text) {
  var items = [], starts = [], re = /"lockupViewModel":\{"contentImage"/g, m;
  while ((m = re.exec(text))) starts.push(m.index);
  for (var k = 0; k < starts.length; k++) {
    var seg = text.slice(starts[k], k + 1 < starts.length ? starts[k + 1] : starts[k] + 20000);
    if (seg.indexOf('THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE') === -1) continue;
    var idm = /i\.ytimg\.com\/vi\/([\w-]{11})\//.exec(seg) || /"contentId":"([\w-]{11})"/.exec(seg);
    if (!idm) continue;
    var t = /"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.){0,300})"/.exec(seg);
    var w = /"content":"([\d,.]+[KM]?) watching"/.exec(seg);
    var watching = 0;
    if (w) { var n = parseFloat(w[1].replace(/,/g, '')); watching = /K$/.test(w[1]) ? n * 1000 : /M$/.test(w[1]) ? n * 1e6 : n; }
    var title = '';
    if (t) { try { title = JSON.parse('"' + t[1] + '"'); } catch (e) { title = t[1]; } }
    items.push({ videoId: idm[1], title: title, watching: watching });
  }
  return items;
}

// ---------------------------------------------------------------- 3. choose
function pick(streams, prefer) {
  if (prefer) {
    var re = new RegExp(escapeRegExp(prefer), 'i');      // plain text match, never a user regex
    var hit = streams.filter(function (x) { return re.test(x.title); });
    if (hit.length) streams = hit;
  }
  return streams.slice().sort(function (a, b) { return b.watching - a.watching; })[0];
}

// ---------------------------------------------------------------- fallback
function canonicalLive(target, cb) {
  followGet(target.replace(/\/live$/, '') + '/live', function (buf) {
    var m = /<link rel="canonical" href="([^"]+)"/.exec(buf);
    return m ? { canonical: m[1] } : null;
  }, function (err, r) {
    if (err) return cb(err);
    var m = /[?&]v=([A-Za-z0-9_-]{11})/.exec(r.canonical);
    cb(null, { videoId: m ? m[1] : null, title: '', via: 'canonical' });
  });
}

// ---------------------------------------------------------------- resolve
function resolve(rawUrl, prefer, cb) {
  var target = validChannelUrl(rawUrl);
  if (!target) return cb(new Error('not a YouTube channel url'));
  prefer = typeof prefer === 'string' ? prefer.slice(0, 100) : '';
  var key = target + '|' + prefer;
  var hit = cache[key];
  if (hit && Date.now() - hit.at < CACHE_MS) return cb(null, hit);
  function finish(entry) {
    entry.at = Date.now();
    bounded(cache, CACHE_MAX);
    cache[key] = entry;
    cb(null, entry);
  }
  channelIdFor(target, function (err, channelId) {
    if (err) return canonicalLive(target, function (e2, r) { if (e2) return cb(e2); finish(r); });
    liveStreams(channelId, function (err2, streams) {
      if (err2 || !streams.length) {
        return canonicalLive(target, function (e3, r) { if (e3) return cb(err2 || e3); finish(r); });
      }
      var best = pick(streams, prefer);
      finish({ videoId: best.videoId, title: best.title, watching: best.watching, via: 'streams' });
    });
  });
}

function respondError(message, err) {
  message.respond({ returnValue: false, errorText: String((err && err.message) || err) });
}

service.register('resolve', function (message) {
  var p = message.payload || {};
  resolve(p.url, p.prefer, function (err, r) {
    if (err) return respondError(message, err);
    message.respond({ returnValue: true, videoId: r.videoId, title: r.title, via: r.via });
  });
});

service.register('resolveAll', function (message) {
  var list = (message.payload && message.payload.channels) || [];
  if (!Array.isArray(list)) return respondError(message, "'channels' must be an array");
  list = list.slice(0, MAX_BATCH);
  var results = {}, pending = list.length, idx = 0, CONCURRENCY = 3;
  if (!pending) return message.respond({ returnValue: true, results: results });
  function next() {
    if (idx >= list.length) return;
    var c = list[idx++] || {};
    resolve(c.url, c.prefer, function (err, r) {
      results[String(c.url)] = err ? { videoId: null, error: String(err.message || err) } : { videoId: r.videoId, title: r.title, via: r.via };
      if (--pending === 0) return message.respond({ returnValue: true, results: results });
      next();
    });
  }
  for (var i = 0; i < CONCURRENCY && i < list.length; i++) next();
});

service.register('version', function (message) {
  message.respond({ returnValue: true, node: process.version, service: pkgInfo.version });
});

module.exports = { resolve: resolve, liveStreams: liveStreams, channelIdFor: channelIdFor, validChannelUrl: validChannelUrl };
