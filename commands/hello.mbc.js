module.exports = {
	name: 'hello',
	description: 'alive response',
	async execute(message) {

		const response = ['I\'m alive!', 'Did you need something?', 'How can I help you?', '<:ZeroSleep:1038896877510340670>'];
		message.channel.send(response[Math.floor((Math.random() * response.length))]);

	}
}