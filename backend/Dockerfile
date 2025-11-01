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

# Copy source code first
COPY . .

# Create scripts directory if it doesn't exist (for test scripts)
RUN mkdir -p scripts

# Rebuild better-sqlite3 for Alpine Linux after source code is copied
# This ensures the native module is compiled for the correct architecture
RUN npm rebuild better-sqlite3 --build-from-source || \
    (echo "Warning: Failed to rebuild better-sqlite3, will retry at runtime" && true)

EXPOSE 4000

# Start NestJS development server
CMD ["npm", "run", "start:dev"]
