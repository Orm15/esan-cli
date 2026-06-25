# Makefile — atajos de tareas para esan-cli (envuelve los scripts de Bun).
# Nota: correr el CLI no es trabajo de make; tras `make install` (o `bun link`) usas `esan`.

PREFIX ?= $(HOME)/.local
BIN := dist/esan

.PHONY: help install uninstall build compile test lint typecheck check clean

help: ## Lista los targets disponibles
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
		| awk 'BEGIN{FS=":.*?## "}{printf "  %-12s %s\n", $$1, $$2}'

build: ## Bundle para Node -> dist/bin.js
	bun run build

compile: ## Binario autonomo -> dist/esan
	bun run compile

install: compile ## Compila e instala el comando `esan` en $(PREFIX)/bin (symlink)
	@mkdir -p "$(PREFIX)/bin"
	@ln -sf "$(CURDIR)/$(BIN)" "$(PREFIX)/bin/esan"
	@echo "OK: esan -> $(PREFIX)/bin/esan"
	@echo "    Asegurate de que $(PREFIX)/bin este en tu PATH."

uninstall: ## Quita el comando `esan` de $(PREFIX)/bin
	@rm -f "$(PREFIX)/bin/esan"
	@echo "OK: esan desinstalado de $(PREFIX)/bin"

test: ## Corre los tests
	bun test

lint: ## Lint (biome)
	bun run lint

typecheck: ## Chequeo de tipos (tsc)
	bun run typecheck

check: typecheck lint test ## typecheck + lint + test

clean: ## Borra dist/
	rm -rf dist
