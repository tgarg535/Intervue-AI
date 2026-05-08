from typing import TypedDict, Annotated, List, Literal
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
        "difficulty": int(new_diff)
    }

def hr_q_node(state: InterviewState):
    """The behavioral/HR phase."""
    return {
        "current_node": "hr_q", 
        "topic": "Behavioral/Culture"
    }

def wrap_node(state: InterviewState):
    """Conclusion of the interview."""
    return {
        "current_node": "wrap", 
        "is_complete": True
    }

# 3. Define Conditional Routing Logic
def should_continue(state: InterviewState) -> Literal["tech_q", "hr_q", "wrap"]:
    """Determines when to move from Technical to HR to Wrap."""
    num_questions = len(state["answer_quality"])
    
    if state["current_node"] == "greet":
        return "tech_q"
    if state["current_node"] == "tech_q":
        # Move to HR after 3 technical questions
        return "hr_q" if num_questions >= 3 else "tech_q"
    if state["current_node"] == "hr_q":
        # Move to Wrap after 2 HR questions
        return "wrap" if num_questions >= 5 else "hr_q"
    return "wrap"

# 4. Build and Compile the Graph
builder = StateGraph(InterviewState)

# Add Nodes
builder.add_node("greet", greet_node)
builder.add_node("tech_q", tech_q_node)
builder.add_node("hr_q", hr_q_node)
builder.add_node("wrap", wrap_node)

# Set Entry Point
builder.add_edge(START, "greet")

# Define Transitions with Conditional Edges
builder.add_conditional_edges(
    "greet", should_continue, {"tech_q": "tech_q"}
)
builder.add_conditional_edges(
    "tech_q", should_continue, {"tech_q": "tech_q", "hr_q": "hr_q"}
)
builder.add_conditional_edges(
    "hr_q", should_continue, {"hr_q": "hr_q", "wrap": "wrap"}
)

builder.add_edge("wrap", END)

# Final Orchestrator Application
interviewer_app = builder.compile()