const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();
const pm2 = require('pm2');


module.exports = {
    data: new SlashCommandBuilder()
		.setName('exit')
		.setDescription('Kokomi goes to sleep')
		.addIntegerOption(option => option.setName('reload').setDescription('reload commands').addChoices(
			{ name: 'reload', value: 1 }
		))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction) {

		if (!JSON.parse(process.env.TRUSTED).includes(interaction.user.id)) return interaction.reply('This command is not available for public useage.');

		if (interaction.options.getInteger('reload')) {
			await interaction.reply({ content: `I'll brb! <:AriSalute:1021920065802739752>`, ephemeral: true});
			reload(interaction.client);
			return;
		}

		await interaction.reply({ content: 'Good night! <:KeqingSleep:1038896867305603122>', ephemeral: true});


		pm2.connect(function (err) {
			if (err) {
				console.error(err);
				process.exit(2);
			}
			pm2.stop('ecosystem.config.js');
		});

		
		// console.log('exiting..');
		// lb.lastexit = true;
		// await synclb(lb);
		// await interaction.client.destroy();
		// process.exit();
	}
}

async function reload(client) {
	const fs = require('fs');
	const startup = require('../src/app');

	// Clear the old command collection
	client.commands.clear();

    // Get the paths of the event and command files
    const eventDir = await fs.promises.readdir(`./events/`);
	const commandDir = await fs.promises.readdir('./commands/');
	const eventFiles = eventDir.filter(file => /.js|.ts/.test(file));
	const commandFiles = commandDir.filter(file => /.js|.ts/.test(file));

	// Unregister previous event handlers
	for (const file of eventFiles) {
		const eventName = file.split('.')[0];
		client.removeAllListeners(eventName);
	}

    // Delete the modules corresponding to the event and command files from the require.cache object
	for (const eFile of eventFiles) {
        delete require.cache[require.resolve(`../events/${eFile}`)];
    }
    for (const cFile of commandFiles) {
        delete require.cache[require.resolve(`../commands/${cFile}`)];
    }

    // Load events and commands again
	startup(eventFiles, commandFiles);
}

async function restartApplication(client) {
    const { lb, synclb } = require('../src/dbManager');

    console.log('reloading application due to database update..');
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