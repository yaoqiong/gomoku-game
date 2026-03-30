const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const currentPlayerEl = document.getElementById('current-player');
const messageEl = document.getElementById('message');
const resetBtn = document.getElementById('reset-btn');

const GRID_SIZE = 15;
const CELL_SIZE = canvas.width / GRID_SIZE;
let board = [];
let currentPlayer = 'black';
let gameOver = false;

function init() {
    board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    currentPlayer = 'black';
    gameOver = false;
    messageEl.textContent = '';
    currentPlayerEl.textContent = '当前玩家: 黑方';
    drawBoard();
}

function drawBoard() {
    ctx.fillStyle = '#daa520';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    for (let i = 0; i < GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(CELL_SIZE / 2, CELL_SIZE / 2 + i * CELL_SIZE);
        ctx.lineTo(canvas.width - CELL_SIZE / 2, CELL_SIZE / 2 + i * CELL_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(CELL_SIZE / 2 + i * CELL_SIZE, CELL_SIZE / 2);
        ctx.lineTo(CELL_SIZE / 2 + i * CELL_SIZE, canvas.height - CELL_SIZE / 2);
        ctx.stroke();
    }

    drawPieces();
}

function drawPieces() {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (board[i][j]) {
                drawPiece(i, j, board[i][j]);
            }
        }
    }
}

function drawPiece(row, col, color) {
    const x = CELL_SIZE / 2 + col * CELL_SIZE;
    const y = CELL_SIZE / 2 + row * CELL_SIZE;
    const radius = CELL_SIZE / 2 - 5;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
}

canvas.addEventListener('click', (e) => {
    if (gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.round((x - CELL_SIZE / 2) / CELL_SIZE);
    const row = Math.round((y - CELL_SIZE / 2) / CELL_SIZE);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE && !board[row][col]) {
        board[row][col] = currentPlayer;
        drawPiece(row, col, currentPlayer);

        if (checkWin(row, col)) {
            gameOver = true;
            messageEl.textContent = `${currentPlayer === 'black' ? '黑方' : '白方'}获胜！`;
            return;
        }

        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        currentPlayerEl.textContent = `当前玩家: ${currentPlayer === 'black' ? '黑方' : '白方'}`;
    }
});

function checkWin(row, col) {
    const directions = [[1,0], [0,1], [1,1], [1,-1]];

    for (let [dx, dy] of directions) {
        let count = 1;
        count += countDirection(row, col, dx, dy);
        count += countDirection(row, col, -dx, -dy);
        if (count >= 5) return true;
    }
    return false;
}

function countDirection(row, col, dx, dy) {
    let count = 0;
    let r = row + dx;
    let c = col + dy;

    while (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && board[r][c] === currentPlayer) {
        count++;
        r += dx;
        c += dy;
    }
    return count;
}

resetBtn.addEventListener('click', init);

init();