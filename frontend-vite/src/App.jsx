import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './App.css';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  // State for chat messages, refresh status, and session ID
  const [messages, setMessages] = useState([]);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Sample data for the grid (can be replaced with actual data)
  const [rowData, setRowData] = useState([
    { ID: 1, Name: 'Item A', Value: 100, Status: 'Active' },
    { ID: 2, Name: 'Item B', Value: 200, Status: 'Inactive' },
    { ID: 3, Name: 'Item C', Value: 150, Status: 'Active' },
    { ID: 4, Name: 'Item D', Value: 300, Status: 'Active' },
    { ID: 5, Name: 'Item E', Value: 250, Status: 'Inactive' }
  ]);

  // Column definitions for AG Grid
  const [columnDefs] = useState([
    { field: 'ID', sortable: true, filter: true, checkboxSelection: true },
    { field: 'Name', sortable: true, filter: true },
    { field: 'Value', sortable: true, filter: true },
    { field: 'Status', sortable: true, filter: true }
  ]);

  // Ref for chat display area to auto-scroll to bottom
  const chatDisplayRef = useRef(null);

  // Function to call the chat API
  const callChatApi = async (message) => {
    try {
      setIsLoading(true);
      
      // Prepare the request payload
      const payload = { message };
      
      // Include session_id if available to maintain context
      if (sessionId) {
        payload.session_id = sessionId;
      }
      
      // Call the API
      const response = await axios.post(`${API_URL}/api/chat`, payload);
      
      if (response.status === 200) {
        const data = response.data;
        // Store the session_id for future requests
        setSessionId(data.session_id);
        return data.response;
      } else {
        return `Error: ${response.status} - ${response.statusText}`;
      }
    } catch (error) {
      return `Error calling API: ${error.message}`;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to check API health
  const checkHealth = async () => {
    try {
      const healthResponse = await axios.get(`${API_URL}/api/health`);
      if (healthResponse.status === 200) {
        setRefreshStatus('success');
        return healthResponse.data;
      } else {
        setRefreshStatus('error');
        return { error: healthResponse.statusText };
      }
    } catch (error) {
      setRefreshStatus('error');
      return { error: error.message };
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Add user message to chat history
    const userMessage = { role: 'user', content: inputValue };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');
    
    // Call the backend API for a response
    const assistantResponse = await callChatApi(userMessage.content);
    
    // Add assistant response to chat history
    setMessages(prevMessages => [
      ...prevMessages, 
      { role: 'assistant', content: assistantResponse }
    ]);
  };
  
  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Clear refresh status after 3 seconds
  useEffect(() => {
    if (refreshStatus) {
      const timer = setTimeout(() => {
        setRefreshStatus(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [refreshStatus]);

  return (
    <div className="App">
      {/* Header with refresh button */}
      <div className="header">
        <button 
          className="refresh-button" 
          onClick={checkHealth} 
          title="Check API health"
        >
          🔄
        </button>
        
        {refreshStatus === 'success' && (
          <div className="status-message status-success">
            API health check successful!
          </div>
        )}
        
        {refreshStatus === 'error' && (
          <div className="status-message status-error">
            API health check failed!
          </div>
        )}
      </div>
      
      {/* Main container */}
      <div className="main-container">
        {/* Chat display area */}
        <div className="chat-display-area" ref={chatDisplayRef}>
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              {message.content}
            </div>
          ))}
        </div>
        
        {/* Chat input */}
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message here..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button 
            className="send-button" 
            onClick={handleSendMessage}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Thinking...
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
        
        {/* Data grid */}
        <div className="data-grid-container ag-theme-alpine">
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            pagination={true}
            paginationAutoPageSize={true}
            enableCellTextSelection={true}
            suppressRowClickSelection={true}
            rowSelection="multiple"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
