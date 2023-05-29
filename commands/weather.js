const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
require('dotenv').config();
//const fetch = require('node-fetch');


async function createEmbed(city, data) {

    weatherCode = {
        0: "Unknown",
        1000: "Clear, Sunny",
        1100: "Mostly Clear",
        1101: "Partly Cloudy",
        1102: "Mostly Cloudy",
        1001: "Cloudy",
        2000: "Fog",
        2100: "Light Fog",
        4000: "Drizzle",
        4001: "Rain",
        4200: "Light Rain",
        4201: "Heavy Rain",
        5000: "Snow",
        5001: "Flurries",
        5100: "Light Snow",
        5101: "Heavy Snow",
        6000: "Freezing Drizzle",
        6001: "Freezing Rain",
        6200: "Light Freezing Rain",
        6201: "Heavy Freezing Rain",
        7000: "Ice Pellets",
        7101: "Heavy Ice Pellets",
        7102: "Light Ice Pellets",
        8000: "Thunderstorm"
    }

    weatherIcon = {
        0: "https://cdn.discordapp.com/avatars/882749662099030078/56a6fbeb207fa08983464fe3a5f6f9d6.png",
        1000: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/clear-day.png",
        1100: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/mostly-clear-day.png",
        1101: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/partly-cloudy-day.png",
        1102: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/mostly-cloudy-day.png",
        1001: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/cloudy.png",
        2000: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/cloudy.png",
        2100: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/cloudy.png",
        4000: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/drizzle-day.png",
        4001: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/rain.png",
        4200: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/light-rain-day.png",
        4201: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/heavy-rain.png",
        5000: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/light-snow-night.png",
        5001: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/flurries-day.png",
        5100: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/light-snow-day.png",
        5101: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/heavy-snow.png",
        6000: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/drizzle-night.png",
        6001: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/rain.png",
        6200: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/light-rain-night.png",
        6201: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/heavy-rain.png",
        7000: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/light-snow-night.png",
        7101: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/heavy-snow.png",
        7102: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/flurries-night.png",
        8000: "https://raw.githubusercontent.com/cozykitten/kokomi/master/icons/thunderstorm.png"
    }

    const embed = new EmbedBuilder()
        .setTitle(`Weather for ${city}`)
        .setDescription(`**${weatherCode[data.weatherCode]}**`)
        .addFields(
            { name: '**Temperature**', value: Math.round(data.temperature) + '°C', inline: true },
            { name: '**Feels**', value: Math.round(data.temperatureApparent) + '°C', inline: true },
            { name: '**Humidity**', value: data.humidity + '%', inline: true },
            { name: '**Cloud Cover**', value: data.cloudCover + '%', inline: true},
            { name: '**Wind**', value: Math.round(data.windSpeed * 3.6) + ' km/h', inline: true },
            { name: '**Percipitation**', value: data.precipitationProbability + '%', inline: true }
        )
        .setThumbnail(weatherIcon[data.weatherCode]);
        embed.data.color = 0x797FCB;
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Get weather data for a specified city')
        .addStringOption(option => option.setName('city').setDescription('City name').setRequired(true)),
        
    async execute(interaction) {
        const city = interaction.options.getString('city');
        await interaction.deferReply();

        try {
            const response = await fetch(
                `https://api.tomorrow.io/v4/weather/realtime?location=${city}&apikey=${process.env.TOMORROWIO_KEY}`,
                { method: 'GET', headers: { accept: 'application/json' } }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: \${response.status}`);
            }

            const weatherData = await response.json();
            await interaction.editReply({ embeds: [await createEmbed(weatherData.location.name, weatherData.data.values)]});
        }
        catch (error) {
            console.error(error);
            await interaction.editReply('There was an error fetching the weather data. Please try again later.');
        }
    }
};
