/**
 * These functions render the minesweeper game onto a 2D canvas and handle event processing
 */

import {MinesweeperState} from "./minesweeper-state";

const CELL_SIZE         = 25;                   // size of a minesweeper cell in the canvas, in px
const BORDER_WIDTH      = 2;                    // border width of a cell in px
const GRID_COLOR        = "#CCCCCC";            // background color of the grid
const CELL_BG_COLOR     = "#C0C0C0";            // cell background color
const CELL_BG_GREEN     = "#01c00d";            // cell green background for correctly marked cell
const CELL_BG_RED       = "#fc000c";            // cell red background for mis-marked cell
const CELL_TL_COLOR     = "#FFFFFF";            // cell top and left "highlight" color to make a 3d effect
const CELL_BR_COLOR     = "#7B7B7B";            // cell bottom and right "shaded" color ro make a 3d effect

const CELL_FONT_STYLE   = 'bold 12px serif';
const TRIANGLE_FLAG     = '\uD83D\uDEA9';       // Triangle Flag used to mark a cell
const MINE              = '\uD83D\uDCA3';       // using a utf-8 bomb for a mine
const QUESTION          = '?';                  // represents a questioned cell
const SMILEY_OPEN       = '\uD83D\uDE03';       // smiley face with open smile
const SMILEY_FROWN      = '\uD83D\uDE1E';       // smiley face frowning
const SMILEY_SHADES     = '\uD83D\uDE0E';       // smiley face with sunglasses on

let num_rows            = 8;                    // default number of rows in the minesweeper grid
let num_cols            = 8;                    // default number of columns in the minesweeper grid

// UI elements used on the minesweeper HTML page
let canvas = document.getElementById("grid-canvas");
const gameBtn = document.getElementById("game-btn");
const mineCounter = document.getElementById("mine-counter");
const settingsBtn = document.getElementById("settings-btn");
const rowSlider = document.getElementById("row-slider");
const colSlider = document.getElementById("col-slider");
const rowOutput = document.getElementById("row-slider-output");
const colOutput = document.getElementById("col-slider-output");
const resultHeader = document.getElementById("result-header");
let timer;
let elapsedTime = 0;

// main object that holds the MinesweeperState
let minesweeper;



// click listener for the 'smiley' face button
gameBtn.addEventListener('click', () => { newGame() });

// input listeners for the row,col sliders
rowSlider.addEventListener('input', sliderInputListener);
colSlider.addEventListener('input', sliderInputListener);

/**
 * listens for click events on the settings button and toggles the display of the row, column sliders on the page
 */
settingsBtn.addEventListener("click", () => {
    const sliders = document.getElementById("settings-sliders");
    if (sliders.style.display === "none") {
        sliders.style.display = "flex";
        sliders.style.flexDirection = "column";
    } else {
        sliders.style.display = "none"
    }
});

/**
 * listener for input events on the row AND col range sliders. This function will trigger the changing of the number
 * of rows and columns in the minesweeper grid and then start a new game
 * @param event - slider (range) input event
 */
function sliderInputListener(event) {
    if (event.target.id === 'row-slider') {
        rowOutput.innerText = event.target.value;
        num_rows = event.target.valueAsNumber;
    }
    if (event.target.id === 'col-slider') {
        colOutput.innerText = event.target.value;
        num_cols = event.target.valueAsNumber;
    }
    newGame();
}

/**
 * translate the click event's page-relative coordinates into canvas-relative coordinates, and then into a row and
 * column index
 */
function translateClickPosition(event) {
    const canvas = document.getElementById("grid-canvas");
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), num_rows - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), num_cols - 1);
    return [row,col];
}


/**
 * listen for click events on the canvas grid and perform game logic accordingly. This function is the main
 * game loop
 * @param event - click event on the canvas
 */
function gridClickListener(event) {
    const ctx = canvas.getContext('2d');

    let [row, col] = translateClickPosition(event);

    console.log("clicked [",row ,"][",col, "]");

    // start the timer once a grid cell is clicked (if it hasn't been started already)
    if (!timer) setTimer();

    if (event.ctrlKey) {
        // mark a cell with a question mark
        minesweeper.toggleQuestion(row, col);
    } else if (event.shiftKey) {
        // flag a cell
        minesweeper.toggleFlag(row, col);
    } else {
        // cell was left clicked, reveal the cell
        minesweeper.revealCell(row, col);
    }

    // check if game is won or lost
    if (minesweeper.isGameWon()) {
        renderGameWon(ctx);
    } else if (minesweeper.isGameLost()) {
        renderGameLost(ctx);
    } else {
        // game is not over, so render the grid state
        renderGrid(ctx);
        mineCounter.innerText = minesweeper.remainingFlags().toString(10).padStart(3, "0");
    }

}

/**
 * starts the "seconds elapsed" timer which is displayed in the upper right section of the grid
 */
