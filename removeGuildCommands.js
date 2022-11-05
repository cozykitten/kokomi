const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.KOKOMI_TOKEN);

for (const iterator of JSON.parse(process.env.GUILD_ID)) {
	rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, iterator), { body: [] })
		.then(() => console.log('Successfully deleted application commands for ' + iterator))
		.catch(() => console.error('\x1b[31mMissing access for ' + iterator + '\x1b[0m'));
}