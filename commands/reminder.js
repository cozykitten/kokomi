const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, sync } = require('../dbManager');
const ms = require('ms');
require('dotenv').config();

async function remindme(timestamp, client) {

    //build embed with db saved date and event name, send over client in dms
    const embed = new EmbedBuilder()
        .setTitle(`Reminder for ${getDate(timestamp)}`)
        .setDescription('<:AriNotes:1038919832135024640> | ' + db.reminder[timestamp].event)
        .setColor('#797FCB');

    const user = await client.users.fetch(db.reminder[timestamp].uid);
    try {
        await user.send({ embeds: [embed] });
    } catch (e) {
        console.error("Cannot send messages to " + user.username);
        const server = await client.guilds.cache.get(process.env.HOME); //use fetch
		const channel = await server.channels.cache.get(process.env.LOG);
        channel.send("Cannot send messages to " + user.username);
    }

    //remove db entry as reminder is completed
    if (db.reminder) {

        const exists = await timestamp in db.reminder;
        if (exists) {
            delete db.reminder[timestamp];
            sync(db);
        }
    }
}

function getDate(timestamp) {
    let date = new Date(timestamp);
    const formDate = date.getDate() + "." + date.getMonth() + "." + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
    return formDate;
}

module.exports = {
    data: new SlashCommandBuilder()
		.setName('reminder')
		.setDescription('set a reminder')
        .addSubcommand(subcommand => subcommand.setName('add').setDescription('add a new reminder')
            .addStringOption(option => option.setName('time').setDescription('time').setRequired(true))
            .addStringOption(option => option.setName('event').setDescription('event').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {

        if (!JSON.parse(process.env.TRUSTED).includes(interaction.member.id)) return interaction.reply("Don't bother me");

        if (interaction.options.getSubcommand() === 'add') {
            
            //split complex time (2d 12h) into subtimes and add up ms
            const complexTime = interaction.options.getString('time').split(' ');
            let time = 0;
            for (const subTime of complexTime) {
                if (ms(subTime)) {
                    time += ms(subTime)
                }
                else return interaction.reply({ content: 'not a valid time' });
            }

            if (time > 2147483646) {
                return interaction.reply({ content: 'Cannot set a reminder further away than ``24d 18h``' });
            }
            //calc future date & store in db
            const fuDate = Date.now() + time;
            
            if (!db.reminder) {
                db.reminder = {};
            }
            db.reminder[fuDate] = {
                "uid": interaction.member.id,
                "event": interaction.options.getString('event')
            }

            sync(db);
            interaction.reply({ content: `<:AriNotes:1038919832135024640> I set a reminder for \`\`${interaction.options.getString('event')}\`\` in \`\`${ms(time, { long: true })}\`\``, ephemeral: true });
            setTimeout(remindme, time, fuDate, client);
        }
    },

    async loadReminders (client) { //check all past reminders and resolve them, and set timeouts for all open reminders
        if (db.reminder) {
    
            const date = Date.now();
            for (const key in db.reminder) {
    
                const fuDate = Number(key);
                if (fuDate <= date) {
                    remindme(fuDate, client);
                }
                else {
                    setTimeout(remindme, fuDate - date, fuDate, client);
                }
            }
        }
    }
}