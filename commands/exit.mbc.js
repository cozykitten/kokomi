require('dotenv').config();
const { lb, synclb } = require('../dbManager');

module.exports = {
    name: 'exit',
	description: 'Kokomi goes to sleep',
	async execute(message, client) {

		if (!JSON.parse(process.env.TRUSTED).includes(message.author.id)) return;
		await message.channel.send('Good night! <:KeqingSleep:1038896867305603122>');
		
		lb.lastexit = true;
		await synclb(lb);
		await client.destroy();
		process.exit();
	}
}