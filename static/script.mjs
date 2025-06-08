// script.mjs

// game variable defaults
const GAME_WIDTH = 100; // positioning can be treated as percentages
const CANNON_WIDTH = 10;
const CSHOT_COOLDOWN = 0.3; // change to adjust rate of fire. 1.0 = 1 second
let ALIENS_PER_COLUMN = 6;
let alienShotIntervalId = null;
const DEAD_ZONE = 0.02;
let speedD = 1; // Adjust this value to change the speed of the cannon with digital control
let speedA = 3; // Adjust this value to change the speed of the cannon with analogue control

// score table variable defaults
let isTyping = false;

// Preload image files. The GIFs are animated and loop constantly without instruction.
const cannonShotImage = new Image();
cannonShotImage.src = "../images/cannonShot.png";
const alienShotImage = new Image();
alienShotImage.src = "../images/alienShot.png";
const stefanAlienImage = new Image();
stefanAlienImage.src = "../images/stefan.webp";
const godfreyAlienImage = new Image();
godfreyAlienImage.src = "../images/godfrey.webp";
const mattAlienImage = new Image();
mattAlienImage.src = "../images/matt.webp";
const hanaAlienImage = new Image();
hanaAlienImage.src = "../images/hana.webp";
const jackyAlienImage = new Image();
jackyAlienImage.src = "../images/jacky.webp";
const salaAlienImage = new Image();
salaAlienImage.src = "../images/sala.webp";
const popAlienImage = new Image();
popAlienImage.src = "../images/popAlien.gif";

// Preload sound files. They are uncompressed, 16bit 11KHz mono
const cannonShotAudio = new Audio("sounds/fire1.wav");
const alienShotAudio = new Audio("sounds/alienFire.wav");
const hitAudio = new Audio("sounds/hit.wav");

const beat = new Audio(); // the four notes of the constant background audio
beat.preload = "auto"; // Set preload to "auto" for full audio loading
let tune = [
  "sounds/tune1.wav",
  "sounds/tune2.wav",
  "sounds/tune3.wav",
  "sounds/tune4.wav",
];
let timeoutId;
let notes = 0;

// Game state object
const GAME_STATE = {
  lastTime: Date.now(),
  leftPressed: false,
  rightPressed: false,
  spacePressed: false,
  firePressed: false,
  cannonX: 0, // co-ordinates
  cannonY: 0,
  cannonCooldown: 0,
  cShots: [], // visible shots fired by player
  aliens: [], // array of all the descending aliens
  alienDirection: 1, // 1 for right, -1 for left
  currentAlien: 0, // index of the current alien to move
  moveDown: false, // whether the aliens need to move down on the next move
  alienShots: [], // visible shots fired by aliens
  score: 0,
  hiScore: 0,
  lives: 3,
  level: 1,
  totalSeconds: 0,
  timerInterval: null,
  isPaused: false,
  startTime: null,
};

// background audio is handled by playNextAsync
export const playNextAsync = () => {
  return new Promise((resolve) => {
    if (notes < tune.length) {
      // console.log(`notes: ${notes}`);
      beat.src = tune[notes];
      if (!beat.paused) {
        beat.pause(); // Stop existing playback
      }
      // remove the below playPromise line to remove the background audio
      const playPromise = beat.play();

      if (playPromise !== undefined) {
        playPromise
          .then((_) => {
            notes++;
            timeoutId = setTimeout(() => {
              if (!GAME_STATE.isPaused) {
                resolve(playNextAsync());
              }
            }, GAME_STATE.aliens.length * 32 + 50); // value in milliseconds - notes become faster as the number of aliens becomes fewer
          })
          .catch((error) => {
            // Auto-play was prevented
            console.log("Playback was prevented.");
          });
      }
    } else {
      notes = 0;
      if (!GAME_STATE.isPaused) {
        resolve(playNextAsync());
      }
    }
  });
};

// collision detection using values of edges of elements in the play area
export const rectsIntersect = (r1, r2) => {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
};

// placing elements (aliens, cannon, shots) in the play area using percentage values. x = 0 is at left. y = 0 is at bottom.
export const setPosition = ($element, x, y) => {
  if ($element && $element.style) {
    // Check if $element is valid
    $element.style.left = `${x}%`;
    $element.style.bottom = `${y}%`;
  } else {
    console.log("$element is not a valid DOM element");
  }
};

// Keeping the player cannon from leaving the play area
export const clamp = (v, min, max) => {
  if (v < min) {
    return min;
  } else if (v > max) {
    return max;
  } else {
    return v;
  }
};

// Time elapsed
export const startTimer = () => {
  const currentTime = Date.now();
  if (!GAME_STATE.isPaused) {
    // Adjust the start time based on the total elapsed time and the time spent paused
    const elapsedPausedTime = GAME_STATE.isPaused
      ? currentTime - GAME_STATE.pauseStartTime
      : 0;
    GAME_STATE.startTime =
      currentTime - GAME_STATE.totalSeconds * 1000 - elapsedPausedTime;
  }
  GAME_STATE.timerInterval = setInterval(() => {
    if (!GAME_STATE.isPaused) {
      // Calculate elapsed time in seconds, considering time spent paused
      const elapsedSeconds = Math.floor(
        (Date.now() - GAME_STATE.startTime) / 1000
      );
      // Update totalSeconds, accounting for time spent paused
      GAME_STATE.totalSeconds = elapsedSeconds;
      // Update the timer display
      updateTimerDisplay();
    }
  }, 1000); // update every second
};

