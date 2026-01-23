/**
 * Lucky Person Picker
 * Handles wheel logic, local storage, and UI interactions.
 */

// --- Configuration ---
const STORAGE_KEY = 'lucky_person_entries';
const COLORS = [
    '#263B68', // Experian UK Navy
    '#672078', // Deep Purple
    '#E52079', // Vibrant Pink
    '#1D4F91', // Medium Blue
    '#9C27B0', // Purple Accent
    '#F6BF33', // Experian Gold (Accent)
    '#40B4E5', // Light Blue
    '#D81B60'  // Berry Pink
];

// --- State ---
let entries = [];
let isSpinning = false;
let currentRotation = 0; // Degrees
let spinVelocity = 0;
let animationId = null;

// --- DOM Elements ---
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const namesInput = document.getElementById('namesInput');
const spinBtn = document.getElementById('spinBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const sortBtn = document.getElementById('sortBtn');
const entryCountLabel = document.getElementById('entryCount');
const currentWinnerDisplay = document.getElementById('currentWinner'); // Optional real-time display

const resultModal = document.getElementById('resultModal');
const winnerNameEl = document.getElementById('winnerName');
const closeModalBtn = document.getElementById('closeModal');
const spinAgainBtn = document.getElementById('spinAgainBtn');
const removeWinnerBtn = document.getElementById('removeWinnerBtn');

// --- Initialization ---
function init() {
    loadEntries();
    resizeCanvas();
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawWheel();
    });

    // Event Listeners
    namesInput.addEventListener('input', handleInput);
    spinBtn.addEventListener('click', startSpin);
    shuffleBtn.addEventListener('click', shuffleEntries);
    sortBtn.addEventListener('click', sortEntries);

    closeModalBtn.addEventListener('click', hideModal);
    spinAgainBtn.addEventListener('click', hideModal);
    removeWinnerBtn.addEventListener('click', removeWinnerAndClose);

    drawWheel();
}

// --- Data Management ---
function loadEntries() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        entries = JSON.parse(stored);
        namesInput.value = entries.join('\n');
    } else {
        // Default entries for first-time users
        entries = ['Spiderman', 'Rambo', 'Superman', 'Wonder Woman', 'Antman', 'Hulk', 'Black Panther', 'Black Widow'];
        namesInput.value = entries.join('\n');
        saveEntries();
    }
    updateUI();
}

function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    updateUI();
}

function handleInput() {
    const text = namesInput.value;
    // Split by new lines, filter empty strings
    entries = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); // Sync without full UI reload to keep cursor
    updateUI(false); // Don't reload text area from state to avoid cursor jumping
    drawWheel();
}

function updateUI(updateInput = true) {
    entryCountLabel.textContent = `${entries.length} entries`;
    if (entries.length < 2) {
        spinBtn.disabled = true;
        spinBtn.title = "Add at least 2 names to spin";
    } else {
        spinBtn.disabled = false;
        spinBtn.title = "";
    }

    if (updateInput) {
        namesInput.value = entries.join('\n');
    }
}

