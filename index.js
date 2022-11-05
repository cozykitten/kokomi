require('dotenv').config();
const fs = require('fs');
const { lb, synclb } = require('./dbManager');
const{ Client, IntentsBitField, Collection, EmbedBuilder, embedLength } = require("discord.js");
//const { loadReminders } = require('./commands/reminder'); for directly calling loadReminders(client);


const myIntents = new IntentsBitField();
myIntents.add(
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent
    );
const client = new Client({ intents: myIntents });


//do stuff on ready
client.once('ready', () => {

    console.log(`\nClient has logged in as ${client.user.tag}`);

    //checking last exit
    if (!lb.lastexit) {
        const embed = new EmbedBuilder()
        .setTitle('crash report')
        .setColor('#c43838');

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
                options = options + i.name + ': ' + i.value + '\n'
            }
            embed.data.fields.push({
                name: 'options',
                value: options
            });
        }

        client.guilds.fetch(process.env.HOME)
        .then((server) => {
            return server.channels.fetch(process.env.LOG);
        }).then((channel) => {
            channel.send({ content: "last exit: unplanned", embeds: [embed] })
        })
    }
    else {
        lb.lastexit = false;
        synclb(lb);
    }

    //loading reminders
    client.commands.get('reminder').loadReminders(client);
})


//command handler
client.commands = new Collection();
client.mbc = new Collection();
const command_files = fs.readdirSync('./commands/').filter(file => /.js|.ts/.test(file));
for (const file of command_files) {

    const command = require(`./commands/${file}`);
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


//event handler
const event_files = fs.readdirSync(`./events`).filter(file => /.js|.ts/.test(file));
for (const file of event_files) {

    const event = require(`./events/${file}`);
    const event_name = file.split('.')[0];
    client.on(event_name, event.bind(null, client));
}


//login
client.login(process.env.KOKOMI_TOKEN)



