const { SlashCommandBuilder, Routes, PermissionFlagsBits, InteractionCollector, InteractionType } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config();
const fs = require('fs');

function commandList(command_files, modified_set, set_name) {
    const commands = [];
    for (const file of command_files) {
        const command = require(`../commands/${file}`);
        if (command.data && command.data.name) {
            if (modified_set) {
                if (modified_set.includes(command.data.name)) {
                    commands.push(command.data.toJSON());
                    console.log('reading ' + file);
                } else console.warn('\x1b[33mskipped ' + set_name + ' ' + file + '\x1b[0m');
            } else {
                commands.push(command.data.toJSON());
                console.log('reading ' + file);
            }
        } else if (command.name) {
            console.warn('\x1b[33mskipped MBC ' + file + '\x1b[0m');
        } else {
            console.error('\x1b[31mError reading ' + file + '\x1b[0m');
        }
    }
    return commands;
}

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

async function registerGlobal(rest, commands) {
    let count = 0;
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })

        if (commands.length) console.log('Successfully registered GLOBAL application commands.');
        else console.log('Successfully deleted GLOBAL application commands for.');
        count++;

    } catch (e) {
        console.error('\x1b[31mError registering GLOBAL application commands.\x1b[0m');
    }
    return count;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('update')
		.setDescription('updates application commands')
            .addSubcommand(subcommand => subcommand.setName('guild').setDescription('updates guild level application commands')
            .addBooleanOption(option => option.setName('all').setDescription('update for all guilds'))
            .addBooleanOption(option => option.setName('restricted').setDescription('restricted command set'))
            .addStringOption(option => option.setName('id').setDescription('target server id')))
        .addSubcommand(subcommand => subcommand.setName('global').setDescription('updates global application commands'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(message){
        if (!JSON.parse(process.env.AUTHOR) === message.user.id) return message.reply('Why would I listen to you?');

        const rest = new REST({ version: '10' }).setToken(process.env.KOKOMI_TOKEN);
        const restricted = ['clone', 'exit', 'music', 'ping', 'update', 'follow'];
        const global = ['cleandm', 'exit', 'ping', 'reminder', 'update'];
        const command_files = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));


        if (message.options.getSubcommand() === 'global') {
            await registerGlobal(rest, []);
            const count = await registerGlobal(rest, commandList(command_files, global, 'GLOBAL'));

            if (count) return message.reply({ content: `Successfully registered GLOBAL application commands <:ZeroCool:1038896868987510794>`, ephemeral: false });
            else return message.reply({ content: `Failed registering application commands <:ZeroFire:1038896872296808560>`, ephemeral: false });
        }


        const fullCommands = message.options.getBoolean('restricted') ? commandList(command_files, restricted, 'restricted') : commandList(command_files);
        const commands = fullCommands.filter(e => !new Set(global).has(e.name));

        if (message.options.getBoolean('all')) {
            await message.reply({ content: 'updating application commands now...', ephemeral: false });

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

            if (count) message.reply({ content: `Successfully registered application commands for ${message.options.getString('id') ? guildID : 'this'} guild <:ZeroCool:1038896868987510794>`, ephemeral: false });
            else message.reply({ content: `Failed registering application commands <:ZeroFire:1038896872296808560>`, ephemeral: false });
        }
	}
}