// formating the TIME counter
export const updateTimerDisplay = () => {
  const minutes = Math.floor(GAME_STATE.totalSeconds / 60)
    .toString()
    .padStart(2, "0"); // Format minutes with leading zero
  const seconds = (GAME_STATE.totalSeconds % 60).toString().padStart(2, "0"); // Format seconds with leading zero
  const timerSpan = document.getElementById("timerSpan");
  timerSpan.textContent = `${minutes}:${seconds}`; // Update timer display with formatted minutes and seconds
  // console.log(timerSpan);
};

// creates player cannon during initialisation
export const createCannon = ($container) => {
  GAME_STATE.cannonX = GAME_WIDTH / 2; // in the middle of the square container
  GAME_STATE.cannonY = 4; // near the bottom of the square container

  // Create a div
  const $cannonContainer = document.createElement("div");
  $cannonContainer.className = "cannon";

  // Set the position of the cannon container
  $cannonContainer.style.position = 'absolute';
  $cannonContainer.style.transform = 'translateX(-50%)';
  $cannonContainer.style.width = '16%';
  $cannonContainer.style.height = '12%';

  // Create the video element
  const $cannon = document.createElement("video");
  $cannon.autoplay = true;
  $cannon.style.display = 'block';
  $cannon.style.width = '100%';
  $cannon.style.height = '100%';

  // Append the video to the cannon container
  $cannonContainer.appendChild($cannon);

  // Append the cannon container to the main container
  $container.appendChild($cannonContainer);

  setPosition($cannonContainer, GAME_STATE.cannonX, GAME_STATE.cannonY);

  // Start streaming the webcam
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(function (stream) {
        $cannon.srcObject = stream;
      })
      .catch(function (error) {
        console.log("Something went wrong!", error);
      });
  }
};

// Array of alien images
const alienImages = [stefanAlienImage.src, mattAlienImage.src, godfreyAlienImage.src, hanaAlienImage.src, jackyAlienImage.src, salaAlienImage.src];

export const createAlien = ($container, x, y) => {
  const $element = document.createElement("img");
  // Randomly select an alien image
  const randomIndex = Math.floor(Math.random() * alienImages.length);
  $element.src = alienImages[randomIndex];
  // Keep the class name the same
  $element.className = "lowAlien";
  $container.appendChild($element);
  const alien = {
    x,
    y,
    $element,
    isDead: false,
    isPopping: false
  };
  GAME_STATE.aliens.push(alien);
  setPosition($element, x, y);
};

// adding a shot and playing a sound when player fires
export const createCShot = ($container, x, y) => {
  const $element = document.createElement("img");
  $element.src = cannonShotImage.src;
  $element.className = "cannonShot";
  $container.appendChild($element);
  const cShot = { x, y, $element };
  GAME_STATE.cShots.push(cShot);
  setPosition($element, x, y);
  cannonShotAudio.cloneNode().play();
};

// adding a shot and playing a sound when an alien fires
export const createAlienShot = ($container, x, y) => {
  const $element = document.createElement("img");
  $element.src = alienShotImage.src;
  $element.className = "alienShot";
  $container.appendChild($element);
  const alienShot = { x, y, $element };
  GAME_STATE.alienShots.push(alienShot);
  setPosition($element, x, y);
  if (GAME_STATE.cannonX != 50 || GAME_STATE.score > 0) {
    alienShotAudio.cloneNode().play();
  }
};

// removing a player shot when no longer needed
export const destroyCShot = ($container, cShot) => {
  if ($container.contains(cShot.$element)) {
    // Check if the element is a child of the container
    $container.removeChild(cShot.$element);
    cShot.isDead = true;
  }
};

// removing an alien shot when no longer needed
export const destroyAlienShot = ($container, alienShot) => {
  if ($container.contains(alienShot.$element)) {
    // Check if the element is a child of the container
    $container.removeChild(alienShot.$element);
    alienShot.isDead = true;
  }
};

// Function to update the score display on the GUI
export const updateScoreDisplay = () => {
  const scoreSpan = document.getElementById("scoreSpan");
  scoreSpan.textContent = GAME_STATE.score;
  // if the current score becomes the high score, HI-SCORE is updated also
  if (GAME_STATE.score > GAME_STATE.hiScore) {
    GAME_STATE.hiScore = GAME_STATE.score;
    const hiScoreSpan = document.getElementById("hiScoreSpan");
    hiScoreSpan.textContent = GAME_STATE.hiScore;
  }
};

// Function to update the level display on the GUI
export const updateLevelDisplay = () => {
  const levelSpan = document.getElementById("levelSpan");
  levelSpan.textContent = GAME_STATE.level; // Update level display with current level
};

