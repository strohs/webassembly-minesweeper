mod utils;
pub mod mine_sweeper_cell;

use wasm_bindgen::prelude::*;
use mine_sweeper_cell::{Cell, CellState, CellKind};
use js_sys::Math::{random, floor};
use std::collections::HashSet;
use std::fmt;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

extern crate web_sys;
use web_sys::console;
// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}



/// MineSweeper Game state
/// This struct contains a 2D grid of minesweeper cells stored as a row-major 1D vector
#[wasm_bindgen]
pub struct Minesweeper {
    grid: Vec<Cell>,
    num_rows: usize,
    num_cols: usize,
}


/// These are the functions used for a game of minesweeper.
#[wasm_bindgen]
impl Minesweeper {

    /// builds a Vector of empty `GridCell`s
    fn empty_grid(rows: usize, cols: usize) -> Vec<Cell> {
        let mut grid = Vec::with_capacity(rows * cols);
        for _i in 0..(rows * cols) {
            grid.push( Cell::new(CellKind::Empty) );
        }
        grid
    }

    /// shuffle the elements in a vector using Knuth's shuffle
    fn shuffle(v: &mut Vec<usize>) {
        for i in (1..v.len()).rev() {
            let ridx = floor( random() * i as f64) as usize;
            v.swap(i, ridx);
        }
    }

    /// Generates `count` amount of random grid indices ranging from 0..`len` and returns them
    /// in a Vector<usize>
    /// `len` is the max index value (exclusive) to use for generating indices
    fn gen_rand_grid_indices(len: usize, count: usize) -> Vec<usize> {
        // build a vec of all grid indices in row major form and shuffle them
        let mut grid_indices: Vec<usize> = (0..len).map(|i| i).collect();
        Minesweeper::shuffle( &mut grid_indices );
        grid_indices.into_iter().take(count).collect()
    }

    /// returns the **indices** of all grid cells "adjacent" to the cell located at `index`, but
    /// does not include the cell at `index`
    fn adjacent_indices(num_rows: usize, num_cols: usize, index: usize) -> Vec<usize> {
        let mut adj_ndxs = vec![];
        let r = index / num_cols;
        let c = index % num_cols;
        let rstart = if r <= 1 { 0 } else { r - 1 };
        let cstart = if c <= 1 { 0 } else { c - 1 };
        let rend = if (r + 1) >= num_rows {
            num_rows - 1
        } else {
            r + 1
        };
        let cend = if (c + 1) >= num_cols {
            num_cols - 1
        } else {
            c + 1
        };

        for nr in rstart..=rend {
            for nc in cstart..=cend {
                // push all the cells located around index: r,c  into the return vector
                if !(nr == r && nc == c) {
                    adj_ndxs.push(nr * num_cols + nc);
                }
            }
        }
        adj_ndxs
    }

    /// returns grid indices that are connected to the cell at `index` AND that
    /// are "lone cells". Lone cells are cells that are not adjacent to any mines
    /// This function is essentially an implementation of flood fill algorithm using depth first search
    fn connected_lone_cell_indices(&self, index: usize) -> Vec<usize> {
        let mut visited = vec![];         // cells already visited
        let mut to_visit = vec![ index ]; // cells left to visit
        let mut connected_ndxs = vec![];  // holds the connected cell indices

        while !to_visit.is_empty() {
            // current index being visited
            let cur_ndx = to_visit.pop().unwrap();

            if visited.contains(&cur_ndx) {
                continue;
            } else {
                // add lone cell's index to the list of connected cell indices
                if self.grid[cur_ndx].is_lone_cell() {
                    connected_ndxs.push(cur_ndx);
                }

                // mark the current cell as visited
                visited.push(cur_ndx);

                // build a list of "lone" cells adjacent to the current cell
                let mut adj_ndxs = Minesweeper::adjacent_indices(self.num_rows, self.num_cols, cur_ndx)
                    .into_iter()
                    .filter(|ndx| self.grid[*ndx].is_lone_cell())
                    .collect::<Vec<usize>>();
                to_visit.append(&mut adj_ndxs);
            }
        }
        connected_ndxs
    }

    /// translates a two-dimensional row, column index into a one-dimensional index
    pub fn to_1d(&self, row: usize, column: usize) -> usize {
        row * self.num_cols + column
    }

