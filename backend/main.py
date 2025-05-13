import os
import sqlite3
import uuid
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain.schema.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_community.chat_models import (
    ChatAnthropic,
    ChatOpenAI,
)
from langchain_google_genai import ChatGoogleGenerativeAI
from models import ChatRequest, ChatResponse, SQLQueryRequest, SQLQueryResponse

# Load environment variables from .env file
load_dotenv()

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "ipl.sqlite")

# Read schema.txt
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.txt")
with open(SCHEMA_PATH, "r") as f:
    DB_SCHEMA = f.read()

app = FastAPI(title="AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Streamlit URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dictionary to store conversation contexts by session ID
conversation_contexts: Dict[str, List[BaseMessage]] = {}


# Database connection function
def get_db_connection():
    """Get a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    return conn


# Function to execute SQL query
def execute_sql_query(query: str) -> Dict[str, Any]:
    """Execute an SQL query and return the results."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query)

        # Check if the query is a SELECT query
        if query.strip().upper().startswith("SELECT"):
            # Fetch all results
            rows = cursor.fetchall()
            # Convert rows to list of dicts
            results = [dict(row) for row in rows]
            conn.close()
            return {"success": True, "data": results}
        else:
            # For non-SELECT queries (INSERT, UPDATE, DELETE)
            conn.commit()
            affected_rows = cursor.rowcount
            conn.close()
            return {"success": True, "affected_rows": affected_rows}
    except Exception as e:
        if conn:
            conn.close()
        return {"success": False, "error": str(e)}


# Initialize LLM
def get_llm(model_type="gemini"):
    """
    Get the LLM instance. This function makes it easy to switch models.

    Args:
        model_type: The type of model to use. Options: "gemini", "anthropic"
    """
    if model_type == "anthropic":
        return ChatAnthropic(model_name="claude-3-sonnet-20240229", temperature=0.7)
    elif model_type == "openai":
        return ChatOpenAI(
            model_name="gpt-3.5-turbo",  # Can be easily changed to another model
            temperature=0.7,
        )
    else:  # default to gemini
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.7,
            convert_system_message_to_human=True,
        )


def generate_session_id() -> str:
    """Generate a unique session ID."""
    return str(uuid.uuid4())


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"Chat API called with session_id: {request.session_id}")
    """
    Chat with the LLM.

    - If session_id is provided, continue the conversation.
    - If session_id is not provided, start a new conversation.
    - The context is maintained across calls.
    """
    # Get or create session ID
    session_id = request.session_id or generate_session_id()
    print(session_id)

    # Get or create conversation context
    if session_id not in conversation_contexts:
        # Initialize with system message including DB schema
        conversation_contexts[session_id] = [
            SystemMessage(
                content=f"""You are a helpful SQL assistant for an IPL (Indian Premier League) cricket database.
                
Here is the database schema:

{DB_SCHEMA}

Help the user write and understand SQL queries for this database. Take all execution outputs if provided in the prompt and use them to generate better iterations on the queries.
Take the latest user feedback and try to make those modifications in the generated query. 
Keep explanations one or two sentences at the max, make sure to return the query in a ```sql block

"""
            )
        ]

    # Add user message to context
    conversation_contexts[session_id].append(HumanMessage(content=request.message))

    # Debug: Print the number of messages in the context
    print(
        f"Context for session {session_id} has {len(conversation_contexts[session_id])} messages"
    )
    # Print the last few messages for debugging
    for i, msg in enumerate(
        conversation_contexts[session_id][-3:]
        if len(conversation_contexts[session_id]) > 3
        else conversation_contexts[session_id]
    ):
        print(f"Message {i}: {msg.type} - {msg.content[:100]}...")

    try:
        # Get LLM response
        # You can change the model here by passing "gemini" or "anthropic"
        llm = get_llm("gemini")  # or get_llm("anthropic")

        print(conversation_contexts[session_id])
        response = llm(conversation_contexts[session_id])
        print(response)

        # Add assistant response to context
        conversation_contexts[session_id].append(AIMessage(content=response.content))

        return ChatResponse(response=response.content, session_id=session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sql", response_model=SQLQueryResponse)
async def execute_sql(request: SQLQueryRequest):
    print(f"SQL API called with session_id: {request.session_id}")
    """
    Execute an SQL query and return the results.

    - If session_id is provided, continue the conversation.
    - If session_id is not provided, start a new conversation.
    - The query and results are added to the context.
    """
    # Get session ID
    session_id = request.session_id
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    # Check if session exists
    if session_id not in conversation_contexts:
        raise HTTPException(status_code=404, detail="Session not found")

    # Execute the SQL query
    result = execute_sql_query(request.query)

    # Format the result for the context
    if result["success"]:
        if "data" in result:
            # For SELECT queries
            # Format the data as a table for better readability
            if result["data"]:
                # Get column names from the first row
                columns = list(result["data"][0].keys())

                # Format the data as a table
                table = "| " + " | ".join(columns) + " |\n"
                table += "| " + " | ".join(["---"] * len(columns)) + " |\n"

                # Add rows to the table (limit to 10 rows to avoid context overflow)
                for row in result["data"][:10]:
                    table += (
                        "| " + " | ".join([str(row[col]) for col in columns]) + " |\n"
                    )

                # Add a note if there are more rows
                if len(result["data"]) > 10:
                    table += f"\n*Note: Showing 10 of {len(result['data'])} rows*"

                result_str = f"Query executed successfully. Results:\n\n{table}"
            else:
                result_str = "Query executed successfully, but returned no data."
        else:
            # For non-SELECT queries
            result_str = (
                f"Query executed successfully. Affected rows: {result['affected_rows']}"
            )
    else:
        # For errors
        result_str = f"Query execution failed: {result['error']}"

    # Add the query and result to the context
    user_message = f"SQL Query: {request.query}"
    conversation_contexts[session_id].append(HumanMessage(content=user_message))
    conversation_contexts[session_id].append(AIMessage(content=result_str))

    # Debug: Print the number of messages in the context after adding SQL query and result
    print(
        f"Context for session {session_id} after SQL execution has {len(conversation_contexts[session_id])} messages"
    )
    # Print the last few messages for debugging
    for i, msg in enumerate(
        conversation_contexts[session_id][-4:]
        if len(conversation_contexts[session_id]) > 4
        else conversation_contexts[session_id]
    ):
        print(f"Message {i}: {msg.type} - {msg.content[:100]}...")

    return SQLQueryResponse(result=result, query=request.query, session_id=session_id)
