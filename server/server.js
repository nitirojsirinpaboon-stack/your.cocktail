const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// Main endpoint to check if the server is running
app.get("/", (req, res) => {
  res.send("Cocktail Generator API is running!");
});

// Endpoint to generate a cocktail based on a name
app.post("/generate", (req, res) => {
  const { name } = req.body;
  
  // Simple AI-like logic to generate a cocktail
  const cocktail = {
    name: `${name}'s Cocktail`,
    color: "Sunset Orange",
    alcoholLevel: "Medium",
    taste: "Sweet & Fruity",
    recipe: [
      "50ml Vodka",
      "100ml Orange Juice",
      "Splash of Grenadine",
      "Ice cubes"
    ]
  };
  
  res.json(cocktail);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));