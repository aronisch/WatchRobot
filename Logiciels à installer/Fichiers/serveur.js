var express = require('express');
var app = express();
var fs = require('fs');
var http = require('http').createServer(app); //chargement des frameworks et creation du serveur
var io = require('socket.io').listen(http); //Création du socket
var gpio = require("pi-gpio");
var GPIO = gpio.GPIO;
/*var A1 = new GPIO("17");
var A2 = new GPIO("27");
var B1 = new GPIO("23");
var B2 = new GPIO("24");*/
var i2c = require('i2c');
var address = 0x04;
var wire = new i2c(address, {device: '/dev/i2c-1', debug: true});

var angularServoX = 80;
var angularServoY = 80;
var positionX, positionY = 0;
var lastSendServo = new Date();
var lastSendLeds = new Date();
var lastSendMotors = new Date();
var activeServo = false;
console.log('Launching Server'); //Annonce de la création du serveur sur les logs du serveur
gpio.close(11);
gpio.close(13);
gpio.close(16);
gpio.close(18);
gpio.open(11, "output", function(err) {});
gpio.open(13, "output", function(err) {});
gpio.open(16, "output", function(err) {});
gpio.open(18, "output", function(err) {});

/*var coreAudio = require("node-core-audio");

//var FFT = require('simple-fft');

var fft = require('kissfft').fft;

var sampleRate = 44100;

var buffer;

function processAudio( inputBuffer ) {
    buffer = new Float32Array(inputBuffer[0].length);
    for(var i = 0; i < inputBuffer[0].length ; i++) {
        buffer[i] = inputBuffer[0][i];
    }
    var output = [];
    output[0] = [0,0];
    return output;
}
var counterAlarm = 0;
setInterval(function(){
    var results = Float32Array(buffer.length + 2);
    fft(buffer, results, function(err, result) {
        //var results = FFT(buffer);
        var maxIntensity = 0;
        var maxIntensityIndex = 0;
        for(var i = 0; i < result.length ; i++) {
            if(maxIntensity < result[i]) {
                maxIntensity = result[i];
                maxIntensityIndex = i;
            }
        }

        var maxFrequency = maxIntensityIndex * sampleRate / buffer.length * 0.5;
        if(2550<maxFrequency && maxFrequency < 2680) {
            counterAlarm++;
        }
        if(counterAlarm >= 2){
            console.log("Alarme");
            wire.write('/A' +'000', function(error) {
            if(error) {
                console.log("Erreur : " + error.message);
            }
            setTimeout(function() {
                wire.write('/B' +'000', function(error) {
                    if(error) {
                        console.log("Erreur : " + error.message);
                    }
                    setTimeout(function() {
                        wire.write('/C' +'000', function(error) {
                            if(error) {
                                console.log("Erreur : " + error.message);
                            }
                            setTimeout(function() {
                                wire.write('/D' +'000', function(error) {
                                    if(error) {
                                    console.log("Erreur : " + error.message);
                                    }
                                });
                            }, 50);
                        });
                    }, 50);
                });
            }, 50);   
        });
            counterAlarm = 0;
        }
        console.log("Freq:" + maxFrequency); 
    });
}, 500);

setInterval(function(){
    counterAlarm = 0;
}, 2000);

var engine = coreAudio.createNewAudioEngine();

engine.addAudioCallback( processAudio );*/

/*A1.open();
A2.open();
B1.open();
A2.open();
A1.setMode(gpio.OUT);
A2.setMode(gpio.OUT);
B1.setMode(gpio.OUT);
A2.setMode(gpio.OUT);*/

if( process.argv.length < 3 ) {
	console.log(
		'Usage: \n' +
		'node stream-server.js <secret> [<stream-port> <websocket-port>]'
	);
	process.exit();
}

var STREAM_SECRET = process.argv[2],
	STREAM_PORT = process.argv[3] || 8082,
	WEBSOCKET_PORT = process.argv[4] || 8084,
	STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes

var width = 320,
	height = 240;

