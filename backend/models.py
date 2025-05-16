from typing import Any, Optional

from pydantic import BaseModel


class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


class SQLQueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None


class SQLQueryResponse(BaseModel):
    result: Any  # Can be a list of records or an error message
    query: str
    session_id: str


class SessionIdResponse(BaseModel):
    session_id: str
