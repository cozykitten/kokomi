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
    console.log('checking github..');
    githubTimed(client, log);

    //checking twitch
    console.log('checking twitch..');
    const twitchCache = {};
    twitchTimed(client, twitchCache);
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
    const isTokenValid = await checkGithubTokenExpiration();

    if (!isTokenValid) {
        console.log('GitHub token is expired or invalid. Please generate a new token.');
        const embed = new EmbedBuilder()
            .setTitle('Invalid token')
            .setColor(0xc43838)
            .setDescription('GitHub token is expired or invalid. Please generate a new token.');
        channel.send({ embeds: [embed] });
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
    const accessToken = await getTwitchAccessToken(clientId, clientSecret);

    for (const uid in db.twitch) {

        const discordUser = await client.users.fetch(uid);
        for (const e of db.twitch[uid]) {

            const stream = await twitch(e, twitchCache, clientId, accessToken);
            if (stream) {
                try {
                    const embed = new EmbedBuilder()
                        .setTitle('Twitch')
                        .setColor(0x797FCB)
                        .setDescription(`${e} is now live on twitch!`)
                        .setURL(`https://www.twitch.tv/${e}`)
                        .setImage(stream.replace('{width}x{height}', '1280x720'));
                    await discordUser.send({ embeds: [embed] });
                } catch (e) {
                    console.error("Cannot send messages to " + discordUser.username);
                    const server = await client.guilds.cache.get(process.env.KOKOMI_HOME); 
                    const channel = await server.channels.cache.get(process.env.KOKOMI_LOG);
                    channel.send("Cannot send messages to " + discordUser.username);
                }
            }
        }
    }
    //repeat every 20min
    setTimeout(twitchTimed, 1200000, client, twitchCache);
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
                console.error("Cannot send messages to " + discordUser.username);
                const server = await client.guilds.cache.get(process.env.KOKOMI_HOME);
                const channel = await server.channels.cache.get(process.env.KOKOMI_LOG);
                channel.send("Cannot send messages to " + discordUser.username);
            }
        } else {
            return;
        }
    } catch (error) {
        console.log(`Error retrieving release information: ${error}`);
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
async function twitch(channelName, twitchCache, clientId, accessToken) {
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
            // If the same stream id is already set, that means this function already returned true before for this stream id
            if (!(twitchCache[channelName] === stream.id)) {
                twitchCache[channelName] = stream.id;
                return stream.thumbnail_url;
            }
            return false;
        }
        else {
            // Channel is not live
            twitchCache[channelName] = 0;
            return false;
        }
    }
    catch (error) {
        console.error('Error:', error);
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
            return false; // Token is expired or invalid
        }

        return true; // Token is valid
    }
    catch (error) {
        console.log(`Error checking token expiration: ${error}`);
        return false; // Error occurred, assume token is expired or invalid
    }
}

async function getTwitchAccessToken(clientId, clientSecret) {
    const url = 'https://id.twitch.tv/oauth2/token';
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    const response = await fetch(url, {
        method: 'POST',
        body: params
    });

    const data = await response.json();
    return data.access_token;
}