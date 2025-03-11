// popup/popup.js
class PopupManager {
    constructor() {
      this.elements = {
        captureBtn: document.getElementById('capture-btn'),
        copyBtn: document.getElementById('copy-btn'),
        openLinkBtn: document.getElementById('open-link-btn'),
        statusText: document.getElementById('status'),
        imagePreview: document.getElementById('image-preview'),
        previewContainer: document.getElementById('preview-container'),
        resultContainer: document.getElementById('result-container'),
        qrResult: document.getElementById('qr-result'),
      };
      
      this.initialize();
    }
  
    initialize() {
      this.setupEventListeners();
      this.checkForExistingImage();
      
      // Add event listener for when popup is about to close
      window.addEventListener('beforeunload', () => this.resetOnClose());
    }
  
    setupEventListeners() {
      this.elements.captureBtn.addEventListener('click', () => this.startCapture());
      this.elements.copyBtn.addEventListener('click', () => this.copyResult());
      this.elements.openLinkBtn.addEventListener('click', () => this.openLink());
    }
    
    // Reset everything when popup is closed
    resetOnClose() {
      // Only reset if we're not in the middle of a capture
      chrome.storage.local.get('captureInProgress', (result) => {
        if (!result.captureInProgress) {
          chrome.storage.local.remove(['lastCapturedImage', 'lastProcessedResult', 'captureComplete']);
        }
      });
    }
  
    async checkForExistingImage() {
        const result = await chrome.storage.local.get(['lastCapturedImage', 'lastProcessedResult', 'captureComplete', 'captureInProgress']);
        
        if (result.captureComplete) {
            // If capture was just completed, show preview and process
            if (result.lastCapturedImage) {
                this.showPreview(result.lastCapturedImage);
                // Clear the flag
                chrome.storage.local.remove('captureComplete');
                // Process the image
                setTimeout(() => this.processImage(), 300);
            }
        } else if (result.captureInProgress) {
            // If capture is in progress, do nothing and wait
            chrome.storage.local.remove('captureInProgress');
        }
    
        // Show any existing results
        if (result.lastProcessedResult) {
            this.displayResult(result.lastProcessedResult);
        }
    }
    
    async startCapture() {
        
        this.updateStatus('Select an area to capture...', 'info', false, 0);
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab?.id || tab.url?.startsWith('chrome://')) {
            this.updateStatus('Cannot capture this page', 'error');
            return;
        }

        // Set flag that capture is in progress
        chrome.storage.local.set({ captureInProgress: true });

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              document.dispatchEvent(new CustomEvent('start-screenshot-selection'));
            }
        });
        
        // Minimize the popup to get out of the way
        window.close();
    }
  
    showPreview(imageUrl) {
      this.elements.imagePreview.src = imageUrl;
      this.elements.previewContainer.classList.remove('hidden');
      this.updateStatus('Ready to process');
    }
  
    async processImage() {
        this.updateStatus('Processing image...', 'info', true, 0);

        try {
            // Send the image to the background script with the selected prompt
            chrome.runtime.sendMessage({
                action: 'processImage',
            });

            // Wait for the processing to complete
            const result = await new Promise((resolve) => {
                const messageListener = (message) => {
                    if (message.action === 'processingComplete') {
                        chrome.runtime.onMessage.removeListener(messageListener);
                        resolve(message);
                    }
                };
                chrome.runtime.onMessage.addListener(messageListener);
            });

            // Get the processed result from storage
            const storage = await chrome.storage.local.get('lastProcessedResult');
            if (storage.lastProcessedResult) {
                this.displayResult(storage.lastProcessedResult);
                this.updateStatus('Processing complete', 'success');
            } else {
                this.updateStatus('No result received', 'error');
            }

            if (!result.success) {
                this.updateStatus(`Processing failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.updateStatus('Error processing image', 'error');
            console.error('Processing error:', error);
        }
    }
  
    displayResult(data) {
        // Handle different types of results
        let displayText = 'No content generated';
        
        if (data.error) {
            displayText = `Error: ${data.error}`;
            this.elements.openLinkBtn.classList.add('hidden');
        } else if (data.text) {
            displayText = data.text;
            
            // Show or hide the open link button based on whether the result is a URL
            if (data.isUrl) {
                this.elements.openLinkBtn.classList.remove('hidden');
            } else {
                this.elements.openLinkBtn.classList.add('hidden');
            }
        }

        this.elements.qrResult.textContent = displayText;
        this.elements.resultContainer.classList.remove('hidden');
    }
  
    async copyResult() {
        try {
            const text = this.elements.qrResult.textContent.trim();
            if (!text || text.startsWith('Error:')) {
                this.updateStatus('No valid text to copy', 'error');
                return;
            }
            
            await navigator.clipboard.writeText(text);
            
            // Store the original button content
            const originalText = this.elements.copyBtn.innerHTML;
            this.elements.copyBtn.innerHTML = '<span class="icon">✅</span> Copied!';
            setTimeout(() => {
                this.elements.copyBtn.innerHTML = originalText;
            }, 2000);
        } catch (error) {
            this.updateStatus('Failed to copy text', 'error');
        }
    }
    
    async openLink() {
        try {
            const url = this.elements.qrResult.textContent.trim();
            if (!url || url.startsWith('Error:')) {
                this.updateStatus('No valid URL to open', 'error');
                return;
            }
            
            // Open the URL in a new tab
            await chrome.tabs.create({ url });
        } catch (error) {
            this.updateStatus('Failed to open URL', 'error');
        }
    }
  
    updateStatus(message, type = 'info', showLoader = false, timeout = 3000) {
        this.elements.statusText.textContent = message;
        this.elements.statusText.className = `status-text ${type}`;
    
        if (showLoader) {
            this.elements.statusText.classList.add('loading');
        } else {
            this.elements.statusText.classList.remove('loading');
        }
    
        // Auto-clear message after timeout
        if (timeout) {
            setTimeout(() => {
                this.elements.statusText.textContent = '';
                this.elements.statusText.className = 'status-text';
            }, timeout);
        }
    }
}
  
// Initialize popup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});