function shuffleEntries() {
    for (let i = entries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    saveEntries();
    drawWheel();
}

function sortEntries() {
    entries.sort((a, b) => a.localeCompare(b));
    saveEntries();
    drawWheel();
}

// --- Wheel Rendering ---
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function drawWheel() {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10; // Padding

    ctx.clearRect(0, 0, width, height);

    if (entries.length === 0) {
        return;
    }

    const sliceAngle = (2 * Math.PI) / entries.length;

    // Draw Segments
    for (let i = 0; i < entries.length; i++) {
        const startAngle = currentRotation + (i * sliceAngle);
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.stroke();

        // Check if this segment is active (under the pointer at 0/360 degrees, which is 3 o'clock in Canvas 0)
        // Adjust for pointer position: Pointer is at 0 degrees (Right side)
        // Actually, let's normalize the logic. Canvas 0 is 3 o'clock.
        // Our pointer is at 3 o'clock (Right). 
        // So we just need to render text.

        // Draw Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        // Adaptive font size
        if (entries.length > 20) ctx.font = "bold 12px sans-serif";
        if (entries.length > 40) ctx.font = "bold 10px sans-serif";

        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText(entries[i], radius - 20, 5);
        ctx.restore();
    }
}

// --- Animation & Physics ---
function startSpin() {
    if (isSpinning || entries.length < 2) return;

    isSpinning = true;
    spinBtn.disabled = true;
    namesInput.disabled = true;

    // Physics variables
    // Initial velocity: Random between 20 and 40
    spinVelocity = Math.random() * 20 + 20;

    // Decay: Random between 0.98 and 0.99 for variable spin times
    // Ensure it eventually stops
    const decay = 0.985 + Math.random() * 0.005;

    function animate() {
        spinVelocity *= decay; // Decelerate

        if (spinVelocity < 0.05) {
            // Stop
            spinVelocity = 0;
            isSpinning = false;
            spinBtn.disabled = false;
            namesInput.disabled = false;
            cancelAnimationFrame(animationId);
            determineWinner();
            return;
        }

        currentRotation += (spinVelocity * Math.PI / 180); // Convert degrees to radians
        // Normalize rotation to keep it manageable
        if (currentRotation >= 2 * Math.PI) {
            currentRotation -= 2 * Math.PI;
        }

        drawWheel();
        animationId = requestAnimationFrame(animate);
    }

    animate();
}

function determineWinner() {
    // The pointer is at 0 radians (3 o'clock in standard canvas arc)
    // We need to find which segment covers 0 radians *relative to the rotation*.
    // However, the wheel rotates clockwise (positive angle).
    // The segment at the pointer is actually effectively "moving back" relative to 0.

    // Let's simplify:
    // Angle of a segment Start = Rotation + (Index * Slice)
    // We want the segment where Start <= 0 (mod 2PI) <= End
    // Normalizing angles is tricky.

    // Easier approach:
    // Total Rotation % 2PI gives us the offset of the first segment from 0.
    // If we calculate the total angle required to put the pointer at index i:
    // Angle = - (i * slice + slice/2)

    // Let's reverse engineer:
    // Pointer is at 0 (or 2PI).
    // Find index i such that:
    // (Rotation + i*Slice) <= 2PI && (Rotation + (i+1)*Slice) >= 2PI
    // Normalized to [0, 2PI)

    const sliceAngle = (2 * Math.PI) / entries.length;
    // Normalize currentRotation to [0, 2PI)
    let normalizedRotation = currentRotation % (2 * Math.PI);
    if (normalizedRotation < 0) normalizedRotation += 2 * Math.PI;

    // The "Angle of Start Index 0" is normalizedRotation.
    // We want to find which index `i` crosses the 0-degree line (Pointer).
    // Since 0 degrees is the pointer:
    // The wheel rotates clockwise. The segment passing the pointer is determining by:
    // (normalizedRotation + i * sliceAngle) % 2PI

    // Actually, simpler logic:
    // Imagine the wheel is static at 0. Pointer rotates Counter-Clockwise by `normalizedRotation`.
    // The pointer effectively lands at `2PI - normalizedRotation`.

    const pointerAngle = (2 * Math.PI - normalizedRotation) % (2 * Math.PI);
    const winningIndex = Math.floor(pointerAngle / sliceAngle);

    showWinner(entries[winningIndex]);
}

// --- Modal & Results ---
function showWinner(name) {
    winnerNameEl.textContent = name;
    resultModal.classList.remove('hidden');
    fireConfetti();
}

function hideModal() {
    resultModal.classList.add('hidden');
}

function removeWinnerAndClose() {
    const winner = winnerNameEl.textContent;
    const index = entries.indexOf(winner);
    if (index > -1) {
        entries.splice(index, 1);
        saveEntries();
        drawWheel();
    }
    hideModal();
}

function fireConfetti() {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
    const container = document.getElementById('confettiDetails');
    container.innerHTML = ''; // Clear previous

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');

        // Random properties
        const bg = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100 + '%';
        const animDuration = Math.random() * 3 + 2 + 's';
        const animDelay = Math.random() * 2 + 's';

        confetti.style.backgroundColor = bg;
        confetti.style.left = left;
        confetti.style.animationDuration = animDuration;
        confetti.style.animationDelay = animDelay;

        container.appendChild(confetti);
    }
}

// Start
init();
