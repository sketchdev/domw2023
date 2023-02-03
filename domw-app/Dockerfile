FROM node:lts-alpine

# Create app directory
WORKDIR /usr/src/app

# Open the Express port in the container
EXPOSE 3000

COPY package*.json ./

# RUN npm install
# If you are building your code for production
RUN npm ci --only=production

# Establish the command to run the app
CMD [ "npm", "start" ]

# Copy app code into the container
COPY . .

###########################################
##
##  ADD CUSTOM FILES AND DIRECTORIES HERE
##
###########################################
RUN mkdir appdata && cd appdata \
    && touch file1.js \
    && touch file2.json \
    && touch file3.java \
    && mkdir subdir && cd subdir \
    && touch data.csv \
    && touch system32.dll \
    && touch staging.conf \
    && cd .. \
    && ls subdir > out.txt \
    && cp ../LICENSE ./zLICENSE.txt

###########################################
##
##  BUILD IMAGE USING THIS COMMAND
##
###########################################
# docker build -t IMAGE_NAME[:TAG] .

###########################################
##
##  RUN CONTAINER USING THIS COMMAND
##
###########################################
# docker run --rm -p 3000:3000 IMAGE_NAME[:TAG]
