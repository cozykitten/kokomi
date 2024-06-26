require('dotenv').config();
const fs = require('fs');
const { startup, stopApplication } = require('./reloadManager');
const { Client, IntentsBitField } = require("discord.js");
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

client.on('warn', (message) => console.warn('\x1b[33mDiscord client issue:\x1b[0m', message));
client.on('error', (message) => console.error('\x1b[31mDiscord client error:\x1b[0m', message));


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
    await stopApplication(client);
});

//any exit
/*process.on('exit', async () => {
    await client.commands.get('receipt').terminateWorker();
});*/