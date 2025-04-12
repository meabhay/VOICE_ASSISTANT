// Dark mode toggle
const toggleDark = document.getElementById("toggleDark");
const darkIcon = document.getElementById("darkIcon");

toggleDark.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  const isDark = document.documentElement.classList.contains("dark");
  darkIcon.className = isDark ? "fas fa-sun" : "fas fa-moon";
});

// API Configuration
const API_URL = 'http://localhost:3000/api';

// Voice recognition setup
const voiceBtn = document.getElementById("voiceBtn");
const textInput = document.getElementById("textInput");
const output = document.getElementById("output");
const recipesList = document.getElementById("recipesList");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.lang = "en-US";
  recognition.continuous = false;

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    textInput.value = transcript;
    fetchRecipe(transcript);
  };

  recognition.onerror = function (event) {
    console.error("Speech recognition error", event);
  };

  voiceBtn.addEventListener("click", () => {
    recognition.start();
  });
} else {
  alert("Sorry, your browser does not support Speech Recognition.");
}

// Recipe handling
async function fetchRecipe(query) {
  output.innerHTML = `<p class="text-green-500">Searching for "<strong>${query}</strong>"...</p>`;

  const token = localStorage.getItem('token')
  if(!token) window.location.href = "./auth.html"
  try {
    const response = await fetch(`${API_URL}/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recipe');
    }

    const recipe = await response.json();
    console.log(recipe);
    displayRecipe(recipe);
    loadSavedRecipes();
  } catch (error) {
    console.error('Error:', error);
    output.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
  }
}

function displayRecipe(recipe) {
  let content = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-2xl font-bold">${recipe.title}</h3>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          <span class="mr-4">🕒 ${recipe.readyInMinutes} mins</span>
          <span>👥 Serves ${recipe.servings}</span>
        </div>
      </div>
      ${recipe.image ? `
        <img src="${recipe.image}" alt="${recipe.title}" class="w-full h-64 object-cover rounded-lg shadow-md">
      ` : ''}
      <div class="space-y-4">
        <h4 class="text-xl font-semibold">Instructions:</h4>
        <ol class="list-decimal pl-6 space-y-4">
          ${recipe.steps.map(step => 
            `<li class="step" data-duration="${step.duration}">${step.instruction} (${step.duration} seconds)</li>`
          ).join('')}
        </ol>
        ${recipe.sourceUrl ? `
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Source: <a href="${recipe.sourceUrl}" target="_blank" class="text-green-500 hover:underline">Original Recipe</a>
          </p>
        ` : ''}
        <button id="startCooking" class="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors">
          Start Cooking
        </button>
        <button id="saveRecipe" class="bg-blue-500 text-white px-6 py-2 rounded-lg">save</button>
      </div>
    </div>
  `;
  
  output.innerHTML = content;

  document.getElementById('startCooking').addEventListener('click', () => {
    startCookingGuide(recipe.steps);
  });
 
  document.getElementById('saveRecipe').addEventListener('click', () => {
    saveRecipe(recipe)
  })
}

async function saveRecipe(recipe) {
  const token = localStorage.getItem('token')
  try {
    const response = await fetch(`${API_URL}/recipes/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ recipe })
    })
    const data = await response.json()
    if(!response.ok) {
      console.log('Error saving recipe:', data.msg || 'Unknown error');
        alert(data.msg || 'Failed to save recipe.');
        return;
    }
    console.log('data',data);
  } catch (error) {
    console.log('Error while saving recipe', error);
  }
}

async function loadSavedRecipes() {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_URL}/recipes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });
    if (!response.ok) throw new Error('Failed to load recipes');
    
    const recipes = await response.json();
    console.log(recipes);
    recipesList.innerHTML = recipes.map(recipe => `
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <div class="flex items-center space-x-4">
          ${recipe.image ? `
            <img src="${recipe.image}" alt="${recipe.title}" class="w-16 h-16 object-cover rounded">
          ` : ''}
          <div class="flex-1">
            <h3 class="font-bold">${recipe.title}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">🕒 ${recipe.readyInMinutes} mins • 👥 Serves ${recipe.servings}</p>
          </div>
          <button 
            onclick="loadRecipe('${recipe._id}')"
            class="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          >
            Load Recipe
          </button>
          <button 
            onclick="removeRecipe('${recipe._id}')"
            class="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Remove Recipe
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading recipes:', error);
  }
}

async function loadRecipe(id) {
  try {
    const response = await fetch(`${API_URL}/recipes/${id}`);
    if (!response.ok) throw new Error('Failed to load recipe');
    
    const recipe = await response.json();
    displayRecipe(recipe);
  } catch (error) {
    console.error('Error loading recipe:', error);
  }
}

async function removeRecipe(id) {
  const token = localStorage.getItem('token')
  try {
    const response = await fetch(`${API_URL}/recipes/remove/${id}`, {
      method: 'DELETE',
      'Authorization': `Bearer ${token}`
    });
    if (!response.ok) throw new Error('Failed to load recipe');
    
    const recipe = await response.json();
    console.log('deleted', recipe);
  } catch (error) {
    console.error('Error loading recipe:', error);
  }
}

function startCookingGuide(steps) {
  let currentStep = 0;
  
  function speakStep() {
    if (currentStep >= steps.length) {
      speakText("Recipe complete! Enjoy your meal!");
      return;
    }

    const step = steps[currentStep];
    const stepElement = output.querySelectorAll('.step')[currentStep];
    
    // Highlight current step
    output.querySelectorAll('.step').forEach(el => el.classList.remove('text-green-500', 'font-bold'));
    stepElement.classList.add('text-green-500', 'font-bold');
    
    speakText(step.instruction);
    
    setTimeout(() => {
      currentStep++;
      speakStep();
    }, step.duration * 1000);
  }
  
  speakStep();
}

function speakText(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
}

// Add event listener for text input
textInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    fetchRecipe(textInput.value);
  }
});

// Load saved recipes on page load
loadSavedRecipes(); 