/*
==============================================
AETHERIUM LABYRINTH - MAIN PROCESS (main.js) - V6 (Robust I/O)
==============================================
Handles window creation, robust file I/O (Excel), and serial hardware communication.
*/

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// --- FILE PATH ---
// The leaderboard is stored in the same folder as the application executable.
const LEADERBOARD_PATH = path.join(__dirname, 'leaderboard.xlsx');

// --- GLOBAL VARIABLES ---
let mainWindow; // Holds the main window object to prevent garbage collection.
let port;       // Holds the serial port object.

// --- EXCEL CONFIGURATION ---
// Defines the structure of the leaderboard file.
// The 'key' is used internally in the code, and the 'header' is what appears in the Excel file.
const excelColumns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'RollNo', key: 'rollNo', width: 15 },
    { header: 'BestTime', key: 'time', width: 15 },
    { header: 'Successes', key: 'successes', width: 15 },
    { header: 'Defeats', key: 'defeats', width: 15 },
    { header: 'HasImproved', key: 'hasImproved', width: 15 }
];

/**
 * Initializes the leaderboard Excel file on startup.
 * Creates a new file with the correct headers if one doesn't exist.
 */
async function initializeLeaderboard() {
    try {
        await fs.promises.access(LEADERBOARD_PATH);
        console.log(`Leaderboard file found at: ${LEADERBOARD_PATH}`);
    } catch (error) {
        console.log('Leaderboard file not found. Creating a new one...');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Leaderboard');
        sheet.columns = excelColumns;
        await workbook.xlsx.writeFile(LEADERBOARD_PATH);
        console.log(`Created leaderboard at: ${LEADERBOARD_PATH}`);
    }
}

/**
 * Creates the main application window.
 */
function createWindow() {
    if (mainWindow) {
        mainWindow.focus();
        return;
    }
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 940,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.webContents.openDevTools(); // Open developer tools for debugging.

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * Sets up the serial port connection to listen for data from the Arduino.
 * This function will attempt to connect to a specified COM port.
 */
function setupSerialPort() {
    // Log all available serial ports to the console to help with debugging.
    SerialPort.list().then(ports => {
        console.log('Available serial ports:', ports);
        // Prioritize a more robust Arduino detection (Standard Arduino Vendor ID is 2341)
        // New, improved code
        const arduinoPort = ports.find(p => {
            return (p.manufacturer && p.manufacturer.includes('Arduino')) || 
                (p.manufacturer && p.manufacturer.includes('wch.cn'));
        });
        if (arduinoPort) {
            console.log(`Arduino found on port: ${arduinoPort.path}`);
            connectToPort(arduinoPort.path);
        } else {
            console.warn('No Arduino found automatically. Please specify the port manually if needed.');
        }
    }).catch(err => console.error('Error listing serial ports:', err));
}

/**
 * Connects to a specific serial port path.
 * @param {string} portPath - The path of the serial port (e.g., 'COM3' or '/dev/ttyUSB0').
 */
function connectToPort(portPath) {
     try {
        if (port && port.isOpen) {
            port.close(() => {
                console.log(`Closed existing port: ${port.path}`);
                createNewPort(portPath);
            });
        } else {
            createNewPort(portPath);
        }
     } catch (error) {
        console.error(`Failed to manage serial port ${portPath}.`, error);
     }
}

function createNewPort(portPath) {
    port = new SerialPort({ path: portPath, baudRate: 9600 });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    // Listen for data from the Arduino.
    parser.on('data', (data) => {
        console.log(`Data from Arduino on ${portPath}:`, data);
        // When data is received, forward it to the UI (renderer process).
        if (mainWindow) {
            mainWindow.webContents.send('serial:data-received', data.trim());
        }
    });

    port.on('open', () => console.log(`Serial port ${portPath} opened successfully.`));
    port.on('error', (err) => {
        console.error('SerialPort Error: ', err.message);
        // Potentially notify the UI of the serial error
        if (mainWindow) {
            mainWindow.webContents.send('serial:error', err.message);
        }
    });
    port.on('close', () => {
        console.log(`Serial port ${portPath} closed.`);
        // Potentially notify the UI of the serial port being closed
        if (mainWindow) {
            mainWindow.webContents.send('serial:closed');
        }
    });
}


// --- APPLICATION LIFECYCLE ---

// This method is called when Electron has finished initialization.
app.whenReady().then(async () => {
    await initializeLeaderboard();
    createWindow();
    setupSerialPort(); // Attempt to connect to Arduino on startup.
    
    app.on('activate', () => {
        // On macOS, re-create a window when the dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (port && port.isOpen) {
            port.close(); // Close serial port cleanly on app quit
        }
        app.quit();
    }
});


// --- IPC (Inter-Process Communication) HANDLERS ---
// These functions handle messages sent from the UI (renderer process).

ipcMain.on('app:quit', () => app.quit());
ipcMain.on('app:show-file', () => shell.showItemInFolder(LEADERBOARD_PATH));

/**
 * Reads all player data from the leaderboard Excel file.
 * This function is now robust and maps columns by header name, not by fixed position.
 */
async function readData() {
    const workbook = new ExcelJS.Workbook();
    try {
        if (!fs.existsSync(LEADERBOARD_PATH) || fs.statSync(LEADERBOARD_PATH).size === 0) {
            return [];
        }
        await workbook.xlsx.readFile(LEADERBOARD_PATH);

        const sheet = workbook.getWorksheet('Leaderboard');
        if (!sheet || sheet.rowCount <= 1) {
            return [];
        }

        const headerRow = sheet.getRow(1);
        if (!headerRow.values || headerRow.values.length === 0) return [];
        
        const headerKeyMap = {};
        headerRow.eachCell((cell, colNumber) => {
            const columnDef = excelColumns.find(c => c.header === cell.value);
            if (columnDef) {
                headerKeyMap[colNumber] = columnDef.key;
            }
        });

        const data = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const player = {};
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const key = headerKeyMap[colNumber];
                    if (key) player[key] = cell.value;
                });

                // Sanitize data types after reading from Excel.
                player.rollNo = String(player.rollNo || '');
                player.successes = Number(player.successes) || 0;
                player.defeats = Number(player.defeats) || 0;
                player.time = player.time ? Number(player.time) : Infinity;
                player.hasImproved = player.hasImproved === true || `${player.hasImproved}`.toLowerCase() === 'true';
                
                if(player.rollNo) data.push(player); // Only add rows that have a roll number
            }
        });
        return data;

    } catch (error) {
        console.error("Failed to load leaderboard:", error);
        return []; // Return empty array on failure to prevent data loss.
    }
}

