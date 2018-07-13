#!/bin/bash
#WatchRobot Installer

#Compiling and Installing Node.js
echo "Compiling Node.js 0.10.38..."
echo "It's a long process : about 3 hours..."
tar -zxf node-v0.10.38.tar.gz
cd node-v0.10.38
./configure
make
sudo make install
cd ../

#Compiling an Installing PortAudio
echo "Compiling an Installing PortAudio..."
sudo apt-get install libasound-dev
tar -zxf pa_stable_v19_20140130.tgz
cd pa_stable_v19_20140130
./configure
make
sudo make install

#Copying Server Files and Installing dependencies
echo "Copying Server Files and Installing dependencies..."
mkdir /home/pi/WatchRobot/
cp -r ./Fichiers/. /home/pi/WatchRobot/
cd /home/pi/WatchRobot/
sudo npm install i2c@0.1.8
npm install express
npm install socket.io
npm install kissfft
npm install node-core-audio.tar.gz

git clone git://github.com/quick2wire/quick2wire-gpio-admin.git
cd quick2wire-gpio-admin
make
sudo make install
sudo adduser $USER gpio
cd ../
npm install pi-gpio

echo "Installation Done !" 
echo "Launch the server in /home/pi/WatchRobot/"
echo "with RobotLauncher.sh Video"
echo "or RobotLauncher.sh FFT"
