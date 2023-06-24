require('dotenv').config();
const fs = require('fs');
const { lb, synclb } = require('./dbManager');
const { Client, IntentsBitField, Collection } = require("discord.js");
const pm2 = require('pm2');
//const { loadReminders } = require('./commands/reminder'); for directly calling loadReminders(client);


const myIntents = new IntentsBitField();
myIntents.add(
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildPresences
    );
const client = new Client({ intents: myIntents });


//do stuff on ready
client.once('ready', () => {
    console.log(`\n\x1b[34mClient has logged in as ${client.user.tag}\x1b[0m`);
    const onceReady = require('./onceReady');
    onceReady(client);
})


//load events and commands
const eventFiles = fs.readdirSync('./events/').filter(file => /.js|.ts/.test(file));
const commandFiles = fs.readdirSync('./commands/').filter(file => /.js|.ts/.test(file));
startup(eventFiles, commandFiles);


//login
client.login(process.env.CLIENT_TOKEN)


function startup(eventFiles, commandFiles) {

    //event handler
    for (const file of eventFiles) {

        const event = require(`../events/${file}`);
        const eventName = file.split('.')[0];
        client.on(eventName, (...args) => event(...args));
    }

    //command handler
    client.commands = new Collection();
    client.mbc = new Collection();

    for (const file of commandFiles) {

        const command = require(`../commands/${file}`);
        if (command.data && command.data.name) {
            client.commands.set(command.data.name, command);
            console.log('loading ' + file);
        }
        else if (command.name) {
            client.mbc.set(command.name, command);
            console.warn('\x1b[33mloading MBC ' + file + '\x1b[0m');
        }
        else {
            console.error('\x1b[31mError reading ' + file + '\x1b[0m');
        }
    }
}

module.exports = startup;


//planned exit
process.on('SIGINT', async () => {
    console.log('exit command received..');
    pm2.disconnect();
    lb.lastexit = true;
    try {
        await synclb(lb);
    } catch (error) {
        const home = await client.guilds.fetch(process.env.KOKOMI_HOME);
        const log = await home.channels.fetch(process.env.KOKOMI_LOG);
        await log.send(`Error while syncing the database:\n${error.message}`);
    }
    await client.destroy();
    process.exit();
}
);