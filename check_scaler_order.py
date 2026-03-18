import joblib
import numpy as np

sc = joblib.load(r'd:\Archi_Projects\MoodReader\model_api\weights\scaler.pkl')
mean = sc.mean_

print(f"MFCC region (0-5): {mean[0:5].tolist()}")
print(f"Chroma region (40-45): {mean[40:45].tolist()}")
print(f"Mel region (52-57): {mean[52:57].tolist()}")
print(f"Delta region (180-185): {mean[180:185].tolist()}")
