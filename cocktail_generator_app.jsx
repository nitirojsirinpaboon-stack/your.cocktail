# Cocktail Generator — Full Project (Backend + Frontend + Docker + GitHub)

This project is a complete, ready-to-run monorepo containing:

- **server/** — Node + Express backend with optional Hugging Face support and a local fallback generator
- **client/** — React (Vite) frontend with a modern, responsive UI (Tailwind CSS)
- **docker-compose.yml** — run both services with one command
- **README.md** — instructions to run locally and to build images
- **.gitignore**

---

## Project structure

```
cocktail-generator-app/
├─ .gitignore
├─ README.md
├─ docker-compose.yml
├─ server/
│  ├─ package.json
│  ├─ Dockerfile
│  ├─ server.js
│  └─ .env.example
└─ client/
   ├─ package.json
   ├─ Dockerfile
   ├─ postcss.config.cjs
   ├─ tailwind.config.cjs
   └─ src/
      ├─ main.jsx
      ├─ App.jsx
      ├─ index.css
      └─ components/
         └─ CocktailCard.jsx
```

---

> **Important:** The code below is saved in this canvas file. Open the file in the canvas to copy or download each file.

---

### Top-level files

#### .gitignore

```
node_modules
dist
.env
.env.local
.DS_Store
client/node_modules
server/node_modules
client/dist
```

#### docker-compose.yml

```
version: '3.8'
services:
  server:
    build: ./server
    ports:
      - '4000:4000'
    environment:
      - PORT=4000
      - HF_INFERENCE=
    restart: unless-stopped
  client:
    build: ./client
    ports:
      - '5173:5173'
    environment:
      - VITE_API_BASE_URL=http://localhost:4000
    restart: unless-stopped
```

---

## Server (backend)

Path: `server/`

#### server/package.json

```json
{
  "name": "cocktail-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "node-fetch": "^2.6.7",
    "dotenv": "^16.0.0"
  }
}
```

#### server/Dockerfile

```
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node","server.js"]
```

#### server/.env.example

```
PORT=4000
HF_INFERENCE=
```

#### server/server.js

```js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const HF_INFERENCE = process.env.HF_INFERENCE || '';
const USE_HF = HF_INFERENCE.length > 0;

function fallbackGenerate(name) {
  const seed = (name || 'friend').trim().toLowerCase();
  const vowels = (seed.match(/[aeiou]/g) || []).length;
  const consonants = (seed.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;

  const colors = ['Ruby Red','Sunset Orange','Emerald Green','Midnight Blue','Golden Yellow','Rose Pink','Smoky Grey','Lavender'];
  const alcoholLevels = ['Non-alcoholic','Very low (0-5%)','Low (6-12%)','Moderate (13-20%)','Strong (21-40%)','Very strong (40%+)'];
  const tastes = ['Sweet','Sour','Bitter','Fruity','Floral','Smoky','Spicy','Herbal','Umami'];
  const choose = (arr, idx) => arr[Math.abs(idx) % arr.length];

  const idx1 = (seed.length + vowels) % 100;
  const idx2 = (consonants * 7 + (seed.charCodeAt(0)||99)) % 100;

  const color = choose(colors, idx1);
  const alcohol = choose(alcoholLevels, idx2);
  const taste = choose(tastes, idx1 + idx2);

  const nameParts = ['Fizz','Breeze','Sunrise','Dream','Twist','Sour','Storm','Elixir','Blossom','Glow'];
  const part = choose(nameParts, seed.length + vowels);
  const cocktailName = `${name.split(' ')[0] || name}'s ${part}`;

  const baseSpirits = ['Vodka','Gin','White Rum','Tequila','Whiskey','Brandy','Coconut Rum','Non-alcoholic sparkling'];
  const base = choose(baseSpirits, idx2);

  let baseAmount = '45 ml';
  if (alcohol.includes('Non-alcoholic')) baseAmount = '0 ml (use sparkling water)';
  else if (alcohol.includes('Very low')) baseAmount = '15 ml';
  else if (alcohol.includes('Low')) baseAmount = '25 ml';
  else if (alcohol.includes('Moderate')) baseAmount = '45 ml';
  else if (alcohol.includes('Strong')) baseAmount = '60 ml';
  else baseAmount = '75 ml';

  const recipe = [];
  recipe.push(`${base} — ${baseAmount}`);
  if (taste === 'Sweet') recipe.push('Pineapple juice — 60 ml');
  else if (taste === 'Sour') recipe.push('Fresh lemon juice — 20 ml, simple syrup — 15 ml');
  else if (taste === 'Bitter') recipe.push('Campari or bitter aperitif — 15 ml');
  else if (taste === 'Fruity') recipe.push('Orange juice — 60 ml');
  else if (taste === 'Floral') recipe.push('Elderflower cordial — 15 ml');
  else if (taste === 'Smoky') recipe.push('Smoked syrup or a drop of mezcal — 10 ml');
  else if (taste === 'Spicy') recipe.push('Ginger syrup — 15 ml or a slice of chili');
  else if (taste === 'Herbal') recipe.push('Herbal tonic or basil leaves — small handful');
  else recipe.push('Tomato juice or umami mixer — 60 ml');

  recipe.push('Ice — as needed');
  recipe.push('Garnish — twist of citrus or herb sprig');

  return {
    cocktailName,
    color,
    alcoholLevel: alcohol,
    taste,
    recipeSteps: recipe
  };
}

async function callHuggingFace(name) {
  const prompt = `You are a creative bartender. User name: ${name}. Generate a JSON object with fields: cocktailName, color, alcoholLevel (short text), taste (short), recipeSteps (array of short ingredient+amount lines). Do not include extra commentary.`;
  const res = await fetch('https://api-inference.huggingface.co/models/gpt2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HF_INFERENCE}`
    },
    body: JSON.stringify({inputs: prompt, parameters:{max_new_tokens:150}})
  });
  const text = await res.text();
  try {
    const jsonStart = text.indexOf('{');
    const jsonText = text.slice(jsonStart);
    return JSON.parse(jsonText);
  } catch (e) {
    return null;
  }
}

app.post('/api/generate', async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });

  if (USE_HF) {
    try {
      const hf = await callHuggingFace(name);
      if (hf) return res.json({ source: 'huggingface', data: hf });
    } catch (e) {
      console.error('HF error', e.message);
    }
  }

  const data = fallbackGenerate(name);
  res.json({ source: 'fallback', data });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
```

---

## Client (frontend)

Path: `client/`

This uses Vite + React + Tailwind for a responsive, nice-looking UI.

#### client/package.json

```json
{
  "name": "cocktail-client",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

#### client/Dockerfile

```
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### client/postcss.config.cjs

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

#### client/tailwind.config.cjs

```js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: { extend: {} },
  plugins: []
};
```

#### client/src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body { @apply bg-gradient-to-b from-slate-50 to-white text-slate-800; }
```

#### client/src/main.jsx

```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(<App />)
```

#### client/src/components/CocktailCard.jsx

```jsx
import React from 'react'

export default function CocktailCard({ data }) {
  if (!data) return null
  return (
    <div className="bg-white shadow-md rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{data.cocktailName}</h2>
          <div className="text-sm text-slate-500">{data.taste} • {data.alcoholLevel}</div>
        </div>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-medium" style={{background:'#f3f4f6'}}>
          {data.color}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="font-medium">Recipe</h3>
        <ol className="list-decimal list-inside mt-2 text-sm text-slate-700">
          {data.recipeSteps && data.recipeSteps.map((r,i)=>(<li key={i} className="py-0.5">{r}</li>))}
        </ol>
      </div>

      <div className="text-xs text-slate-400 mt-4">Generated by: {data.source || 'fallback'}</div>
    </div>
  )
}
```

#### client/src/App.jsx

```jsx
import React, { useState } from 'react'
import CocktailCard from './components/CocktailCard'

export default function App(){
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

  async function handleSubmit(e){
    e.preventDefault();
    setError('');
    if(!name.trim()) return setError('กรุณากรอกชื่อของคุณ')
    setLoading(true); setResult(null)
    try{
      const res = await fetch(`${API_BASE}/api/generate`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name })
      })
      const j = await res.json()
      if(!res.ok) throw new Error(j.error || 'เกิดข้อผิดพลาด')
      setResult(j.data)
    }catch(err){
      setError(err.message)
    }finally{ setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white rounded-3xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold">Cocktail Name Generator</h1>
          <p className="mt-2 opacity-90">กรอกชื่อของคุณแล้วกด Generate เพื่อรับชื่อค็อกเทล สี ระดับแอลกอฮอล์ รสชาติ และสูตร</p>

          <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="พิมพ์ชื่อของคุณ (ภาษาไทย/อังกฤษ)" className="flex-1 p-3 rounded-xl text-slate-800" />
            <button disabled={loading} className="bg-white text-indigo-600 px-5 py-3 rounded-xl font-semibold shadow">{loading? 'กำลังสร้าง...':'Generate'}</button>
          </form>

          {error && <div className="mt-3 text-red-100">{error}</div>}
        </div>

        <CocktailCard data={result} />

        <div className="mt-6 text-xs text-slate-500">
          <div>Run locally: backend port 4000, frontend dev port 5173. Or use `docker-compose up --build`.</div>
        </div>
      </div>
    </div>
  )
}
```

---

## README.md (short)

```
# Cocktail Generator App

## Run locally (no Docker)

- Server:
  cd server
  npm install
  cp .env.example .env (and edit HF_INFERENCE if you have a token)
  npm start

- Client:
  cd client
  npm install
  npm run dev

The client expects the API at http://localhost:4000 by default.

## Run with Docker (recommended)

docker-compose up --build

This will expose:
- frontend Vite: http://localhost:5173
- backend API: http://localhost:4000

```

---

## GitHub repo

To publish on GitHub:
1. `git init`
2. `git add .` and commit
3. Create a new repo on GitHub and follow the `git remote add origin ...` + `git push -u origin main`

I can prepare a ready-to-push commit for you or generate a `.github/workflows/ci.yml` if you want automatic deployment.

---

## What I changed vs previous draft

- Split the single-file sample into a full monorepo with server + client directories
- Replaced basic CSS with Tailwind for a cleaner modern UI
- Added Dockerfiles for both server and client and `docker-compose.yml` for easy local deployment
- Kept fallback generator so AI usage remains **free** unless you paste a Hugging Face token in env

---

If you want any of these next steps, say which one and I will update the canvas accordingly (I already have the project in the canvas and can add files or push a prepared git commit):

- Add GitHub Actions workflow to build & push Docker images
- Add NGINX reverse-proxy config to serve client on port 80 and proxy /api to server
- Make the frontend a static single-file (no Vite) for easy GitHub Pages deploy
- Add prettier/eslint config and unit tests

Which do you want next?
