# Use official Node image
FROM node:18

WORKDIR /app

COPY . /app

RUN npm install

# If react-scripts is missing globally
RUN npm install -g react-scripts

EXPOSE 3000

CMD ["npm", "start"]
