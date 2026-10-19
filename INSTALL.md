# Install Hop on an LG TV

This procedure installs Hop on an LG TV that runs webOS. It uses the LG
Developer Mode app and the webOS CLI. It takes about 20 minutes the first
time. Later updates take one command.

## Requirements

- An LG TV with webOS 6 or later.
- A computer on the same network as the TV, with Node.js 18 or later.
- An LG account. Make one at https://www.lge.com if you do not have one.

## 1. Register as a developer

1. Open https://webostv.developer.lge.com on the computer.
2. Select **SIGN IN** and log in with the LG account.
3. Accept the developer terms when the site shows them.

> The Developer Mode app on the TV accepts only an LG account that has done this step.

## 2. Install the Developer Mode app on the TV

1. Press the **Home** key on the remote.
2. Open **Apps** (the LG Content Store).
3. Search for `Developer Mode`.
4. Make sure that the seller is **LGE**. Then select **Install**.
5. Open **Developer Mode** from the Home row.
6. Log in with the LG account from step 1.
7. Set **Dev Mode Status** to **ON**. The TV restarts.
8. Open **Developer Mode** again.
9. Set **Key Server** to **ON**.
10. Write down the **IP Address** and the **Passphrase** that the screen shows.

> Developer Mode stops after 50 hours. To keep Hop installed, open Developer Mode
> and select **EXTEND** before the time runs out. If the time runs out, the TV
> removes Hop. Do steps 7 to 10 again, then run `scripts/deploy.sh` again.

## 3. Install the webOS CLI on the computer

1. Open a terminal.
2. Run:

```bash
npm install -g @webos-tools/cli
```

3. Make sure that the install was successful:

```bash
ares-package --version
```

## 4. Get Hop

```bash
git clone https://github.com/appbytes/hop.git
cd hop
```

## 5. Set the TV details

1. Copy the example file:

```bash
cp .env.example .env
```

2. Open `.env` in a text editor.
3. Set `TV_IP` to the IP address from step 2.
4. Set `TV_PASSPHRASE` to the passphrase from step 2. The passphrase is case sensitive.
5. Save the file.

> Do not share `.env` and do not commit it. It identifies your TV.

## 6. Register the TV

Run:

```bash
scripts/setup-tv.sh
```

If the script asks for the passphrase, type it again. When the script finishes,
it shows the TV model name. This shows that the computer can talk to the TV.

## 7. Install Hop

Run:

```bash
scripts/deploy.sh
```

Hop starts on the TV. Press a number on the remote to open a channel.

## 8. Change the channel list

1. Open `app/channels.js` in a text editor.
2. Add, remove or reorder channels. See the README for the fields.
3. Save the file.
4. Run `scripts/deploy.sh` again.

## Problems

**The script says "All configured authentication methods failed".**
Developer Mode is off, or the passphrase has changed. Do steps 2.7 to 2.10, put
the new passphrase in `.env`, then run `scripts/setup-tv.sh` again.

**The script cannot find the TV.**
Make sure that the TV and the computer are on the same network. Make sure that
`TV_IP` in `.env` is the address that the Developer Mode app shows.

**The Developer Mode app does not accept the login.**
Do step 1 again. The site must show the developer terms once, and you must accept them.

**A channel tile shows OFF AIR.**
The channel is not streaming now. Hop checks again every 10 minutes while it is open.

**A channel opens the wrong stream.**
The channel runs several streams. Add a `prefer` hint with words from the title
of the stream you want. See the README.

**macOS asks for Local Network access.**
Select **Allow**. The CLI needs it to talk to the TV.
