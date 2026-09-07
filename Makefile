.PHONY: install dev build preview typecheck lint lint-fix format format-check test test-run test-e2e \
        clean docker-dev docker-build docker-prod docker-down

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

format-check:
	npm run format:check

test:
	npm run test

test-run:
	npm run test:run

test-e2e:
	npm --prefix e2e ci && npx --prefix e2e playwright install --with-deps chromium && npm run test:e2e

clean:
	rm -rf node_modules dist

docker-dev:
	docker compose up --build

docker-build:
	docker compose build

docker-prod:
	docker build --target prod -t spanish-paternity-leave:prod .

docker-down:
	docker compose down
