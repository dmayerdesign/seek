# SEEK

## Development

### Prerequisites (Mac OS)

1. Download Visual Studio Code or a similar text editor.
2. Clone the Git repository:
    - Open your shell (e.g. Terminal).
    - Install the GitHub.com command line interface: `brew install gh`.
    - If you have a folder for code, `cd` into it. Otherwise, run this command: `mkdir -p ~/Code && cd ~/Code`
    - Run `gh auth login` and follow the steps needed to authenticate with the GitHub.com command line interface.
        - If you get a "command not found" error, try opening a new shell window and trying again.
    - Run `gh repo clone dmayerdesign/seek`.
    - Run `cd seek`
    - Open this new `seek` folder in your text editor.
3. [Install Python 3.12](https://www.python.org/downloads/)
4. [Install Node.js](https://nodejs.org/en)
5. Install Firebase:

```sh
npm install -g firebase-tools
```

### Test locally while developing

From now on, all commands should be run from inside the `functions/` folder. Run the following in your shell:

```sh
cd functions
```

#### Install dependencies

```sh
/usr/local/bin/python3 -m venv venv
/usr/local/bin/python3 -m pip install -r requirements.txt
```

#### Set environment variables

Our app needs certain secrets and parameters that shouldn't be stored in our version control system.

Those are all contained in one file: `functions/.env.seek-poe-dev` (or `functions/.env.<any Firebase project>`). That file does not exist yet, so create it by copying the template provided in the repo:

```sh
# Assuming you are inside the functions/ folder
cp template.env .env.seek-poe-dev
```

Now open `.env.seek-poe-dev` in your text editor, and fill it in.

- OPENAI_API_KEY: Can be found at https://console.cloud.google.com/security/secret-manager/secret/OPENAI_API_KEY/versions?project=seek-poe-dev, or in the Daniel Mayer Design vault in 1Password

#### Run the server locally

Now that the environment is configured, we are ready to run the app locally using Firebase's command-line emulator:

```sh
firebase emulators:start --only functions
```

Check the output for the line that says "All emulators ready!". Right above that will be a line that tells you the URL of your function(s). You can now hit those URLs directly (e.g. with your browser) to test your functions!

### Submitting a pull request

When your code change is working locally and is ready to be deployed, submit a pull request.

```sh
git checkout -b my-development-branch # You can name your branch anything you want
git add -A # Stage your changes
git commit -m 'brief description of the change' # Commit your changes
git push -u origin HEAD # Push your branch to the remote repository
```

Then visit the repository at https://github.com/dmayerdesign/seek and follow the prompts to create a pull request.
