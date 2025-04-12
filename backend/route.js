const { Router } = require("express");
const { Recipe, User } = require("./model");
const { getRecipeFromSpoonacular } = require("./spoonacular");
const authMiddleware = require("./middleware");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const route = Router()


route.post('/recipes', authMiddleware, async (req, res) => {
    try {
        console.log('Searching for recipe:', req.body.query);
        const spoonacularRecipe = await getRecipeFromSpoonacular(req.body.query);
        console.log(spoonacularRecipe);
        return res.json(spoonacularRecipe)
    } catch(error) {
        return res.status(400).json({
            msg: 'Recipe search error:',
            error: error.message
        })
    }
});

route.post('/recipes/save', authMiddleware, async (req, res) => {
    try {
        const { recipe } = req.body
        const isSaved = await Recipe.findOne({
            userId: req.user.userId,
            title: recipe.title,
        })
        if(isSaved) {
            return res.status(400).json({
                msg: 'Recipe is already saved'
            })
        }
        const newRecipe = new Recipe({
            userId: req.user.userId,
            title: recipe.title,
            query: recipe.query,
            steps: recipe.steps,
            sourceUrl: recipe.sourceUrl,
            image: recipe.image,
            servings: recipe.servings,
            readyInMinutes: recipe.readyInMinutes
        })
        await newRecipe.save()
        res.status(200).json({
            newRecipe
        })
    } catch (error) {
        return res.status(500).json({
            msg: 'Error while saving recipe',
            error: error.message
        })
    }
})

route.get('/recipes', authMiddleware, async (req, res) => {
    const userId = req.user.userId
    try {
        const recipes = await Recipe.find({userId}).sort({ createdAt: -1 });
        console.log('receipe',recipes);
        if(!recipes) return res.json({msg: 'recipe not found'})
        res.json(recipes);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

route.get('/recipes/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        res.json(recipe);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

route.delete('/recipes/remove/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findByIdAndDelete({_id: req.params.id});
        if(!recipe) return res.status(400).json({
            msg: 'Error while removing recipe'
        })
        res.status(200).json(recipe);
    } catch (err) {
        return res.status(400).json('Error: ' + err);
    }
});


route.post('/auth/signup', async (req, res) => {
    const { email, fullName, password } = req.body
    console.log(email, fullName, password);
    try {
        const isExist = await User.findOne({ email })
        console.log(isExist);
        if (isExist) return res.status(400).json({ msg: 'user is alredy exist' })
        
        const saltRound = 10;
        const hashedPswd = await bcrypt.hash(password, saltRound)

        const newUser = await User.create({
            email: email,
            fullName: fullName,
            password: hashedPswd
        })
        console.log(newUser);
        if (!newUser) return res.status().json({
            msg: 'Error while creating error',
            error: error.name
        })

        res.status(201).json({
            msg: 'user registered successfully',
            user: newUser
        })
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                mgs: 'Validation Error'
            })
        }
        console.log(error);
        return res.status(501).json({
            msg: 'Internal server error',
            error: error.name
        })
    }
})

route.post('/auth/signin', async (req, res) => {
    const { email, password } = req.body
    try {
        const user = await User.findOne({ email })
        if (!user) return res.status(400).json({ msg: 'user not exist' })

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) return res.status(400).json({msg: 'Invalid password'})
        
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '6h' })
        res.status(201).json({
            msg: 'user signin successfully',
            user: user,
            token: token
        })
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                mgs: 'Validation Error'
            })
        }
        return res.status(501).json({
            msg: 'Internal server error',
            error: error.message
        })
    }
})

module.exports = route