#!/bin/bash

# Variables
REPO_URL="https://github.com/web-platform-tests/wpt.git"
PROJECT_DIR="./packages/observable/wpt"
REPO_DIR="$PROJECT_DIR/wpt-repo"
TEST_FILES_GLOB="observable-*.any.js"
TEST_HARNESS_FILE="resources/testharness.js"
TESTS_JSON_FILE="$PROJECT_DIR/.wpt-tests.json"

# Clone or pull the latest version of the repository with --depth 1
if [ ! -d "$REPO_DIR" ]; then
    echo "Cloning repository..."
    git clone --depth 1 "$REPO_URL" "$REPO_DIR" || { echo "Failed to clone repository"; exit 1; }
else
    echo "Repository already exists, pulling latest changes..."
    cd "$REPO_DIR" || { echo "Failed to change directory to $REPO_DIR"; exit 1; }
    git pull --depth 1 origin master || { echo "Failed to pull latest changes"; exit 1; }
    cd - || exit 1
fi

# Find all of the test files matching the glob pattern and create a JSON file with an array of them

echo "Checking for required utilities..."
if ! command -v jq &> /dev/null; then
    echo "jq is required to run this script. Would you like to install it using brew? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "Exiting..."
        exit 1
    fi
    brew install jq || { echo "Failed to install jq"; exit 1; }
fi

echo "Finding test files..."
# Get all of the test file names and put them in a JSON array
jq -n '[]' > "$TESTS_JSON_FILE"
find "$REPO_DIR" -type f -name "$TEST_FILES_GLOB" | while read -r file; do
    # Get the relative path of the file
    relative_path="${file#$REPO_DIR/}"
    # Add the relative path to the JSON array
    jq ". += [\"$relative_path\"]" "$TESTS_JSON_FILE" > "$TESTS_JSON_FILE.tmp" && mv "$TESTS_JSON_FILE.tmp" "$TESTS_JSON_FILE"
done

# Complete

# Print the number of test files found
echo "Found $(jq length "$TESTS_JSON_FILE") test files."