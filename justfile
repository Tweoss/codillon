default:
    just build

list:
    just --list

build:
    tsc
watch:
    watchexec 'just build' -d 0 -v -w src
serve:
    penguin serve . -p 8080 --no-auto-watch -w index.html -w build

