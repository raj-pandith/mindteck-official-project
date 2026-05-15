import numpy as np

class ECGBuffer:
    def __init__(self, fs=360, window_sec=5):
        self.fs = fs
        self.window_size = fs * window_sec
        self.buffer = []

    def add(self, value):
        self.buffer.append(value)

    def is_full(self):
        return len(self.buffer) >= self.window_size

    def get_window(self):
        return self.buffer[:self.window_size]

    def clear(self):
        self.buffer = []