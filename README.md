# Settlement Ledger (online)

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
3. Wrangler prints an address such as `https://settlement-ledger-server.YOU.workers.dev`. That is your server.

### 3. Point the game at the server
Open the game, choose **Play online**, and paste the address into the **Server** box (the browser remembers it).
To set it for everyone, open `index.html`, find `const SL_SERVER = ''`, set it to `'wss://settlement-ledger-server.YOU.workers.dev'` and push.

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
- **Joining.** Pick **Play online**, choose a length and create a room. A **4-digit code** appears. Friends open the same page, pick **Play online**, type their name and the code. That is all (the server address is saved in `index.html` as `SL_SERVER`).
- **The world.** One map: four real village islands in a square, a river up the middle and across, rock walls all round, and Mr Lovegrove, The Watcher standing on the top wall where the river meets it. Every player gets their own randomly made island (a finer grid than solo, with no river and no bridge) and everyone sees everyone's island live: buildings, trees, roads and settlers.
- **Zoom.** One button zooms in to your island (it takes you back into your real village) and zooms out to the whole world. Click any other island to look at its live board; the war buttons are at the top.
- **Seasons.** Everyone plans, then **Run** locks the plan in. When all have locked in (the host can press *Don't wait*) the server settles raids and events and all seasons start together.
- **War.** Opens in Season 2. Declare war (8 food and 4 materials), then send the army (6 food); you need a harbour or a warship to cross the river. Strength comes from soldiers, units, defences, knowledge and a dice roll. Winners loot food and materials and may capture settlers. Either side can offer peace.
- **Conquest.** A raid that leaves almost nobody standing takes the island. The loser is out, the winner gets some of their settlers and a second island to look at with the **View island** buttons.
- **Army** (button in the top bar). Spearmen (Season 2), archers (3), horsemen and warships (4), catapults and cannons (5), champions and tanks (6). Barracks hold 6 land units, shipyards hold 4 ships, units eat food each season and desert if you cannot feed them.
- **Buildings that unlock by season (online only).** Barracks and palisade (2), tavern, forge and harbour (3), stables, stone wall and shipyard (4), siege workshop, foundry and fortress (5), the Great Monument and factory (6).
- **Traders.** One of thirteen traders docks each season (Alex, Joe, Noah, Abdullah, Karas, Oscar, Cooper, Jonah, Moses, Harry, Kiro, Patty, Lucas) and what is on their cart depends on who they are. About 1.5% of the time two arrive together with rare goods. Stock is limited, first come first served. Click the boat to shop.
- **The Watcher.** Using `ans123` in an online game costs 10 materials and 5 food, shoots lasers at your island on everyone's map and tells every player "The Watcher has caught a cheater". Click him for a surprise.
- **World events:** harvest, drought, festival, plague, caravan, ore seam, pirates, a royal wedding, a comet, a silver fish run.
- **Treasure:** most seasons something turns up in the river. Click it on the map; the first player to dig it up wins the prize.
- **Easter eggs:** with the world map open, type `dragon`, `ducks`, `party`, `nessie`, `tank` or `armada`.
- The biggest village at the end wins.

## Limits worth knowing
- Players report their own numbers, so this suits friends, not strangers.
- Reloading the page loses your village (a dropped connection reconnects fine).
- Free plan: 100,000 requests a day across all rooms. Rooms are deleted a day after last use.
- The maths content and syllabus wording come from someone else's work. Get their permission before you publish it publicly.
