const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { re, syncre } = require('../src/dbManager');
const { createWorker } = require('tesseract.js');
const https = require('https');

/* TODO:
 *      compare total to read sum //done
 * if the line containing the price does not contain words, instead of continuing check display the last line as item
 *      at the end of every command call calculate the totals over the current month's receipts that aren't paid=true and display the current balance. //done
 *      -> also check if all previous months have paid= true, otherwise add a hint to the reply that past month have open balance.  //done
 * 
 *      add subcommands to display total amount due, amount due by month, mark entire month as paid //done
 *      -> for that group receipts inside months //done
 */

let worker;
(async () => {
    worker = await createWorker('fin');
})();
const monthNames = ['𝘑𝘢𝘯𝘶𝘢𝘳𝘺', '𝘍𝘦𝘣𝘳𝘶𝘢𝘳𝘺', '𝘔𝘢𝘳𝘤𝘩', '𝘈𝘱𝘳𝘪𝘭', '𝘔𝘢𝘺', '𝘑𝘶𝘯𝘦', '𝘑𝘶𝘭𝘺', '𝘈𝘶𝘨𝘶𝘴𝘵', '𝘚𝘦𝘱𝘵𝘦𝘮𝘣𝘦𝘳', '𝘖𝘤𝘵𝘰𝘣𝘦𝘳', '𝘕𝘰𝘷𝘦𝘮𝘣𝘦𝘳', '𝘋𝘦𝘤𝘦𝘮𝘣𝘦𝘳'];

async function getImageBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const imageBuffer = Buffer.concat(chunks);
                resolve(imageBuffer);
            });
            response.on('error', reject);
        });
    });
}

async function parseImageText(buyer, result) {

    let sum = total = 0;
    const items = [];
    //const control = [] //LOG

    for (const line of result.data.lines) {

        //remove linebreaks
        const currentLine = line.text.trim();
        //control.push(currentLine) //LOG

        //if line doesn't contain a price, go next
        const match = currentLine.match(/\d+\,\d{2}-?$/);
        if (!match) continue;
        console.log('\n' + currentLine) //LOG
        const priceStr = match[0];

        //if price is negative subtract from previous item
        if (priceStr.endsWith('-')) {
            const price = Number(priceStr.replace(',', '.').replace('-', ''));
            const index = items.length - 1;
            if (index >= 0) items[index].price -= price;
            total -= price;
            continue;
        }
        const price = Number(priceStr.replace(',', '.'));
        console.log('    ' + price + ' - ' + currentLine.replace(priceStr, '').trim()) //LOG

        //if line doesn't contain words (product names), go next
        if (!/^[A-ZÄÖ0].*[A-Za-zÄÖäö]{3}/.test(currentLine)) continue;
        const name = currentLine.replace(priceStr, '').trim();
        console.log('    got: ' + name + ' @ ' + price) //LOG

        //if word is sum get sum and break, else save item info
        if (name.toLowerCase().includes('yhteensä')) {
            sum = price;
            total = Math.round(total * 100) / 100;
            break;
        }
        items.push({
            name: name,
            price: price
        });
        total += price;
    }
    //console.log('\n' + control.join('\n')) //LOG

    if (buyer === '461213195177033740') {
        buyer = 'Vio';
    } else if (buyer === '789906177742995527') {
        buyer = 'Lia';
    }
    const receipt = {
        buyer: buyer,
        date: Date.now(),
        items: items,
        sum: sum,
        calculatedTotal: total,
        due: 0,
        paid: false
    }
    return receipt;
}

