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
    githubTimed(client);
}

async function githubTimed(client) {
    //TODO: export in own command file that allows adding and removing of repos to check, similar to reminder command
    console.log('checking github..');
    for (const uid in db.github) {
        const discordUser = await client.users.fetch(uid);
        for (const e of db.github[uid]) {
            github(e.owner, e.repo, discordUser);
        }
    }
    //repeat every 24h
    setTimeout(githubTimed, 86400000, client);
}

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

// Retrieve information on the latest release
async function github(owner, repo, discordUser) {
    // Retrieve information on the latest release
    fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`)
        .then(response => response.json())
        .then(async latestRelease => {
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
        })
        .catch(error => {
            console.log(`Error retrieving release information: ${error}`);
            return;
        });
}