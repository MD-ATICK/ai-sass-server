require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const Replicate = require('replicate')
const { MongooseConnect } = require('./utils/Mongoose')
const generatedUsersModel = require('./models/genaratedUsers')
const userSubscriptionModel = require('./models/userSubcription')
const port = 4000
const Stripe = require('stripe')

const stripe = new Stripe(process.env.SRIPE_KEY)


app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});


app.get('/', (req, res) => res.send({ 'brower_message': 'you arenot a man?' }))


app.post('/checkApiLimit', async (req, res) => {
    const { userId } = req.body
    if (!userId) return res.status(201).json({ method: 'post', generateCount: 0 })

    const Find = await generatedUsersModel.findOne({ userid: userId })

    if (!Find) return res.status(201).json({ method: 'post', generateCount: 0 })

    res.status(201).json({ method: 'post', generateCount: Find.generateCount })


})

app.post('/generate', async (req, res) => {
    const { userid } = req.body

    if (!userid) return res.status(400).json({ error: 'user not found' })

    const Find = await generatedUsersModel.findOne({ userid })

    if (Find) {
        if (Find.generateCount < 10) {
            const updated = await generatedUsersModel.findOneAndUpdate({ userid }, {
                generateCount: Find.generateCount + 1
            }, { new: true })

            return res.status(201).json({ post: 'generate update', access: true, updated })
        }
        return res.status(201).json({ post: 'generate expried', access: false, error: 'free trail has been expried!' })
    }

    const created = await generatedUsersModel.create({
        userid,
        generateCount: 1
    })
    res.status(201).json({ post: 'generate created', access: true, created })

})

app.post('/music', async (req, res) => {
    try {
        const { conversation } = req.body
        if (!conversation || conversation === '') return res.status(400).send('send somethings to thinging.')
        console.log('music', conversation)
        const { audio } = await replicate.run(
            "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
            {
                input: { prompt_a: conversation }
            }
        )

        res.status(201).json({ post: 'music generated', audio })
    } catch (error) {
        console.log(error)
    }
})

app.post('/created-stripe-session', async (req, res) => {
    try {
        const { userid: userId, currentUser } = req.body

        if (!userId || !currentUser) return res.status(400).json({ error: 'user unauthorized entered.' })

        const subscriptionFind = await userSubscriptionModel.findOne({ userId })

        if (subscriptionFind && subscriptionFind.stripeCustomerId) {

            const stripeSession = await stripe.billingPortal.sessions.create({
                customer: subscriptionFind.stripeCustomerId,
                return_url: `http://localhost:5173/settings?u_r_c=${userId}`
            })
            return res.status(201).json({ url: stripeSession.url })

        };


        const line_items = [
            {
                quantity: 1,
                price_data: {
                    currency: "USD",
                    product_data: {
                        name: "Genious Pro",
                        description: "Unlimited AI Generation"
                    },
                    unit_amount: 2000,
                    recurring: {
                        interval: "month"
                    }
                }
            }
        ]

        const stripeCheckoutSession = await stripe.checkout.sessions.create({
            line_items,
            metadata: { userId },
            success_url: `http://localhost:5173/settings?u_r_c=${userId}`,
            cancel_url: `http://localhost:5173/settings?u_r_c=${userId}`,
            payment_method_types: ["card"],
            mode: 'subscription',
            billing_address_collection: "auto",
            customer_email: currentUser.emailAddresses[0].emailAddress,
        })

        // console.log('stripeCheckoutSession', stripeCheckoutSession)
        res.status(201).json({ url: stripeCheckoutSession.url })

    } catch (error) {
        console.log(error)
    }
})

app.post('/webhook', express.json(), async (req, res) => {

    const signature = req.headers['stripe-signature'];

    let END_POINT_SECRET;
    // END_POINT_SECRET = process.env.END_POINT_SECRET
    let eventType;
    let session;

    if (END_POINT_SECRET) {
        console.log('------------------- Enter Enter Enter ------------------------')
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, signature, END_POINT_SECRET);
        } catch (err) {
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }
        session = event.data.object;
        eventType = event.type;
    } else {
        session = req.body.data.object;
        eventType = req.body.type;
    }

    if (eventType === 'checkout.session.completed') {
        console.log('$$$$$ checkout session $$$$$')

        if (!session) return res.status(400).send(`session not found`);

        const subscription = await stripe.subscriptions.retrieve(session.subscription)

        await userSubscriptionModel.create({
            userId: session.metadata.userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription?.customer,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriousEnd: new Date(subscription.current_period_end * 1000)
        })
    } else if (eventType === 'invoice.payment_succeeded') {
        console.log('$$$$$ invoice $$$$$')
    }
    res.status(201).end()
})


app.get('/isPro', async (req, res) => {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ err: 'userId not found.' })

    const subscriptionFind = await userSubscriptionModel.findOne({ userId })

    if (subscriptionFind) {
        return res.status(200).json({ isPro: true })
    } else {
        return res.status(200).json({ isPro: false })
    }
})

app.listen(port, () => {
    MongooseConnect()
    console.log(`server is running at http://localhost:${port}`)
})