async function assignOwner(interaction, receipt) {

    //creating base embed
    const embed = new EmbedBuilder()
        .setTitle('┈┈・✿・𝘙𝘌𝘊𝘌𝘐𝘗𝘛・✿・┈┈')
        .setColor(0x797FCB);

    //adding item list
    let description = '';
    for (const item of receipt.items) {
        description += `・ ${item.name} ・ ${item.price}€\n`;
    }

    embed.setDescription(description);
    embed.addFields({ name: '𝘛𝘖𝘛𝘈𝘓', value: receipt.sum + '€', inline: true });

    //adding selection buttons
    const row = new ActionRowBuilder();
    const vio = new ButtonBuilder()
        .setCustomId('Vio')
        .setLabel('Vio')
        .setStyle(ButtonStyle.Primary);

    const shared = new ButtonBuilder()
        .setCustomId('sha')
        .setLabel('Shared')
        .setStyle(ButtonStyle.Secondary);

    const lia = new ButtonBuilder()
        .setCustomId('Lia')
        .setLabel('Lia')
        .setStyle(ButtonStyle.Primary);

    row.setComponents(vio, shared, lia);
    const response = await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });
    const collectorFilter = i => i.user.id === interaction.user.id;

    //collect component interaction for every line and update each line
    let iter = 0;
    for (const item of receipt.items) {

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 15000 });
            item.owner = confirmation.customId;
            const descArray = embed.data.description.split('\n');
            const updateDescItem = descArray[iter].replace('・', `${confirmation.customId} ・`);
            descArray[iter] = updateDescItem;
            embed.setDescription(descArray.join('\n'));

            if (iter + 1 >= receipt.items.length) {
                await confirmation.update({ embeds: [embed], components: [], ephemeral: true });
                break;
            }
            await confirmation.update({ embeds: [embed], components: [row], ephemeral: true });

        } catch (e) {
            return false;
        }
        iter++;
    }
    return embed;
}

async function monthlyBalance(currentYear, currentMonth, embed) {
    let dueMonth = re[currentYear][currentMonth].receipts.reduce((total, receipt) => {
        if (receipt.paid) return total;
        if (receipt.buyer === 'Lia') return total + receipt.due;
        else return total - receipt.due;
    }, 0);
    embed.addFields({ name: `${monthNames[currentMonth - 1]} ` + (dueMonth > 0 ? 'Vio' : 'Lia'), value: Math.abs(dueMonth).toFixed(2) + '€' });

    //check if all previous months were paid = true
    let unpaidFound = false;
    for (const year in re) {
        for (const month in re[year]) {
            if (!re[year][month].paid && Number(month) !== currentMonth) {
                unpaidFound = true;
                embed.addFields({ name: 'Unpaid month found', value: `${monthNames[month - 1]} ${year}` });
                break;
            }
        }
        if (unpaidFound) break;
    }
}

async function calculateBalance(receipt, embed, interaction) {

    //calculate amount due
    const due = receipt.items.reduce((total, item) => {
        if (item.owner === receipt.buyer) return total;
        if (item.owner === 'sha') return total + item.price / 2;
        return total + item.price;
    }, 0);
    //console.log('due: ' + due); //LOG
    receipt.due = Number(due.toFixed(2));
    embed.addFields({ name: '𝘈𝘔𝘖𝘜𝘕𝘛 𝘋𝘜𝘌', value: receipt.due + '€', inline: true });

    //calculate year and month of current receipt
    const receiptDate = new Date(receipt.date);
    const currentYear = receiptDate.getFullYear();
    const currentMonth = receiptDate.getMonth() + 1;
    if (!re[currentYear]) re[currentYear] = {};
    if (!re[currentYear][currentMonth]) re[currentYear][currentMonth] = { paid: false, receipts: [] };
    re[currentYear][currentMonth].receipts.push(receipt);

    //calculate general balance of this month
    await monthlyBalance(currentYear, currentMonth, embed);
    interaction.editReply({ embeds: [embed], ephemeral: true });

    //console.log(receipt); //LOG
}

