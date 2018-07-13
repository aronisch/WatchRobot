#include <Wire.h>
#include <Servo.h>

#define SLAVE_ADDRESS 0x04
#define SERVO_X 5
#define SERVO_Y 6
#define LED_A 2
#define LED_B 3
#define LED_C 4
#define LED_D 7
#define MOTOR_R 10
#define MOTOR_L 11

char data[6];
int index = 0;
int instructionsValue;
boolean ledState;
Servo servoControllerX;
Servo servoControllerY;

void setup() {
  //Logs Serial
  Serial.begin(9600);
  
  //I2C Connection
  Wire.begin(SLAVE_ADDRESS);
  Wire.onReceive(dataReceiver);
  Wire.onRequest(dataSender);
  
  //PIN Definitions
  pinMode(LED_A, OUTPUT);
  pinMode(LED_B, OUTPUT);
  pinMode(LED_C, OUTPUT);
  pinMode(LED_D, OUTPUT);
  pinMode(MOTOR_R, OUTPUT);
  pinMode(MOTOR_L, OUTPUT);
  //Servos Definitions
  servoControllerX.attach(SERVO_X);
  servoControllerY.attach(SERVO_Y);
  servoControllerX.write(80);
  servoControllerY.write(80);

  
  Serial.println("Started");
}

void loop() {
  //delay(100);
}

void dataReceiver(int byteCount) {
  index = 0;
  while(Wire.available()) {
    char c = Wire.read();
    //Serial.print(c);
    data[index] = c;
    index++;
  }
  Serial.print("Data :");
  for(int i=0; i<=index; i++) {
    Serial.print(data[i]);
  }
  char nb[4];
  nb[0] = data[2];
  nb[1] = data[3];
  nb[2] = data[4];
  Serial.println("");
      //Serial.println("Trame complete");
      switch (data[1]) {
        case 'R':
          instructionsValue = atoi(nb);
          instructionsValue = instructionsValue * 15;
          if(instructionsValue >= 150) {
             instructionsValue = 150; 
          }
          digitalWrite(MOTOR_R, instructionsValue);
          Serial.print("MD : ");
          Serial.print(instructionsValue);
          Serial.println();
          break;
        case 'L':
          instructionsValue = atoi(nb);
          instructionsValue = instructionsValue * 15;
          if(instructionsValue >= 150) {
             instructionsValue = 150; 
          }
          digitalWrite(MOTOR_L, instructionsValue);
          Serial.print("MG : ");
          Serial.print(instructionsValue);
          Serial.println();
          break;
        case 'X':
          instructionsValue = atoi(nb);
          servoControllerX.write(instructionsValue);
          Serial.print("SX : ");
          Serial.print(instructionsValue);
          Serial.println();
          break;
        case 'Y':
          instructionsValue = atoi(nb);
          servoControllerY.write(instructionsValue);
          Serial.print("SY : ");
          Serial.print(instructionsValue);
          Serial.println();
          break;
        case 'A':
          ledState = atoi(nb);
          if(ledState) {
            digitalWrite(LED_A, HIGH);
          } else {
            digitalWrite(LED_A, LOW);
          }
          Serial.print("LED A : ");
          Serial.println(ledState);
          break;
        case 'B':
          ledState = atoi(nb);
          if(ledState) {
            digitalWrite(LED_B, HIGH);
          } else {
            digitalWrite(LED_B, LOW);
          }
          Serial.print("LED B : ");
          Serial.println(ledState);
          break;
        case 'C':
          ledState = atoi(nb);
          if(ledState) {
            digitalWrite(LED_C, HIGH);
          } else {
            digitalWrite(LED_C, LOW);
          }
          Serial.println("LED C : " + ledState);
          break;
        case 'D':
          ledState = atoi(nb);
          if(ledState) {
            digitalWrite(LED_D, HIGH);
          } else {
            digitalWrite(LED_D, LOW);
          }
          Serial.println("LED D : " + ledState);
          break;
        default:
          Serial.println("Erreur de trame");
          break;
      }
}

void dataSender() {
}
