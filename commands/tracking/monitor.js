const axios = require("axios")
const Discord = require("discord.js")

const check_dpd = async ({referenceNum, postCode}) => {
    const url = `https://apis.track.dpd.co.uk/v1/reference?origin=PRTK&postcode=${postCode}&referenceNumber=${referenceNum}`
    const opts = {
        url: url,
        method: 'get'
    }
    const res = await axios(opts)
    const data = res.data.data[0]
    const {parcelStatus} = data
    return parcelStatus
}

const basic_dpd = async ({message, referenceNum, postCode}) => {
    const url = `https://apis.track.dpd.co.uk/v1/reference?origin=PRTK&postcode=${postCode}&referenceNumber=${referenceNum}`
    const opts = {
        url: url,
        method: 'get'
    }
    const res = await axios(opts)
    const data = res.data.data[0]
    let {parcelStatus, preferenceText, parcelNumber, parcelCode, consignmentNumber, customerLogoUrl, collectionDate} = data
    const trackUrl = `https://track.dpd.co.uk/parcels/${parcelCode}`
    let returnEmbed = new Discord.MessageEmbed()
	.setColor('#FF0000')
	.setTitle(`Track Parcel \`${referenceNum}\` from DPD`)
	.setURL(trackUrl)
	.setAuthor('Parcel Tracker')
	.setDescription(`Started monitoring the parcel for any updates. You will receive a DM if anything changes.\n${parcelStatus}\n${preferenceText}\nYour parcel was collected from the shipper on ${collectionDate}`)
	.setThumbnail(customerLogoUrl)
	.setTimestamp()
    await message.author.send(returnEmbed)
    console.log("Sent original DM")
    let interval = setInterval(async () => {
        console.log("Getting new parcel status...")
        let newParcelStatus = await check_dpd({referenceNum: referenceNum, postCode: postCode})
        if (newParcelStatus !== parcelStatus) {
            console.log("Parcel status has changed, sending update...")
            returnEmbed = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setTitle(`Track Parcel \`${referenceNum}\` from DPD`)
            .setURL(trackUrl)
            .setAuthor('Parcel Tracker')
            .setDescription(`${newParcelStatus}\n${preferenceText}\nYour parcel was collected from the shipper on ${collectionDate}`)
            .setThumbnail(customerLogoUrl)
            .setTimestamp()
            await message.author.send(returnEmbed)
        } else {
            parcelStatus = newParcelStatus
            if (newParcelStatus.includes('parcel has been delivered and received')) {
                console.log("Finished monitoring as parcel has been delivered.")
                await message.author.send(`Finished monitoring parcel \`${referenceNum}\` as it has been delivered and received.`)
                clearInterval(interval)
            } else {
                console.log("No changes, waiting a minute...")
            }
        }
    }, 60000);
}


const execute = async (message, args) => {
    const courier = args[0]
    const referenceNum = args[1]
    const postCode = args[2]
    if (!courier) {
        await message.reply("You didn't provide all the necessary arguments. `.tracker [courier] [reference number] [post code]`")
    }
    if (courier.toLowerCase() === 'dpd') {
        await basic_dpd({message: message, referenceNum: referenceNum, postCode: postCode})
    } else if (courier.toLowerCase() === 'ups') {
        const res = await ups({trackingNumber: referenceNum})
        await message.reply(res)
    } else if (courier.toLowerCase() === 'hermes') {
        const res = await basic_hermes({trackingNumber: referenceNum})
        await message.reply(res)
    }
}

module.exports = {
	name: 'monitor',
	description: 'Add a monitor to track a parcel being delivered to you from DPD, UPS or Hermes.',
    args: true,
	execute,
};