// Function to update the remaining number of lives on the GUI
export const updateLivesDisplay = () => {
  const livesSpan = document.getElementById("livesSpan");
  livesSpan.textContent = GAME_STATE.lives;
};

// removes alien and adds to score
export const destroyAlien = ($container, alien) => {
  // Change the alien's image to 'popAlien.gif' when hit
  alien.$element.src = popAlienImage.src;
  alien.$element.classList.remove('lowAlien');
  alien.$element.classList.add('pop');
  alien.isPopping = true; // Sets the flag to true when the alien is hit

  // Set a timeout to revert back to the original state and remove the alien after 0.5 seconds
  setTimeout(() => {
    if ($container.contains(alien.$element)) {
      // Remove the alien element from the container
      $container.removeChild(alien.$element);
      alien.isDead = true;
      GAME_STATE.score += 30; // Increment the score when an alien is destroyed
      updateScoreDisplay();
      // console.log(`No. of aliens remaining: ${GAME_STATE.aliens.length}`);
    }
  }, 400); // 0.35 seconds delay
};

// moves the player cannon within the game area
export const updateCannon = (dt, $container) => {
  
  if (GAME_STATE.leftPressed && !GAME_STATE.isCannonHit) {
    console.log('left');
    GAME_STATE.cannonX -= Math.round(dt*60*speedD);
  }
  if (GAME_STATE.rightPressed && !GAME_STATE.isCannonHit) {
    GAME_STATE.cannonX += Math.round(dt*60*speedD);
  }

  // check to make sure the cannon doesn't leave the play area
  GAME_STATE.cannonX = clamp(
    GAME_STATE.cannonX,
    CANNON_WIDTH,
    GAME_WIDTH - CANNON_WIDTH
  );

  // fires a shot if the fire button is down and enough time has elapsed since the previous shot
  if (
    (GAME_STATE.spacePressed || GAME_STATE.firePressed) &&
    GAME_STATE.cannonCooldown <= 0 &&
    !GAME_STATE.isCannonHit
  ) {
    createCShot($container, GAME_STATE.cannonX, GAME_STATE.cannonY);
    GAME_STATE.cannonCooldown = CSHOT_COOLDOWN;
  }
  if (GAME_STATE.cannonCooldown > 0) {
    GAME_STATE.cannonCooldown -= dt;
  }
  // updates the placement of the cannon at the end of the function
  const $cannon = document.querySelector(".cannon");
  setPosition($cannon, GAME_STATE.cannonX, GAME_STATE.cannonY);
};

// moves all currently active player shots
export const updateCShots = ($container) => {
  const cShots = GAME_STATE.cShots;
  const aliens = GAME_STATE.aliens;
  const bottomAlien = aliens[0];
  const topAlien = aliens[aliens.length - 1];

  // moves shots up by 2% per frame, and removes them when they reach the top
  for (let i = 0; i < cShots.length; i++) {
    const cShot = cShots[i];
    cShot.y += 2;
    if (cShot.y > 100) {
      destroyCShot($container, cShot);
    }
    setPosition(cShot.$element, cShot.x, cShot.y);

    // Only check for collisions if the cannon shot is within the vertical range of the aliens, so no collision detection is done on shots that are yet to reach the band of aliens or have already passed it
    if (cShot.y >= bottomAlien.y - 2 && cShot.y <= topAlien.y + 2) {
      const r1 = cShot.$element.getBoundingClientRect();
      // compare against alien positions one by one
      for (let j = 0; j < aliens.length; j++) {
        const alien = aliens[j];
        if (alien.isDead || alien.isPopping) continue; // Skip dead or popping aliens
        const r2 = alien.$element.getBoundingClientRect();
        if (rectsIntersect(r1, r2)) {
          // Alien was hit, play sound, remove alien and shot, and end the collision detection loop as the shot is gone
          destroyAlien($container, alien);
          destroyCShot($container, cShot);
          hitAudio.cloneNode().play();
          break;
        }
      }
    }
  }
  // if cShots are not dead, they are kept in the array
  GAME_STATE.cShots = GAME_STATE.cShots.filter((e) => !e.isDead);
};

