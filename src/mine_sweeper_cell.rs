use wasm_bindgen::prelude::*;
use std::fmt;
use std::fmt::Formatter;

// default characters for Debugging game cells to standard output
pub const MINE: char = '\u{25CF}';      // UTF-8 black circle \u{25CF}
// UTF-8 Bomb \u{1F4A3}
pub const REVEALED: char = '0';
pub const HIDDEN: char = '\u{25A1}';    // UTF-8 white square
pub const QUESTION: char = '\u{003F}';  // question mark
pub const FLAG: char = '⚑';             // UTF-8 black flag \u{2691}


/// holds information on the current state of a MineSweeper cell
/// `Revealed` - a user has revealed the cell
/// `Marked` - a user has "marked" a cell with either a Flag or Question Mark
/// `Hidden` - the cell has not yet been revealed by the user
#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CellState {
    Revealed    = 0,
    Flagged     = 1,
    Questioned  = 2,
    Hidden      = 3,
}

/// the "kind" of cell, either the Cell contains a mine, or it is empty (not mined)
#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CellKind {
    Mine    = 0,
    Empty   = 1,
}

/// MineSweeper cell
/// holds the state of a minesweeper cell (square)
#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Cell {
    state: CellState,
    kind: CellKind,
    adj_mine_count: u8,
}

#[wasm_bindgen]
impl Cell {

    /// create a new empty cell, with CellState::Hidden and adjacent mine count of 0
    pub fn new(kind: CellKind) -> Cell {
        Cell {
            state: CellState::Hidden,
            kind,
            adj_mine_count: 0,
        }
    }

    /// return the Cell's marker (either a Flag or Question Mark)
//    fn marker(&self) -> Option<CellState> {
//        match self.state {
//            CellState::Flagged => Some(CellState::Flagged),
//            CellState::Questioned => Some(CellState::Questioned),
//            _ => None,
//        }
//    }

    /// is this cell currently flagged?
    pub fn is_flagged(&self) -> bool {
        self.state == CellState::Flagged
    }

    /// is this cell currently questioned?
    pub fn is_questioned(&self) -> bool {
        self.state == CellState::Questioned
    }

    pub fn is_revealed(&self) -> bool {
        self.state == CellState::Revealed
    }

    /// is the cell mined?
    pub fn is_mined(&self) -> bool {
        self.kind == CellKind::Mine
    }

    /// set the cell's `CellKind`
    pub fn set_kind(&mut self, kind: CellKind) {
        self.kind = kind;
    }

    /// get the cell's `CellKind`
//    fn get_kind(&self) -> &CellKind {
//        &self.kind
//    }

    /// set the cell's `CellState`
    pub fn set_state(&mut self, state: CellState) {
        self.state = state;
    }

    /// get the cell's `CellState`
//    fn get_state(&self) -> &CellState {
//        &self.state
//    }

    /// return the cell's adjacent mine count
    pub fn adj_mine_count(&self) -> u8 {
        self.adj_mine_count
    }

    /// set the cell's adjacent mine count
    pub fn set_adj_mine_count(&mut self, count: u8) {
        self.adj_mine_count = count
    }

    /// return `true` if the cell is Empty and does not have any adjacent mines, else `false`
    pub fn is_lone_cell(&self) -> bool {
        self.kind == CellKind::Empty && self.adj_mine_count == 0
    }
}


/// prints the cell's state. If a cell is "Revealed", this function will either print a "mine"
/// character, else the cell's adjacent mine count
impl fmt::Display for Cell {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let cell_char = match self.state {
            CellState::Revealed => match self.kind {
                CellKind::Mine => MINE,
                CellKind::Empty if self.adj_mine_count > 0 => (self.adj_mine_count + 48) as char,
                _ => REVEALED,
            },
            CellState::Flagged => FLAG,
            CellState::Questioned => QUESTION,
            CellState::Hidden => HIDDEN,
        };
        write!(f, "{}", cell_char)
    }
}

/// prints the `CellKind` value of all cells in the grid. Useful for seeing which cells
/// are mined, plus the adjacent mine count of cells
impl fmt::Debug for Cell {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let cell_char = match self.kind {
            CellKind::Mine => MINE,
            CellKind::Empty => (self.adj_mine_count + 48) as char, // convert to ASCII digit by adding + 48
        };
        write!(f, "{}", cell_char)
    }
}