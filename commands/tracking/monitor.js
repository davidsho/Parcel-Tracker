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
	.setTitle(`Monitoring Parcel \`${referenceNum}\` from DPD`)
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
            .setTitle(`Monitoring Parcel \`${referenceNum}\` from DPD`)
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

const basic_hermes = async ({message, trackingNumber, postCode}) => {
    const url = `https://api.hermesworld.co.uk/enterprise-tracking-api/v1/parcels/search/${trackingNumber}`
    const headers = {
        apiKey: 'R6xkX4kqK4U7UxqTNraxmXrnPi8cFPZ6'
    }
    const opts = {
        url: url,
        method: 'get',
        headers: headers
    }
    const res = await axios(opts)
    const uniqueId = res.data[0]
    const trackUrl = `https://www.myhermes.co.uk/track#/parcel/${trackingNumber}/details`
    let extra = await advanced_hermes({uniqueId: uniqueId, postCode: postCode})
    let updated = extra.updated
    let imageStream, attachment
    if (extra.image) {
        imageStream = new Buffer.from(extra.image.split(';base64,').pop(), 'base64');
        attachment = new Discord.MessageAttachment(imageStream, 'test.jpg')
    }
    let returnEmbed = new Discord.MessageEmbed()
	.setColor('#ADD8E6')
	.setTitle(`Monitoring Parcel \`${trackingNumber}\` from Hermes`)
	.setURL(trackUrl)
	.setAuthor('Parcel Tracker')
	.setDescription(`Started monitoring the parcel for any updates. You will receive a DM if anything changes.\nAn update on your parcel being shipped from ${extra.sender}`)
    .addFields({
        name: "Status",
        value: extra.status,
        inline: true
    }, {
        name: "Updated",
        value: new Date(updated).toUTCString(),
        inline: true
    })
    .setTimestamp()
    .setThumbnail(extra.mapUrl)
    if (attachment) {
        returnEmbed.attachFiles(attachment)
        returnEmbed.setImage('attachment://test.jpg')
    }
    await message.author.send(returnEmbed)
    let interval = setInterval(async () => {
        let new_extra = await advanced_hermes({uniqueId: uniqueId})
        if (new_extra.updated !== updated) {
            let imageStream, attachment
            if (extra.image) {
                imageStream = new Buffer.from(extra.image.split(';base64,').pop(), 'base64');
                attachment = new Discord.MessageAttachment(imageStream, 'test.jpg')
            }
            returnEmbed = new Discord.MessageEmbed()
            .setColor('#ADD8E6')
            .setTitle(`Monitoring Parcel \`${trackingNumber}\` from Hermes`)
            .setURL(trackUrl)
            .setAuthor('Parcel Tracker')
            .setDescription(`An update on your parcel being shipped from ${new_extra.sender}`)
            .addFields({
                name: "Status",
                value: new_extra.status,
                inline: true
            }, {
                name: "Updated",
                value: new Date(new_extra.updated).toUTCString(),
                inline: true
            })
            .setTimestamp()
            .setThumbnail(extra.mapUrl)
            if (attachment) {
                returnEmbed.attachFiles(attachment)
                returnEmbed.setImage('attachment://test.jpg')
            }
            await message.author.send(returnEmbed)
        } else {
            if (new_extra.status === 'Delivered') {
                console.log("Finished monitoring as parcel has been delivered.")
                await message.author.send(`Finished monitoring parcel \`${trackingNumber}\` as it has been delivered and received.`)
                clearInterval(interval)
            } else {
                console.log("No changes, waiting a minute...")
            }
        }
        extra = new_extra
    }, 60000);
}

const advanced_hermes = async ({uniqueId, postCode}) => {
    const url = `https://api.hermesworld.co.uk/enterprise-tracking-api/v1/parcels/?uniqueIds=${uniqueId}&postcode=${postCode}`
    const headers = {
        apiKey: 'R6xkX4kqK4U7UxqTNraxmXrnPi8cFPZ6'
    }
    const opts = {
        url: url,
        method: 'get',
        headers: headers
    }
    const res = await axios(opts)
    const recentEvent = res.data.results[0].trackingEvents[0]
    const sender = res.data.results[0].sender
    const recipient = res.data.results[0].recipient
    let returnDict =  {
        status: recentEvent.trackingStage.description,
        updated: recentEvent.dateTime,
        sender: sender.displayName
    }
    let mapUrl, image
    if (recentEvent.location) {
        mapUrl = recentEvent.location.mapUrl
    }
    if (recentEvent.proofOfDelivery) {
        image = await get_hermes_image({photoUri: recentEvent.proofOfDelivery.photoUri, postCode: postCode})
    }
    returnDict.mapUrl = mapUrl
    returnDict.image = image
    return returnDict
}

