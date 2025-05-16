import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
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
  
  // State for grid data
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);

  // Ref for chat display area to auto-scroll to bottom
  const chatDisplayRef = useRef(null);

  // Function to parse SQL code blocks
  const parseMessageContent = (content) => {
    // Check if the content contains SQL code block
    const sqlRegex = /```sql\s+([\s\S]*?)```/g;
    const match = sqlRegex.exec(content);
    
    if (match) {
      // Extract the SQL query
      const sqlQuery = match[1].trim();
      // Split content into parts: before SQL, SQL, after SQL
      const parts = content.split(sqlRegex);
      
      return {
        hasSql: true,
        beforeSql: parts[0],
        sqlQuery: sqlQuery,
        afterSql: parts[parts.length - 1]
      };
    }
    
    return { hasSql: false, content };
  };
  
  // Function to execute SQL query
  const executeSqlQuery = async (query) => {
    try {
      setIsLoading(true);
      
      // Prepare the request payload
      const payload = { 
        query,
        session_id: sessionId
      };
      
      // Call the API
      const response = await axios.post(`${API_URL}/api/sql`, payload);
      
      if (response.status === 200) {
        const data = response.data;
        
        // Check if the result has data
        if (data.result && data.result.success && data.result.data && data.result.data.length > 0) {
          // Get the first row to determine columns
          const firstRow = data.result.data[0];
          
          // Create column definitions from the keys of the first row
          const newColumnDefs = Object.keys(firstRow).map(key => ({
            field: key,
            sortable: true,
            filter: true
          }));
          
          // Update the grid data
          setColumnDefs(newColumnDefs);
          setRowData(data.result.data);
        } else {
          // Clear the grid if no data
          setColumnDefs([]);
          setRowData([]);
          
          // Show a message about the result
          if (data.result && data.result.success) {
            if (data.result.affected_rows !== undefined) {
              // For non-SELECT queries
              setMessages(prevMessages => [
                ...prevMessages,
                { role: 'assistant', content: `Query executed successfully. Affected rows: ${data.result.affected_rows}` }
              ]);
            } else {
              // For SELECT queries with no results
              setMessages(prevMessages => [
                ...prevMessages,
                { role: 'assistant', content: 'Query executed successfully, but returned no data.' }
              ]);
            }
          } else if (data.result && data.result.success === false) {
            // For failed queries, show the error message in chat
            setMessages(prevMessages => [
              ...prevMessages,
              { role: 'assistant', content: `Query execution failed: ${data.result.error}` }
            ]);
          }
        }
        
        return data;
      } else {
        // Show error message
        setMessages(prevMessages => [
          ...prevMessages,
          { role: 'assistant', content: `Error: ${response.status} - ${response.statusText}` }
        ]);
        return `Error: ${response.status} - ${response.statusText}`;
      }
    } catch (error) {
      // Show error message
      setMessages(prevMessages => [
        ...prevMessages,
        { role: 'assistant', content: `Error executing SQL: ${error.message}` }
      ]);
      return { error: error.message };
    } finally {
      setIsLoading(false);
    }
  };
  
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
  
  // Function to generate a session ID and clear chat history
  const generateSessionId = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/generate_session_id`);
      if (response.status === 200) {
        setSessionId(response.data.session_id);
        setMessages([]); // Clear chat history
        setRowData([]); // Clear grid data
        setColumnDefs([]); // Clear grid columns
        setRefreshStatus('success');
        return response.data;
      } else {
        setRefreshStatus('error');
        return { error: response.statusText };
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
  
  // Function to take a screenshot of the chat history
  const takeScreenshot = async () => {
    if (chatDisplayRef.current) {
      try {
        // Show a temporary message
        setRefreshStatus('screenshot');
        
        // Save original styling
        const originalHeight = chatDisplayRef.current.style.height;
        const originalOverflow = chatDisplayRef.current.style.overflow;
        const originalMaxHeight = chatDisplayRef.current.style.maxHeight;
        
        // Temporarily modify the chat display area to show all content
        chatDisplayRef.current.style.height = 'auto';
        chatDisplayRef.current.style.overflow = 'visible';
        chatDisplayRef.current.style.maxHeight = 'none';
        
        // Use html2canvas to capture the entire chat display area
        const canvas = await html2canvas(chatDisplayRef.current, {
          scrollY: 0,
          windowHeight: document.documentElement.offsetHeight,
          height: chatDisplayRef.current.scrollHeight,
          onclone: (clonedDoc) => {
            // Ensure the cloned element has the right dimensions
            const clonedChat = clonedDoc.querySelector('.chat-display-area');
            if (clonedChat) {
              clonedChat.style.height = 'auto';
              clonedChat.style.overflow = 'visible';
              clonedChat.style.maxHeight = 'none';
            }
          }
        });
        
        // Restore original styling
        chatDisplayRef.current.style.height = originalHeight;
        chatDisplayRef.current.style.overflow = originalOverflow;
        chatDisplayRef.current.style.maxHeight = originalMaxHeight;
        
        // Convert canvas to a data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `chat-history-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        
        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        setRefreshStatus('success');
      } catch (error) {
        console.error('Error taking screenshot:', error);
        setRefreshStatus('error');
      }
    }
  };

  return (
    <div className="App">
      {/* Header with refresh and screenshot buttons */}
      <div className="header">
        <div className="header-buttons">
          <button 
            className="refresh-button" 
            onClick={generateSessionId} 
            title="Refresh session"
          >
            🔄
          </button>
          <button 
            className="screenshot-button" 
            onClick={takeScreenshot} 
            title="Take a screenshot of chat history"
          >
            📷
          </button>
        </div>
        
        {refreshStatus === 'success' && (
          <div className="status-message status-success">
            New session ID generated!
          </div>
        )}
        
        {refreshStatus === 'error' && (
          <div className="status-message status-error">
            Failed to generate session ID!
          </div>
        )}
        
        {refreshStatus === 'screenshot' && (
          <div className="status-message status-success">
            Taking screenshot...
          </div>
        )}
      </div>
      
      {/* Main container */}
      <div className="main-container">
        {/* Chat display area */}
        <div className="chat-display-area" ref={chatDisplayRef}>
          {messages.map((message, index) => {
            // Parse message content to check for SQL code blocks
            const parsedContent = parseMessageContent(message.content);
            
            if (parsedContent.hasSql) {
              // Render message with SQL code block
              return (
                <div 
                  key={index} 
                  className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                >
                  {parsedContent.beforeSql && <ReactMarkdown>{parsedContent.beforeSql}</ReactMarkdown>}
                  <div 
                    className="sql-message" 
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    id={`sql-query-${index}`}
                  >
                    {parsedContent.sqlQuery}
                    <button 
                      className="execute-sql-button"
                      onClick={(e) => {
                        // Get the parent div (sql-message)
                        const sqlMessageDiv = e.target.parentNode;
                        // Get the text content without the button text
                        const buttonText = e.target.textContent;
                        let editedQuery = sqlMessageDiv.textContent;
                        // Remove the button text from the content
                        editedQuery = editedQuery.replace(buttonText, '').trim();
                        executeSqlQuery(editedQuery);
                      }}
                      disabled={isLoading}
                    >
                      Execute SQL
                    </button>
                  </div>
                  {parsedContent.afterSql && <ReactMarkdown>{parsedContent.afterSql}</ReactMarkdown>}
                </div>
              );
            } else {
              // Render regular message
              return (
                <div 
                  key={index} 
                  className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              );
            }
          })}
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
        <div className="data-grid-container ag-theme-alpine" style={{ height: '400px', width: '100%' }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            pagination={false}
            enableCellTextSelection={true}
            suppressRowClickSelection={true}
            rowSelection="multiple"
            domLayout="normal"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
