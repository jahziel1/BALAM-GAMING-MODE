#!/bin/bash
# Build Overlay DLL - Build script for overlay.dll
#
# Compiles overlay-dll project and copies to src-tauri for bundling.
# Run this before building Tauri app to ensure overlay.dll is included.
#
# Usage:
#   ./build-overlay.sh           # Build release DLL
#   ./build-overlay.sh debug     # Build debug DLL

set -e

DEBUG_MODE=false
if [ "$1" = "debug" ]; then
    DEBUG_MODE=true
fi

echo "🔨 Building Overlay DLL..."

# Determine build profile
if [ "$DEBUG_MODE" = true ]; then
    PROFILE="debug"
    PROFILE_FLAG=""
else
    PROFILE="release"
    PROFILE_FLAG="--release"
fi

# Change to overlay-dll directory
cd overlay-dll

# Build overlay-dll
echo "Building overlay-dll ($PROFILE)..."
cargo build $PROFILE_FLAG

# Copy DLL to src-tauri
SOURCE_DLL="target/$PROFILE/overlay.dll"
DEST_DLL="../src-tauri/overlay.dll"

if [ -f "$SOURCE_DLL" ]; then
    echo "Copying overlay.dll to src-tauri..."
    cp "$SOURCE_DLL" "$DEST_DLL"

    # Show DLL info
    SIZE_KB=$(du -k "$DEST_DLL" | cut -f1)
    echo "✓ Overlay DLL built successfully!"
    echo "  Size: ${SIZE_KB} KB"
    echo "  Path: $DEST_DLL"
else
    echo "ERROR: DLL not found at $SOURCE_DLL"
    exit 1
fi

cd ..

echo ""
echo "✅ Build complete!"