async function monthPaid(year, month) {
    for (receipt of re[year][month].receipts) {
        receipt.paid = true;
    }
    re[year][month].paid = true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('receipt')
        .setDescription('add your receipts to calculate household cost')
        .addSubcommand(subcommand => subcommand.setName('add').setDescription('add a new receipt')
            .addAttachmentOption(option => option.setName('receipt').setDescription('receipt image').setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('pay').setDescription('check your balance of this month')
            .addIntegerOption(option => option.setName('month').setDescription('month').setMaxValue(12).setMinValue(1).setRequired(true)
                .addChoices(
                    { name: 'January', value: 1 },
                    { name: 'February', value: 2 },
                    { name: 'March', value: 3 },
                    { name: 'April', value: 4 },
                    { name: 'May', value: 5 },
                    { name: 'June', value: 6 },
                    { name: 'July', value: 7 },
                    { name: 'August', value: 8 },
                    { name: 'September', value: 9 },
                    { name: 'October', value: 10 },
                    { name: 'November', value: 11 },
                    { name: 'December', value: 12 }
                )))
        .setDMPermission(false),
    async execute(interaction) {

        //command may only be used by trusted people
        if (!JSON.parse(process.env.TRUSTED) === interaction.user.id) return interaction.reply('This command is not available for public usage.');

        if (interaction.options.getSubcommand() === 'add') {
            const attachment = await interaction.options.getAttachment('receipt');
            await interaction.deferReply({ ephemeral: true });

            const imageBuffer = await getImageBuffer(attachment.url);
            const result = await worker.recognize(imageBuffer);
            const receipt = await parseImageText(interaction.user.id, result);

            //check if sum equals calculated total
            if (receipt.sum !== receipt.calculatedTotal) return interaction.editReply({ content: `Command cancelled: Read sum ${receipt.sum}€ differs from calculated total ${receipt.calculatedTotal}€.`, ephemeral: true });

            //send a reply listing all the items and assign an owner to each item
            const embed = await assignOwner(interaction, receipt);
            if (!embed) return interaction.editReply({ content: 'Command cancelled due to inactivity.', components: [], ephemeral: true });

            //calculate new balance
            await calculateBalance(receipt, embed, interaction);
            syncre(re);

        } else if (interaction.options.getSubcommand() === 'pay') {
            await interaction.deferReply({ ephemeral: true });

            const currentDate = new Date(Date.now());
            let currentYear = currentDate.getFullYear();
            const workingMonth = interaction.options.getInteger('month');

            if (!re[currentYear]) {
                currentYear -= 1;
                if (!re[currentYear]) return interaction.editReply({ content: `There are no entries for ${currentYear} or ${currentYear + 1}`, ephemeral: true });
            }
            if (!re[currentYear][workingMonth]) return interaction.editReply({ content: `There are no entries for ${monthNames[workingMonth - 1]} ${currentYear}`, ephemeral: true });
            if (re[currentYear][workingMonth].paid) return interaction.editReply({ content: `There are no outstanding payments for ${monthNames[workingMonth - 1]} ${currentYear}`, ephemeral: true });

            //calculate general balance of this month
            const embed = new EmbedBuilder()
                .setTitle('┈┈・✿・Balance・✿・┈┈')
                .setColor(0x797FCB);

            await monthlyBalance(currentYear, workingMonth, embed);

            //adding buttons
            const row = new ActionRowBuilder();
            const yes = new ButtonBuilder()
                .setCustomId('yes')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success);

            const no = new ButtonBuilder()
                .setCustomId('no')
                .setLabel('No')
                .setStyle(ButtonStyle.Danger);

            row.setComponents(yes, no);
            const response = await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });
            const collectorFilter = i => i.user.id === interaction.user.id;

            try {
                const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 15000 });
                if (confirmation.customId === 'no') return confirmation.update({ embeds: [embed], components: [], ephemeral: true });
            } catch (e) {
                return interaction.editReply({ content: 'Command cancelled due to inactivity.', components: [], ephemeral: true });
            }

            //mark this month as paid only if we're not in that month anymore
            if (workingMonth === currentDate.getMonth() + 1) return interaction.editReply({ content: `You cannot mark the current month as paid.`, embeds: [embed], components: [], ephemeral: true });
            await monthPaid(currentYear, workingMonth);
            embed.data.fields[0].value = `~~${embed.data.fields[0].value}~~`;
            interaction.editReply({ embeds: [embed], components: [], ephemeral: true });
            syncre(re);
        }
    },
    async terminateWorker() {
        if (worker) {
            await worker.terminate();
            worker = null;
        }
    }
}



// testing functions for writing processed images to file

function convertImage(imgSrc) {
    const data = atob(imgSrc.split(',')[1]).split('').map((c) => c.charCodeAt(0));
    return new Uint8Array(data);
}

async function writeTestImages(imageBuffer) {
    const fs = require('fs')
    const { data: { text, imageColor, imageGrey, imageBinary } } = await worker.recognize(imageBuffer, { rotateAuto: true }, { imageColor: true, imageGrey: true, imageBinary: true });
    console.log(text); //LOG

    await fs.promises.writeFile('./imageColor.png', convertImage(imageColor));
    await fs.promises.writeFile('./imageGrey.png', convertImage(imageGrey));
    await fs.promises.writeFile('./imageBinary.png', convertImage(imageBinary));
}