// Websocket Server
var socketServer = new (require('ws').Server)({port: WEBSOCKET_PORT});
socketServer.on('connection', function(socket) {
	// Send magic bytes and video size to the newly connected socket
	// struct { char magic[4]; unsigned short width, height;}
	var streamHeader = new Buffer(8);
	streamHeader.write(STREAM_MAGIC_BYTES);
	streamHeader.writeUInt16BE(width, 4);
	streamHeader.writeUInt16BE(height, 6);
	socket.send(streamHeader, {binary:true});

	console.log( 'New WebSocket Connection ('+socketServer.clients.length+' total)' );
	
	socket.on('close', function(code, message){
		console.log( 'Disconnected WebSocket ('+socketServer.clients.length+' total)' );
	});
});

socketServer.broadcast = function(data, opts) {
	for( var i in this.clients ) {
		if (this.clients[i].readyState == 1) {
			this.clients[i].send(data, opts);
		}
		else {
			console.log( 'Error: Client ('+i+') not connected.' );
		}
	}
};


// HTTP Server to accept incomming MPEG Stream
var streamServer = require('http').createServer( function(request, response) {
	var params = request.url.substr(1).split('/');

	if( params[0] == STREAM_SECRET ) {
		width = (params[1] || 320)|0;
		height = (params[2] || 240)|0;
		
		console.log(
			'Stream Connected: ' + request.socket.remoteAddress + 
			':' + request.socket.remotePort + ' size: ' + width + 'x' + height
		);
		request.on('data', function(data){
			socketServer.broadcast(data, {binary:true});
		});
	}
	else {
		console.log(
			'Failed Stream Connection: '+ request.socket.remoteAddress + 
			request.socket.remotePort + ' - wrong secret.'
		);
		response.end();
	}
}).listen(STREAM_PORT);

console.log('Listening for MPEG Stream on http://127.0.0.1:'+STREAM_PORT+'/<secret>/<width>/<height>');
console.log('Awaiting WebSocket connections on ws://127.0.0.1:'+WEBSOCKET_PORT+'/');


app.get('/', function(req, res) { // Réponse à la requête du client pour l'accueil
    fs.readFile('./stream-example.html', 'utf-8', function(error, content) {
        if(!error) { //Verifie si la lecture du fichier s'est bien passé
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(content);
        } else {
            console.log(error.message); //Si il y a erreur affichage sur la console et envoie d'une page d'erreur
            res.writeHead(500);
            res.end("Erreur 500 : Erreur Interne du Serveur");
        }
    });
});

/*app.get('/style.css', function(req, res) { //Idem Réponse pour la feuille de style
    fs.readFile('./style.css', 'utf-8', function(error, content) {
        if(!error) {
            res.writeHead(200, {"Content-Type": "text/css"});
            res.end(content);
        } else {
            console.log(error.message); //Si il y a erreur affichage sur la console et envoie d'une page d'erreur
            res.writeHead(500);
            res.end("Erreur 500 : Erreur Interne du Serveur");
        }
    });   
});*/

app.get('/jsmpg.js', function(req, res) { //Idem Réponse pour la librairie jQuery
    fs.readFile('./jsmpg.js', 'utf-8', function(error, content) {
        if(!error) {
            res.writeHead(200, {"Content-Type": "script/javascript"});
            res.end(content);
        } else {
            console.log(error.message); //Si il y a erreur affichage sur la console et envoie d'une page d'erreur
            res.writeHead(500);
            res.end("Erreur 500 : Erreur Interne du Serveur");
        }
    });   
});

