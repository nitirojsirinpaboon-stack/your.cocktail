import React, { useState } from 'react';

function App() {
  const [name, setName] = useState('');
  const [cocktail, setCocktail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCocktail(null);
    setError(null);

    try {
      const response = await fetch("http://localhost:4000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cocktail. Please try again.");
      }

      const data = await response.json();
      setCocktail(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          AI Cocktail Generator
        </h1>
        <form onSubmit={handleSubmit} className="mb-6">
          <label htmlFor="name" className="block text-gray-700 font-semibold mb-2">
            Enter your name or a creative word:
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition duration-300"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <p>{error}</p>
          </div>
        )}

        {cocktail && (
          <div className="mt-8 p-6 border-2 border-gray-200 rounded-lg">
            <h2 className="text-2xl font-bold text-blue-600 mb-2">{cocktail.name}</h2>
            <div className="space-y-3">
              <p className="flex items-center">
                <span className="font-semibold text-gray-700 mr-2">Color:</span>
                <span className="px-2 py-1 rounded-full text-white" style={{ backgroundColor: cocktail.color.toLowerCase().replace(/\s/g, '') }}>
                  {cocktail.color}
                </span>
              </p>
              <p><span className="font-semibold text-gray-700">Alcohol Level:</span> {cocktail.alcoholLevel}</p>
              <p><span className="font-semibold text-gray-700">Taste:</span> {cocktail.taste}</p>
              <div className="mt-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Recipe:</h3>
                <ul className="list-disc list-inside text-gray-600">
                  {cocktail.recipe.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;