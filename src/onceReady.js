const { EmbedBuilder } = require('discord.js');
require('dotenv').config();
const { db, lb, synclb } = require('./dbManager');


module.exports = async (client) => {

    //retrieve channels for messages
    const home = await client.guilds.fetch(process.env.KOKOMI_HOME);
    const log = await home.channels.fetch(process.env.KOKOMI_LOG);

    //checking last exit
    if (!lb.lastexit) {
        checkLastExit(log);
    }
    else {
        lb.lastexit = false;
        synclb(lb);
    }

    //loading reminders
    console.log('loading reminders..');
    client.commands.get('reminder').loadReminders(client);

    //checking git
    githubTimed(client, log);

    //checking twitch
    const twitchCache = {};
    twitchTimed(client, twitchCache);

    //check youtube
    //youtubeTimed(client);
}

/**
 * Calls the githubTimed function every 24h.
 * Contains 2 nested loops, the first iterated through every discord user in db.github, the second iterates through the array of github repos assigned to each discord user.
 * It then calls githubTimed for every repo.
 * 
 * @param {Discord.Client} client Discord Client.
 */
async function githubTimed(client, channel) {
    //TODO: export in own command file that allows adding and removing of repos to check, similar to reminder command
    console.log('checking github..');
    const isTokenValid = await checkGithubTokenExpiration();

    if (!isTokenValid) {
        setTimeout(githubTimed, 900000, client);
        return;
    }

    if (isTokenValid === -1) {
        console.warn('GitHub token is expired or invalid. Please generate a new token.');
        const embed = new EmbedBuilder()
            .setTitle('Invalid token')
            .setColor(0xc43838)
            .setDescription('GitHub token is expired or invalid. Please generate a new token.');
        channel.send({ embeds: [embed] });
        setTimeout(githubTimed, 900000, client);
        return;
    }

    for (const uid in db.github) {
        const discordUser = await client.users.fetch(uid);
        for (const e of db.github[uid]) {
            github(e.owner, e.repo, discordUser);
        }
    }
    //repeat every 24h
    setTimeout(githubTimed, 86400000, client);
}

/**
 * Calls the twitch function every 20 minutes.
 * Contains 2 nested loops, the first iterates through every discord user in db.twitch and the second iterates through all twitch channels listed for every discord user.
 * It calls the twitch function on every listed twitch channel.
 * It sends a message to the discord user if the twitch function returns true. 
 * 
 * @param {Discord.Client} client Discord Client.
 * @param {Object.<string, number>} twitchCache Cache holding the stream id for each channel if it's live.
 */
async function twitchTimed(client, twitchCache) {
    //TODO: export in own command file that allows adding and removing of channels to check, similar to reminder command
    const clientId = process.env.TWITCH_ID;
    const clientSecret = process.env.TWITCH_SECRET;
	let accessToken;
	if (twitchCache.accessToken) accessToken = await validateTwitchToken(clientId, clientSecret, twitchCache);
	else accessToken = await getTwitchAccessToken(clientId, clientSecret, twitchCache);

    if (!accessToken) {
        //connection error, try again in 10 minutes
        setTimeout(twitchTimed, 600000, client, twitchCache);
        return;
    }

    for (const uid in db.twitch) {

        const discordUser = await client.users.fetch(uid);
        for (const e of db.twitch[uid]) {

            const thumbnail = await twitch(e, twitchCache, clientId, accessToken, discordUser);
            if (thumbnail) {
                try {
                    const embed = new EmbedBuilder()
                        .setTitle('Twitch')
                        .setColor(0x797FCB)
                        .setDescription(`${e} is now live on twitch!`)
                        .setURL(`https://www.twitch.tv/${e}`)
                        .setImage(thumbnail.replace('{width}x{height}', '1280x720') + '?time=' + Date.now());
                    const message = await discordUser.send({ embeds: [embed] });
                    twitchCache[e].messageId = message.id;

                } catch (e) {
                    console.error("Cannot send messages to " + discordUser.username + "\n error in function 'twitchTimed' in 'onceReady.js'");
                    const server = await client.guilds.cache.get(process.env.KOKOMI_HOME);
                    const channel = await server.channels.cache.get(process.env.KOKOMI_LOG);
                    channel.send("Cannot send messages to " + discordUser.username + "\n error in function 'twitchTimed' in 'onceReady.js'");
                }
            }
        }
    }
    //repeat every 20min
    setTimeout(twitchTimed, 1200000, client, twitchCache);
}

