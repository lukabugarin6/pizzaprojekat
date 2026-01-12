# Dockerfile
# Koristimo Node.js LTS image
FROM node:20-alpine

# Setujemo working directory
WORKDIR /app

# Kopiramo package.json i package-lock.json
COPY package*.json ./

# Instaliramo dependencies
RUN npm install

# Kopiramo ceo projekat
COPY . .

# Build projekta (Next.js)
RUN npm run build

# Expose port (Next.js default 3000)
EXPOSE 3000

# Pokretanje servera
CMD ["npm", "start"]