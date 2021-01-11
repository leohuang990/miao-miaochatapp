const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    friends: {
        type: Array,
        required: true,
        default: []
    },
    background: {
        type: String,
        required: true,
        default: 'Sea'
    },
    language: {
        type: String,
        required: true,
        default: 'English'
    },
    
    requestReceived: {
        type: Array,
        required: true,
        default: []
    },
    
    description: {
        type: String,
        required: true,
        default: 'none'
    },
    
    requestSent: {
        type: Array,
        required: true,
        default: []
    },
    icon:{
        type: String,
        default: 'a'
    }
})

module.exports = User = mongoose.model('user', UserSchema);