/*app.get('/virtualjoystick.js', function(req, res) { //Idem Réponse pour la librairie du Joystick
    fs.readFile('./virtualjoystick.js', 'utf-8', function(error, content) {
        if(!error) {
            res.writeHead(200, {"Content-Type": "script/javascript"});
            res.end(content);
        } else {
            console.log(error.message); //Si il y a erreur affichage sur la console et envoie d'une page d'erreur
            res.writeHead(500);
            res.end("Erreur 500 : Erreur Interne du Serveur");
        }
    });   
});

app.get('/socket.io.js', function(req, res) { //Idem Réponse pour la librairie du socket
    fs.readFile('./socket.io.js', 'utf-8', function(error, content) {
        if(!error) {
            res.writeHead(200, {"Content-Type": "script/javascript"});
            res.end(content);
        } else {
            console.log(error.message); //Si il y a erreur affichage sur la console et envoie d'une page d'erreur
            res.writeHead(500);
            res.end("Erreur 500 : Erreur Interne du Serveur");
        }
    });   
});*/

setInterval(function() {
    if(activeServo) {
        angularServoX -= positionX / 5;
        angularServoY += positionY / 5;
        if(angularServoX < 0) {angularServoX = 0;}
        if(angularServoY < 0) {angularServoY = 0;}
        if(angularServoX > 160) {angularServoX = 160;}
        if(angularServoY > 160) {angularServoY = 160;}
        angularServoX = parseInt(angularServoX);
        angularServoY = parseInt(angularServoY);        
        console.log("Angle Caméra X :" + angularServoX + " / Y :" + angularServoY);

        var instructionsX = String('/X').concat(angularServoX);
        var instructionsY = String('/Y').concat(angularServoY);

        if(angularServoX < 100) {instructionsX = String('/X0').concat(angularServoX);}
        if(angularServoY < 100) {instructionsY = String('/Y0').concat(angularServoY);}
        if(angularServoX < 10) {instructionsX = String('/X00').concat(angularServoX);}
        if(angularServoY < 10) {instructionsY = String('/Y00').concat(angularServoY);}
        console.log("Instructions X : " + instructionsX + " / Y: " + instructionsY);

        //Send Servo Data with I2C
        wire.write(instructionsX, function(error) {
            if(error) {
                console.log("Erreur : " + error.message);
            }
            setTimeout(function(){
                wire.write(instructionsY, function(error) {
                    if(error) {
                        console.log("Erreur : " + error.message);
                    }
                });
            }, 100);
        });
        console.log("\n");
    }
}, 50);

// Chargement de socket.io