    /// returns a raw pointer to this Grid's Vector<Cell>
    pub fn cells(&self) -> *const Cell {
        self.grid.as_ptr()
    }

    /// returns the Cell's of the Grid as a string
    pub fn render(&self) -> String {
        self.to_string()
    }

    /// returns the size of a Cell struct
    pub fn cell_size() -> usize {
        std::mem::size_of::<Cell>()
    }

    /// convenience function for logging the state of the grid to the Javascript console
    pub fn debug(&self) -> String {
        log!("size of cell {} bytes", std::mem::size_of::<Cell>() );
        log!("rows:{} cols:{}", self.num_rows, self.num_cols);
        // for r in 0..self.num_rows {
        //     for c in 0..self.num_cols {
        //         let cell = &self.grid[self.to_1d(r, c)];
        //         log!("{}::{}  s:{} k:{} a:{}  ",r,c, cell.get_state(), cell.get_kind(), cell.adj_mine_count());
        //     }
        // }
        format!("{:?}", self)
    }


    /// ////////////////////////////////////////////////////////////////////////////////////////
    /// MineSweeperGame Trait Impl

    /// initialize a new MineSweeper grid with the specified rows and columns
    /// This function will generate random mine locations and compute the adjacent mine counts
    /// for every cell in the grid
    pub fn init(num_rows: usize, num_cols: usize) -> Minesweeper {
        let mut grid = Minesweeper::empty_grid(num_rows, num_cols);

        // generate random mine locations
        let total_mines = ((num_rows * num_cols) as f32 * 0.15f32).round() as usize;
        let mine_ndxs = Minesweeper::gen_rand_grid_indices(num_rows * num_cols, total_mines);
        for index in mine_ndxs.iter() {
            grid[*index] = Cell::new(CellKind::Mine);
        }

        // compute the adjacent mine counts for every cell that contains a mine
        for index in mine_ndxs.iter() {
            for adj_ndx in Minesweeper::adjacent_indices(num_rows, num_cols, *index) {
                let cur_count = grid[adj_ndx].adj_mine_count() + 1;
                grid[adj_ndx].set_adj_mine_count(cur_count);
            }
        }

        Minesweeper {
            grid,
            num_rows,
            num_cols,
        }
    }

    /// returns the locations on the grid where mines are located
    /// # Returns
    /// a Vector of usize where each element is the index of a mine on the grid
    fn mine_indices(&self) -> Vec<usize> {
        self.grid.iter().enumerate()
            .filter(|(_ndx, cell)| cell.is_mined() )
            .map(|(ndx, _cell)| ndx)
            .collect::<Vec<usize>>()
    }

    /// compute the total number of mines that that a grid should contain based on the number
    /// of rows and columns
    /// Total mines on a grid is 15% * the number of cells i.e.:
    ///     `TOTAL_MINES = grid.num_rows * grid.mum_columns * 0.15`
    pub fn total_mines(&self) -> usize {
        ((self.num_rows * self.num_cols) as f32 * 0.15f32).round() as usize
    }

    /// computes the remaining number of flags that can be placed by the player
    /// # Returns
    /// a count of the number of remaining flags
    pub fn remaining_flags(&self) -> usize {
        let flagged = self.grid
            .iter().filter(|cell| cell.is_flagged()).count();
        self.total_mines() - flagged
    }

    /// reveals a cell at the specified index
    /// This function marks the cell's internal state as `CellState::Revealed` and then triggers
    /// the revealing of any "lone" cells that are "connected", or adjacent to, this cell
    pub fn reveal_cell(&mut self, index: usize) {
        if !self.grid[index].is_revealed() {
            self.grid[index].set_state(CellState::Revealed);
            // if the revealed cell is a lone cell, then reveal connected lone cells
            if self.grid[index].is_lone_cell() {
                self.reveal_lone_cells(index);
            }

        }
    }

    /// reveals all "lone" cells that are connected to the cell at `index`
    /// A lone cell is a cell that is empty and not connected to any adjacent mines
    fn reveal_lone_cells(&mut self, index: usize) {
        let connected_ndxs = self.connected_lone_cell_indices(index);

        // also reveal all the cells that are adjacent to the lone cells
        let adj_perimeter_cells: HashSet<usize> = connected_ndxs
            .iter()
            .flat_map(|ndx| Minesweeper::adjacent_indices(self.num_rows, self.num_cols, *ndx))
            .collect();

        for ndx in connected_ndxs {
            self.reveal_cell(ndx);
        }
        for ndx in adj_perimeter_cells {
            self.reveal_cell(ndx);
        }
    }