function setTimer () {
    timer = setInterval(function(){
        elapsedTime += 1;
        document.getElementById('timer').innerText = elapsedTime.toString().padStart(3, '0');
    }, 1000);
}

/**
 * starts a new game of minesweeper, resets all UI elements
 * @returns {Minesweeper} - a struct from Rust/WASM that encapsulates the current game state
 */
function newGame() {
    // set the row,col lengths from values in the sliders
    num_rows = rowSlider.valueAsNumber;
    num_cols = colSlider.valueAsNumber;

    // initialize canvas
    canvas.style.backgroundColor = CELL_BG_COLOR;
    canvas.height = (CELL_SIZE + 1) * num_rows + 1;
    canvas.width = (CELL_SIZE + 1) * num_cols + 1;

    // initialize a new MineSweeper Game
    minesweeper = new MinesweeperState(num_rows, num_cols);

    // reset the result text
    resultHeader.innerText = " ";
    // rest smiley button
    gameBtn.innerText = SMILEY_OPEN;
    // reset the timer
    clearInterval(timer);
    timer = undefined;
    elapsedTime = 0;
    document.getElementById('timer').innerText = elapsedTime.toString().padStart(3, '0');
    // reset the flags remaining counter
    mineCounter.innerText = minesweeper.totalMines().toString(10).padStart(3, "0");

    // draw the minesweeper grid
    renderGrid( canvas.getContext('2d') );
    canvas.addEventListener("click", gridClickListener);
    return minesweeper;
}

/**
 * renders the minesweeper game grid on the 2D canvas
 * @param ctx - the canvas context to render to
 */
function renderGrid(ctx) {
    drawGridLines(ctx);
    drawGridCells(ctx, minesweeper.cells );
}

/**
 * reveals and renders all cells of the minsweeper grid. Highlights which cells were flagged correctly and which were
 * flagged incorrectly
 * @param ctx - the canvas context to draw to
 */
function revealEntireGrid(ctx) {
    drawGridLines(ctx);
    for (let r=0; r < num_rows; r++) {
        for (let c=0; c < num_cols; c++) {
            if (minesweeper.isFlaggedAndMinedCell(r, c)) {
                drawRevealedCell(ctx, r, c, CELL_BG_GREEN);
            }
            if (minesweeper.isUnflaggedAndMinedCell(r, c)) {
                drawRevealedCell(ctx, r, c, CELL_BG_RED);
            }
            minesweeper.revealCell(r, c);
        }
    }
}

/**
 * triggers the game won state by revealing the entire game grid and updating UI components with "You Won" message
 * @param ctx - canvas context containing the game grid
 */
function renderGameWon(ctx) {
    resultHeader.innerText = "You Won!";
    gameBtn.innerText = SMILEY_SHADES;
    clearInterval(timer);
    revealEntireGrid(ctx);
    canvas.removeEventListener("click", gridClickListener);
}

/**
 * triggers the game lost state by revealing the entire game grid and updating UI components with "You Lost" message
 * @param ctx - canvas context containing the game grid
 */
function renderGameLost(ctx) {
    resultHeader.innerText = "You Lost!";
    gameBtn.innerText = SMILEY_FROWN;
    clearInterval(timer);
    revealEntireGrid(ctx);
    canvas.removeEventListener("click", gridClickListener);
}


/**
 * draw the horizontal and vertical grid lines that separate cells on the canvas
 * @param ctx - canvas context to draw to
 */
const drawGridLines = (ctx) => {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 2;

    // Vertical lines.
    for (let i = 0; i <= num_rows; i++) {
        ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
        ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * num_cols + 1);
    }

    // Horizontal lines.
    for (let j = 0; j <= num_cols; j++) {
        ctx.moveTo(0,                           j * (CELL_SIZE + 1) + 1);
        ctx.lineTo((CELL_SIZE + 1) * num_rows + 1, j * (CELL_SIZE + 1) + 1);
    }

    ctx.stroke();
};


/**
 * draws all grid cells on the canvas, taking into account the cell's current state
 * @param ctx - canvas context to render to
 * @param cells - Uint8array of cell data that was returned from Rust/Wasm vector of <Cell>
 */
function drawGridCells(ctx, cells) {

    for (let r = 0; r < num_rows; r++) {
        for (let c = 0; c < num_cols; c++) {
            if ( minesweeper.isHiddenCell(r, c) ) {
                drawHiddenCell(ctx, r, c);
            } else if (minesweeper.isFlaggedCell(r, c)) {
                drawHiddenCell(ctx, r, c);  // clear the cell before drawing the flag
                drawText(ctx, r, c, TRIANGLE_FLAG);
            } else if (minesweeper.isQuestionedCell(r, c)) {
                drawHiddenCell(ctx, r, c);  // clear the cell before drawing the question mark
                ctx.fillStyle = 'black';
                drawText(ctx, r, c, QUESTION);
            } else {
                drawRevealedCell(ctx, r, c, CELL_BG_COLOR);
            }
        }
    }
}


