# PixieQL

This project demonstrates an iterative way to build SQL queries

## Prerequisites

- Python 3.8+
- `uv` (for package management)
- Node.js and npm (for the frontend)
### Installing uv
https://docs.astral.sh/uv/getting-started/installation/

## Running the Application

### Method 1: Using the Automated Script

For convenience, you can use the provided script to install dependencies and run both the backend and frontend in a single command:

```bash
python run.py
```

This script:
1. Checks if `uv` and `npm` are installed, exits if either is not available
2. Installs dependencies for both backend and frontend
3. Starts the FastAPI backend server
4. Waits for the backend to initialize
5. Starts the Vite React frontend development server

### Method 2: Manual Setup (Separate Terminals)

1.  **Start the FastAPI Backend:**

    Open a terminal, navigate to the `backend` directory, install dependencies, and run the server:
    ```bash
    cd backend
    uv pip install -r requirements.txt
    uv run uvicorn main:app --reload --port 8000
    ```
    The backend server will be running at `http://localhost:8000`.

2.  **Start the Vite React Frontend:**

    Open another terminal, navigate to the `frontend-vite` directory, install dependencies, and run the development server:
    ```bash
    cd frontend-vite
    npm install
    npm run dev
    ```
    The frontend application will be available in your browser, usually at `http://localhost:5173`.



All process outputs (installation, backend, and frontend) will be visible in the terminal.

The frontend is configured to connect to the backend API running on port 8000.
