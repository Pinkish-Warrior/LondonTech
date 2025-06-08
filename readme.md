# 01-Invaders

# 👾

An adaption of an 01 Founders/01-Edu make-your-game project, made for London Tech Week 2024, based on the 1978 arcade game Space Invaders by Taito.

The original project is about learning the usage of JavaScript, minimizing the redrawing of large areas of screen to maintain a high frame rate, while also not using some things that may make this task easier such as html canvas.

Features of this game include:

- One Invader moving across the play area per frame as in the arcade original, which in turn causes the game and background sounds to speed up as invaders are eliminated, increasing the difficulty and tension. This was an innovation of the original game that came as a side effect of the limits of how much movement the hardware of 1978 could process.

- A responsive layout that can work with large and small displays, in landscape and portrait views.

- Use of CSS to created background gradients, masks and glowing for text effects, clipping for the player sprite, and a background animation with minimal redrawing.

- Animated GIFs and WEBP images for sprites

Compared to the original Space Invaders, some game aspects are still absent, such as the fast moving UFO, the bunkers, and an attract mode/title screen. In our learning, we were keen to move onto other projects, and may return to these features later. Also for the purposes of visibility of 01 Founders staff images in this version, the number of invaders has been reduced to make them larger.


## Installation instructions 👽
cs
Go 1.17 or higher required

Download with git using the command line

`git clone https://github.com/Pinkish-Warrior/LondonTech.git`


## Usage instructions 👽

Run with the command line:

`go run main.go`
cs
then with a web browser go to the URL

[http://localhost:8081/](http://localhost:8081/)

Tested on Chrome, Edge, Opera and Firefox

When first starting, the browser is likely to ask permission to use a webcam. Choosing no, or not having a webcam, or not having webcam drivers installed, will make the game run with the player sprite be represented with a silhouette.

### *The game does not record, transmit or otherwise store pictures or video with the webcam feature on.*

Some sounds won't play unless there has been some user input before it. This is because browsers can prevent some automatic audio playback.


## Controls 👽

Left and right arrow keys or game controller joystick to move left and right. Joystick controls are analogue, allowing slower and faster movement when pushing the joystick a small amount or a lot.

Space bar or the game controller button with index [0] to fire

P key to pause and resume

R key or game controller button with index [4] to restart game (reloads page).

Use full keyboard to input a 15 character name into the scores and press Enter to submit it. Keyboard controls for pausing and restarting are disabled during name entry, although the displayed reset image will work to reset the game if the player doesn't wish to provide a name.

When highest scores are displayed, left and right arrow keys will flip between pages of five scores, up to rank 100.


## Adjustments 👽

The past scores are stored in scores.json and can be edited. The 'HI-SCORE' is separate and stored in the local storage associated with the web page.

These variable values near the top of script.js can be changed to adjust difficulty. Making CSHOT_COOLDOWN lower will increase the rate of fire from the player.

`const CSHOT_COOLDOWN = 0.3;` 

ALIENS_PER_COLUMN will change the number of invaders. They will also descend more quickly if increased, and above 8 will make the game end almost instantly as they won't fit in the play area.

`let ALIENS_PER_COLUMN = 6;`

Rate of Invader fire is partially random and increases with level. It's worked out in the function starting on line 605 

`createAlienShotInterval`

Invader size is set in static/style.css, under .square .lowAlien

## Easter Eggs 🐣

"Bim!" and "Oh Snap!" refer to the pass and fail messages displayed during the coding Piscine, which uses gamification to measure progress.

Part of the background is a silhouette of laptops and monitors, based on a photo taken in the college.

The default high score names are an AI-written dialogue between invaders chatting to each other as they invade. This was inspired by the high score tables of Chronos: A Tapestry of Time from 1987.

The misspelling of "HI-SCORE" was present in the original Space Invaders.

Most sound effects were taken from videos of the original Space Invaders. But the sound of the invaders firing is from a video of baby crocodiles that went viral.

## Credits 👽

- Christopher Reed
- George Saad
- Tania Machado Santana 🔗 https://www.linkedin.com/in/tania-rosa-99503b36/
- Diana Adamczyk

- Thanks to Tomohiro Nishikado of developer Taito, designer of the original Space Invaders

## 👾 👾 👾 👾 👾 👾 👾 👾 👾 👾 👾
## 👽 👽 👽 👽 👽 👽 👽 👽 👽 👽 👽