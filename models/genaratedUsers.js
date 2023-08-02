const { default: mongoose } = require("mongoose");


const generatedUsersSchema = new mongoose.Schema({
    userid: {
        type: String,
        require: true
    },
    generateCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

const generatedUsersModel = mongoose.model('generatedUsers', generatedUsersSchema)

module.exports = generatedUsersModel;