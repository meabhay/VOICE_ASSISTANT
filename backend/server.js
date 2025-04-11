const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cookingAssistant', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const connection = mongoose.connection;
connection.once('open', () => {
    console.log('MongoDB database connection established successfully');
});

// Recipe Schema
const recipeSchema = new mongoose.Schema({
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

const Recipe = mongoose.model('Recipe', recipeSchema);

// Spoonacular API integration
async function getRecipeFromSpoonacular(query) {
    try {
        // First, search for recipes
        const searchResponse = await axios.get(`https://api.spoonacular.com/recipes/complexSearch`, {
            params: {
                apiKey: process.env.SPOONACULAR_API_KEY,
                query: query,
                number: 1,
                addRecipeInformation: true,
                instructionsRequired: true,
                fillIngredients: true
            }
        });

        console.log('Search response:', JSON.stringify(searchResponse.data, null, 2));

        if (!searchResponse.data.results || !searchResponse.data.results.length) {
            throw new Error(`No recipes found for "${query}"`);
        }

        const recipe = searchResponse.data.results[0];

        // Get detailed recipe instructions
        const instructionsResponse = await axios.get(
            `https://api.spoonacular.com/recipes/${recipe.id}/analyzedInstructions`,
            {
                params: {
                    apiKey: process.env.SPOONACULAR_API_KEY
                }
            }
        );

        console.log('Instructions response:', JSON.stringify(instructionsResponse.data, null, 2));

        // Transform steps into our format with estimated durations
        const steps = instructionsResponse.data[0]?.steps.map(step => ({
            instruction: step.step,
            duration: estimateStepDuration(step.step)
        })) || [];

        if (steps.length === 0) {
            // If no steps found, create a simple step from the summary
            steps.push({
                instruction: recipe.summary.replace(/<[^>]*>/g, ''),
                duration: 30
            });
        }

        return {
            title: recipe.title,
            query: query,
            steps: steps,
            sourceUrl: recipe.sourceUrl,
            image: recipe.image,
            servings: recipe.servings,
            readyInMinutes: recipe.readyInMinutes || 30
        };
    } catch (error) {
        console.error('Spoonacular API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || `Failed to find recipe for "${query}"`);
    }
}

// Helper function to estimate step duration based on the instruction
function estimateStepDuration(instruction) {
    const timeRegex = /(\d+)\s*(minute|min|hour|hr)/i;
    const match = instruction.match(timeRegex);
    
    if (match) {
        const amount = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (unit.includes('hour') || unit.includes('hr')) {
            return amount * 60;
        }
        return amount;
    }

    // Default durations based on common cooking actions
    if (instruction.match(/boil|simmer|bake|roast|cook/i)) return 15;
    if (instruction.match(/preheat|heat|warm/i)) return 10;
    if (instruction.match(/chop|dice|slice|cut|mince/i)) return 5;
    if (instruction.match(/mix|stir|combine|whisk/i)) return 3;
    return 2; // Default duration for simple steps
}

// Routes
app.post('/api/recipes', async (req, res) => {
    try {
        console.log('Searching for recipe:', req.body.query);
        const spoonacularRecipe = await getRecipeFromSpoonacular(req.body.query);
        const newRecipe = new Recipe(spoonacularRecipe);
        const savedRecipe = await newRecipe.save();
        res.json(savedRecipe);
    } catch (err) {
        console.error('Recipe search error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/recipes', async (req, res) => {
    try {
        const recipes = await Recipe.find().sort({ createdAt: -1 });
        res.json(recipes);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.get('/api/recipes/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        res.json(recipe);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
}); 