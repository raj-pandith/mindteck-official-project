import numpy as np
# This class manages a buffer for ECG data. It allows adding new values, checking if the buffer is full based on a specified window size, retrieving a window of data for processing, and clearing the buffer when needed. The buffer is designed to hold a certain number of samples based on the sampling frequency (fs) and the desired window duration in seconds (window_sec). This class is essential for handling streaming ECG data in real-time applications, ensuring that the model receives appropriately sized segments of data for inference.
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