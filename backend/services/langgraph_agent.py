from typing import TypedDict, Annotated, List, Literal, cast
import operator
from langgraph.graph import StateGraph, START, END

# 1. Define the State Object
# This dictionary flows through every node in your graph.
class InterviewState(TypedDict):
    current_node: str
    topic: str
    difficulty: int                       # Scale of 1-5
    answer_quality: Annotated[List[int], operator.add] # Appends scores
    sentiment_logs: Annotated[List[str], operator.add] # Appends tags
    asked_questions: int
    is_complete: bool

# 2. Define the Nodes (The logic for each interview stage)
def greet_node(state: InterviewState):
    """Initial greeting and introduction."""
    return {
        "current_node": "greet", 
        "topic": "Introduction", 
        "difficulty": 1
    }

def tech_q_node(state: InterviewState):
    """The technical questioning phase."""
    # Logic to adjust difficulty based on previous answer quality
    avg_score = sum(state["answer_quality"]) / len(state["answer_quality"]) if state["answer_quality"] else 3
    new_diff = min(5, max(1, state["difficulty"] + (1 if avg_score > 7 else -1)))
    
    return {
        "current_node": "tech_q", 
        "topic": "Technical Skills",
        "difficulty": int(new_diff),
        "asked_questions": state.get("asked_questions", 0) + 1,
    }

def followup_node(state: InterviewState):
    """Follow-up probing phase."""
    return {
        "current_node": "followup",
        "topic": "Technical Follow-up",
        "difficulty": state["difficulty"],
        "asked_questions": state.get("asked_questions", 0) + 1,
    }

def hr_q_node(state: InterviewState):
    """The behavioral/HR phase."""
    return {
        "current_node": "hr_q", 
        "topic": "Behavioral/Culture",
        "asked_questions": state.get("asked_questions", 0) + 1,
    }

def wrap_node(state: InterviewState):
    """Conclusion of the interview."""
    return {
        "current_node": "wrap", 
        "is_complete": True
    }

# 3. Define Conditional Routing Logic
def should_continue(state: InterviewState) -> Literal["tech_q", "followup", "hr_q", "wrap"]:
    """Determines when to move from Technical to HR to Wrap."""
    num_questions = len(state["answer_quality"])
    
    if state["current_node"] == "greet":
        return "tech_q"
    if state["current_node"] == "tech_q":
        # Move to HR after 3 technical questions
        return "followup" if num_questions >= 2 else "tech_q"
    if state["current_node"] == "followup":
        return "hr_q"
    if state["current_node"] == "hr_q":
        # Move to Wrap after 2 HR questions
        return "wrap" if num_questions >= 5 else "hr_q"
    return "wrap"

# 4. Build and Compile the Graph
builder = StateGraph(InterviewState)

# Add Nodes
builder.add_node("greet", greet_node)
builder.add_node("tech_q", tech_q_node)
builder.add_node("followup", followup_node)
builder.add_node("hr_q", hr_q_node)
builder.add_node("wrap", wrap_node)

# Set Entry Point
builder.add_edge(START, "greet")

# Define Transitions with Conditional Edges
builder.add_conditional_edges(
    "greet", should_continue, {"tech_q": "tech_q"}
)
builder.add_conditional_edges(
    "tech_q", should_continue, {"tech_q": "tech_q", "followup": "followup", "hr_q": "hr_q"}
)
builder.add_conditional_edges(
    "followup", should_continue, {"hr_q": "hr_q"}
)
builder.add_conditional_edges(
    "hr_q", should_continue, {"hr_q": "hr_q", "wrap": "wrap"}
)

builder.add_edge("wrap", END)

# Final Orchestrator Application
interviewer_app = builder.compile()


def seed_state() -> InterviewState:
    return {
        "current_node": "greet",
        "topic": "Introduction",
        "difficulty": 2,
        "answer_quality": [],
        "sentiment_logs": [],
        "asked_questions": 0,
        "is_complete": False,
    }


def compute_quality(answer_text: str, sentiment_tag: str | None) -> int:
    base = min(10, max(1, len(answer_text.strip()) // 25 + 2))
    if sentiment_tag and "anxious" in sentiment_tag.lower():
        base = max(1, base - 1)
    return base


def next_state(
    state: InterviewState,
    answer_text: str,
    sentiment_tag: str | None,
) -> InterviewState:
    update: InterviewState = {
        "current_node": state["current_node"],
        "topic": state["topic"],
        "difficulty": state["difficulty"],
        "answer_quality": [compute_quality(answer_text, sentiment_tag)],
        "sentiment_logs": [sentiment_tag] if sentiment_tag else [],
        "asked_questions": state.get("asked_questions", 0),
        "is_complete": False,
    }
    return cast(InterviewState, interviewer_app.invoke({**state, **update}))