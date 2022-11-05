require('dotenv').config();
const { lb, synclb } = require('../dbManager');

module.exports = {
    name: 'exit',
	description: 'Kokomi goes to sleep',
	async execute(message) {

		if (!JSON.parse(process.env.TRUSTED).includes(message.member.id)) return;
		await message.channel.send('Good night! <:keqing_sleep:873683583468965978>');
		
		lb.lastexit = true;
		await synclb(lb);
		await client.destroy();
		process.exit();
	}
}