io.sockets.on('connection', function (socket) {
    console.log('Un client est connecté !'); //Notification sur la console de la connection d'un client
    
    socket.on('Moteur', function (data) { //Lors de la réception d'un message du client
        
        var speedRight = data.speedRight;
        var speedLeft = data.speedLeft;
        
        var instructionsRight = String('/R0').concat(Math.abs(speedRight));
        var instructionsLeft = String('/L0').concat(Math.abs(speedLeft));
        if(Math.abs(speedRight) < 10) {instructionsRight = String('/R00').concat(Math.abs(speedRight));}
        if(Math.abs(speedLeft) < 10) {instructionsLeft = String('/L00').concat(Math.abs(speedLeft));}
        //Send Motor Data with I2C
        var currentTime = new Date();
        if(currentTime - lastSendMotors > 100) {
            console.log("Vitesse Moteurs Droit : " + speedRight + " / Gauche : " + speedLeft); //Affichage du message sur la console
            wire.write(instructionsRight, function(error) {
                if(error) {
                console.log("Erreur : " + error.message);
            }
                setTimeout(function() {
                    wire.write(instructionsLeft, function(error) {
                        if(error) {
                            console.log("Erreur : " + error.message);
                        }
                    });
                    
                    if(speedRight < 0) {
                        //A1.write(gpio.HIGH);
                        //A2.write(gpio.LOW);
                        gpio.write(11, 1, function() {});
                        gpio.write(13, 0, function() {});
                    } else {
                        //A1.write(gpio.LOW);
                        //A2.write(gpio.HIGH);
                        gpio.write(11, 0, function() {});
                        gpio.write(13, 1, function() {});
                    }
                    
                    if(speedLeft < 0) {
                        //B1.write(gpio.HIGH);
                        //B2.write(gpio.LOW);
                        gpio.write(16, 1, function() {});
                        gpio.write(18, 0, function() {});
                    } else {
                        //B1.write(gpio.LOW);
                        //B2.write(gpio.HIGH);
                        gpio.write(16, 0, function() {});
                        gpio.write(18, 1, function() {});
                    }
                    
                }, 100);
            });
            
            lastSendMotors = new Date();
        }
    });
    
    socket.on('Servo', function(data) {
        
        positionX = data.ServoPositionX;
        positionY = data.ServoPositionY;
        if(positionX != 0) {
            activeServo = true;
        } else if (positionY != 0){
            activeServo = true;
        } else {
            activeServo = false;
        }
        
        var currentTime = new Date();

        if(currentTime - lastSendServo > 100) {
            //Convert Received Data to Servo Angle Position
            
            angularServoX += positionX / 5;
            angularServoY += positionY / 5;
            if(angularServoX < 0) {angularServoX = 0;}
            if(angularServoY < 0) {angularServoY = 0;}
            if(angularServoX > 160) {angularServoX = 160;}
            if(angularServoY > 160) {angularServoY = 160;}
            angularServoX = parseInt(angularServoX);
            angularServoY = parseInt(angularServoY);
            
            

            console.log("Angle Caméra X :" + angularServoX + " / Y :" + angularServoY);

            var instructionsX = String('/X').concat(angularServoX);
            var instructionsY = String('/Y').concat(angularServoY);

            if(angularServoX < 100) {instructionsX = String('/X0').concat(angularServoX);}
            if(angularServoY < 100) {instructionsY = String('/Y0').concat(angularServoY);}
            if(angularServoX < 10) {instructionsX = String('/X00').concat(angularServoX);}
            if(angularServoY < 10) {instructionsY = String('/Y00').concat(angularServoY);}
            console.log("Instructions X : " + instructionsX + " / Y: " + instructionsY);

            //Send Servo Data with I2C
            wire.write(instructionsX, function(error) {
                if(error) {
                    console.log("Erreur : " + error.message);
                }
                setTimeout(function(){
                    wire.write(instructionsY, function(error) {
                        if(error) {
                            console.log("Erreur : " + error.message);
                        }
                    });
                }, 100);
            });
            console.log("\n");
            lastSendServo = new Date();
        }
    });
    
    socket.on('RAZCam', function(){
        console.log("RAZ Caméra");
        //Send Servo Data with I2C
        wire.write(0, function(error) {
            if(error) {
                console.log("Erreur : " + error.message);
            }
            setTimeout(function(){
                wire.write(0, function(error) {
                    if(error) {
                        console.log("Erreur : " + error.message);
                    }
                });
            }, 100);
        });
    });
    
    socket.on('LEDs', function(data) {
    //Convert LEDs State
    var instructionsLEDs;
    if (data.LEDstate == '1') {
        instructionsLEDs = '111';
        console.log("LEDs Allumées");
    } else {
        instructionsLEDs = '000';
        console.log("LEDs Éteintes");
    }
    //Send LEDs data with I2C
    
    var currentTime = new Date();
    
    if(currentTime - lastSendLeds > 400) {
    
        wire.write('/A' + instructionsLEDs, function(error) {
            if(error) {
                console.log("Erreur : " + error.message);
            }
            setTimeout(function() {
                wire.write('/B' + instructionsLEDs, function(error) {
                    if(error) {
                        console.log("Erreur : " + error.message);
                    }
                    setTimeout(function() {
                        wire.write('/C' + instructionsLEDs, function(error) {
                            if(error) {
                                console.log("Erreur : " + error.message);
                            }
                            setTimeout(function() {
                                wire.write('/D' + instructionsLEDs, function(error) {
                                    if(error) {
                                    console.log("Erreur : " + error.message);
                                    }
                                });
                            }, 50);
                        });
                    }, 50);
                });
            }, 50);   
        });
        lastSendLeds = new Date();
    }
});
});

io.sockets.on('disconnect', function() {
    gpio.close(11);
    gpio.close(13);
    gpio.close(16);
    gpio.close(18);
});

http.listen(80);