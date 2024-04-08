var mongoose=require('mongoose');
const postSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        required: true
    },
    like:{
        type: [String], // Change type to an array of strings
        default: [],   // Default value is an empty array
    }
})
module.exports = mongoose.model('post',postSchema)