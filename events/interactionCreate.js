const { lb, synclb } = require('../dbManager');

module.exports = async (client, interaction) => {

	if (!interaction.isChatInputCommand()) return;

	//log command to lb for crashreport on next start
	lb.lastcall = {
		userid: interaction.user.id,
		command: interaction.commandName
	}

	if (interaction.options._subcommand) {
		lb.lastcall.subcommand = interaction.options._subcommand
	}

	if (interaction.commandName != 'login' && interaction.options._hoistedOptions.length) {

		lb.lastcall.options = [];
		for (const iterator of interaction.options._hoistedOptions) {
			const option = {
				name: iterator.name,
				value: iterator.value
			}
			lb.lastcall.options.push(option);
		}
	}
	await synclb(lb);

	//execute command
	const command = client.commands.get(interaction.commandName);
	if (command) command.execute(interaction, client);

	console.log(`\nCommand: ${interaction.commandName} ${interaction.options._subcommand}`);
	for (const iterator of interaction.options._hoistedOptions) {
		console.log(iterator.name);
	}
}