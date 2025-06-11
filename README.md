## Bot Setup

### Prerequisites
* Latest version of Docker ([download](https://docs.docker.com/get-docker))
* Latest version of Docker Compose ([download](https://docs.docker.com/compose/install))
* Git ([download](https://git-scm.com/downloads))
* An [e621ng](https://github.com/e621ng/e621ng) instance ready to start
* A [discord bot application](https://discord.com/developers/applications)

 If you are on Windows Docker Compose is already included, you do not need to install it yourself.
 If you are on Linux/MacOS you can probably use your package manager.

### Discord application setup
1. Create a new application
2. Under the "Installation" sidebar
   - For "Installation Contexts" select "Guild Install"
   - Set the "Install Link" dropdown to "None"
3. Under the "OAuth2" sidebar
   - Add a redirect to `http://localhost:8000/callback`, or where ever your discord bot joiner will be listening
4. Under the "Bot" sidebar
   - It is recommended to disable "Public Bot"
   - Enable "Server Members Intent"
   - Enable "Message Content Intent"
5. Join the bot to the desired server using the following invite link, but replace the client id with your application's id: https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID_HERE&scope=bot&permissions=395271335063

### Configuration
1. Copy the `.env.sample` file and rename it to `.env`
2. Enter your bot's token (found on the `Bot` page of the application setup)
3. Enter your application's client secret (found on the `OAuth2` page of the application setup)
4. Enter your bot's client id (application id, found on the `General Information` page of the application setup)
5. Enter your discord guild (server) id
6. Enter your discord joiner link secret (found in e621ng's `docker-compose.yml` file, or other environment file, it's passed as `DANBOORU_DISCORD_SECRET`. It defaults to `super_secret_for_url_discord`)
7. e621/e926 base url can be the same in development environments, but should be your e621ng's domain. Do not add trailing slashes
8. Enter the redis url of your e621ng instance. You may need to expose the port from docker manually in development enviornments. This can be done by adding a `ports` mapping to the `redis` service in e621ng's `docker-compose.yml` file. You should map `6379:6379`
9. Enter your desired port number. It is recommended to leave this at `8000`, if you select anything different you will need to map the correct port in `docker-compose.yml`

### Installing dependencies
Run `npm i` to install all node dependencies. This is required to start the bot.

### Starting the bot

e621ng must be up for the bot to start properly and open the connection to the redis database.

#### In development
You can use `npm run dev` to run the typescript without compiling. This will watch for changes and restart when they happen.

If desired, you can also build the typescript using `npm run build` and then subsequently run it using `npm run start`

#### In docker
1. Run `docker compose build` to build the image
2. Run `docker compose up` to start the bot. Changes to any files, including `.env` will require a rebuild