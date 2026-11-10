# Gridlines Fun (Settlement Ledger)

A settlement game with maths questions. Play alone, endless, pass-and-play on one device, or **online with 2 to 4 players**.

- `index.html` is the whole game (GitHub Pages serves it).
- `worker/` is the small server for online rooms (Cloudflare Workers, free plan, or any Node host such as Render).

## Put it online (about 15 minutes)

### 1. Publish the game on GitHub Pages
1. Create a new GitHub repository and upload everything in this folder (`index.html` and the `worker` folder are what matter).
2. In the repo go to **Settings > Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and Save.
3. After a minute the page shows your game's address.

### 2. Put the server on Cloudflare (free, no terminal needed)
1. Make a free account at https://dash.cloudflare.com/sign-up
2. **Workers & Pages > Create application > Import a repository**, pick your repo, set the project name to `gridlines-fun-server` and the root directory to `worker`, then **Save and Deploy**.
3. The server address looks like `https://gridlines-fun-server.YOURNAME.workers.dev`. Change `https://` to `wss://` and put it in `index.html` where it says `const SL_SERVER`, then upload the file again. After that, joining only needs the 4-digit room code.

### Or: the server on Render
New Web Service, root directory `worker`, build command `npm install`, start command `npm start`, free instance. The address is `wss://YOUR-SERVICE.onrender.com`. Free Render services sleep when idle and forget rooms when they restart.

### Try it on your own computer
```
cd worker && npm install && npm run local
```
Open the game with `?server=ws://localhost:8787` added to its address, in two or more browser windows.

## How online play works
- **Joining.** Pick **Play online**, choose a length, create a room and share the 4-digit code. Friends pick **Play online**, type their name and the code. The host starts when 2 to 4 have joined.
- **The world.** One map: four real village islands in a square, a river up the middle and across, rock walls all round, and Mr Lovegrove, The Watcher standing on the top wall where the river meets it. Everyone gets their own randomly made island (a finer grid than solo, a small forest, and water along the sides that face the river for harbours). Everyone sees everyone's island live. Islands are labelled with the names players typed.
- **Zoom.** One button zooms in to your island (back into your real village) and out to the whole world. Click any other island to look at its live board; the war buttons are at the top.
- **Seasons.** Everyone plans, then **Run** locks the plan in. When all have locked in (the host can press *Don't wait*), the server settles raids and events and all seasons start together.
- **War.** Opens in Season 2. Declare war (8 food and 4 materials), then send the army (6 food); you need a harbour or a warship to cross the river. Strength comes from soldiers, units, defences, knowledge and a dice roll. Winners loot food and materials and may capture settlers. Either side can offer peace.
- **Conquest.** A raid that leaves almost nobody standing takes the island. The loser is out, the winner gets some settlers and a second island to look at with the **View island** buttons.
- **Army** (top bar). Spearmen (Season 2), archers (3), horsemen and warships (4), catapults and cannons (5), champions and tanks (6). Barracks hold 6 land units, shipyards hold 4 ships; units eat food each season and desert if you cannot feed them.
- **Buildings that unlock by season (online only).** Barracks and palisade (2), tavern, forge and harbour (3), stables, stone wall and shipyard (4), siege workshop, foundry and fortress (5), the Great Monument and factory (6). Harbours and shipyards must be built right beside water.
- **Traders.** In a quarter of seasons a merchant arrives as a **cart** that drives up the road to ONE base, picked at random. Only that player can trade, by clicking the cart; everyone else can see it on that island. One of thirteen traders comes (Alex, Joe, Noah, Abdullah, Karas, Oscar, Cooper, Jonah, Moses, Harry, Kiro, Patty, Lucas) and what is on the cart depends on who it is. About 1.5% of visits bring two carts with rare goods. Stock is limited.
- **Treasure.** In 7.5% of seasons something turns up in the river and a gold banner appears across everyone's screen. Everyone can race to **connect the wires**; the first to finish wins the prize, but diving is dangerous: a 15% chance a settler drowns.
- **World events.** Harvest, festival, comet, caravan, ore seam, royal wedding and silver fish run are common; drought, plague and river pirates are rare. Shared worlds also get fewer disasters and small bad events than solo.
- **The Watcher.** Using the maths-skip code in an online game costs 10 materials and 5 food, fires lasers at your island on everyone's map and tells every player "The Watcher has caught a cheater". Click him for a surprise.
- **Easter eggs.** With the world map open, type `dragon`, `ducks`, `party`, `nessie`, `tank` or `armada`.
- The biggest village at the end wins.

## Solo and pass-and-play
- The solo map is a fair bit bigger (21 by 15 blocks) with the river, bridge and everything else as before.
- **Clearing crew** (100 materials): when finished, every tree and rock within 3 blocks is cleared and sold (2 materials a tree, 3 a rock). Works in every mode.
- **Defences:** pick palisade or stone wall and press **Wall the whole shoreline** to plan a run of it along every free bit of bank, leaving the road open as a gate.
- Endless mode has no last season and a **Stop here** button; pass-and-play takes turns on one device.

## Admin panel
There is a hidden admin panel for setting resources, settlers, satisfaction and health, and for adding granaries, stockpiles and shelters to hold them. Its code is not written down in this repository; it is stored in the page only in scrambled form.

## Limits worth knowing
- Players report their own numbers, so online play suits friends, not strangers.
- Reloading the page loses your village (a dropped connection reconnects fine).
- Free Cloudflare plan: 100,000 requests a day across all rooms; rooms are deleted a day after last use.
- The maths content and syllabus wording come from someone else's work. Get their permission before you publish it publicly.