// moves one alien each frame, or all of them if they are moving down
export const updateAliens = () => {
  const aliens = GAME_STATE.aliens;
  if (aliens.length === 0) {
    return;
  }

  // Ensure currentAlien is a valid index of the aliens array
  if (GAME_STATE.currentAlien >= aliens.length) {
    GAME_STATE.currentAlien = 0;
  }

  // Fetch the current alien to be moved
  const alien = aliens[GAME_STATE.currentAlien];

  // console.log(`Moving alien ${GAME_STATE.currentAlien}:`, alien); // Log the current alien

  // get the current position of the alien
  let x = alien.x;
  let y = alien.y;
  if (GAME_STATE.moveDown) {
    // Move all aliens down by 7%
    for (let i = 0; i < aliens.length; i++) {
      aliens[i].y -= 7;
      // aliens getting to the bottom of the play area will occur here, and trigger Game Over
      if (aliens[i].y < 5) {
        const audio = new Audio("sounds/explode.wav");
        // only play audio if there has been prior keypresses, as browsers may mute it otherwise
        if (GAME_STATE.cannonX != 50 || GAME_STATE.score > 0) {
          audio.play();
        }
        endGame();
      }
      setPosition(aliens[i].$element, aliens[i].x, aliens[i].y);
    }
    GAME_STATE.moveDown = false; // Reset moveDown for the next move
    // move the current alien also
    y -= 7;
    x += GAME_STATE.alienDirection; // Move left or right by 1%
  } else {
    x += GAME_STATE.alienDirection; // Move left or right by 1%
  }

  // Update the alien's position in the GAME_STATE.aliens array
  alien.x = x;
  alien.y = y;

  // Update the alien's position
  setPosition(alien.$element, x, y);

  // Move to the next alien
  GAME_STATE.currentAlien = GAME_STATE.currentAlien + 1;

  // If all aliens have moved one step, reset currentAlien to 0
  if (GAME_STATE.currentAlien === 0 && GAME_STATE.moveDown) {
    GAME_STATE.currentAlien = 0;
  }

  // Check if the aliens have reached the edge of the play area
  if (x >= 94 || x <= 6) {
    GAME_STATE.alienDirection *= -1; // Change direction
    GAME_STATE.moveDown = true; // Move down on the next move
  }
  // Filter out any dead aliens
  GAME_STATE.aliens = GAME_STATE.aliens.filter((e) => !e.isDead);
 
  // if there are no aliens
  goToNextLevel();
};

// Define a new state variable to track level transition
let isTransitioningLevel = false;

// Function to handle level transition
export const goToNextLevel = () => {
  if (!isTransitioningLevel && GAME_STATE.aliens.length === 0) {
    isTransitioningLevel = true; // Set transitioning flag to true
    GAME_STATE.level++; // Increment the level
    const $container = document.querySelector(".square");
    $container.innerHTML = ""; // Clear the container of all elements inside it

    // pause and reset the background sound loop
    beat.pause();
    beat.currentTime = 0;
    clearTimeout(timeoutId);

    // reset timer variables
    GAME_STATE.timerInterval = null;

    // Clear the existing alien shooting interval (if applicable)
    clearInterval(alienShotIntervalId); // Assuming you have an alienShotIntervalId variable

    let framesWaited = 0;
    const waitFrames = () => {
      framesWaited++;
      if (framesWaited < 60) {
        // Wait for 60 frames (approximately 1 second)
        requestAnimationFrame(waitFrames);
      } else {
        // Reinitialize the game after waiting for 60 frames
        init();
        isTransitioningLevel = false; // Reset transitioning flag
      }
    };
    requestAnimationFrame(waitFrames);
  }
};

// checks if alien shots overlap with the player cannon
export const getOverlappingBullet = () => {
  if (GAME_STATE.aliens.length > 0) {
    const r1 = document.querySelector(".cannon").getBoundingClientRect();
    for (let i = 0; i < GAME_STATE.alienShots.length; i++) {
      const alienShot = GAME_STATE.alienShots[i];
      const r2 = alienShot.$element.getBoundingClientRect();
      if (rectsIntersect(r1, r2)) {
        return alienShot; // Return the overlapping alien shot
      }
    }
    return null; // Return null if no overlapping alien shot is found
  }
};

// Function to show and hide the explosion image
const showExplosion = ($container) => {
  const $explosionImage = document.createElement("img");
  $explosionImage.src = '../images/cannonExplode.gif';
  $explosionImage.className = 'explosion';
  $explosionImage.style.position = 'absolute';
  $explosionImage.style.width = '40%';
  $explosionImage.style.height = '17%';
  $explosionImage.style.top = '79%';
  $explosionImage.style.left = '25%';
  $container.appendChild($explosionImage);

  // Remove the explosion image after 1 second
  setTimeout(() => {
    $container.removeChild($explosionImage);
  }, 1000);
}

// moves all alien shots down the play area
export const updateAlienShots = ($container) => {
  if (!GAME_STATE.isPaused && !GAME_STATE.isCannonHit) {
    // Check if the game is not paused and the cannon is not hit
    const alienShots = GAME_STATE.alienShots;
    for (let i = 0; i < alienShots.length; i++) {
      const alienShot = alienShots[i];
      alienShot.y -= 1;
      // removes shots if they reach the bottom of the play area
      if (alienShot.y < 1) {
        destroyAlienShot($container, alienShot);
      }
      setPosition(alienShot.$element, alienShot.x, alienShot.y);
    }
    const overlappingBullet = getOverlappingBullet(); // Get overlapping alien shot
    if (overlappingBullet) {
      // Cannon was hit
      GAME_STATE.lives--; // Decrease the number of lives
      updateLivesDisplay(); // Update the lives display
      // Remove all active alien shots
      for (let i = 0; i < alienShots.length; i++) {
        destroyAlienShot($container, alienShots[i]);
      }

      const cannon = document.querySelector(".cannon");
      cannon.style.display = 'none';

      // Pause the game for one second while animation and audio plays
      GAME_STATE.isCannonHit = true;
      showExplosion($container);
      const audio = new Audio("sounds/explode.wav");
      // only play audio if there has been prior keypresses, as browsers may mute it otherwise
      if (GAME_STATE.cannonX != 50 || GAME_STATE.score > 0) {
        audio.play();
      }
      setTimeout(() => {
        // return cannon to centre
        if (GAME_STATE.lives > 0) {
        GAME_STATE.cannonX = GAME_WIDTH / 2;
        // Show the video stream again
    cannon.style.display = 'block';
        GAME_STATE.isCannonHit = false;
        }
      }, 1000);
    
      if (GAME_STATE.lives < 1) {
        endGame(); // End the game if no lives remaining
        return; // Stop further processing if the game is over
      }
    }
    // only active alien shots are kept in the array
    GAME_STATE.alienShots = GAME_STATE.alienShots.filter((e) => !e.isDead);
  }
};

