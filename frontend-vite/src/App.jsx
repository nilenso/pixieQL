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
  
  // Sample data for table grids
  const [tableData1] = useState([
    { player: 'Virat Kohli', team: 'RCB', runs: 973, average: 81.08, strike_rate: 152.03 },
    { player: 'KL Rahul', team: 'PBKS', runs: 670, average: 55.83, strike_rate: 158.41 },
    { player: 'Shikhar Dhawan', team: 'DC', runs: 618, average: 44.14, strike_rate: 144.73 },
    { player: 'David Warner', team: 'SRH', runs: 548, average: 42.15, strike_rate: 135.64 },
    { player: 'Mayank Agarwal', team: 'PBKS', runs: 424, average: 38.54, strike_rate: 156.45 },
  ]);
  
  const [tableData2] = useState([
    { bowler: 'Kagiso Rabada', team: 'DC', wickets: 30, economy: 8.34, average: 18.26 },
    { bowler: 'Jasprit Bumrah', team: 'MI', wickets: 27, economy: 6.73, average: 14.96 },
    { bowler: 'Trent Boult', team: 'MI', wickets: 25, economy: 7.97, average: 18.28 },
    { bowler: 'Mohammed Shami', team: 'PBKS', wickets: 20, economy: 8.57, average: 23.35 },
    { bowler: 'Rashid Khan', team: 'SRH', wickets: 20, economy: 5.37, average: 17.20 },
  ]);
  
  const [tableCols1] = useState([
    { field: 'player', sortable: true, filter: true, minWidth: 150 },
    { field: 'team', sortable: true, filter: true, minWidth: 120 },
    { field: 'runs', sortable: true, filter: true, minWidth: 120 },
    { field: 'average', sortable: true, filter: true, minWidth: 120 },
    { field: 'strike_rate', sortable: true, filter: true, minWidth: 120 },
  ]);
  
  const [tableCols2] = useState([
    { field: 'bowler', sortable: true, filter: true, minWidth: 150 },
    { field: 'team', sortable: true, filter: true, minWidth: 120 },
    { field: 'wickets', sortable: true, filter: true, minWidth: 120 },
    { field: 'economy', sortable: true, filter: true, minWidth: 120 },
    { field: 'average', sortable: true, filter: true, minWidth: 120 },
  ]);

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
        <div className="top-section">
          {/* Left side - Tables container */}
          <div className="tables-container">
            {/* This will contain multiple data grids */}
            <h4>Top Batsmen</h4>
            <div className="table-grid-container ag-theme-alpine">
              <AgGridReact
                rowData={tableData1}
                columnDefs={tableCols1}
                pagination={true}
                paginationPageSize={5}
                enableCellTextSelection={true}
                suppressRowClickSelection={true}
                rowSelection="multiple"
                domLayout="autoHeight"
                headerHeight="auto"
                defaultColDef={{
                  flex: 1,
                  minWidth: 100,
                  resizable: true
                }}
                onGridReady={(params) => {
                  params.api.sizeColumnsToFit();
                  setTimeout(() => params.columnApi.autoSizeAllColumns(), 0);
                }}
              />
            </div>
            <h4>Top Bowlers</h4>
            <div className="table-grid-container ag-theme-alpine">
              <AgGridReact
                rowData={tableData2}
                columnDefs={tableCols2}
                pagination={true}
                paginationPageSize={5}
                enableCellTextSelection={true}
                suppressRowClickSelection={true}
                rowSelection="multiple"
                domLayout="autoHeight"
                headerHeight="auto"
                defaultColDef={{
                  flex: 1,
                  minWidth: 100,
                  resizable: true
                }}
                onGridReady={(params) => {
                  params.api.sizeColumnsToFit();
                  setTimeout(() => params.columnApi.autoSizeAllColumns(), 0);
                }}
              />
            </div>
          </div>
          
          {/* Right side - Chat section */}
          <div className="chat-section">
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
          </div>
        </div>
        
        {/* Bottom data grid - Original full-width grid */}
        <div className="data-grid-container ag-theme-alpine">
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            pagination={false}
            enableCellTextSelection={true}
            suppressRowClickSelection={true}
            rowSelection="multiple"
            domLayout="normal"
            headerHeight="auto"
            defaultColDef={{
              flex: 1,
              minWidth: 100,
              resizable: true
            }}
            onGridReady={(params) => {
              if (params.api && rowData.length > 0) {
                params.api.sizeColumnsToFit();
                setTimeout(() => params.columnApi.autoSizeAllColumns(), 0);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