// Exposes the readData function to the UI.
ipcMain.handle('excel:load-data', async () => await readData());

// Handles saving game results to the Excel file.
ipcMain.handle('excel:save-data', async (event, newEntry) => {
    try {
        let data = await readData();
        const newEntryRollNo = String(newEntry.rollNo);
        const existingPlayerIndex = data.findIndex(p => p.rollNo === newEntryRollNo);
        
        data.forEach(p => p.hasImproved = false);

        if (existingPlayerIndex > -1) {
            // --- Player exists: Update their record ---
            const player = data[existingPlayerIndex];
            if (newEntry.status === 'success') {
                player.successes = (player.successes || 0) + 1;
                if (newEntry.time < player.time) {
                    player.time = newEntry.time;
                    player.name = newEntry.name;
                    player.hasImproved = true;
                }
            } else { // status is 'defeat'
                player.defeats = (player.defeats || 0) + 1;
            }
        } else {
            // --- New player: Create a new record ---
            data.push({
                name: newEntry.name,
                rollNo: newEntryRollNo,
                time: newEntry.status === 'success' ? newEntry.time : Infinity,
                successes: newEntry.status === 'success' ? 1 : 0,
                defeats: newEntry.status === 'defeat' ? 1 : 0,
                hasImproved: newEntry.status === 'success'
            });
        }

        // --- Write the updated data back to the file ---
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Leaderboard');
        sheet.columns = excelColumns;
        sheet.addRows(data);
        await workbook.xlsx.writeFile(LEADERBOARD_PATH);

        return { success: true };

    } catch (error) {
        console.error('!!! FAILED TO SAVE DATA TO EXCEL !!!', error);
        return { success: false, error: error.message };
    }
});

// --- Unified IPC Handler for sending serial commands to Arduino ---
ipcMain.on('serial:send-command', (event, command) => {
    if (port && port.isOpen) {
        console.log(`Sending command to Arduino: ${command}...`);
        port.write(`${command}\n`, (err) => { // Send command followed by a newline
            if (err) {
                console.error(`Error writing '${command}' to serial port:`, err.message);
            }
        });
    } else {
        console.warn(`Serial port not open. Cannot send '${command}' command.`);
        // Optionally, try to reconnect here or notify the UI
        setupSerialPort();
    }
});


// Clean up serial port on app exit
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (port && port.isOpen) {
            port.close();
            console.log('Serial port closed on app exit.');
        }
        app.quit();
    }
});