window.addEventListener("gamepadconnected", (event) => {
  console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
    event.gamepad.index, event.gamepad.id,
    event.gamepad.buttons.length, event.gamepad.axes.length);
});

// Function to log the state of all gamepad buttons
const logGamepadButtons = () => {
  // Get the connected gamepad, if any
  const gamepad = navigator.getGamepads()[0]; // Assumes the first gamepad is the one being used

  if (gamepad) {
    gamepad.buttons.forEach((button, index) => {
      if (button.pressed) {
        console.log(`Button ${index} is pressed`);
      }
    });
  }
};

// Call logGamepadButtons in your main game loop
const gameLoop = () => {
  logGamepadButtons();
  // ... rest of your game loop code
  requestAnimationFrame(gameLoop); // Continue the loop
};

// Start the game loop
requestAnimationFrame(gameLoop);