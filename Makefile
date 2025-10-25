.PHONY: dev build test clean

# Development
dev:
	docker-compose up --build

# Production build
build:
	docker-compose -f docker-compose.prod.yml build

# Start production
prod:
	docker-compose -f docker-compose.prod.yml up -d

# Run tests
test:
	cd frontend && npm test
	cd backend && npm test

# Clean up
clean:
	docker-compose down -v
	rm -rf frontend/node_modules
	rm -rf backend/node_modules

# Install dependencies
install:
	cd frontend && npm install
	cd backend && npm install

# Database migrations
db-migrate:
	cd backend && npm run migration:run

# Generate database migration
db-generate:
	cd backend && npm run migration:generate

# Lint code
lint:
	cd frontend && npm run lint
	cd backend && npm run lint

# Format code
format:
	cd frontend && npm run format
	cd backend && npm run format
