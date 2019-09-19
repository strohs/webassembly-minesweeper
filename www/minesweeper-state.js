import {Minesweeper, CellKind, CellState} from "wasm-minesweeper";
import {memory} from "wasm-minesweeper/wasm_minesweeper_bg";

/**
 * A wrapper class that contains the current state of the MineSweeper game.
 * This class wraps calls to the Rust side of minesweeper, and is used to interact and make moves on the
 * minesweeper grid.
 * It also contains a "cells array" of Uint8 cells, where the state of each cell is held in a group of 3 bytes:
 *      the first bytes is the CellState (Hidden, Revealed, Flagged, Questioned)
 *      the second byte is the CellKind (Mined or Empty)
 *      the third byte is the adjacent mine count (i.e. the total number of mines around the cell)
 */
class MinesweeperState {

    constructor(rows, cols) {
        this.num_rows = rows;
        this.num_cols = cols;
        // "minesweeper" is the handle to the Rust minesweeper struct
        this.minesweeper = Minesweeper.init(rows, cols);
        // the size of the minesweeper Cell struct in bytes
        this.cellSizeBytes = Minesweeper.cell_size();
        this.cellsArray = new Uint8Array(memory.buffer, this.minesweeper.cells(), this.num_rows * this.num_cols * this.cellSizeBytes );
        // log the locations of mines
        console.log(this.minesweeper.debug());
    }

    /**
     * converts a 2D row,column index into a 1D index.
     * @param row - row index of cell
     * @param col - column index of cell
     * @returns integer - index that can be used to index into the minesweeper cell grid
     */
    to_1d(row, col) {
        return row * this.num_cols + col;
    };

    /**
     * returns the size of the Rust Cell struct is bytes.
     * @returns {number} - the size of a Minesweeper Cell in bytes
     */
    get cellBytes() {
        return this.cellSizeBytes;
    }

    /**
     * gets the Cells array that contains the state of every Cell in the minesweeper grid.
     * Each Cell is this.cellSizeBytes in length (currently 3 bytes). The first byte represents the CellState,
     * the second byte represents the CellKind and the third byte represents the Adjacent Mine Count
     * @returns {Uint8Array} of Cell. The total size of the array will be num_rows * num_cols * this.cellSizeBytes
     */
    get cells() {
        return this.cellsArray;
    }

    /**
     * toggles the Cell's status from Hidden to Question OR from Questioned to Hidden
     * @param row - row index of the cell to toggle
     * @param col - col index of the cell to toggle
     */
    toggleQuestion(row, col) {
        this.minesweeper.toggle_question( this.to_1d(row, col) );
        this.cellsArray = new Uint8Array(memory.buffer, this.minesweeper.cells(), this.num_rows * this.num_cols * this.cellSizeBytes )
    }

    /**
     * toggles the Cell's status from Flagged to Hidden OR from Hidden to Flagged
     * @param row - row index of the cell to toggle
     * @param col - col index of the cell to toggle
     */
    toggleFlag(row, col) {
        this.minesweeper.toggle_flag( this.to_1d(row, col) );
        this.cellsArray = new Uint8Array(memory.buffer, this.minesweeper.cells(), this.num_rows * this.num_cols * this.cellSizeBytes )
    }

    /**
     * reveals the cell, changing its state to Revealed
     * @param row - row index of the cell to reveal
     * @param col - col index of the cell to reveal
     */
    revealCell(row, col) {
        this.minesweeper.reveal_cell( this.to_1d(row, col) );
        this.cellsArray = new Uint8Array(memory.buffer, this.minesweeper.cells(), this.num_rows * this.num_cols * this.cellSizeBytes )
    }

    /**
     * is the cell currently Flagged and does it contain a mine
     * @param row - row index of cell to test
     * @param col - col index of cell to test
     * @returns {boolean} true if the cell is Flagged and mined
     */
    isFlaggedAndMinedCell(row, col) {
        return this.minesweeper.flagged_mine_cell( this.to_1d(row, col) );
    }

    /**
     * is the cell UN-flagged (i.e. either questioned or hidden) and also mined
     * @param row - row index of cell to check
     * @param col - col index of cell to check
     * @returns {boolean} true if cell is unflagged and also mine, else false
     */
    isUnflaggedAndMinedCell(row, col) {
        return this.minesweeper.unflagged_mine_cell( this.to_1d(row, col) );
    }

    /**
     * is the cell Hidden (i.e. not revealed)
     * @param row - row index of cell
     * @param col - col index of cell
     * @returns {boolean} true if the cell is Hidden, else false
     */
    isHiddenCell(row, col) {
        return this.cellState(row, col) === CellState.Hidden;
    }

    /**
     * is the cell currently Flagged
     * @param row - row index if cell to check
     * @param col - col index of cell to check
     * @returns {boolean} true if cell is currently flagged, else false
     */
    isFlaggedCell(row, col) {
        return this.cellState(row, col) === CellState.Flagged;
    }

    /**
     * is the cell currently questioned
     * @param row - row index of cell to check
     * @param col - row index of cell to check
     * @returns {boolean} true if cell is currently questioned, else false
     */
    isQuestionedCell(row, col) {
        return this.cellState(row, col) === CellState.Questioned;
    }

    /**
     * does the cell contain a mine
     * @param row - row index of cell to check
     * @param col - col index of cell to check
     * @returns {boolean} true if cell contains a mine, else false
     */
    isMinedCell(row, col) {
        return this.cellKind(row, col) === CellKind.Mine;
    }

    /**
     * checks the current game state to see if it is won.
     * A game is won if all mined cells have been correctly flagged
     * @returns {boolean} true if the game is won, false if game is not won
     */
    isGameWon() {
        return this.minesweeper.is_game_won();
    }

    /**
     * check the current game state to see if a game is lost.
     * A game is lost if a mined cell is revealed, or if a Empty cell is flagged after all flags have been placed
     * @returns {boolean} true if the game is lost, false if the game is not (yet) lost
     */
    isGameLost() {
        return this.minesweeper.is_game_lost();
    }

    /**
     * how many flags can are left for the player to place on the gird
     * @returns {number} the number of flags that the player can still place on the grid
     */
    remainingFlags() {
        return this.minesweeper.remaining_flags();
    }

    /**
     * the total number of mines on the grid
     * @returns {number} the total number of mines on the grid.
     */
    totalMines() {
        return this.minesweeper.total_mines();
    }


    /**
     * gets the CellState information from the cells array. CellState is the first byte within each "group" of cell
     * @param row - row index to lookup within the 'cells' array
     * @param col - col index to lookup within the 'cells' array
     * @returns the CellState represented as a Uint8
     */
    cellState(row, col) {
        const cells = this.cells;
        return cells[ this.to_1d(row, col) * this.cellBytes ];
    }

    /**
     * gets the CellKind information from the 'cells' array. CellKind is the second byte of data in each cell "group"
     * @param row - row index to lookup within the 'cells' array
     * @param col - col index to lookup within the 'cells' array
     * @returns the CellKind represented as a Uint8
     */
    cellKind(row, col) {
        const cells = this.cells;
        return cells[ this.to_1d(row, col) * this.cellBytes + 1];
    }

    /**
     * gets the adjacent mine count from the 'cells' array. AdjMineCount is the third byte of data in each cell "group"
     * @param row - row index to lookup within the 'cells' array
     * @param col - col index to lookup within the 'cells' array
     * @returns the adjMineCount as a Uint8
     */
    cellAdjMineCount(row, col) {
        const cells = this.cells;
        return cells[ this.to_1d(row, col) * this.cellBytes + 2];
    }
}

export {MinesweeperState};