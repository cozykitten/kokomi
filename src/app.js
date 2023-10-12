require('dotenv').config();
const fs = require('fs');
const { lb, synclb } = require('./dbManager');
const { startup } = require('./reloadManager');
const { Client, IntentsBitField } = require("discord.js");
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
startup(eventFiles, commandFiles, client);


//login
async function login() {
    try {
        await client.login(process.env.CLIENT_TOKEN);
    } catch (err) {
        console.error('client login error... retrying in 15 minutes.');
        setTimeout(login, 900000);
    }
}
login();


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