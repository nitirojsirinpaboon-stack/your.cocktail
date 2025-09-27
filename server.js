const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Root endpoint
app.get("/", (req, res) => {
  res.send("Cocktail Generator API is running!");
});

// Cocktail generator endpoint
app.post("/generate", (req, res) => {
  const { name } = req.body;
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
