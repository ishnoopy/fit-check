# Use Node.js official base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port
EXPOSE 4000

# Start the application
RUN npm install
RUN npm run build
CMD ["node", "dist/index.js"]

