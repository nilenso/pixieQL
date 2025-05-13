import os

import pandas as pd
import requests
import streamlit as st
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API URL from environment or use default
API_URL = os.getenv("API_URL", "http://localhost:8000")

st.set_page_config(
    layout="wide", page_title="AI Chat Interface", initial_sidebar_state="collapsed"
)

# Custom CSS for chat message styling
st.markdown(
    """
<style>
    /* Base styling for all chat messages */
    .stChatMessage {
        padding: 2px !important;
        margin-bottom: 4px !important;
    }
    
    /* Hide all avatars */
    .stChatMessageAvatar {
        display: none !important;
    }
    .stMainBlockContainer {
        overflow: hidden;
        padding: 50px;
    }
    
    /* User messages - right aligned */
    [data-testid="stChatMessage"][data-chat-message-role="user"] {
        margin-left: 20% !important;
        margin-right: 0 !important;
        background-color: #e6f7ff !important; /* Light blue background */
        border-radius: 15px 15px 0 15px !important;
    }
    
    /* Assistant messages - left aligned */
    [data-testid="stChatMessage"][data-chat-message-role="assistant"] {
        margin-right: 20% !important;
        margin-left: 0 !important;
        background-color: #f0f0f0 !important; /* Light gray background */
        border-radius: 15px 15px 15px 0 !important;
    }
</style>
""",
    unsafe_allow_html=True,
)

# Initialize session state for chat history, refresh status, and session ID
if "messages" not in st.session_state:
    st.session_state.messages = []
if "refresh_status" not in st.session_state:
    st.session_state.refresh_status = None
if "session_id" not in st.session_state:
    st.session_state.session_id = None


# Function to call the chat API
def call_chat_api(message):
    try:
        # Prepare the request payload
        payload = {"message": message}

        # Include session_id if available to maintain context
        if st.session_state.session_id:
            payload["session_id"] = st.session_state.session_id

        # Call the API
        response = requests.post(f"{API_URL}/api/chat", json=payload)

        if response.status_code == 200:
            data = response.json()
            # Store the session_id for future requests
            st.session_state.session_id = data["session_id"]
            return data["response"]
        else:
            return f"Error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error calling API: {str(e)}"


# Function to check API health
def check_health():
    try:
        health_response = requests.get(f"{API_URL}/api/health")
        if health_response.status_code == 200:
            st.session_state.refresh_status = "success"
            return health_response.json()
        else:
            st.session_state.refresh_status = "error"
            return {"error": health_response.text}
    except Exception as e:
        st.session_state.refresh_status = "error"
        return {"error": str(e)}


# Page layout
st.sidebar.title("AI Chat Interface")

# Header with refresh button
col1, col2 = st.columns([1, 11])
with col1:
    if st.button("🔄", help="Check API health"):
        api_data = check_health()
        st.experimental_rerun()

# Display refresh status if available
if st.session_state.refresh_status == "success":
    st.success("API health check successful!")
    # Reset status after displaying
    st.session_state.refresh_status = None
elif st.session_state.refresh_status == "error":
    st.error("API health check failed!")
    # Reset status after displaying
    st.session_state.refresh_status = None

# Main container
main_container = st.container()

with main_container:
    # Display chat messages - minimal height, CSS will control actual height
    chat_display_area = st.container(height=450)
    with chat_display_area:
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.write(message["content"])

    # Chat input is typically placed at the bottom of the screen or chat area
    user_input = st.chat_input("Type your message here...")

    if user_input:
        # Add user message to chat history and display it
        st.session_state.messages.append({"role": "user", "content": user_input})
        with chat_display_area:  # Re-draw user message in the display area
            with st.chat_message("user"):
                st.write(user_input)

        # Call the backend API for a response
        with st.spinner("Thinking..."):
            assistant_response = call_chat_api(user_input)
        st.session_state.messages.append(
            {"role": "assistant", "content": assistant_response}
        )

        # Display assistant response
        # This will append the new message to the chat_display_area
        # To make it appear immediately after input, we might need to rerun or handle state differently
        # For simplicity, we'll let Streamlit's natural re-run display it.
        # A more robust solution might involve st.experimental_rerun() or managing display updates carefully.
        with chat_display_area:  # Re-draw assistant message in the display area
            with st.chat_message(
                "assistant"
            ):  # This might cause messages to appear out of order without a full rerun
                st.write(assistant_response)
        # st.experimental_rerun() # Uncomment if messages don't update correctly after input

    # Sample data for the grid (can be an empty DataFrame if no data)
    # data = {} # Example for empty data
    data = {
        "ID": [1, 2, 3, 4, 5],
        "Name": ["Item A", "Item B", "Item C", "Item D", "Item E"],
        "Value": [100, 200, 150, 300, 250],
        "Status": ["Active", "Inactive", "Active", "Active", "Inactive"],
    }
    df = pd.DataFrame(data)

    # Display the data grid (not editable) - minimal height, CSS will control actual height
    st.dataframe(
        df,
        use_container_width=True,
        hide_index=True,
        height=250,  # Minimal height, CSS will control actual height
    )
