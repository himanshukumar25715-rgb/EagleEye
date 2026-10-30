class TemporalFilter:
    def __init__(self, window_size=5):
        self.window_size = window_size
        self.history = {}
