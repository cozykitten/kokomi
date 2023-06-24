const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config();
const fs = require('fs');

const commands = [];
const command_files = fs.readdirSync('../commands/').filter(file => /.js|.ts/.test(file));

for (const file of command_files) {
	const command = require(`../commands/${file}`);
	if (command.data && command.data.name) {
		commands.push(command.data.toJSON());
		console.log('loading ' + file);
	} else if (command.name) {
        console.warn('\x1b[33mskipped MBC ' + file + '\x1b[0m');
    } else {
		console.error('\x1b[31mError reading ' + file + '\x1b[0m');
	}
}

const rest = new REST({ version: '10' }).setToken(process.env.CLIENT_TOKEN);
register();

async function register() {
	const iterator = process.env.KOKOMI_HOME;
	try {
		await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, iterator), { body: commands })

		if (commands.length) console.log('Successfully registered application commands for ' + iterator);
		else console.log('Successfully deleted application commands for ' + iterator);

	} catch (e) {
		console.error('\x1b[31mMissing access for ' + iterator + '\x1b[0m');
	}
}