    /// sets the cell's state to flagged if it is currently Hidden, else sets the cell's state
    /// to hidden if it is currently flagged
    pub fn toggle_flag(&mut self, index: usize) {
        if !self.grid[index].is_revealed() {
            if self.grid[index].is_flagged() {
                self.grid[index].set_state(CellState::Hidden);
            } else {
                self.grid[index].set_state(CellState::Flagged);
            }
        }
    }

    /// sets the cell's state to questioned if it is currently Hidden, else sets the cell's state
    /// to hidden if it is currently questioned
    pub fn toggle_question(&mut self, index: usize) {
        if !self.grid[index].is_revealed() {
            if self.grid[index].is_questioned() {
                self.grid[index].set_state(CellState::Hidden);
            } else {
                self.grid[index].set_state(CellState::Questioned);
            }
        }
    }

    /// sets a cell's state to `CellState::Flagged` if the cell is not already revealed
    pub fn flag_cell(&mut self, index: usize) {
        if !self.grid[index].is_revealed() {
            self.grid[index].set_state(CellState::Flagged);
        }
    }

    /// sets a cell's state to `CellState::Questioned` if the cell is not already revealed
    pub fn question_cell(&mut self, index: usize) {
        if !self.grid[index].is_revealed() {
            self.grid[index].set_state(CellState::Questioned);
        }
    }

    /// sets a cell's state back to Hiddem if the cell is not already revealed
    pub fn unmark_cell(&mut self, index: usize) {
        if !self.grid[index].is_revealed() {
            self.grid[index].set_state(CellState::Hidden);
        }
    }

    /// returns true if a cell is flagged AND contains a mine, else false
    pub fn flagged_mine_cell(&self, index: usize) -> bool {
        self.grid[index].is_flagged() && self.grid[index].is_mined()
    }

    /// does the cell at `index` contain a mine AND is it currently un-flagged
    /// # Return
    /// `true` if a cell is NOT flagged AND the cell contains a mine, else `false`
    pub fn unflagged_mine_cell(&self, index: usize) -> bool {
        !self.grid[index].is_flagged() && self.grid[index].is_mined()
    }

    /// determines if a game of minesweeper has been won.
    /// A game is won if all mined cells have been correctly flagged
    /// # Returns
    /// `true` if the game is won, `false` if the game is not yet won
    pub fn is_game_won(&self) -> bool {
        self.mine_indices()
            .iter()
            .all(|&i| self.grid[i].is_flagged() )
    }

    /// determines if a game of minesweeper is lost.
    /// A game is lost if a mined cell was revealed OR once the last flagged was placed but at
    /// least one of the mined cells was left un-flagged
    /// # Returns
    /// `true` if the game is lost, else `false`
    pub fn is_game_lost(&self) -> bool {
        let mine_revealed = self.mine_indices()
            .iter()
            .any(|&i| self.grid[i].is_revealed() );
        // are there any empty cells flagged
        let mis_flagged = self.grid.iter().any(|cell| cell.is_flagged() && !cell.is_mined());
        mine_revealed || (self.remaining_flags() == 0 && mis_flagged)
    }

}


impl fmt::Display for Minesweeper {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let mut buf = String::new();
        for ri in 0..self.num_rows {
            for ci in 0..self.num_cols {
                let index = self.to_1d(ri, ci);
                //let cell = &self.grid[index];
                let cell_str = format!(" {}", self.grid[index]);

                buf.push_str(cell_str.as_str());
            }
            buf.push_str("\n")
        }
        write!(f, "{}", buf)
    }
}

impl fmt::Debug for Minesweeper {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let mut buf = String::new();
        for ri in 0..self.num_rows {
            for ci in 0..self.num_cols {
                let index = self.to_1d(ri, ci);
                buf.push_str(format!(" {:?}", self.grid[index]).as_str());
            }
            buf.push_str("\n")
        }
        write!(f, "{}", buf)
    }
}