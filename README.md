# Gridlines Fun (Settlement Ledger online)

A settlement game with maths questions. Play alone, endless, pass-and-play on one device, or **online with 2 to 4 players**:
each player gets a plot on a shared map, can declare war and send raiders, send aid, and gets hit by shared world events.

- `index.html` is the whole game (GitHub Pages serves it).
- `worker/` is the small server for online rooms (Cloudflare Workers, free plan).

## Put it online (about 15 minutes)

### 1. Publish the game on GitHub Pages
1. Create a new GitHub repository and upload everything in this folder.
2. In the repo go to **Settings > Pages > Source** and choose **GitHub Actions**.
3. Push to `main`. The *Deploy game to GitHub Pages* workflow runs and shows the address, like `https://YOU.github.io/REPO/`.

### 2. Deploy the server on Cloudflare (free)
1. Make a free account at https://dash.cloudflare.com/sign-up
2. On your computer, with Node 18 or newer installed:
   ```
   cd worker
   npm install
   npx wrangler login
   npx wrangler deploy
   ```
3. Wrangler prints an address such as `https://gridlines-fun-server.YOU.workers.dev`. That is your server.

### 3. Point the game at the server
Open the game, choose **Play online**, and paste the address into the **Server** box (the browser remembers it).
To set it for everyone, open `index.html`, find `const SL_SERVER = ''`, set it to `'wss://gridlines-fun-server.YOU.workers.dev'` and push.

Optional: in `worker/wrangler.toml` uncomment `ALLOWED_ORIGIN` and set it to `https://YOU.github.io` so only your page can use your server, then deploy again.

### Auto-deploy the server from GitHub (optional)
Add repository secrets `CLOUDFLARE_API_TOKEN` (an API token made from the "Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID`. The *Deploy server* workflow then runs whenever `worker/` changes.


## Using Render instead of Cloudflare
The server also runs as a normal Node app, so Render works too (free web service).
1. Put this repo on GitHub, then at https://render.com choose **New > Web Service** and pick the repo.
2. Set **Root Directory** to `worker`, **Build Command** to `npm install`, **Start Command** to `npm start`, and **Instance Type** to **Free**.
3. When it is live, your server address is `wss://YOUR-SERVICE-NAME.onrender.com` (use `wss://`, not `https://`).

Free Render services go to sleep after 15 minutes with no traffic and take about a minute to wake, so the first person to connect waits. They also forget all rooms when they restart, and some users report free connections dropping every 5 minutes (the game reconnects by itself). Cloudflare avoids these problems.

## Try it on your own computer first
```
cd worker && npm install && npm run local
```
Open the game with `?server=ws://localhost:8787` added to its address, in two or more browser windows.

## How online play works
- One player creates a room and shares the 4-letter code. The host starts once 2 to 4 have joined. Everyone gets the same valley and settlers.
- The shared map has one plot per player: two side by side, three in a triangle, four in a square. In the square, corner-to-corner raids are weaker.
- Each season: plan, then **Run** locks your plan in. When everyone has locked in (the host can press *Don't wait*), the server settles raids and any world event, and all seasons start together.
- **War** opens in Season 2. Declaring costs 8 food and 4 materials; a raid costs 6 food. Strength comes from soldiers, settlers, watchtowers and knowledge, plus a dice roll, and defenders get a small edge. Winners loot food and materials and may capture settlers. Either side can offer peace.
- World events: harvests, droughts, festivals, plague in the biggest village, a caravan for the smallest, a rich ore seam.
- The biggest village at the end wins.

## Limits worth knowing
- Players report their own numbers, so this suits friends, not strangers.
- Reloading the page loses your village (a dropped connection reconnects fine).
- Free plan: 100,000 requests a day across all rooms. Rooms are deleted a day after last use.
- The maths content and syllabus wording come from someone else's work. Get their permission before you publish it publicly.
