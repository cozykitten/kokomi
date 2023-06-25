function startup(eventFiles, commandFiles, client) {
    const { Collection } = require("discord.js");
    
    //event handler
    for (const file of eventFiles) {
        const event = require(`../events/${file}`);
        const eventName = file.split('.')[0];
        client.on(eventName, (...args) => event(...args));
    }

    //command handler
    client.commands = new Collection();
    client.mbc = new Collection();

    for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
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
}
exports.startup = startup;

exports.reloadApplication = async (client) => {
    const fs = require('fs');

    console.log('reloading commands and event listeners..');

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
	for (const file of eventFiles) {
        delete require.cache[require.resolve(`../events/${file}`)];
    }
    for (const file of commandFiles) {
        delete require.cache[require.resolve(`../commands/${file}`)];
    }

    // Load events and commands again
	startup(eventFiles, commandFiles, client);
}

exports.restartApplication = async (client) => {
    require('dotenv').config();
    const { lb, synclb } = require('./dbManager');

    console.log('restarting application..');
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