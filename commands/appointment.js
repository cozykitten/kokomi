const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const sharp = require('sharp');
const { db } = require('../src/dbManager');
require('dotenv').config();


module.exports = {
    data: new SlashCommandBuilder()
        .setName('appointment')
        .setDescription('view and set your appointments')
        .addIntegerOption(option => option.setName('month').setDescription('month').setMaxValue(11).setMinValue(0).setRequired(true)
        .addChoices(
            { name: 'January', value: 0 },
            { name: 'February', value: 1 },
            { name: 'March', value: 2 },
            { name: 'April', value: 3 },
            { name: 'May', value: 4 },
            { name: 'June', value: 5 },
            { name: 'July', value: 6 },
            { name: 'August', value: 7 },
            { name: 'September', value: 8 },
            { name: 'October', value: 9 },
            { name: 'November', value: 10 },
            { name: 'December', value: 11 }
        ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {

        const svgString = await constructView(await interaction.options.getInteger('month'), interaction.user.id);
        const png = await sharp(Buffer.from(svgString)).resize(380).png().toBuffer();

        interaction.reply({ files: [{attachment: png, name: 'month.png'}], ephemeral: true });
    }
}

/**
 * Construct the svg.
 * 
 * @param {number} month 
 * @returns {String}
 */
async function constructView (month, userID) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    //const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="220">
    <rect x="0" y="0" width="190" height="220" rx="10" ry="10" fill="white" />
    <text x="10" y="30" font-size="12" font-family="Comfortaa" text-anchor="left">${monthNames[month]}</text>
    <g fill="#333" font-size="10" font-family="Comfortaa" text-anchor="middle">
    <g transform="translate(10, 0)">
    <text x="10" y="55">Mo</text>
    <text x="35" y="55">Tu</text>
    <text x="60" y="55">We</text>
    <text x="85" y="55">Th</text>
    <text x="110" y="55">Fr</text>
    <text x="135" y="55">Sa</text>
    <text x="160" y="55">Su</text>
    </g>
    </g>
    <g fill="#e9ccd4">
    <g transform="translate(10, 65)">`;

    const numberSvg = `<g fill="black" font-size="9" font-family="Comfortaa" text-anchor="middle" dominant-baseline="central">
<g transform="translate(10, 68.5)">`;

    //get weekday of number '1' and length of month
    const year = 2023;
    const firstWeekday = new Date(year, month, 1).getDay();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    //add first row to base svg
    const firstRow = await attachFirstRow(baseSvg, numberSvg, firstWeekday);

    //add middle rows
    const middleRow = await attachMiddleRow(firstRow[0], firstRow[1], firstRow[2]);

    //add last row
    const lastRow = await attachLastRow(firstWeekday, lastDayOfMonth, middleRow[0], middleRow[1], middleRow[2]);

    //add reminder dates
    const finalSvg = lastRow[0] + '\n' + await markDays(year, month, firstWeekday, userID) + '\n' + lastRow[1] + '\n</svg>';

    return finalSvg;
}

/**
 * Creates the first row of circles based on the first weekday of the month.
 * 
 * @param {String} base svg
 * @param {String} number svg
 * @param {number} firstWeekday
 * @returns {Promise<Array<any>>} svg's and next number to add
 */
async function attachFirstRow (baseSvg, numberSvg, firstWeekday) {  

    let xOffset = 0;
    let i = 1;
    for (i; xOffset < 160; i++) {
        xOffset = (((firstWeekday + 175 + i) * 25) - 40) % 175;
        baseSvg = baseSvg + '\n' + `<circle r="10" cx="${xOffset}" cy="10" />`;
        numberSvg = numberSvg + '\n' + `<text x="${xOffset}" y="10">${i}</text>`;
    }
    return [baseSvg, numberSvg, i];
}

/**
 * Creates the middle rows of circles.
 * 
 * @param {String} base svg
 * @param {String} number svg 
 * @param {number} dayNumber 
 * @returns {Promise<array<void>>} next number to add
 */
async function attachMiddleRow (baseSvg, numberSvg, dayNumber) {
    const middleSvg = `<circle r="10" cx="10" cy="35" />
<circle r="10" cx="35" cy="35" />
<circle r="10" cx="60" cy="35" />
<circle r="10" cx="85" cy="35" />
<circle r="10" cx="110" cy="35" />
<circle r="10" cx="135" cy="35" />
<circle r="10" cx="160" cy="35" />
<circle r="10" cx="10" cy="60" />
<circle r="10" cx="35" cy="60" />
<circle r="10" cx="60" cy="60" />
<circle r="10" cx="85" cy="60" />
<circle r="10" cx="110" cy="60" />
<circle r="10" cx="135" cy="60" />
<circle r="10" cx="160" cy="60" />
<circle r="10" cx="10" cy="85" />
<circle r="10" cx="35" cy="85" />
<circle r="10" cx="60" cy="85" />
<circle r="10" cx="85" cy="85" />
<circle r="10" cx="110" cy="85" />
<circle r="10" cx="135" cy="85" />
<circle r="10" cx="160" cy="85" />`;

    baseSvg = baseSvg + '\n' + middleSvg;

    for (let i = 35; i <= 85; i += 25) {
        let xOffset = 10;
        for (let j = 0; j < 7; j++) {
            numberSvg = numberSvg + '\n' + `<text x="${xOffset}" y="${i}">${dayNumber}</text>`;
            xOffset += 25;
            dayNumber++;
        }
    }
    return [baseSvg, numberSvg, dayNumber];
}

/**
 * Attaches the last two rows of circles as needed.
 * 
 * @param {number} firstWeekday 
 * @param {number} lastDayOfMonth 
 * @param {String} base svg
 * @param {String} number svg 
 * @returns {Promise<String[]>}
 */
async function attachLastRow (firstWeekday, lastDayOfMonth, baseSvg, numberSvg, dayNumber) {

    const fullDaysInMonth = ((firstWeekday + 7 - 1) % 7) + lastDayOfMonth;
    const rowsNeeded = Math.ceil(fullDaysInMonth / 7);
    
    if (rowsNeeded < 5) {
        baseSvg = baseSvg + '\n' + `</g>\n</g>`;
        numberSvg = numberSvg + '\n' + `</g>\n</g>`;
        return baseSvg + '\n' + numberSvg + '\n</svg>';
    }

    let yOffset = 110;
    if (rowsNeeded > 5) {
        let xOffset = 0;
        for (let i = 0; i < 7; i++) {
            xOffset = i * 25 + 10;
            baseSvg = baseSvg + '\n' + `<circle r="10" cx="${xOffset}" cy="${yOffset}" />`;
            numberSvg = numberSvg + '\n' + `<text x="${xOffset}" y="${yOffset}">${dayNumber}</text>`;
            dayNumber++;
        }
        yOffset = 135;
    }

    const circlesNeeded = fullDaysInMonth % 7;
    
    let xOffset = 0;
    for (let i = 0; i < circlesNeeded; i++) {
        xOffset = i * 25 + 10;
        baseSvg = baseSvg + '\n' + `<circle r="10" cx="${xOffset}" cy="${yOffset}" />`;
        numberSvg = numberSvg + '\n' + `<text x="${xOffset}" y="${yOffset}">${dayNumber}</text>`;
        dayNumber++;
    }

    baseSvg = baseSvg + '\n' + `</g>\n</g>`;
    numberSvg = numberSvg + '\n' + `</g>\n</g>`;
    return [baseSvg, numberSvg];
}

/**
 * adds coloured circles for days that have a reminder set
 * 
 * @param {number} year 
 * @param {number} month 
 * @param {number} firstWeekday 
 * @param {String} userID 
 * @returns {Promise<String>}
 */
async function markDays (year, month, firstWeekday, userID) {

    let markSvg = `<g transform="translate(10, 65)">` //ccd1e9 b6e2c9 c2e2b6
    const addedDates = [];

    for (const key in db.reminder) {
        if (db.reminder[key].uid !== userID) {
            continue;
        }
        
        const date = new Date(db.reminder[key].eventDate);
        if (!(date.getFullYear() === year && date.getMonth() === month)) {
            continue;
        }

        const circleNumber = ((firstWeekday + 6) % 7) + date.getDate();
        if (addedDates.includes(circleNumber)) {
            continue;
        }
        addedDates.push(circleNumber);

        const row = Math.ceil(circleNumber / 7);
        const column = circleNumber % 7;
        const yOffset = (row * 25) - 15;
        const xOffset = (((column + 175 + 1) * 25) - 40) % 175;
        let color = "#b6c6e2";
        if (db.reminder[key].repeat) color = "#c2e2b6";
        markSvg = markSvg + '\n' + `<circle fill="${color}" r="10" cx="${xOffset}" cy="${yOffset}" />`;
    }

    return markSvg + '\n' + `</g>`;
    

    /*
<defs>
<filter id="svg_11_blur">
<feGaussianBlur stdDeviation="0.9" in="SourceGraphic"/>
</filter>
</defs>
 this below very first line, then filter="url(#svg_11_blur)" in <g> tag of desired group
 */
}