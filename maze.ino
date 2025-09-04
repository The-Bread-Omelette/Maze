
```cpp
#include <Servo.h>

const int SERVO_X_PIN = 9;
const int SERVO_Y_PIN = 10;
const int TRIG_PIN = 11;
const int ECHO_PIN = 12;
const int JOY_X_PIN = A0;
const int JOY_Y_PIN = A1;

Servo servoX;
Servo servoY;

const int FALL_THRESHOLD = 5;
bool gameIsActive = false;

void setup() {
  Serial.begin(9600);
  servoX.attach(SERVO_X_PIN);
  servoY.attach(SERVO_Y_PIN);
  servoX.write(90);
  servoY.write(90);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  while (!Serial) {
    ;
  }
  Serial.println("Arduino Ready.");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "START" && !gameIsActive) {
      gameIsActive = true;
      Serial.println("Game Started!");
    }
  }

  if (gameIsActive) {
    // Read analog values from the joystick
    int joyX = analogRead(JOY_X_PIN);
    int joyY = analogRead(JOY_Y_PIN);

    // Map the joystick values (0-1023) to a servo angle range (e.g., 45-135)
    // Adjust the min (45) and max (135) angles to suit your maze's tilt limits
    int angleX = map(joyX, 0, 1023, 70, 110);
    int angleY = map(joyY, 0, 1023, 80, 110);

    // Write the new angles to the servos
    servoX.write(angleX);
    servoY.write(angleY);
    
    // Check if the ball has fallen
    long distance = getDistance();
    if (distance > 0 && distance < FALL_THRESHOLD) {
      gameIsActive = false;
      Serial.println("FINISH");
    }
  }
}

long getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  long distance = duration * 0.034 / 2;
  return distance;
}