/**
 * draws a hidden cell with a 3D "shading" effect on the canvas, at row,col index
 * @param ctx - the canvas context to draw to
 * @param row - row index of the cell
 * @param col - column index of the cell
 */
function drawHiddenCell(ctx, row, col) {
    // compute the x/y coordinate offset for drawing at the correct position in the grid
    const x = col * CELL_SIZE + col + 2;
    const y = row * CELL_SIZE + row + 2;

    const cell = new Path2D();
    cell.rect(x, y, CELL_SIZE, CELL_SIZE);
    ctx.fillStyle = CELL_BG_COLOR;
    ctx.fill(cell);
    // draw the top border of the cell
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + BORDER_WIDTH, y + BORDER_WIDTH);
    ctx.lineTo( x + CELL_SIZE - BORDER_WIDTH, y + BORDER_WIDTH);
    ctx.lineTo( x + CELL_SIZE, y);
    ctx.fillStyle = CELL_TL_COLOR;
    ctx.fill();
    // draw the left border of the cell
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + BORDER_WIDTH, y + BORDER_WIDTH);
    ctx.lineTo( x + BORDER_WIDTH, y + CELL_SIZE - BORDER_WIDTH);
    ctx.lineTo( x, y + CELL_SIZE);
    ctx.fillStyle = CELL_TL_COLOR;
    ctx.fill();
    // draw the right border of the cell
    ctx.beginPath();
    ctx.moveTo(x + CELL_SIZE, y);
    ctx.lineTo( x + CELL_SIZE - BORDER_WIDTH, y + BORDER_WIDTH);
    ctx.lineTo(x + CELL_SIZE - BORDER_WIDTH, y + CELL_SIZE - BORDER_WIDTH);
    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
    ctx.fillStyle = CELL_BR_COLOR;
    ctx.fill();
    // draw the bottom border of the cell
    ctx.beginPath();
    ctx.moveTo(x + CELL_SIZE, y + CELL_SIZE);
    ctx.lineTo( x + CELL_SIZE - BORDER_WIDTH, y + CELL_SIZE - BORDER_WIDTH);
    ctx.lineTo(x + BORDER_WIDTH, y + CELL_SIZE - BORDER_WIDTH);
    ctx.lineTo(x, y + CELL_SIZE);
    ctx.fillStyle = CELL_BR_COLOR;
    ctx.fill();
}


/**
 * draw a textual character in a grid cell
 * @param ctx - canvas context to draw to
 * @param row - row index of the cell
 * @param col - col index of the cell
 * @param char - character to draw in the cell
 */
function drawText(ctx, row, col, char) {
    // compute the x/y coordinate offset for drawing at the correct cell in the grid
    const x = col * CELL_SIZE + col;
    const y = row * CELL_SIZE + row;

    ctx.font = CELL_FONT_STYLE;
    // these next two offsets are used to center the text within a cell
    const xOffset = Math.floor(CELL_SIZE * 0.40);
    const yOffset = Math.floor(CELL_SIZE * 0.80);
    ctx.fillText(char, x + xOffset, y + yOffset);
}


/**
 * draw a "revealed" cell on the canvas. A revealed cell, is a cell that has been clicked on by the player
 * @param ctx - canvas context to draw to
 * @param row - row index of the revealed cell
 * @param col - col index of the revealed cell
 * @param bgColor - background color to use for drawing the cell
 */
function drawRevealedCell(ctx, row, col, bgColor = CELL_BG_COLOR) {
    const x = col * CELL_SIZE + col + 2;    // x origin
    const y = row * CELL_SIZE + row + 2;    // y origin

    const cell = new Path2D();
    cell.rect(x, y, CELL_SIZE, CELL_SIZE);
    ctx.fillStyle = bgColor;
    ctx.fill(cell);

    // if a cell contains a mine, then draw the mine character in the cell, else draw the adjacent mine count
    if ( minesweeper.isMinedCell(row, col) ) {
        drawText(ctx, row, col, MINE);
    } else {
        const adjMineCount = minesweeper.cellAdjMineCount(row, col);
        ctx.fillStyle = getTextColor(adjMineCount);
        drawText(ctx, row, col, adjMineCount);
    }
}


/**
 * compute the color that will be used to display a cell's adjacent mine count
 * @param adjMineCount - adjacent mine count of a cell, must be between 0 and 8
 * @returns a color string
 */
function getTextColor(adjMineCount) {
    const colors = [
        '',
        '#0000FA',
        '#4B802D',
        '#DB1300',
        '#202081',
        '#690400',
        '#457A7A',
        '#1B1B1B',
        '#7A7A7A',
    ];
    return colors[adjMineCount];
}

/**
 * initialize the row,col sliders UI elements
 */
function initializeSliders() {
    rowSlider.value = num_rows;
    colSlider.value = num_cols;
    rowOutput.innerText = num_rows;
    colOutput.innerText = num_cols;
    document.getElementById("settings-sliders").style.display = "none";
}

initializeSliders();
newGame();
