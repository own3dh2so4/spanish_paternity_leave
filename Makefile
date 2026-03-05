.PHONY: install dev build preview typecheck lint lint-fix format test test-run clean \
        docker-dev docker-build docker-down

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

typecheck:
	npm run typecheck

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

test:
	npm run test

test-run:
	npm run test:run

clean:
	rm -rf node_modules dist

docker-dev:
	docker compose up --build

docker-build:
	docker compose build

docker-down:
	docker compose down
