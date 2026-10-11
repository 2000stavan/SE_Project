export JAVA_HOME := $(shell if [ -d "/opt/homebrew/opt/openjdk@21" ]; then echo "/opt/homebrew/opt/openjdk@21"; elif [ -d "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home" ]; then echo "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"; else /usr/libexec/java_home -v 21 2>/dev/null; fi)
export PATH := $(JAVA_HOME)/bin:$(PATH)

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
	@echo "Demo data is seeded automatically on backend startup (SPRING_PROFILES_ACTIVE=demo, set in docker-compose.yml)."
	@echo "To re-seed from scratch run: make reset && make up"

reset: down
	docker compose down -v
	rm -rf storage/invoices/*
