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


# Initialize session state for chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Check API connection
try:
    health_response = requests.get(f"{API_URL}/api/health")
    if health_response.status_code == 200:
        api_status = "✅ Connected"
        api_data = health_response.json()
    else:
        api_status = "❌ Error"
        api_data = {"error": health_response.text}
except Exception as e:
    api_status = "❌ Unavailable"
    api_data = {"error": str(e)}

# Page layout
st.sidebar.title("AI Chat Interface")

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

        # Simulate assistant response
        # In a real app, this would involve calling the backend API
        assistant_response = f"{user_input}"
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
