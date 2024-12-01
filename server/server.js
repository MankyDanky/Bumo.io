// Required packages
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Constants
const maxV = 5;
const playerSize = 30;
const playerColors = ["rgb(66, 139, 255)", "rgb(255, 167, 66)", "rgb(66, 255, 123)", "rgb(255, 236, 66)", "rgb(255, 88, 66)", "rgb(153, 51, 255)"];
const playerBorderColors = ["rgb(47, 102, 189)", "rgb(209, 137, 54)", "rgb(49, 196, 93)", "rgb(222, 205, 55)", "rgb(212, 71, 53)", "rgb(115, 38, 191)"]

// Provide static files
app.use(express.static( path.join(__dirname, '../', '/client/')));

// Send landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../', '/client/index.html'));
});

// Listen for connections on port 2000
server.listen(2000, ()=> {
    console.log('Server is up on: 2000')
})

// Player data
let players = {}

// Dot production function
function dotProduct(a,b) {
    return a.map((x,i) => a[i]*b[i]).reduce((m,n) => m + n);
}

// Unit vector function
function unitVector(a) {
    const magnitude = Math.sqrt(a.reduce((accumulator, currentValue) => accumulator + currentValue**2, 0))
    return a.map((x) => x/magnitude);
}

io.on('connection', (socket) => {
    console.log('a user connected');
    players[socket.id] = {x: 1000, y: 1000, vX: 0, vY: 0, size: playerSize, aY: false, aX: false, spawned: false, name: "", color: "black", borderColor: "black"};
    
    socket.on('spawn', (data) => {
        console.log(data.name);
        players[socket.id].spawned = true;
        players[socket.id].name = data.name;
        const index = Math.floor(Math.random() * 6);
        players[socket.id].color = playerColors[index];
        players[socket.id].borderColor = playerBorderColors[index];
    });

    socket.on('accelerate', (data) => {
        players[socket.id].vX = Math.max(Math.min(players[socket.id].vX + data.dvX, maxV), -maxV);
        players[socket.id].vY = Math.max(Math.min(players[socket.id].vY + data.dvY, maxV), -maxV);
        if (data.dvY != 0) players[socket.id].aY = true;
        if (data.dvX != 0) players[socket.id].aX = true;
    });

    socket.on('disconnect', () => {
        console.log('a user disconnected');
        delete players[socket.id];
    });
})

// Game loop
let framerate = 60
setInterval(function(){
    for (let id in players) {
        if (players[id].spawned) {

            // Movement
            players[id].x += players[id].vX;
            players[id].y += players[id].vY;

            // Collision detection
            for (let id2 in players) {  
                if (id2 != id) {
                    const x1 = players[id].x;
                    const x2 = players[id2].x;
                    const y1 = players[id].y;
                    const y2 = players[id2].y;
                    const distance = Math.sqrt((x2-x1)**2 + (y2-y1)**2)

                    // Clipping
                    if (distance < 2*playerSize) {
                        let theta = Math.asin((y1-y2)/distance);
                        if (x1 < x2) {
                            theta = Math.PI-theta;
                        }
                        
                        const xn = x2 + Math.cos(theta)*playerSize*2;
                        const yn = y2 + Math.sin(theta)*playerSize*2;
                        players[id].x = xn;
                        players[id].y = yn;

                        // Collision solution
                        let impulseMaginitude = 0;
                        const v1 = Math.sqrt(players[id].vX**2 + players[id].vY**2);
                        const v2 = Math.sqrt(players[id2].vX**2 + players[id2].vY**2);

                        if (v1 != 0) {
                            impulseMaginitude += dotProduct(unitVector([players[id].vX, players[id].vY]), unitVector([players[id2].x-players[id].x, players[id2].y-players[id].y]))*v1;
                        }
                        if (v2 != 0) {
                            impulseMaginitude += dotProduct(unitVector([players[id2].vX, players[id2].vY]), unitVector([players[id].x-players[id2].x, players[id].y-players[id2].y]))*v2;
                        }
                        
                        console.log(impulseMaginitude);
                        const v2Y = players[id].vY - (Math.sin(theta) * impulseMaginitude)/2;
                        const v1Y = players[id2].vY + (Math.sin(theta) * impulseMaginitude)/2;
                        const v2X = players[id].vX - (Math.cos(theta) * impulseMaginitude)/2;
                        const v1X = players[id2].vX + (Math.cos(theta) * impulseMaginitude)/2;

                        players[id].vX = v1X;
                        players[id].vY = v1Y;
                        players[id2].vX = v2X;
                        players[id2].vY = v2Y;
                    }
                }
            }
            
            // Friction
            players[id].vX*=0.98
            players[id].vY*=0.98

            players[id].aX = false;
            players[id].aY = false;
        }
    }

    io.emit('state', players);
}, 1000/framerate);