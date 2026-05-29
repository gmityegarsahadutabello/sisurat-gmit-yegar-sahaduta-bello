# Use an official Node.js runtime as a parent image
# Using a specific version is recommended for production
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
# This leverages Docker's layer caching.
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Bundle app source
COPY . .

# Google Cloud Run expects the container to listen on the port defined by the PORT environment variable.
# Your server.js already does this. We expose 8080 as a common default.
EXPOSE 8080

# Define the command to run your app
CMD [ "npm", "start" ]
