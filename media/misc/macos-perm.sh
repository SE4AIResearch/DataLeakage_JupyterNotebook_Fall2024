SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
find $SCRIPT_DIR -type f -exec xattr -d com.apple.quarantine {} + 2>/dev/null