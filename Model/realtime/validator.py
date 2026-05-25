import numpy as np
import neurokit2 as nk

SAMPLING_RATE = 360
MIN_R_PEAKS = 5


import numpy as np
import neurokit2 as nk

SAMPLING_RATE = 360
MIN_R_PEAKS = 4

# Function to validate if a given ECG window contains enough R-peaks to be considered valid for inference
def is_valid_window(window):

    try:
        signals, info = nk.ecg_process(window, sampling_rate=SAMPLING_RATE)
        rpeaks = np.array(info["ECG_R_Peaks"])
    except:
        return False, 0
    
    r_count = len(rpeaks)

    if r_count == 0:
        return False, 0

    return r_count >= MIN_R_PEAKS, r_count