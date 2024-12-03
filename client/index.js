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
const score = document.getElementById("score");
const scoreText = document.getElementById("scoreText");
const menuForm = document.getElementById("menuForm");
const nameInput = document.getElementById("nameInput");
const leaderboard = document.getElementById("leaderboard");
const leaderboardTable = document.getElementById("leaderboardTable");
const highScore = document.getElementById("highScore");

// Update highscore
if (localStorage.getItem("highScore") != null) {
    highScore.innerText = "High Score: " + localStorage.getItem("highScore").toString();
}

// Join game
menuForm.addEventListener("submit", function(){
    menu.classList.add('hidden');
    score.classList.remove('hidden');
    leaderboard.classList.remove('hidden');
    socket.emit("spawn", {name: nameInput.value});
});


// Update input states
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

// Merge two leaderboard lists
function merge(list1, list2) {
    console.log(list1, list2);
    let i1 = 0;
    let i2 = 0;
    let output = []
    while (i1 < list1.length || i2 < list2.length) {
        if (i1 >= list1.length) {
            output.push(list2[i2]);
            i2 += 1
        } else if (i2 >= list2.length) {
            output.push(list1[i1])
            i1 += 1
        } else if (list2[i2][0] < list1[i1][0]) {
            output.push(list2[i2]);
            i2 += 1
        } else {
            output.push(list1[i1])
            i1 += 1
        }
    }
    return output;
}

// Merge sort scoreboard function
function sortLeaderboard(leaderboardList) {

    if (leaderboardList.length == 0) {
        return [];
    }

    if (leaderboardList.length == 1) {
        return leaderboardList
    } else {
        const mid = Math.floor(leaderboardList.length/2);
        console.log(leaderboardList, mid);
        return merge(sortLeaderboard(leaderboardList.slice(0, mid)), sortLeaderboard(leaderboardList.slice(mid)));
    }
}

// Update score when knocked out player
socket.on('score', (id, newScore, players)=> {
    if (id == socket.id) {
        scoreText.innerText = "Score:" + newScore.toString();
    }
    var rowCount = leaderboardTable.rows.length;
    for (var i = 1; i < rowCount; i++) {
        console.log(leaderboardTable.rows);
        leaderboardTable.deleteRow(1);
    }
    // Update leaderboard
    let leaderboardList = [];
    for (let id in players) {
        let player = players[id];
        if (player.spawned) {
            const score = player.score;
            let name = player.name;
            if (player.name == "") {
                name = "Unnamed ball"
            } else if (player.name.length > 8) {
                name = player.name.slice(0,10) + "...";
            }
            leaderboardList.push([score, name]);
        }
        
    }

    // Sort leaderboard entries and display result
    leaderboardList = sortLeaderboard(leaderboardList);
    for (let i = 0; i < leaderboardList.length; i++) {
        const entry = leaderboardList[i];
        let row = leaderboardTable.insertRow(1);
        let playerName = row.insertCell(0);
        let playerScore = row.insertCell(1);
        console.log(entry);
        playerName.innerHTML = entry[1];
        playerScore.innerHTML = entry[0];
    }
});

// Update display from server data
socket.on('state', (data)=>{
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Drawing constants
    players = data.players;
    pellets = data.pellets;
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

    // Draw pellets
    for (let i = 0; i < pellets.length; i++) {
        pellet = pellets[i];
        drawX = canvas.width/2 + pellet.x - localPlayer.x;
        drawY = canvas.height/2 + pellet.y- localPlayer.y;
        context.beginPath();
        context.arc(drawX, drawY, 8, 0, 2 * Math.PI);
        context.fillStyle = "white";
        context.fill();
        context.lineWidth = 4;
        context.strokeStyle = "black";
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
            score.classList.add('hidden');
            leaderboard.classList.add('hidden');
            // Update highscore
            if (localStorage.getItem("highScore") != null) {
                localStorage.setItem("highScore", Math.max(localStorage.getItem("highScore"), localPlayer.score))
            } else {
                localStorage.setItem("highScore", localPlayer.score);
            }
            highScore.innerText = "High Score: " + localStorage.getItem("highScore").toString();
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
