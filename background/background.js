// background.js

// Function to inject scripts into the active tab
async function injectScripts(tabId) {
    try {
        // First inject jsQR library
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['background/dist/jsQR.js']
        });
        
        // Then inject content script
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/content.js']
        });
        
        // Inject CSS
        await chrome.scripting.insertCSS({
            target: { tabId },
            files: ['content/content.css']
        });
        
        return true;
    } catch (error) {
        console.error('Script injection error:', error);
        return false;
    }
}

// Update your message listener to ensure scripts are injected
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'captureArea') {
        captureAndProcessArea(message.rect, sender.tab);
    }
    if (message.action === 'processImageForQRCode') {
        processImageForQRCode(sender.tab);
    }
});

function captureAndProcessArea(rect, tab) {
    chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
            console.error('Capture failed:', chrome.runtime.lastError);
            return;
        }

        // Create a temporary canvas to process the captured data
        const canvas = new OffscreenCanvas(rect.width, rect.height);
        const ctx = canvas.getContext('2d');
        
        // Create a blob from the data URL
        fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => createImageBitmap(blob))
            .then(bitmap => {
                // Draw the cropped portion
                ctx.drawImage(
                    bitmap,
                    rect.left, rect.top,
                    rect.width, rect.height,
                    0, 0, canvas.width, canvas.height
                );
                
                // Convert the canvas to blob
                return canvas.convertToBlob({ type: 'image/png' });
            })
            .then(blob => {
                // Convert blob to data URL
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            })
            .then(croppedDataUrl => {
                // Store the cropped image
                console.log('Cropped image URL:', croppedDataUrl);
                chrome.storage.local.set({ 
                    lastCapturedImage: croppedDataUrl,
                    captureComplete: true,  // Flag to indicate capture is complete
                    captureInProgress: false // Clear the in-progress flag
                }, () => {
                    // Open the popup after storage is updated
                    chrome.action.openPopup();
                });
            })
            .catch(error => {
                console.error('Error processing image:', error);
            });
    });
}

function processImageForQRCode(tab) {
    chrome.storage.local.get('lastCapturedImage', (result) => {
        const imageUrl = result.lastCapturedImage;
        console.log('Processing image:', imageUrl);

        // We'll use a content script to process the image with QR code libraries
        // that require DOM access
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'scanQRCode',
                    imageUrl: imageUrl
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        // Handle error - maybe the content script isn't ready
                        console.error('Error sending message to content script:', chrome.runtime.lastError);
                        simulateQRCodeResult();
                        return;
                    }
                    
                    if (response && response.success) {
                        // Store the result
                        chrome.storage.local.set({ 
                            lastProcessedResult: {
                                text: response.data,
                                isUrl: isValidUrl(response.data)
                            }
                        }, () => {
                            // Notify the popup that processing is complete
                            chrome.runtime.sendMessage({
                                action: 'processingComplete',
                                success: true
                            });
                        });
                    } else {
                        // Handle error or no QR code found
                        chrome.storage.local.set({ 
                            lastProcessedResult: { 
                                error: response ? response.error : 'Failed to scan QR code' 
                            }
                        }, () => {
                            chrome.runtime.sendMessage({
                                action: 'processingComplete',
                                success: false,
                                error: response ? response.error : 'Failed to scan QR code'
                            });
                        });
                    }
                });
            } else {
                // Fallback if no active tab
                console.log('No active tab found');
            }
        });
    });
}

// Helper function to check if a string is a valid URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}