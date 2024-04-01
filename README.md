# SEEK

## Development basics

### Prerequisites

1. Install Python 3.12
2. Install Node.js
3. Install Firebase

```sh
npm install -g firebase-tools
```

## Development

```sh
firebase emulators:start --only functions
```

Check the output for the line that says "All emulators ready!". Right above that will be a line that tells you the URL of your function(s). You can now hit those URLs directly (e.g. with your browser) to test your functions!
