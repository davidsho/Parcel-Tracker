const axios = require("axios")
const Discord = require("discord.js")

const basic_dpd = async ({referenceNum, postCode}) => {
    const url = `https://apis.track.dpd.co.uk/v1/reference?origin=PRTK&postcode=${postCode}&referenceNumber=${referenceNum}`
    const opts = {
        url: url,
        method: 'get'
    }
    const res = await axios(opts)
    const data = res.data.data[0]
    const {parcelStatus, preferenceText, parcelNumber, parcelCode, consignmentNumber, customerLogoUrl, collectionDate} = data
    const trackUrl = `https://track.dpd.co.uk/parcels/${parcelCode}`
    const returnEmbed = new Discord.MessageEmbed()
	.setColor('#FF0000')
	.setTitle('Track Parcel from DPD')
	.setURL(trackUrl)
	.setAuthor('Parcel Tracker')
	.setDescription(`${parcelStatus}\n${preferenceText}\nYour parcel was collected from the shipper on ${collectionDate}`)
	.setThumbnail(customerLogoUrl)
	.setTimestamp()
    return returnEmbed
}

// Needs Captcha token to work, but will enable advanced_dpd if used
const dpd_login = async ({parcelCode, postCode}) => {
    const url = "https://apis.track.dpd.co.uk/v1/login"
    const d = {
        "parcelCode":parcelCode,
        "postcode":postCode,
        "origin":"PRTK"
    }
    const opts = {
        url: url,
        data: d,
        method: 'post'
    }
    console.log(opts)
    const res = await axios(opts)
    console.log(res.data)
    console.log(res.headers)
}
 
// Doesn't work when not logged in, so function unavailable
const advanced_dpd = async ({parcelCode}) => {
    const url = `https://apis.track.dpd.co.uk/v1/parcels/${parcelCode}?_=${Date.now()}`
    console.log(url)
    const opts = {
        url: url,
        method: 'get'
    }
    const res = await axios(opts)
    console.log(res.data)
    const data = res.data.data
    const {
        collectionDate,
        estimatedDeliveryDate,
        lastConfirmDate,
        trackingStatusCurrent,
        canCollectParcel,
        collectionDetails,
        shipperDetails,
        deliveryDetails,
        nextSteps,
        estimatedDeliveryStartTime,
        estimatedDeliveryEndTime,
        shipmentTargetDate,
        deliveredToConsumer,
        undelivered,
        etaEtaTime,
        consumerPreferenceText,
        estimatedInstructions
    } = data
    console.log(`We estimate the parcel to arrive between ${estimatedDeliveryStartTime} and ${estimatedDeliveryEndTime} on ${estimatedDeliveryDate}, approximately at ${etaEtaTime}`)
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

const ups = async ({trackingNumber}) => {

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
        let returnEmbed
        if (deliveryDate) {
            returnEmbed = new Discord.MessageEmbed()
            .setColor('#FFD700')
            .setTitle('Track Parcel from UPS')
            .setURL(trackUrl)
            .setAuthor('Parcel Tracker')
            .setDescription(`Your parcel has an update from UPS on \`${new Date(await formatDate(updatedDate)).toDateString()}\` at \`${await formatTime(updatedTime)}\``)
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
                value: `${deliveryTimeType !== 'DEL' ? `${deliveryDict[deliveryTimeType]}, ` : ''}${await formatTime(deliveryStartTime)}-${await formatTime(deliveryEndTime)}`
            })
            .setTimestamp()
        } else {
            returnEmbed = new Discord.MessageEmbed()
            .setColor('#FFD700')
            .setTitle('Track Parcel from UPS')
            .setURL(trackUrl)
            .setAuthor('Parcel Tracker')
            .setDescription(`Your parcel has an update from UPS on \`${new Date(await formatDate(updatedDate)).toDateString()}\` at \`${await formatTime(updatedTime)}\``)
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
        return returnEmbed
    }
}

const basic_hermes = async ({trackingNumber}) => {
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
    const extra = await advanced_hermes({uniqueId: res.data[0]})
    const trackUrl = `https://www.myhermes.co.uk/track#/parcel/${trackingNumber}/details`
    const returnEmbed = new Discord.MessageEmbed()
	.setColor('#ADD8E6')
	.setTitle('Track Parcel from Hermes')
	.setURL(trackUrl)
	.setAuthor('Parcel Tracker')
	.setDescription(`An update on your parcel being shipped from ${extra.sender}`)
    .addFields({
        name: "Status",
        value: extra.status,
        inline: true
    }, {
        name: "Updated",
        value: new Date(extra.updated).toUTCString(),
        inline: true
    })
	.setTimestamp()
    return returnEmbed
}

const advanced_hermes = async ({uniqueId}) => {
    const url = `https://api.hermesworld.co.uk/enterprise-tracking-api/v1/parcels/?uniqueIds=${uniqueId}`
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
    return {
        status: recentEvent.trackingStage.description,
        updated: recentEvent.dateTime,
        sender: sender.displayName
    }
}


const execute = async (message, args) => {
    const courier = args[0]
    const referenceNum = args[1]
    const postCode = args[2]
    if (!courier) {
        await message.reply("You didn't provide all the necessary arguments. `.tracker [courier] [reference number] [post code]`")
    }
    if (courier.toLowerCase() === 'dpd') {
        const res = await basic_dpd({referenceNum: referenceNum, postCode: postCode})
        await message.reply(res)
    } else if (courier.toLowerCase() === 'ups') {
        const res = await ups({trackingNumber: referenceNum})
        await message.reply(res)
    } else if (courier.toLowerCase() === 'hermes') {
        const res = await basic_hermes({trackingNumber: referenceNum})
        await message.reply(res)
    }
}

module.exports = {
	name: 'tracker',
	description: 'Track a parcel being delivered to you from DPD, UPS or Hermes.',
    args: true,
	execute,
};