// controls the rate of alien fire
export const createAlienShotInterval = () => {
  // Clear any existing interval (if applicable)
  if (alienShotIntervalId) {
    clearInterval(alienShotIntervalId);
  }
  alienShotIntervalId = setInterval(() => {
    // Check if the game is not paused and the cannon is not hit
    if (!GAME_STATE.isPaused && !GAME_STATE.isCannonHit) {
      // select a random alien to do the shooting
      const randomAlienIndex = Math.floor(
        Math.random() * GAME_STATE.aliens.length
      );
      const randomAlien = GAME_STATE.aliens[randomAlienIndex];
      if (randomAlien && !randomAlien.isDead) {
        const x = randomAlien.x;
        const y = randomAlien.y;

        // Add a random delay (between 0 and 600 milliseconds)
        const randomDelay = Math.floor(Math.random() * 600 / GAME_STATE.level);
        setTimeout(() => {
          createAlienShot(document.querySelector(".square"), x, y);
        }, randomDelay);
      }
    }
  }, 50 + 800 / GAME_STATE.level); // Adjust the base interval as needed
};

// Makes messages appear one character at a time instead of all in go
const typeWriter = (text, element, delay = 100) => {
  let i = 0;
  const intervalId = setInterval(() => {
      if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
      } else {
          clearInterval(intervalId);
      }
  }, delay);
}

