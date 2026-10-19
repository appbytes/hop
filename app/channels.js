// Channel list. Edit this file, then repackage and reinstall.
// number : the key(s) to press on the remote
// name   : shown on the tile
// url    : what gets opened in the YouTube app
//          https://www.youtube.com/@handle/live  -> whatever that channel is streaming now
//          https://www.youtube.com/@handle       -> the channel page (for channels with no 24/7 stream)
//          https://www.youtube.com/watch?v=ID    -> one fixed stream (for 24/7 streams with a stable ID)
// prefer : (optional) words from the title of the channel's main 24/7 stream, used when a
//          channel runs several streams at once; otherwise the most-watched live stream is used
// videoId: (optional) a fixed stream ID; skips resolving altogether
// logo   : cover image, bundled in logos/ (square works best)
// color  : fallback tile colour if the logo is missing
window.CHANNELS = [
  { number:  1, name: "Bhakthi TV",      url: "https://www.youtube.com/@BhakthiTV/live",          color: "#c2410c", logo: "logos/bhakthi.jpg", prefer: "Bhakthi TV Live" },
  { number:  2, name: "DD Yadagiri",     url: "https://www.youtube.com/@DoordarshanYADAGIRI/live", color: "#4d7c0f", logo: "logos/ddyadagiri.jpg" },
  { number:  3, name: "SVBC TTD",        url: "https://www.youtube.com/@SVBCTTD/live",            color: "#a16207", logo: "logos/svbc.jpg" },
  { number:  4, name: "TV9 Telugu",      url: "https://www.youtube.com/@TV9TeluguLive/live",      color: "#b91c1c", logo: "logos/tv9.jpg", prefer: "TV9 Telugu News LIVE" },
  { number:  5, name: "NTV Telugu",      url: "https://www.youtube.com/@NTVTelugu/live",          color: "#1d4ed8", logo: "logos/ntv.jpg" },
  { number:  6, name: "V6 News",         url: "https://www.youtube.com/@V6NewsTelugu/live",       color: "#15803d", logo: "logos/v6.jpg" },
  { number:  7, name: "T News",          url: "https://www.youtube.com/@TNewsTelugu/live",        color: "#c2410c", logo: "logos/tnews.jpg" },
  { number:  8, name: "Zee Telugu News", url: "https://www.youtube.com/@ZeeTeluguNews/live",      color: "#6d28d9", logo: "logos/zeetelugu.jpg", prefer: "ZEE Telugu News LIVE" },
  { number:  9, name: "India Today",     url: "https://www.youtube.com/@indiatoday/live",         color: "#dc2626", logo: "logos/indiatoday.jpg" },
  { number: 10, name: "WION",            url: "https://www.youtube.com/@WION/live",               color: "#0f766e", logo: "logos/wion.jpg" },
  { number: 11, name: "CNBC-TV18",       url: "https://www.youtube.com/@CNBC-TV18/live",          color: "#1e3a8a", logo: "logos/cnbctv18.jpg" },
  { number: 12, name: "NDTV 24x7",       url: "https://www.youtube.com/@NDTV/live",               color: "#b45309", logo: "logos/ndtv.jpg" },
  { number: 13, name: "NDTV Profit",     url: "https://www.youtube.com/@NDTVProfitIndia/live",    color: "#065f46", logo: "logos/ndtvprofit.jpg", prefer: "NDTV Profit LIVE TV" },
  { number: 14, name: "BBC News India",  url: "https://www.youtube.com/@BBCNewsIndia",            color: "#7f1d1d", logo: "logos/bbcindia.jpg" },
  { number: 15, name: "CNN-News18",      url: "https://www.youtube.com/@CNNNews18/live",          color: "#9f1239", logo: "logos/cnnnews18.jpg" }
];
