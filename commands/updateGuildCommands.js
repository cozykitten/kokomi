const { SlashCommandBuilder, Routes, PermissionFlagsBits, GuildDefaultMessageNotifications, Guild } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config();
const fs = require('fs');

/**
 * Builds a list of commands to register based on the command names given.
 * 
 * @param {string[]} command_files List of command names.
 * @param {string[]} modified_set Sublist of command names to register.
 * @param {string} set_name Name of the sublist of command names.
 * @returns {any[]} Array of commands to register.
 */
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

/**
 * Register application commands for the given guild. 
 * 
 * @param {REST} rest 
 * @param {string} guildID Id of the guild to register.
 * @param {any[]} commands Commands to register, empty array to unregister.
 * @returns {Promise<boolean>} True if successful.
 */
async function register(rest, guildID, commands) {
    let success = false;
   // for (const iterator of JSON.parse(process.env.GUILD_ID)) {
    const iterator = guildID;
        try {
            await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, iterator), { body: commands })

            if (commands.length) console.log('Successfully registered application commands for ' + iterator);
            else console.log('Successfully deleted application commands for ' + iterator);
            success = true;

        } catch (e) {
            console.error('\x1b[31mMissing access for ' + iterator + '\x1b[0m');
        }
 //   }
    return success;
}

/**
 * Register application commands for all guilds added to process.env.GUILD_ID.
 * 
 * @param {REST} rest 
 * @param {any} message Interaction triggering this command to send messages on error.
 * @param {any[]} commands Commands to register, empty array to unregister.
 * @returns {Promise<number>} Count of successfully registered guilds.
 */
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

/**
 * Register application commands globally.
 * 
 * @param {REST} rest 
 * @param {any[]} commands Commands to register globally, empty array to unregister.
 * @returns {Promise<boolean>} True if successful.
 */
async function registerGlobal(rest, commands) {
    let success = false;
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })

        if (commands.length) console.log('Successfully registered GLOBAL application commands.');
        else console.log('Successfully deleted GLOBAL application commands.');
        success = true;

    } catch (e) {
        console.error('\x1b[31mError registering GLOBAL application commands.\x1b[0m');
    }
    return success;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('update')
		.setDescription('updates application commands')
            .addSubcommand(subcommand => subcommand.setName('guild').setDescription('updates guild level application commands')
            .addBooleanOption(option => option.setName('all').setDescription('update for all trusted guilds'))
            .addBooleanOption(option => option.setName('restricted').setDescription('restricted command set'))
            .addStringOption(option => option.setName('id').setDescription('target server id')))
        .addSubcommand(subcommand => subcommand.setName('global').setDescription('updates global application commands'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction){

        //command may only be used by developer
        if (!JSON.parse(process.env.AUTHOR) === interaction.user.id) return interaction.reply('Why would I listen to you?');

        const rest = new REST({ version: '10' }).setToken(process.env.KOKOMI_TOKEN);

        /**
         * @restricted {string[]} commands registered on guild level for restricted setting
         * @global {string[]} commands registered globally with global setting
         * @command_files {string[]} all commands found in ./commands
         */
        const restricted = ['clone', 'music', 'follow'];
        const global = ['cleandm', 'exit', 'ping', 'reminder', 'update', 'timestamp', 'login'];
        const command_files = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));


        if (interaction.options.getSubcommand() === 'global') {
            //await registerGlobal(rest, []);
            const success = await registerGlobal(rest, commandList(command_files, global, 'GLOBAL'));

            if (success) return interaction.reply({ content: `Successfully registered GLOBAL application commands <:ZeroCool:1038896868987510794>`, ephemeral: false });
            else return interaction.reply({ content: `Failed registering application commands <:ZeroFire:1038896872296808560>`, ephemeral: false });
        }


        /**
         * @fullCommands Array of commands built from either all commands or restricted commands only.
         * @commands Array of commands. Commands present in global are removed.
         */
        const fullCommands = interaction.options.getBoolean('restricted') ? commandList(command_files, restricted, 'restricted') : commandList(command_files);
        const commands = fullCommands.filter(e => !new Set(global).has(e.name));

        if (interaction.options.getBoolean('all')) {
            await interaction.reply({ content: 'updating application commands now...', ephemeral: false });

            //await registerAll(rest, interaction, []);
            const count = await registerAll(rest, interaction, commands)

            if (count) interaction.editReply({ content: `Successfully registered application commands for ${count} guilds`, ephemeral: false });
            else interaction.editReply({ content: `Failed registering application commands`, ephemeral: false });
        }
        else {
            let guildID;
            if (interaction.options.getString('id')) {
                guildID = interaction.options.getString('id');
            }
            else {
                if (!interaction.inGuild()) return interaction.reply('Please provide a guild id.');
                guildID = interaction.guild.id;
            }

            //await register(rest, guildID, []);
            const success = await register(rest, guildID, commands);

            if (success) interaction.reply({ content: `Successfully registered application commands for ${interaction.options.getString('id') ? guildID : 'this guild'} <:ZeroCool:1038896868987510794>`, ephemeral: false });
            else interaction.reply({ content: `Failed registering application commands <:ZeroFire:1038896872296808560>`, ephemeral: false });
        }
	}
}