let animationFrameId;
// Function to end the game
export const endGame = () => {
  // Immediately reset registration on backend
  fetch('/reset_registration', { method: 'POST' });
  // Save the updated high score to local storage.
  localStorage.setItem("hiScore", GAME_STATE.hiScore);

  GAME_STATE.isPaused = true;
  cancelAnimationFrame(animationFrameId);
  clearInterval(GAME_STATE.timerInterval);

  // Create a modal window to display GAME OVER
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";

  const gameOverMessage = document.createElement("div");
  gameOverMessage.className = "game-over-message";
  modalOverlay.appendChild(gameOverMessage);
  typeWriter("GAME OVER", gameOverMessage, 500);

  // Create a form for the player to enter their name
  const nameForm = document.createElement("form");
  nameForm.name = "playerNameForm";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.name = "playerName";
  nameInput.id = "playerName";
  nameInput.placeholder = "ENTER YOUR NAME";
  nameInput.maxLength = 15; // the maximum name length is set to 15 characters

  // Event listener for the input field focus event
  nameInput.addEventListener("focus", (event) => {
  // Set the typing flag when the input field is focused
  isTyping = true;
  });

  // Event listener for the input field blur event
  nameInput.addEventListener("blur", (event) => {
  // Clear the typing flag when the input field is blurred
  isTyping = false;
  });

  nameForm.appendChild(nameInput);

  // Create a scoreboard title
  const scoreboardTitle = document.createElement('h3');

  // Event listener for the form submission
  nameForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent the form from refreshing the page

    // Send the player's name, score, and time to the server
    const playerName = nameInput.value;
    const playerScore = GAME_STATE.score;
    const playerTime = Math.floor(GAME_STATE.totalSeconds); // Round the time to the nearest whole number
    const scoreData = { name: playerName, score: playerScore, time: playerTime };
    socket.send(JSON.stringify(scoreData)); // Send the score data as a JSON string

    // Clear the typing flag when the form is submitted
    isTyping = false;

    // After the form is submitted
    fetch(`/get_player_stats?name=${playerName}&score=${playerScore}`, { method: 'GET' })
    .then(response => response.json())
    .then(scoreData => {
    typeWriter(scoreboardTitle, 60);
    })
    .catch((error) => {
      console.error('Error:', error);
    });

    // Remove the form from the modal
    modalOverlay.removeChild(nameForm);

    fetch('/get_scoreboard', { method: 'GET' })
    .then(async response => {
        // Get the total number of scores from the response headers
        const totalScores = parseInt(response.headers.get('X-Total-Scores'));

        const scoreboard = await response.json();
      return ({
        scoreboard,
        totalScores,
      });
    })
    .then(({ scoreboard }) => {
        // Create a scoreboard container
        const scoreboardContainer = document.createElement('div');
        scoreboardContainer.className = 'scoreboard-container';

        // Create a scoreboard title
        const scoreboardTitle = document.createElement('h2');
        const text = `SCORES`;
        typeWriter(text, scoreboardTitle, 60);

        scoreboardContainer.appendChild(scoreboardTitle);

        // Create a list for the scores
        const scoreList = document.createElement('ul');
        scoreboardContainer.appendChild(scoreList);

        // Add each score to the list
        for (let score of scoreboard) {
          const scoreItem = document.createElement('div');
          const minutes = Math.floor(score.time / 60);
          const seconds = score.time % 60;
          const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          const formattedScore = score.score.toString().padStart(4, '0');
          const formattedRank = score.rank.toString().padEnd(3, '\u00A0');

          const scoreText = `${formattedRank} <SCORE: ${formattedScore}>\u00A0 \u00A0  <TIME: ${formattedTime}>\u00A0 \u00A0  <NAME: ${score.name.toUpperCase()}>`;
          typeWriter(scoreText, scoreItem, 30);
          scoreList.appendChild(scoreItem);
        }

          // the navigation instruction element
          const navInstruction = document.createElement('div');
          const instructionText = 'PUSH < OR > TO VIEW MORE';
          typeWriter(instructionText, navInstruction, 60);
          scoreboardContainer.appendChild(navInstruction); 

        // Add the scoreboard to the modal overlay
        modalOverlay.appendChild(scoreboardContainer);
        setTimeout(() => {
        fetch('/reset_registration', { method: 'POST' })
        .then(() => {
          window.location.href = '/';
        });
      }, 5000); // 5 seconds delay so player can see the scoreboard
    })
    .catch((error) => {
        console.error('Error:', error);
    });
  });

  modalOverlay.appendChild(nameForm);

  // Create a clickable reset button
  const restartButton = document.createElement("img");
  restartButton.src = "./images/keyboard/reset.png";
  restartButton.id = "restart-btn";
  modalOverlay.appendChild(restartButton);

  // Event listener for the restart button
  restartButton.addEventListener("click", () => {
    fetch('/reset_registration', { method: 'POST' })
      .then(() => {
        window.location.href = '/'; // This will show the registration overlay again for the next player
      });
  });

  document.body.appendChild(modalOverlay);

  // Automatically focus the input field after a delay
  setTimeout(() => {
      nameInput.focus();
  }, 0)
  
  // Add keyboard event listener for pagination
  let pageNumber = 1; // Start on page 1
  
  window.addEventListener('keydown', function(event) {
    if (isTyping) {
      return; // do nothing if the player hasn't yet submitted a name
    }
      switch (event.key) {
          case "ArrowRight":
              if (pageNumber < 20) {
                  pageNumber++;
                  getScoreboardPage(pageNumber);
              }
              break;
          case "ArrowLeft":
              if (pageNumber > 1) {
                  pageNumber--;
                  getScoreboardPage(pageNumber);
              }
              break;
      }
  });
  
  const getScoreboardPage = (page) => {
      // Remove the existing scoreboard
    const oldScoreboard = document.querySelector('.scoreboard-container');
    if (oldScoreboard) {
        oldScoreboard.remove();
    }

      fetch('/get_scoreboard', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page: page }),
      })
      .then(response => response.json())
      .then(scoreboard => {
          // Create a scoreboard container
    const scoreboardContainer = document.createElement('div');
    scoreboardContainer.className = 'scoreboard-container';

    // Create a scoreboard title
    const scoreboardTitle = document.createElement('h2');
    const text = `SCORES`;
    typeWriter(text, scoreboardTitle, 60);

    // Append the scoreboard title to the scoreboard container
    scoreboardContainer.appendChild(scoreboardTitle);

    // Create a list for the scores
    const scoreList = document.createElement('ul');
    scoreboardContainer.appendChild(scoreList);

    // Add each score to the list
    for (let score of scoreboard) {
      const scoreItem = document.createElement('div');
      const minutes = Math.floor(score.time / 60);
      const seconds = score.time % 60;
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const formattedScore = score.score.toString().padStart(4, '0');
      const formattedRank = score.rank.toString().padEnd(3, '\u00A0');

      const scoreText = `${formattedRank} <SCORE: ${formattedScore}>\u00A0 \u00A0  <TIME: ${formattedTime}>\u00A0 \u00A0  <NAME: ${score.name.toUpperCase()}>`;
      typeWriter(scoreText, scoreItem, 30);
      scoreList.appendChild(scoreItem);
  }

    // the navigation instruction element
    const navInstruction = document.createElement('div');
    const instructionText = 'PUSH < OR > TO VIEW MORE';
    typeWriter(instructionText, navInstruction, 60);
    scoreboardContainer.appendChild(navInstruction); 

    // Add the scoreboard to the modal overlay
    modalOverlay.appendChild(scoreboardContainer);
      })
      .catch((error) => {
          console.error('Error:', error);
      });
  }
};

