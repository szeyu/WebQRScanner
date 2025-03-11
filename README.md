# WebQRScanner - Chrome Extension

## Overview

WebQRScanner is a lightweight Chrome extension that streamlines the process of scanning QR codes found on web pages. Instead of taking screenshots, switching to a QR scanner app, or using your phone to scan your computer screen, WebQRScanner allows you to select any area of a webpage containing a QR code and instantly scan it.

## Features

- **Area Selection**: Precisely select the area of the webpage containing the QR code
- **Instant Scanning**: Automatically processes and scans the selected area
- **URL Detection**: Automatically identifies when QR codes contain URLs
- **One-Click Actions**: Copy QR code content to clipboard or open URLs directly
- **Clean Interface**: Simple, intuitive UI that stays out of your way

## How It Works

1. Click the WebQRScanner icon in your browser toolbar
2. Select "Select Area to Scan" button
3. Draw a rectangle around the QR code on the webpage
4. The extension automatically captures, processes, and scans the selected area
5. View the QR code content and take action (copy or open URL)

## Technical Details

WebQRScanner is built using:

- Chrome Extension Manifest V3
- JavaScript (ES6+)
- jsQR library for QR code detection
- HTML5 Canvas for image processing
- Chrome Extension APIs (storage, tabs, scripting)

The extension uses a content script to handle the area selection UI, a background script to process the captured image, and a popup interface to display results and provide user actions.

## Privacy

WebQRScanner respects your privacy:

- All processing happens locally in your browser
- No data is sent to external servers
- No tracking or analytics
- Minimal permissions required

## Installation

1. Download the extension from the Chrome Web Store (link coming soon)
2. Click "Add to Chrome" to install
3. The WebQRScanner icon will appear in your browser toolbar

## Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The WebQRScanner icon will appear in your browser toolbar

## Usage Tips

- For best results, ensure the QR code is clearly visible and not distorted
- The selected area should include the entire QR code with a small margin
- Works with both black/white and colored QR codes
- If scanning fails, try selecting a slightly larger area around the QR code

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [jsQR](https://github.com/cozmo/jsQR) for the QR code scanning library
- All contributors and testers who helped improve this extension

---

## Future Plans

- Support for additional barcode formats (Code128, EAN, etc.)
- Batch scanning of multiple QR codes
- History of scanned codes
- Customizable UI themes
- Export options for scanned data

---

*WebQRScanner - Scan QR codes directly from your browser*
