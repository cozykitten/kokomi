const { SlashCommandBuilder, Routes, PermissionFlagsBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config();
const fs = require('fs');

async function register(rest, guildID, commands) {
    let count = 0;
   // for (const iterator of JSON.parse(process.env.GUILD_ID)) {
    const iterator = await guildID;
        try {
            await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, iterator), { body: commands })

            if (commands.length) console.log('Successfully registered application commands for ' + iterator);
            else console.log('Successfully deleted application commands for ' + iterator);
            count++;

        } catch (e) {
            console.error('\x1b[31mMissing access for ' + iterator + '\x1b[0m');
        }
 //   }
    return count;
}

async function registerAll(rest, message, commands) {
    let count = 0;
    for (const iterator of JSON.parse(process.env.GUILD_ID)) {

        try {
            await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, iterator), { body: commands })

            if (commands.length) console.log('Successfully registered application commands for ' + iterator);
            else console.log('Successfully deleted application commands for ' + iterator);
            count++;

        } catch (e) {
            console.error('\x1b[31mMissing access for ' + iterator + '\x1b[0m');
            message.channel.send(`Failed registering application commands for ${iterator}`)
        }
    }
    return count;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('update')
		.setDescription('updates application commands')
        .addSubcommand(subcommand => subcommand.setName('slashcommands').setDescription('updates application commands')
        .addBooleanOption(option => option.setName('all').setDescription('update for all guilds'))
        .addBooleanOption(option => option.setName('restricted').setDescription('restricted command set'))
        .addStringOption(option => option.setName('id').setDescription('target server id')))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(message){
        if (!JSON.parse(process.env.TRUSTED).includes(message.member.id)) return message.reply('Why would I listen to you?');
        //remove third id and add option to update from a different server for an id

        const rest = new REST({ version: '10' }).setToken(process.env.KOKOMI_TOKEN);
        const commands = [];
        const restricted = ['clone', 'exit', 'music', 'ping', 'update', 'follow'];
        const command_files = fs.readdirSync('./commands/').filter(file => /.js|.ts/.test(file)); //file.endsWith('.js')

        if (message.options.getBoolean('restricted')) {

            for (const file of command_files) {
                const command = require(`../commands/${file}`);
                if (command.data && command.data.name) {
                    if (restricted.includes(command.data.name)) {
                        commands.push(command.data.toJSON());
                    console.log('reading ' + file);
                    } else console.warn('\x1b[33mskipped restricted ' + file + '\x1b[0m');
                } else if (command.name) {
                    console.warn('\x1b[33mskipped MBC ' + file + '\x1b[0m');
                } else {
                    console.error('\x1b[31mError reading ' + file + '\x1b[0m');
                }
            }
        }
        else {
            for (const file of command_files) {
                const command = require(`../commands/${file}`);
                if (command.data && command.data.name) {
                    commands.push(command.data.toJSON());
                    console.log('reading ' + file);
                } else if (command.name) {
                    console.warn('\x1b[33mskipped MBC ' + file + '\x1b[0m');
                } else {
                    console.error('\x1b[31mError reading ' + file + '\x1b[0m');
                }
            }
        }

        
        if (message.options.getBoolean('all')) {
            message.reply({ content: 'updating application commands now...', ephemeral: false });

            await registerAll(rest, message, []);
            const count = await registerAll(rest, message, commands)

            if (count) message.editReply({ content: `Successfully registered application commands for ${count} guilds`, ephemeral: false });
            else message.editReply({ content: `Failed registering application commands`, ephemeral: false });
        }
        else {
            let guildID;
            if (message.options.getString('id')) guildID = message.options.getString('id');
            else guildID = message.guild.id;

            await register(rest, guildID, []);
            const count = await register(rest, guildID, commands);

            if (count) message.reply({ content: `Successfully registered application commands for this guild <:ZeroCool:871457148138319903>`, ephemeral: false });
            else message.reply({ content: `Failed registering application commands <:ZeroFire:871734161268961320>`, ephemeral: false });
        }
	}
}