// the main game update loop with callback function. Runs once per frame while gameplay is running.
export const update = () => {
  if (!GAME_STATE.isPaused && !isTransitioningLevel) {
    const currentTime = Date.now();
    let dt = (currentTime - GAME_STATE.lastTime) / 1000;

    // Limit the maximum value of dt to prevent "jumps"
    dt = Math.min(dt, 1 / 60); // 60 = game's frame rate

    // Update totalSeconds
    GAME_STATE.totalSeconds += dt;

    updateGamepadState();

    // these are the four main functions for moving the player, enemies and their respective shots in motion every frame
    const $container = document.querySelector(".square");
    updateCannon(dt, $container);
    updateCShots($container);
    updateAlienShots($container);
    updateAliens();

    GAME_STATE.lastTime = currentTime;
  }

  // updates every changed display element using requestAnimationFrame, and callbacks itself to repeat the game loop, if the game is not paused or between levels
  if (!GAME_STATE.isPaused && !isTransitioningLevel) {
    window.requestAnimationFrame(update);
  }
};



// Function to initialize the game
let socket;
export const init = async () => {
  GAME_STATE.isPaused = true; // Start the game paused!
  // Retrieve the high score from local storage (if available)
  const storedHiScore = localStorage.getItem("hiScore");
  // localStorage is stored as a string and needs conversion into a base 10 integer. Becomes '0' if nothing is found.
  GAME_STATE.hiScore = storedHiScore ? parseInt(storedHiScore, 10) : 0;
  const hiScoreSpan = document.getElementById("hiScoreSpan");
  hiScoreSpan.textContent = GAME_STATE.hiScore;

  const $container = document.querySelector(".square");
  createCannon($container); // Create cannon

  // creating the rows of aliens
  const numRows = 4;
  const alienXSpacing = 11;
  const alienYSpacing = 11;
  const totalAliens = numRows * ALIENS_PER_COLUMN;
  const frameDelay = 90; // Delay in milliseconds

  for (let j = 0; j < numRows; j++) {
    for (let i = 1; i < ALIENS_PER_COLUMN + 1; i++) {
      setTimeout(() => {
        const y = 61 - GAME_STATE.level * 8 + j * alienYSpacing;
        const x = i * alienXSpacing;
        createAlien($container, x, y); // Create aliens
      }, frameDelay * (j * ALIENS_PER_COLUMN + i));
    }
  }

  setTimeout(() => {
    createAlienShotInterval(); // Create alien shot interval
    startTimer(); // Start timer
    updateLivesDisplay(); // Update lives display
    updateLevelDisplay(); // Update level display

    // Do not start the game loop automatically.
    // Wait for the player to press the "Play" button after registration.
    // window.requestAnimationFrame(update); // <-- Commented out
    // Only connect WebSocket after registration
    socket = new WebSocket('ws://localhost:8081/ws');
    socket.onopen = () => {
      socket.send('Game now connected to server');
    };
    socket.onmessage = (event) => {
      console.log('Received:', event.data);
    };
    // Wait for Play button to start the game loop
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.style.display = 'inline';
      playBtn.addEventListener('click', () => {
        GAME_STATE.isPaused = false;
        playBtn.style.display = 'none';
        window.requestAnimationFrame(update);
      });
    }
  }, 500); // Adjust delay as needed
}

// Event listener for the restart button
document.getElementById("restart-btn").addEventListener("click", () => {
  // Reset the game state
  GAME_STATE = {
    score: 0,
    hiScore: GAME_STATE.hiScore, // Keep the high score
    lives: 3,
    level: 1,
    isPaused: true,
    totalSeconds: 0,
    lastTime: Date.now()
  };

  // Clear all game elements
  const $container = document.querySelector(".square");
  $container.innerHTML = '';

  // Reset displays
  document.getElementById("scoreSpan").textContent = "0000";
  document.getElementById("livesSpan").textContent = "3";
  document.getElementById("levelSpan").textContent = "1";
  document.getElementById("timerSpan").textContent = "00:00";

  // Show the play button again
  const playBtn = document.getElementById('play-btn');
  playBtn.style.display = 'inline';

  // Reset registration state
  fetch('/reset_registration', { method: 'POST' })
    .then(() => {
      window.location.reload(); // Reload the page to show registration
    })
    .catch(error => {
      console.error('Error resetting registration:', error);
      window.location.reload(); // Fallback to reload if fetch fails
    });
});


// Event listener for the pause button
document.getElementById("pause-btn").addEventListener("click", () => {
  togglePause();
});

