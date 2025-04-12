const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    title: String,
    query: String,
    steps: [{
        instruction: String,
        duration: Number // duration in seconds
    }],
    sourceUrl: String,
    image: String,
    servings: Number,
    readyInMinutes: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        minlength: 6,
        required: true
    },
})

const User = mongoose.model('User', userSchema)
const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = {
    User,
    Recipe,
}