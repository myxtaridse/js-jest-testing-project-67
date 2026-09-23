install:
	npm ci

link:
	npm link

setup: install link

lint:
	npx eslint .

lint-fix:
	npx eslint . --fix

test:
	npm run test