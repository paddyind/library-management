FROM node:20-alpine

WORKDIR /app

# Install system dependencies for sqlite3 and SSL/TLS support
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-setuptools \
    make \
    g++ \
    sqlite \
    sqlite-dev \
    ca-certificates \
    openssl

# Update CA certificates
RUN update-ca-certificates

# Install node dependencies
COPY package*.json ./
RUN npm install

# Rebuild sqlite3 for Alpine Linux
RUN npm rebuild sqlite3 --build-from-source

# Copy source code
COPY . .

EXPOSE 4000

# Start NestJS development server
CMD ["npm", "run", "start:dev"]
