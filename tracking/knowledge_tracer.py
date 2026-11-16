class KnowledgeTracer:
    """
    Research-Grade Knowledge Tracing Module.
    Uses a modified reinforcement learning / EMA update rule to track student mastery.
    """
    def __init__(self, learning_rate: float = 0.2, penalty_rate: float = 0.25):
        self.alpha = learning_rate   # How fast mastery grows on correct answers
        self.beta = penalty_rate     # How fast mastery drops on incorrect answers

    def update_mastery(self, current_mastery: float, performance_score: float) -> float:
        """
        Updates the mastery score (0.0 to 1.0) based on an LLM-graded performance score (0.0 to 1.0).
        
        Math:
        If performance >= 0.5 (mostly correct):
            Growth is proportional to the remaining gap to 1.0.
            New = Old + Alpha * (Performance) * (1 - Old)
            
        If performance < 0.5 (mostly incorrect):
            Penalty is proportional to current mastery.
            New = Old - Beta * (1 - Performance) * Old
        """
        # Clamp inputs
        current_mastery = max(0.0, min(1.0, current_mastery))
        performance_score = max(0.0, min(1.0, performance_score))
        
        if performance_score >= 0.5:
            # Positive update
            gain = self.alpha * performance_score * (1.0 - current_mastery)
            new_mastery = current_mastery + gain
        else:
            # Negative update
            # The worse the performance (1 - perf), the bigger the penalty
            penalty = self.beta * (1.0 - performance_score) * current_mastery
            new_mastery = current_mastery - penalty
            
        # Ensure it stays within bounds
        return round(max(0.0, min(1.0, new_mastery)), 3)