const get_hermes_image = async ({photoUri, postCode}) => {
    const url = `https://api.hermesworld.co.uk/enterprise-tracking-api/v1${photoUri}?postcode=${postCode}`
    const headers = {
        apiKey: 'R6xkX4kqK4U7UxqTNraxmXrnPi8cFPZ6'
    }
    const opts = {
        url: url,
        method: 'get',
        headers: headers
    }
    const res = await axios(opts)
    return res.data.image
}

const formatDate = async (date) => {
    const year = date.slice(0,4)
    const month = date.slice(4,6)
    const day = date.slice(6)
    return `${year}-${month}-${day}`
}

const formatTime = async (time) => {
    const hour = time.slice(0,2)
    const min = time.slice(2,4)
    const sec = time.slice(4)
    return `${hour}:${min}:${sec}`
}

const ups = async ({message, trackingNumber}) => {

    const trackUrl = `https://www.ups.com/track?tracknum=${trackingNumber}&requester=WT/trackdetails`

    const typeDict = {
        D: "Delivered",
        I: "In Transit",
        M: "Billing Information Received",
        MV: "Billing Information Voided",
        P: "Pickup",
        X: "Exception",
        RS: "Returned to Shipper",
        DO: "Delivered Origin CFS (Freight Only)",
        DD: "Delivered Destination CFS (Freight Only)",
        W: "Warehousing (Freight Only)",
        NA: "Not Available",
        O: "Out for Delivery"
    }

    const deliveryDict = {
        RDD: "Rescheduled Delivery Date",
        SDD: "Scheduled Delivery Date",
        DEL: "Delivery Date"
    }

    const url = `https://onlinetools.ups.com/track/v1/details/${trackingNumber}`
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "AccessLicenseNumber": "FD98604AF6B3AFF5"
    }
    const opts = {
        url: url,
        headers: headers,
        method: 'get'
    }
    const res = await axios(opts)
    const {trackResponse} = res.data
    try {
        const {warnings} = trackResponse.shipment[0]
        const warningsList = warnings.map(warning => {
            return {
                name: `Warning ${warnings.indexOf(warning) + 1}`,
                value: `Code: ${warning.code}\n${warning.message}`,
                inline: true
            }
        })
        let returnEmbed = new Discord.MessageEmbed()
        .setColor('#FFD700')
        .setTitle('Track Parcel from UPS')
        .setURL(trackUrl)
        .setAuthor('Parcel Tracker')
        .setDescription(`There was an error trying to track this parcel`)
        .addFields(warningsList)
        .setTimestamp()
        console.log(returnEmbed)
        return returnEmbed
    } catch (error) {
        const {package} = trackResponse.shipment[0]
        const recentActivity = package[0].activity[0]
        const {location, status} = recentActivity
        const activityType = status.type
        const activityDescription = status.description
        let updatedTime = recentActivity.time
        const updatedDate = recentActivity.date
        const {address} = location
        let recentLocation
        if (address.city) {
            recentLocation = `${address.city}, ${address.country}`
        } else {
            recentLocation = address.country
        }
        let deliveryDate, deliveryDateType, actualDeliveryDate, deliveryTime, deliveryStartTime, deliveryEndTime, deliveryTimeType
        if (package[0].deliveryDate) {
            deliveryDate = package[0].deliveryDate
            deliveryDateType = deliveryDate[0].type
            actualDeliveryDate = deliveryDate[0].date 
        }
        if (package[0].deliveryTime) {
            deliveryTime = package[0].deliveryTime
            deliveryStartTime = deliveryTime.startTime
            deliveryEndTime = deliveryTime.endTime
            if (!deliveryStartTime) {
                deliveryStartTime = deliveryEndTime
            }
            deliveryTimeType = deliveryTime.type
        }
        let returnEmbed
        if (deliveryDate) {
            returnEmbed = new Discord.MessageEmbed()
            .setColor('#FFD700')
            .setTitle(`Monitor Parcel \`${trackingNumber}\` from UPS`)
            .setURL(trackUrl)
            .setAuthor('Parcel Tracker')
            .setDescription(`Started monitoring the parcel for any updates. You will receive a DM if anything changes.\nYour parcel has an update from UPS on \`${new Date(await formatDate(updatedDate)).toDateString()}\` at \`${await formatTime(updatedTime)}\``)
            .addFields({
                name: "Status",
                value: typeDict[activityType],
                inline: true
            }, {
                name: "Description",
                value: activityDescription,
                inline: true
            }, {
                name: "Recent Location",
                value: recentLocation,
                inline: true
            }, {
                name: "Delivery Date",
                value: `${deliveryDateType !== 'DEL' ? `${deliveryDict[deliveryDateType]}, ` : ''}${new Date(await formatDate(actualDeliveryDate)).toDateString()}`,
                inline: true
            }, {
                name: "Delivery Time",
                value: `${deliveryTimeType !== 'DEL' ? `${deliveryDict[deliveryTimeType]}, ` : ''}${await formatTime(deliveryStartTime)}-${await formatTime(deliveryEndTime)}`,
                inline: true
            })
            .setTimestamp()
        } else {
            returnEmbed = new Discord.MessageEmbed()
            .setColor('#FFD700')
            .setTitle(`Monitor Parcel \`${trackingNumber}\` from UPS`)
            .setURL(trackUrl)
            .setAuthor('Parcel Tracker')
            .setDescription(`Started monitoring the parcel for any updates. You will receive a DM if anything changes.\nYour parcel has an update from UPS on \`${new Date(await formatDate(updatedDate)).toDateString()}\` at \`${await formatTime(updatedTime)}\``)
            .addFields({
                name: "Status",
                value: typeDict[activityType],
                inline: true
            }, {
                name: "Description",
                value: activityDescription,
                inline: true
            }, {
                name: "Recent Location",
                value: recentLocation,
                inline: true
            })
            .setTimestamp()
        }
        await message.author.send(returnEmbed)
        let interval = setInterval(async () => {
            const new_data = await check_ups({trackingNumber: trackingNumber})
            new_data.warnings && clearInterval(interval)
            if (new_data.updatedTime !== updatedTime) {
                let returnEmbed
                if (new_data.deliveryDate) {
                    returnEmbed = new Discord.MessageEmbed()
                    .setColor('#FFD700')
                    .setTitle(`Monitor Parcel \`${trackingNumber}\` from UPS`)
                    .setURL(trackUrl)
                    .setAuthor('Parcel Tracker')
                    .setDescription(`Your parcel has an update from UPS on \`${new Date(await formatDate(new_data.updatedDate)).toDateString()}\` at \`${await formatTime(new_data.updatedTime)}\``)
                    .addFields({
                        name: "Status",
                        value: typeDict[new_data.activityType],
                        inline: true
                    }, {
                        name: "Description",
                        value: new_data.activityDescription,
                        inline: true
                    }, {
                        name: "Recent Location",
                        value: new_data.recentLocation,
                        inline: true
                    }, {
                        name: "Delivery Date",
                        value: `${new_data.deliveryDateType !== 'DEL' ? `${deliveryDict[new_data.deliveryDateType]}, ` : ''}${new Date(await formatDate(new_data.actualDeliveryDate)).toDateString()}`,
                        inline: true
                    }, {
                        name: "Delivery Time",
                        value: `${new_data.deliveryTimeType !== 'DEL' ? `${deliveryDict[new_data.deliveryTimeType]}, ` : ''}${await formatTime(new_data.deliveryStartTime)}-${await formatTime(new_data.deliveryEndTime)}`,
                        inline: true
                    })
                    .setTimestamp()
                } else {
                    returnEmbed = new Discord.MessageEmbed()
                    .setColor('#FFD700')
                    .setTitle(`Monitor Parcel \`${trackingNumber}\` from UPS`)
                    .setURL(trackUrl)
                    .setAuthor('Parcel Tracker')
                    .setDescription(`Your parcel has an update from UPS on \`${new Date(await formatDate(new_data.updatedDate)).toDateString()}\` at \`${await formatTime(new_data.updatedTime)}\``)
                    .addFields({
                        name: "Status",
                        value: typeDict[new_data.activityType],
                        inline: true
                    }, {
                        name: "Description",
                        value: new_data.activityDescription,
                        inline: true
                    }, {
                        name: "Recent Location",
                        value: new_data.recentLocation,
                        inline: true
                    })
                    .setTimestamp()
                }
                await message.author.send(returnEmbed)
            } else {
                if (new_data.activityType === 'D') {
                    console.log("Finished monitoring as parcel has been delivered.")
                    await message.author.send(`Finished monitoring parcel \`${trackingNumber}\` as it has been delivered and received.`)
                    clearInterval(interval)
                } else {
                    console.log("No changes, waiting a minute...")
                }
            }
            updatedTime = new_data.updatedTime
        }, 60000);
    }
}

