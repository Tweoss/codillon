# spr25-team-20

# Developing

For best experience, install

- just: https://just.systems/man/en/introduction.html
  - run commands from a recipe file
- tsc: https://www.typescriptlang.org/download/ (installable via npm)
  - compile Typescript to javascript
- watchexec: https://github.com/watchexec/watchexec
  - run build command on save
- penguin: https://github.com/LukasKalbertodt/penguin
  - hot reloading of webpage
- npm: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
  - manage some dependencies (see [./package.json](./package.json))

Run `npm install` to get `prettier`.

Add the path to a browser in a `.env` file.
```
BROWSER_PATH="/Users/francis/path/to/google chrome"
```

For developing, start both `just watch` and `just serve` in some terminals.
Open the `just serve` URL in a browser.

Open the source files and start editing.

# Testing

Start the web server with `just serve`.
Run `just test`.