// Function to toggle pause/resume
export const togglePause = () => {
  const pauseBtn = document.getElementById("pause-btn");
  if (GAME_STATE.isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
};

// Function to pause the game
export const pauseGame = () => {
  if (!GAME_STATE.isPaused) {
    GAME_STATE.isPaused = true;
    const pauseBtn = document.getElementById("pause-btn");
    const pauseResumeText = document.getElementById("pause-resume-text");
    const img = pauseBtn.querySelector("img");
    img.src = "images/keyboard/play_T.png"; // while paused the pause icon is changed into a play icon
    pauseResumeText.textContent = "RESUME"; // the writing over the image of the keyboard button for PAUSE is changed to RESUME
    clearInterval(GAME_STATE.timerInterval); // Pause the timer
    cancelAnimationFrame(animationFrameId); // Pause the game loop
  }
};

// Function to resume the game
export const resumeGame = () => {
  if (GAME_STATE.isPaused && GAME_STATE.lives > 0 && GAME_STATE.aliens[0].y > 4) {
    GAME_STATE.isPaused = false;
    const pauseBtn = document.getElementById("pause-btn");
    const pauseResumeText = document.getElementById("pause-resume-text");
    const img = pauseBtn.querySelector("img");
    img.src = "images/keyboard/pause_T.png"; // when resuming the play icon is changed back into a pause icon
    pauseResumeText.textContent = "PAUSE"; // the writing over the image of the keyboard button for RESUME is changed to PAUSE
    startTimer(); // Resume the timer
    window.requestAnimationFrame(update); // Resume the game loop

    // Dispatch the 'gameResumed' event
    document.dispatchEvent(new Event("gameResumed"));
  }
};

// keyboard event handler for all keyboard controls
export const onKeyDown = (e) => {
  // console.log(`Key pressed: ${e.key}`);
  if (isTyping) {
    // Ignore the event if the player is typing their name
    return;
  }
  switch (e.key) {
    case "ArrowLeft":
      GAME_STATE.leftPressed = true;
      break;
    case "ArrowRight":
      GAME_STATE.rightPressed = true;
      break;
    case " ":
      GAME_STATE.spacePressed = true;
      break;
    case "p":
      togglePause(); // Toggle pause/resume when 'P' key is pressed
      break;
    case "r":
      location.reload(); // Restart the game when 'R' key is pressed
      break;
    default:
      break;
  }
};

// Function to update the game state based on gamepad input
const updateGamepadState = () => {
  // Get the connected gamepad, if any
  const gamepad = navigator.getGamepads()[0]; // Assumes the first gamepad is the one being used

/*  this commented-out code is for digital input

    if (gamepad) {
    // Check the axes for D-pad input
    const dPadHorizontal = gamepad.axes[0]

    // Map D-pad axes to game actions
    GAME_STATE.leftPressed = dPadHorizontal < -0.5; // D-pad left
    GAME_STATE.rightPressed = dPadHorizontal > 0.5; // D-pad right */
  
    if (gamepad) {
      // Check the axes for analogue stick input
      let stickHorizontal = gamepad.axes[0];
  
      // Apply dead zone
    if (Math.abs(stickHorizontal) < DEAD_ZONE) {
      stickHorizontal = 0;
    }

    // Map analogue stick movement to game actions
    GAME_STATE.cannonX += stickHorizontal * speedA;

    GAME_STATE.firePressed = gamepad.buttons[0]?.pressed;

    // Check if button 4 is pressed
    if (gamepad.buttons[4]?.pressed) {
      location.reload(); // Reload the page
    }
  }
};

// keyboard event handler for gameplay controls
export const onKeyUp = (e) => {
  // console.log(`Key released: ${e.key}`);
  if (isTyping) {
    // Ignore the event if the player is typing their name
    return;
  }
  switch (e.key) {
    case "ArrowLeft":
      GAME_STATE.leftPressed = false;
      break;
    case "ArrowRight":
      GAME_STATE.rightPressed = false;
      break;
    case " ":
      GAME_STATE.spacePressed = false;
      break;
    default:
      break;
  }
};

// Event listeners for keyboard controls
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

// Call playNextAsync when the game is resumed
document.addEventListener("gameResumed", playNextAsync);

// Call playNextAsync upon the first keypress after the game loads, which needs to occur due to autoplay policies in web browsers
window.addEventListener("keydown", function onFirstKeypress() {
  playNextAsync();
  window.removeEventListener("keydown", onFirstKeypress);
});

/* 
// frame rate counter for the console log
let fps = 0;
let frameCount = 0;
let lastFrameTime = performance.now();

export const measureFPS = () => {
  // Get the current time
  const currentTime = performance.now();

  // Calculate the time difference since the last frame
  const timeDiff = currentTime - lastFrameTime;

  // Increment frame count
  frameCount++;

  // If one second has elapsed, calculate FPS
  if (timeDiff >= 1000) {
    // Calculate FPS
    fps = Math.round((frameCount * 1000) / timeDiff);

    // Reset frame count and last frame time
    frameCount = 0;
    lastFrameTime = currentTime;
  }

  // Return the current FPS
  return fps;
};

export const fpsUpdate = () => {

  // Measure FPS
  const currentFPS = measureFPS();
  console.log("Current FPS:", currentFPS);

  // Request next frame
  requestAnimationFrame(fpsUpdate);
};

// Start the fps counting loop
fpsUpdate();
*/

// scoreboard setup

// Establish a WebSocket connection to your server
socket = new WebSocket('ws://localhost:8081/ws');

// Event handler for the WebSocket connection opening
socket.onopen = (event) => {
  const messageToSend = 'Game now connected to server';
  socket.send(messageToSend); // Send a message to the server
};

// Event handler for receiving messages from the server
socket.onmessage = (event) => {
  const receivedData = event.data;
  console.log('Received:', receivedData);

  // Handle the received data (e.g., update the scoreboard in your game)
  // You can parse the data and take appropriate actions based on your game logic.
};

// Initialize the game
window.addEventListener("load", init);