const check_ups = async ({trackingNumber}) => {
    
    const url = `https://onlinetools.ups.com/track/v1/details/${trackingNumber}`
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "AccessLicenseNumber": "FD98604AF6B3AFF5"
    }
    const opts = {
        url: url,
        headers: headers,
        method: 'get'
    }
    const res = await axios(opts)
    const {trackResponse} = res.data
    try {
        const {warnings} = trackResponse.shipment[0]
        const warningsList = warnings.map(warning => {
            return {
                name: `Warning ${warnings.indexOf(warning) + 1}`,
                value: `Code: ${warning.code}\n${warning.message}`,
                inline: true
            }
        })
        return {
            warnings: warningsList
        }
    } catch (error) {
        const {package} = trackResponse.shipment[0]
        const recentActivity = package[0].activity[0]
        const {location, status} = recentActivity
        const activityType = status.type
        const activityDescription = status.description
        const updatedTime = recentActivity.time
        const updatedDate = recentActivity.date
        const {address} = location
        let recentLocation
        if (address.city) {
            recentLocation = `${address.city}, ${address.country}`
        } else {
            recentLocation = address.country
        }
        let deliveryDate, deliveryDateType, actualDeliveryDate, deliveryTime, deliveryStartTime, deliveryEndTime, deliveryTimeType
        if (package[0].deliveryDate) {
            deliveryDate = package[0].deliveryDate
            deliveryDateType = deliveryDate[0].type
            actualDeliveryDate = deliveryDate[0].date 
        }
        if (package[0].deliveryTime) {
            deliveryTime = package[0].deliveryTime
            deliveryStartTime = deliveryTime.startTime
            deliveryEndTime = deliveryTime.endTime
            if (!deliveryStartTime) {
                deliveryStartTime = deliveryEndTime
            }
            deliveryTimeType = deliveryTime.type
        }
        return {
            activityType: activityType,
            activityDescription: activityDescription,
            updatedTime: updatedTime,
            updatedDate: updatedDate,
            recentLocation: recentLocation,
            deliveryDate: deliveryDate,
            deliveryDateType: deliveryDateType,
            actualDeliveryDate: actualDeliveryDate,
            deliveryStartTime: deliveryStartTime,
            deliveryEndTime: deliveryEndTime,
            deliveryTimeType: deliveryTimeType
        }
    }
}

const execute = async (message, args) => {
    const courier = args[0]
    const referenceNum = args[1]
    const postCode = args[2]
    if (!courier) {
        await message.reply("You didn't provide all the necessary arguments. `.tracker [courier] [reference number] [post code]`")
    }
    message.channel.type !== 'dm' && await message.reply("Check your DMs")
    if (courier.toLowerCase() === 'dpd') {
        await basic_dpd({message: message, referenceNum: referenceNum, postCode: postCode})
    } else if (courier.toLowerCase() === 'ups') {
        await ups({message: message, trackingNumber: referenceNum})
    } else if (courier.toLowerCase() === 'hermes') {
        await basic_hermes({message: message, trackingNumber: referenceNum, postCode: postCode})
    }
}

module.exports = {
	name: 'monitor',
	description: 'Add a monitor to track a parcel being delivered to you from DPD, UPS or Hermes.',
    args: true,
	execute,
};