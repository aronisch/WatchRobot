#!/bin/bash
#WatchRobot Launcher
cd /home/pi/ServeurNode.js/
if [ $1 = "Video" ]
then
    echo "Launch Robot without the FFT"
    sudo node serveur &
    avconv -s 320x240 -f video4linux2 -i /dev/video0 -f mpeg1video -r 30 http://example.com:8082/pi/320/240/
elif [ $1 = "FFT" ]
then
    echo "Launch Robot with the FFT"
    sudo node serveurWithFFT &
    avconv -s 320x240 -f video4linux2 -i /dev/video0 -f mpeg1video -r 30 http://example.com:8082/pi/320/240/
else
    echo "Argument error : use \"Video\" or \"FFT\"
fi