#!/usr/bin/env python3
"""
Script to install dependencies and run both backend and frontend components.
"""

import subprocess
import sys
import time
from pathlib import Path

# Define paths
ROOT_DIR = Path(__file__).parent.absolute()
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


def check_uv_installed():
    """Check if uv is installed."""
    try:
        subprocess.run(["uv", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def install_dependencies():
    """Install dependencies for both backend and frontend."""
    print("Installing backend dependencies...")
    # Don't capture stdout/stderr to allow output to be visible in the terminal
    subprocess.run(
        ["uv", "pip", "install", "-r", "requirements.txt"],
        cwd=BACKEND_DIR,
        check=True,
        stdout=None,
        stderr=None,
    )

    print("Installing frontend dependencies...")
    # Don't capture stdout/stderr to allow output to be visible in the terminal
    subprocess.run(
        ["uv", "pip", "install", "-r", "requirements.txt"],
        cwd=FRONTEND_DIR,
        check=True,
        stdout=None,
        stderr=None,
    )


def start_backend():
    """Start the backend server."""
    print("Starting backend server...")
    # Don't capture stdout/stderr to allow output to be visible in the terminal
    return subprocess.Popen(
        ["uv", "run", "uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=None,
        stderr=None,
    )


def start_frontend():
    """Start the frontend application."""
    print("Starting frontend application...")
    # Don't capture stdout/stderr to allow output to be visible in the terminal
    subprocess.run(
        ["uv", "run", "streamlit", "run", "app.py"],
        cwd=FRONTEND_DIR,
        check=True,
        stdout=None,
        stderr=None,
    )


def main():
    """Main function to run the application."""
    # Check if uv is installed
    if not check_uv_installed():
        print("Error: 'uv' is not installed. Please install it first.")
        print("You can install it with: pip install uv")
        sys.exit(1)

    # Install dependencies
    install_dependencies()

    # Start backend
    backend_process = start_backend()

    # Wait for backend to start
    print("Waiting for backend to start...")
    time.sleep(3)

    try:
        # Start frontend (this will block until frontend is closed)
        start_frontend()
    finally:
        # Ensure backend is terminated when script exits
        print("Shutting down backend...")
        backend_process.terminate()
        backend_process.wait()


if __name__ == "__main__":
    main()