/**
 * TODO: set repeat to ~48min
 * @param {Discord.Client} client Discord Client.
 */
async function youtubeTimed(client) {
    
    console.log('checking youtube..');
    /* for (const uid in db.youtube) {

        const discordUser = await client.users.fetch(uid);
        for (const e of db.youtube[uid]) {

            if (!await youtube(e)) {
                //channel not live, continue
                continue;
            }
            try {
                const embed = new EmbedBuilder()
                    .setTitle('Youtube')
                    .setColor(0x797FCB)
                    .setDescription(`${e} is now live on youtube!`)
                    .setURL(`https://www.youtube.com/${e}/streams`);
                await discordUser.send({ embeds: [embed] });
            } catch (e) {
                console.error("Cannot send messages to " + discordUser.username + "\n error in function 'twitchTimed' in 'onceReady.js'");
                const server = await client.guilds.cache.get(process.env.KOKOMI_HOME);
                const channel = await server.channels.cache.get(process.env.KOKOMI_LOG);
                channel.send("Cannot send messages to " + discordUser.username + "\n error in function 'twitchTimed' in 'onceReady.js'");
            }
        }
    }
    //repeat every 48 min min
    setTimeout(youtubeTimed, 2880000, client);

    async function youtube(channelId) {
        try {
            const response = await fetch(`https://www.youtube.com/${channelId}/streams`);
            const data = await response.text();
            if (data.includes('hqdefault_live.jpg')) {
                console.log('channel is live')
                return true;
            }
            else {
                console.log('channel is not live')
                return false;
            }
        } catch (e) {
            console.error(`Error fetching youtube channel of ${channelId}:`, e);
            return false;
        }
    } */

    {
        async function getChannelId(channelName) {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&q=${channelName}&type=channel&key=${process.env.GOOGLE_API_KEY}`);
            const data = await response.json();
            console.log(data.items);
            if (data.items.length > 0) {
                return data.items[0].id.channelId;
            } else {
                throw new Error('Channel not found');
            }
        }
        async function isChannelLive(channelId) {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${process.env.GOOGLE_API_KEY}`);
            const data = await response.json();
            console.log(data)
            return data.items.length > 0;
        }

        //const channelName = '';
        //const isLive = await isChannelLive(await getChannelId(channelName));
        //just use channelID directly
        const channelId = '';
        const isLive = await isChannelLive(channelId);

        console.log(`Is the channel live? ${isLive}`);
    }
       
}

/**
 * Retrieves the command data of the last invoked command and posts it in the log channel.
 * @param {Discord.GuildChannel} log The channel to send kokomi's logs to.
 */
async function checkLastExit(log) {

    const{ EmbedBuilder } = require("discord.js");

    const embed = new EmbedBuilder()
        .setTitle('crash report')
        .setColor(0xc43838);

    if (lb.lastcall.subcommand) {
        embed.data.fields = [{
            name: 'command',
            value: lb.lastcall.command + ' ' + lb.lastcall.subcommand,
            inline: true
        }];
    }
    else {
        embed.data.fields = [{
            name: 'command',
            value: lb.lastcall.command,
            inline: true
        }];
    }

    embed.data.fields.push({
        name: 'requested by',
        value: '<@' + lb.lastcall.userid + '>',
        inline: true
    });

    if (lb.lastcall.options) {
        let options = '';
        for (const i of lb.lastcall.options) {
            options = options + i.name + ': ' + i.value + '\n';
        }
        embed.data.fields.push({
            name: 'options',
            value: options
        });
    }
    
    log.send({ content: "last exit: unplanned", embeds: [embed] });
}

