const socket = io();

const canvas = document.getElementById('gameCanvas');
canvas.width = screen.width;
canvas.height = screen.height;
const context = canvas.getContext("2d");

let vX = 0;
let vY = 0;

let wDown = false;
let sDown = false;
let aDown = false;
let dDown = false;

// Handle player spawning
const menu = document.getElementById("menu");
const menuForm = document.getElementById("menuForm");
const nameInput = document.getElementById("nameInput");
menuForm.addEventListener("submit", function(){
    menu.classList.add('hidden');
    socket.emit("spawn", {name: nameInput.value});
});

document.addEventListener('keydown', (event) => {
    if (event.key == 'w') wDown = true;
    if (event.key == 's') sDown = true;
    if (event.key == 'd') dDown = true;
    if (event.key == 'a') aDown = true;
});

document.addEventListener('keyup', (event) => {
    if (event.key == 'w') wDown = false;
    if (event.key == 's') sDown = false;
    if (event.key == 'd') dDown = false;
    if (event.key == 'a') aDown = false;
});

// Update display from server data
socket.on('state', (players)=>{
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Drawing constants
    localPlayer = players[socket.id];
    centerX = canvas.width/2;
    centerY = canvas.height/2;

    // Draw red background
    context.fillStyle="rgb(217, 52, 52)";
    context.fillRect(0,0,canvas.width,canvas.height);

    // Draw white play area
    context.fillStyle="white";
    context.fillRect(centerX - localPlayer.x, centerY - localPlayer.y, 2000, 2000);

    // Draw background grid
    for (let i = 50; i < 2000; i += 50) {
        context.beginPath();
        context.moveTo(centerX + i - localPlayer.x, centerY - localPlayer.y);
        context.lineTo(centerX + i - localPlayer.x, centerY + 2000 - localPlayer.y);
        context.strokeStyle = "rgb(186, 186, 186)";
        context.stroke();
    }
    for (let i = 50; i < 2000; i += 50) {
        context.beginPath();
        context.moveTo(centerX - localPlayer.x, centerY + i - localPlayer.y);
        context.lineTo(centerX + 2000 - localPlayer.x, centerY + i - localPlayer.y);
        context.strokeStyle = "rgb(186, 186, 186)";
        context.stroke();
    }

    // Draw players 
    for (let id in players) {
        const player = players[id];
        if (player.spawned) {
            
            drawX = canvas.width/2;
            drawY = canvas.height/2;
            context.beginPath();
            if (id != socket.id) {
                console.log("update");
                drawX += player.x - players[socket.id].x;
                drawY += player.y - players[socket.id].y;
            }
            context.arc(drawX, drawY, player.size, 0, 2 * Math.PI);
            context.fillStyle = player.color;
            context.fill();
            context.lineWidth = 4;
            context.strokeStyle = player.borderColor;
            context.stroke();

            // Draw player names
            context.fillStyle = "white"
            context.strokeStyle = "black"
            context.font = "24px Helvetica";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.lineJoin="round";
            context.miterLimit=2;
            context.strokeText(player.name, drawX, drawY);
            context.fillText(player.name, drawX, drawY);
        }

        
        
        // Draw border
        context.beginPath();
        context.moveTo(centerX - localPlayer.x, centerY - localPlayer.y);
        context.lineTo(centerX + 2000 - localPlayer.x, centerY - localPlayer.y);
        context.lineTo(centerX + 2000 - localPlayer.x, centerY + 2000 - localPlayer.y);
        context.lineTo(centerX - localPlayer.x, centerY + 2000 - localPlayer.y);
        context.lineTo(centerX - localPlayer.x, centerY - localPlayer.y);
        context.strokeStyle="rgb(168, 42, 42)";
        context.stroke();
        
        // Check if player is knocked out
        if (localPlayer.x + localPlayer.size > 2000 || localPlayer.x - localPlayer.size < 0 || localPlayer.y + localPlayer.size > 2000 || localPlayer.y - localPlayer.size < 0) {
            menu.classList.remove('hidden');
            socket.emit("knockedOut");
        }
    }
});

let framerate = 60
setInterval(function(){

    // Movement
    let dvY = 0;
    let dvX = 0;

    if (wDown && sDown) dvY = 0;
    else if (wDown) dvY = -0.1;
    else if (sDown) dvY = 0.1;

    if (aDown && dDown) dvX = 0;
    else if (aDown) dvX = -0.1;
    else if (dDown) dvX = 0.1;

    socket.emit('accelerate', {dvX: dvX, dvY: dvY})

}, 1000/framerate);