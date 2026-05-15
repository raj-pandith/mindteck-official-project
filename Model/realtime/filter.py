import numpy as np
from scipy.signal import butter, lfilter, lfilter_zi

SAMPLING_RATE = 360

class RealTimeBandpassFilter:
    def __init__(self, lowcut=0.5, highcut=40.0, fs=SAMPLING_RATE, order=4):
        nyq = 0.5 * fs
        low = lowcut / nyq
        high = highcut / nyq

        self.b, self.a = butter(order, [low, high], btype='band')
        self.zi = lfilter_zi(self.b, self.a)

    def process(self, sample: float) -> float:
        y, self.zi = lfilter(self.b, self.a, [sample], zi=self.zi)
        return float(y[0])