/**
 * Retrieve information on the latest release of a given Github repo.
 * If the latest release occured within the last 24h, send a message with the release information to the discordUser.
 * 
 * @param {String} owner The owner of the github repository to check.
 * @param {String} repo The github repository to check.
 * @param {Discord.User} discordUser The Discord user to send a message to.
 */
async function github(owner, repo, discordUser) {
    // Retrieve information on the latest release
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`;
    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
            }
        });

        const latestRelease = await response.json();
        const latestReleaseTime = Date.parse(latestRelease[0].published_at);

        // Check if there is a new release since the past 24h
        const currentTime = Date.now();
        if (latestReleaseTime > (currentTime - 86400000)) {
            try {
                await discordUser.send(`New release available: ${latestRelease[0].name}\nhttps://github.com/${owner}/${repo}/releases`);
            } catch (e) {
                console.error("Cannot send messages to " + discordUser.username + "\n error in function 'github' in 'onceReady.js'");
                const server = await client.guilds.cache.get(process.env.KOKOMI_HOME);
                const channel = await server.channels.cache.get(process.env.KOKOMI_LOG);
                channel.send("Cannot send messages to " + discordUser.username + "\n error in function 'github' in 'onceReady.js'");
            }
        } else {
            return;
        }
    } catch (e) {
        console.error('Error retrieving release information:', e);
        return;
    };
}

/**
 * Checks if a given twitch channel is live.
 * 
 * @param {String} channelName Name of the twitch channel to check.
 * @param {Object.<string, number>} twitchCache Cache holding the stream id for each channel if it's live.
 * @param {String} clientId Twitch client id.
 * @param {String} accessToken Twitch access token.
 * @returns {String} Returns the thumbnail url only once for each stream id.
 */
async function twitch(channelName, twitchCache, clientId, accessToken, discordUser) {
    const url = `https://api.twitch.tv/helix/streams?user_login=${channelName}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();

        if (data.data.length > 0) {
            // Channel is live, cache stream id
            const stream = data.data[0];

            if (!twitchCache[channelName]) {
                twitchCache[channelName] = {};
            }

            // If live is 1, that means this function already returned true before for this stream
            if (!twitchCache[channelName].live) {
                twitchCache[channelName].live = 1;
                return stream.thumbnail_url;
            }
            return false;
        }
        else {
            // Channel is not live
            if (!twitchCache[channelName]) return false;
            if (!twitchCache[channelName].live) return false;
            twitchCache[channelName].live = 0;

            let dm;
            if (discordUser.dmChannel) {
                dm = discordUser.dmChannel;
            } else {
                dm = await user.createDM();
            }

            try {
                const m = await dm.messages.fetch(twitchCache[channelName].messageId);
                await m.delete();
            } catch (e) {}
            delete twitchCache[channelName].messageId;
            return false;
        }
    }
    catch (e) {
        console.error(`Error fetching twitch channel of ${channelName}:`, e);
        return false;
    }
}

async function checkGithubTokenExpiration() {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
            }
        });

        if (response.status === 401) {
            return -1; // Token is expired or invalid
        }

        return 1; // Token is valid
    }
    catch (e) {
        console.error('Error checking Github token expiration:', e);
        return false; // Error occurred, or connection error
    }
}

async function getTwitchAccessToken(clientId, clientSecret, twitchCache) {
    const url = 'https://id.twitch.tv/oauth2/token';
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: params
        });
    
        const data = await response.json();
		twitchCache.accessToken = data.access_token;
        return data.access_token;
    } catch (e) {
        console.error('Error fetching Twitch access token:', e);
        return false;
    }
}

async function validateTwitchToken(twitchCache) {
	const url = 'https://id.twitch.tv/oauth2/validate';

	try {
		const response = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${twitchCache.accessToken}`
			}
		});

		const data = await response.json();
		if (response.ok && data.expires_in > 100) return twitchCache.accessToken;
		if (response.status === 401) return await getTwitchAccessToken(clientId, clientSecret, twitchCache);
	} catch (e) {
		console.error('Error validating Twitch access token:', e);
        return false;
	}

}