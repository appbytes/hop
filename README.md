# Hop

Hop is a tiny app for LG webOS TVs. It shows your favourite YouTube live channels
as numbered tiles. Press a number on the remote and the channel starts in the
real YouTube app, with your own login, your Premium, no ads and no extra player.

- **Number keys work like a TV.** Press `7` and channel 7 opens. Press `1` then `2`
  quickly and channel 12 opens. Hop waits briefly after a lone digit, exactly
  like a set-top box.
- **Always the main feed.** Many channels run several streams at once during
  events. Hop lists a channel's live streams and picks the one most people are
  watching, or the one whose title matches a hint you give it.
- **Nothing to sign in to.** Hop has no account, no server and no tracking. It
  talks only to YouTube and to the YouTube app on the TV.
- **Light.** About 200 KB installed. A small background service does the
  lookups and sleeps when idle.

A longer, illustrated explanation is in [docs/index.html](docs/index.html).

## Install

See [INSTALL.md](INSTALL.md). In short: enable Developer Mode on the TV, install
the webOS CLI on a computer, put your TV's address in a `.env` file and run
`scripts/deploy.sh`.

## Your channels

Edit [app/channels.js](app/channels.js). Each line is one channel:

```js
{ number: 4, name: "TV9 Telugu", url: "https://www.youtube.com/@TV9TeluguLive/live",
  logo: "logos/tv9.jpg", prefer: "TV9 Telugu News LIVE" }
```

| Field | Meaning |
|---|---|
| `number` | The key(s) to press on the remote. |
| `name` | The label on the tile. |
| `url` | The channel's address on YouTube. `/live` at the end means "whatever is live now". |
| `logo` | A square image in `app/logos/`. Optional; without it the tile shows initials. |
| `prefer` | Optional words from the title of the channel's main stream, for channels that run several streams at once. |
| `videoId` | Optional fixed video ID for 24/7 streams that never change. Skips the lookup. |

After a change, run `scripts/deploy.sh` again.

## Switch back from YouTube with one key

Once YouTube is playing, its Back key goes to YouTube's own home, not to Hop.
webOS has a built-in way to jump to any app from anywhere, called Quick Access.
Set it up once with the remote:

1. Press and hold the `0` key for about two seconds. The Quick Access screen opens.
2. Choose a free slot from `1` to `8` and pick **Hop**.
3. From now on, press and hold that key, even while YouTube is playing, and Hop
   comes back instantly with your last channel highlighted.

So changing channel from inside YouTube is: hold the Quick Access key, press a
channel number. Hop ignores held keys, so the long press never types a digit.

## How it works

```
remote key  ──▶  Hop (web app)  ──▶  Hop service (Node.js, on the TV)
                     │                      │  finds the channel's live streams
                     │                      │  and picks the main one
                     ▼                      ▼
            YouTube app  ◀── launch with v=<video id> ──┘
```

The YouTube app on LG TVs accepts exactly one deep-link shape, the query
fragment `v=<video id>`. Hop's service turns a channel address into the current
live video ID, so the tiles never go stale.

## Project layout

```
app/        the web app: page, channel list, logos, icon
service/    the background service that resolves live streams
scripts/    setup-tv.sh and deploy.sh (read your .env)
design/     the icon source (SVG)
docs/       the illustrated project page
```

## Privacy

Hop stores nothing and sends nothing about you. Your TV's address and pairing
passphrase live only in your local `.env`, which git ignores.

Channel names and logos belong to their respective broadcasters and are
included only to identify the channels in the list.

## License

MIT. See [LICENSE](LICENSE).
