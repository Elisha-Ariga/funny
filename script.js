const proposal = document.getElementById("proposal");
const question = document.getElementById("question");
const yesButton = document.getElementById("yesButton");
const noButton = document.getElementById("noButton");
const celebration = document.getElementById("celebration");
const wow = document.getElementById("wow");

let celebrating = false;
let lastDodgeTime = 0;
const recentHeartPositions = [];

// Check whether two rectangles touch or overlap, with extra breathing room.
function overlaps(first, second, padding = 12) {
  return !(
    first.right + padding <= second.left ||
    first.left >= second.right + padding ||
    first.bottom + padding <= second.top ||
    first.top >= second.bottom + padding
  );
}

// Find a safe random place for No that stays on-screen and clear of other content.
function findSafePosition() {
  const buttonWidth = noButton.offsetWidth;
  const buttonHeight = noButton.offsetHeight;
  const maxLeft = Math.max(0, window.innerWidth - buttonWidth);
  const maxTop = Math.max(0, window.innerHeight - buttonHeight);
  const obstacles = [
    question.getBoundingClientRect(),
    yesButton.getBoundingClientRect()
  ];

  function isSafe(left, top) {
    const candidate = {
      left,
      top,
      right: left + buttonWidth,
      bottom: top + buttonHeight
    };

    return obstacles.every((obstacle) => !overlaps(candidate, obstacle));
  }

  // Random tries make the button's escape path feel less predictable.
  for (let attempt = 0; attempt < 250; attempt++) {
    const left = Math.random() * maxLeft;
    const top = Math.random() * maxTop;

    if (isSafe(left, top)) {
      return { left, top };
    }
  }

  // Try positions beside or above/below each obstacle before scanning the screen.
  const leftOptions = [0, maxLeft];
  const topOptions = [0, maxTop];

  for (const obstacle of obstacles) {
    leftOptions.push(
      Math.max(0, Math.min(maxLeft, obstacle.left - buttonWidth - 14)),
      Math.max(0, Math.min(maxLeft, obstacle.right + 14))
    );
    topOptions.push(
      Math.max(0, Math.min(maxTop, obstacle.top - buttonHeight - 14)),
      Math.max(0, Math.min(maxTop, obstacle.bottom + 14))
    );
  }

  for (const top of topOptions) {
    for (const left of leftOptions) {
      if (isSafe(left, top)) {
        return { left, top };
      }
    }
  }

  // The scan is a fallback for unusual viewport sizes or layouts.
  for (let top = 0; top <= maxTop; top += 8) {
    for (let left = 0; left <= maxLeft; left += 8) {
      if (isSafe(left, top)) {
        return { left, top };
      }
    }
  }

  return null;
}

// Move No to a safe fixed position. A brief cooldown prevents duplicate events
// (such as touchstart plus pointerdown) from making it jump twice at once.
function dodgeNoButton() {
  const now = Date.now();
  if (celebrating || now - lastDodgeTime < 90) return;
  lastDodgeTime = now;

  const position = findSafePosition();
  if (!position) return;

  noButton.style.position = "fixed";
  noButton.style.left = `${position.left}px`;
  noButton.style.top = `${position.top}px`;
}

// Run away when the mouse enters No or gets close to it.
noButton.addEventListener("mouseenter", dodgeNoButton);
noButton.addEventListener("mouseover", dodgeNoButton);

window.addEventListener("mousemove", (event) => {
  const rect = noButton.getBoundingClientRect();
  const closestX = Math.max(rect.left, Math.min(event.clientX, rect.right));
  const closestY = Math.max(rect.top, Math.min(event.clientY, rect.bottom));
  const distance = Math.hypot(event.clientX - closestX, event.clientY - closestY);

  if (distance < 80) {
    dodgeNoButton();
  }
});

// Stop touch and pointer presses before they can activate No.
noButton.addEventListener("touchstart", (event) => {
  event.preventDefault();
  dodgeNoButton();
}, { passive: false });

noButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  dodgeNoButton();
});

// Also move No if a finger slides close to it on a touchscreen.
document.addEventListener("touchmove", (event) => {
  if (event.touches.length === 0 || celebrating) return;

  const touch = event.touches[0];
  const rect = noButton.getBoundingClientRect();
  const closestX = Math.max(rect.left, Math.min(touch.clientX, rect.right));
  const closestY = Math.max(rect.top, Math.min(touch.clientY, rect.bottom));
  const distance = Math.hypot(touch.clientX - closestX, touch.clientY - closestY);

  if (distance < 80) {
    event.preventDefault();
    dodgeNoButton();
  }
}, { passive: false });

// Block mouse, keyboard, or synthesized clicks as a final safeguard.
noButton.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  dodgeNoButton();
});

noButton.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    dodgeNoButton();
  }
});

// Create a heart and remove it when its fall animation finishes.
function createHeart() {
  const heart = document.createElement("div");
  const heartFace = document.createElement("span");
  const heartTypes = ["❤️", "💕"];
  const heartPosition = findHeartPosition();

  heart.className = "heart";
  heartFace.textContent = heartTypes[Math.floor(Math.random() * heartTypes.length)];
  heart.style.setProperty("--left", `${heartPosition}vw`);
  heart.style.setProperty("--size", `${12 + Math.random() * 8}px`);
  heart.style.setProperty("--fall-time", `${4 + Math.random() * 5}s`);
  heart.style.setProperty("--sway", `${5 + Math.random() * 10}px`);

  heart.appendChild(heartFace);
  document.body.appendChild(heart);
  heart.addEventListener("animationend", () => heart.remove(), { once: true });
}

// Spread recent hearts out horizontally so they do not spawn in a tight cluster.
function findHeartPosition() {
  let position = Math.random() * 100;

  for (let attempt = 0; attempt < 20; attempt++) {
    position = Math.random() * 100;
    if (recentHeartPositions.every((recent) => Math.abs(position - recent) >= 16)) {
      break;
    }
  }

  recentHeartPositions.push(position);
  if (recentHeartPositions.length > 5) {
    recentHeartPositions.shift();
  }

  return position;
}

// Yes hides the proposal, reveals WOW, and starts the endless heart shower.
yesButton.addEventListener("click", () => {
  if (celebrating) return;

  celebrating = true;
  proposal.hidden = true;
  celebration.hidden = false;
  wow.classList.add("pop-in");

  createHeart();
  window.setInterval(createHeart, 700);
});

// Reposition No after a resize so it remains fully inside the visible screen.
window.addEventListener("resize", () => {
  if (celebrating || getComputedStyle(noButton).position !== "fixed") return;

  const position = findSafePosition();
  if (!position) return;

  noButton.style.left = `${position.left}px`;
  noButton.style.top = `${position.top}px`;
});