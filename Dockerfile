FROM node:12.6.0

# Create work directory
WORKDIR /app

# Copy app config files
COPY package.json ./
COPY package-lock.json ./

# Install app dependencies
RUN npm install

# Copy app source to work directory
COPY src ./src
COPY public ./public
COPY tsconfig.json ./
COPY .eslintrc ./

# Build and run the app
RUN npm run build
CMD npm run start
