import zipfile
import h5py
import os

filepath = r'D:\Archi_Projects\MoodReader\model_api\weights\model.keras'

print(f"File size: {os.path.getsize(filepath)} bytes")

is_zip = zipfile.is_zipfile(filepath)
print(f"Is valid ZIP file (Keras v3): {is_zip}")

try:
    with h5py.File(filepath, 'r') as f:
        print("Is valid HDF5 file (Legacy Keras / H5): True")
        print(f"H5 Keys: {list(f.keys())}")
except Exception as e:
    print(f"Is valid HDF5 file: False ({e})")
