const { default: mongoose } = require("mongoose");


const userSubscriptionSchema = new mongoose.Schema({
    userId: {
        type: String,
        require: true
    },
    stripeSubscriptionId: String,
    stripeCustomerId: String,
    stripePriceId: String,
    stripeCurrentPeriousEnd: Date
}, { timestamps: true })

const userSubscriptionModel = mongoose.model('userSubscriptions', userSubscriptionSchema)

module.exports = userSubscriptionModel;