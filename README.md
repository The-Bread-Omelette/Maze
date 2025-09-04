# Aetherium Labyrinth

Aetherium Labyrinth is a desktop application that serves as the user interface for a physical, hardware-based maze game. It captures player information, times their gameplay, and maintains a persistent leaderboard using an Excel file.

---

## Features

-   **Player Registration**: Collects player's name and roll number before starting the game.
-   **Live Game Timer**: A real-time timer tracks the player's progress through the maze.
-   **Hardware Integration**: Communicates with a hardware device (like an Arduino) via a serial port to start the game and detect when the maze is finished.
-   **Automated Leaderboard**: Automatically saves game results, including best times, successes, and defeats, to an `leaderboard.xlsx` file.
-   **Dynamic UI**: A futuristic, animated interface with separate screens for welcoming players, gameplay, and viewing results.
-   **Data Analytics**: The leaderboard screen displays key statistics like the all-time record, average best time, total players, and success rate.

---

## Technologies Used

-   **Electron**: To create the cross-platform desktop application.
-   **Node.js**: As the backend runtime environment.
-   **SerialPort**: For communication between the application and the hardware maze.
-   **ExcelJS**: To read from and write to the `.xlsx` leaderboard file.
-   **HTML, CSS, JavaScript**: For the user interface and frontend logic.

---

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### **Prerequisites**

You will need to have **Node.js** and **npm** (Node Package Manager) installed on your computer. You can download them from the official Node.js website:

[https://nodejs.org/](https://nodejs.org/)

### **Installation & Setup**

1.  **Clone the repository** (or download and extract the project files) to a folder on your computer.

2.  **Open a terminal** or command prompt and navigate to the project directory:
    ```bash
    cd path/to/your/project/folder
    ```

3.  **Install the required node packages**. The `package.json` file lists all the necessary dependencies. Run the following command to install them:
    ```bash
    npm install
    ```
    This will download all the dependencies, including Electron, ExcelJS, and SerialPort, into a `node_modules` folder.

### **Running the Application**

1.  Make sure your hardware maze (e.g., Arduino) is connected to your computer via a USB port. The application will attempt to automatically detect the correct port.

2.  In the terminal, from the project's root directory, run the start command:
    ```bash
    npm start
    ```
    This command executes `electron .`, which will launch the Aetherium Labyrinth application window.

You can now enter player details, start the game, and see the results logged in the `leaderboard.xlsx` file created in the project folder.
