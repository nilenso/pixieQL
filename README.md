# Streamlit Frontend with FastAPI Backend

This project demonstrates a Streamlit frontend interacting with a FastAPI backend.

## Prerequisites

- Python 3.8+
- `uv` (for package management)

## Running the Application

1.  **Start the FastAPI Backend:**

    Open a terminal, navigate to the `backend` directory, install dependencies, and run the server:
    ```bash
    cd backend
    uv pip install -r requirements.txt
    uv run uvicorn main:app --reload --port 8000
    ```
    The backend server will be running at `http://localhost:8000`.

2.  **Start the Streamlit Frontend:**

    Open another terminal, navigate to the `frontend` directory, install dependencies, and run the Streamlit app:
    ```bash
    cd frontend
    uv pip install -r requirements.txt
    streamlit run app.py
    ```
    The frontend application will open in your browser, usually at `http://localhost:8501`.

The frontend is configured to connect to the backend API running on port 8000.
