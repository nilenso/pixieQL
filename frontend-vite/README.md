# PixieQL React Frontend (Vite)

This is a React-based frontend for the PixieQL application, converted from the original Streamlit implementation, using Vite as the build tool.

## Features

- Chat interface with the AI assistant
- API health check functionality
- Data grid display with AG Grid (sorting, filtering, column selection)
- Session management for conversation context

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository
2. Navigate to the frontend-vite directory
3. Install dependencies:

```bash
npm install
```

### Configuration

The application uses environment variables for configuration. You can modify these in the `.env` file:

- `VITE_API_URL`: The URL of the backend API (default: http://localhost:8000)

### Running the Application

To start the development server:

```bash
npm run dev
```

This will run the app in development mode. It will automatically open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

To build the app for production:

```bash
npm run build
```

This builds the app for production to the `dist` folder, optimizing the build for the best performance.

To preview the production build locally:

```bash
npm run preview
```

## Usage

1. Type your message in the input field at the bottom of the screen
2. Press Enter or click the Send button to send your message
3. The AI assistant will respond to your message
4. Use the refresh button (🔄) in the header to check the API health
5. Use the data grid to view, sort, and filter data

## Backend API

The frontend communicates with a FastAPI backend that provides:

- `/api/chat`: Endpoint for chat functionality
- `/api/health`: Endpoint for health checks
