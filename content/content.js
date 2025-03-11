// content.js

class SelectionOverlay {
    constructor() {
        this.overlay = null;
        this.startX = 0;
        this.startY = 0;
        this.isSelecting = false;
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
    }

    initialize() {
        this.createOverlay();
        this.setupEventListeners();
        this.disableTextSelection();
        this.setCrosshairCursor();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            position: 'fixed',
            border: '2px dashed #007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            zIndex: 2147483647,
            display: 'none',
            pointerEvents: 'none'
        });
        document.body.appendChild(this.overlay);
    }

    disableTextSelection() {
        document.body.style.userSelect = 'none';
    }

    setCrosshairCursor() {
        document.body.style.cursor = 'crosshair';
    }

    setupEventListeners() {
        document.addEventListener('mousedown', this.boundMouseDown);
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
    }

    removeEventListeners() {
        document.removeEventListener('mousedown', this.boundMouseDown);
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
    }

    cleanup() {
        this.resetCursorAndSelection();
        this.removeEventListeners();
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
    }

    onMouseDown(e) {
        if (e.button !== 0) return; // Only respond to left-click
        this.isSelecting = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.overlay.style.left = `${this.startX}px`;
        this.overlay.style.top = `${this.startY}px`;
        this.overlay.style.width = '0px';
        this.overlay.style.height = '0px';
        this.overlay.style.display = 'block';
    }

    onMouseMove(e) {
        if (!this.isSelecting) return;
        const currentX = e.clientX;
        const currentY = e.clientY;
        const width = Math.abs(currentX - this.startX);
        const height = Math.abs(currentY - this.startY);
        this.overlay.style.width = `${width}px`;
        this.overlay.style.height = `${height}px`;
        this.overlay.style.left = `${Math.min(this.startX, currentX)}px`;
        this.overlay.style.top = `${Math.min(this.startY, currentY)}px`;
    }

    onMouseUp(e) {
        if (!this.isSelecting) return;
        this.isSelecting = false;
        const rect = this.overlay.getBoundingClientRect();
        this.overlay.style.display = 'none';

        // Send the selection rectangle to the background script
        chrome.runtime.sendMessage({
            action: 'captureArea',
            rect: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            }
        });

        // Clean up after capturing
        this.cleanup();
    }

    resetCursorAndSelection() {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    }
}

// Initialize the selection overlay when the content script is loaded
document.addEventListener('start-screenshot-selection', () => {
    new SelectionOverlay().initialize();
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scanQRCode') {
        scanQRCode(message.imageUrl)
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true; // Indicates we'll respond asynchronously
    }
});

// Function to load the jsQR library
function loadJsQR() {
    return new Promise((resolve, reject) => {
        // Check if jsQR is already loaded
        if (typeof jsQR === 'function') {
            resolve();
            return;
        }
        
        // Create script element
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('background/dist/jsQR.js');
        script.onload = () => {
            resolve();
        };
        script.onerror = () => {
            reject(new Error('Failed to load jsQR library'));
        };
        document.head.appendChild(script);
    });
}

// Function to scan QR code from an image URL
async function scanQRCode(imageUrl) {
    try {
        // Load jsQR library if not already loaded
        await loadJsQR();
        
        // Create a hidden image element
        const img = document.createElement('img');
        img.style.position = 'absolute';
        img.style.left = '-9999px';
        img.style.top = '-9999px';
        
        // Wait for the image to load
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
            document.body.appendChild(img);
        });
        
        // Create a canvas and draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get image data for QR code scanning
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR library to scan for QR code
        const code = jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
            { inversionAttempts: "dontInvert" }
        );
        
        // Clean up
        document.body.removeChild(img);
        
        if (code) {
            console.log('QR code found:', code.data);
            return { success: true, data: code.data };
        } else {
            return { success: false, error: 'No QR code found in the image' };
        }
    } catch (error) {
        console.error('QR code scanning error:', error);
        return { success: false, error: error.message };
    }
}
