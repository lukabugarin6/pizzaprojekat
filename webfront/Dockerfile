# Koristimo Node.js LTS baziran na Debian-u (bolje kompatibilan sa native modulima)
FROM node:22-bullseye

# Setujemo working directory
WORKDIR /app

# Kopiramo package.json i package-lock.json
COPY package*.json ./

# Instaliramo dependencies sa forced build-om (da lightningcss napravi binarku za Ubuntu)
RUN npm ci --build-from-source

# Kopiramo ceo projekat
COPY . .

# Build Next.js projekta
RUN npm run build

# Expose port (Next.js default 3000)
EXPOSE 3000

# Pokretanje servera
CMD ["npm", "start"]
