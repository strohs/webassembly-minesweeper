# Minesweeper with Rust and WebAssembly
This project is an implementation of the classic Windows [minesweeper](https://en.wikipedia.org/wiki/Microsoft_Minesweeper) 
game using Rust and WebAssembly.

Rust is used to maintain the game logic and game state, while Javascript does the event handling and rendering
of the game's UI elements to a 2D canvas.

![screenshot](./screenshot.png "Minesweeper Screenshot") 

### Running
It's easiest to use nodejs and the webpack development server to serve the game files. It has
default support for the `application/wasm` MIME type required to serve webassebmly files.

1. cd into the `www` directory
2. run `npm install`
3. run `npm run start` to start the webpack dev server
4. open your browser to [http://localhost:8080](http://localhost:8080)
 
You could also use another web server such as busybox, Apache, NGINX etc.. to serve the game, but (as mentioned above) 
you will need to configure the server to support the `application/wasm` MIME type. If you want to go this route, I have
prebuilt all the files needed for the game and placed them in [www/dist](./www/dist) directory. 
 
### Prerequisites
To run the game, you should only need nodejs and npm installed. To play around with the source code, you will need 
rust installed and the following prerequisites listed [here](https://rustwasm.github.io/docs/book/game-of-life/setup.html) 

### Building (from scratch)
I used Rust 1.37 and npm 6.11.2 to develop this project on a linux machine.

1. from this projects root directory run `wasm-pack build` which will create the `/pkg` directory and compile rust 
sources into a WebAssembly (.wasm) binary
2. cd into the `www` directory and run `npm install`.
3. from within the 'www' directory, start the webpack local development server by running: `npm run start`
4. go to the page at `http://localhost:8080` in your browser of choice
5. start minesweeping

### project directories
* rust code is in the [src](./src/lib.rs) directory
* the nodejs project containing javascript, html, and css source files are in the [www](./www) directory
* the [pkg](./pkg) directory contains the wasm and javascript code built with the `wasm-pack` utility
* the [www/dist](./www/dist) directory contains all final compiled files used by the game, including: html,css,js 
and wasm. You could deploy these to your web-server of choice (just be sure to configure your server to recognize
 the`application/wasm` MIME type)
