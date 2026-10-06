.PHONY: all up down test test-backend test-frontend seed reset

all: up

up:
	docker compose up --build -d

down:
	docker compose down

test: test-backend test-frontend

test-backend:
	cd backend && ./mvnw clean test

test-frontend:
	cd frontend && npm run test --if-present

seed:
	@echo "Seeding demo data (profile 'demo' is enabled by default in backend)"
	curl -s -X POST http://localhost:8080/api/v1/dev/seed || true

reset: down
	docker compose down -v
	rm -rf storage/invoices/*
