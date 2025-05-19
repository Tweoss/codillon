set dotenv-required := true
set dotenv-load := true

default:
    just build

list:
    just --list

build:
    tsc
watch:
    watchexec -d 1ms -v -w src 'just build'
serve:
    penguin serve . -p 8080 --no-auto-watch -w index.html -w build
test:
    node src/tests/main.ts "$BROWSER_PATH"

