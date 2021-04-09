# Parcel Tracker Discord Bot

This project uses Discord.js. It provides a platform to track multiple packages from multiple couriers.
To invite the bot I host, click [here](https://discord.com/oauth2/authorize?client_id=828975675322794005&scope=bot&permissions=8).

## What You Need

- [ ] A Discord Bot Token -> find more at the start of [this](https://www.digitalocean.com/community/tutorials/how-to-build-a-discord-bot-with-node-js)
- [ ] A UPS API key -> can be setup [here](https://www.ups.com/upsdeveloperkit?loc=en_GB)

Once you have these things, put them in the config.json.example file and rename this to config.json
Without these tokens the bot will crash

## How to Run

Clone this repository and setup your config.json file. Ensuring you have node.js installed, navigate to the directory in your terminal and run `npm install`. This will install the dependencies for this project. Then all you have to do is run `node bot.js` or `npm start`. Enjoy!
  