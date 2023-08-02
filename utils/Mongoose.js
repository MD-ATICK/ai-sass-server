const mongoose = require("mongoose")


exports.MongooseConnect = async () => {
    try {
         mongoose.connect(process.env.MONGO_ATLAS_URL, { dbName: 'ai-sass' })
        console.log('databse connected at : ', mongoose.connection.host)
    } catch (error) {
        console.log('not connected')
    }
}