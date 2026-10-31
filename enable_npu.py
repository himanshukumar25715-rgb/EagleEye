"""
Eagle Eye 2.0 - Intel NPU & OpenVINO Hardware Acceleration Diagnostics
Tests and verifies Intel Core Ultra NPU (Intel AI Boost) and Intel Arc GPU acceleration.
"""
import os
import sys
import time
import numpy as np

print("=" * 65)
print("  EAGLE EYE 2.0 - INTEL NPU / HARDWARE ACCELERATION DIAGNOSTICS")
print("=" * 65)

try:
    import openvino as ov
    core = ov.Core()
    devices = core.available_devices
    print(f"\n[1] OpenVINO Runtime: v{ov.__version__}")
    print(f"[2] Available Acceleration Devices: {devices}")
    for d in devices:
        try:
            full_name = core.get_property(d, "FULL_DEVICE_NAME")
            print(f"    * {d}: {full_name}")
        except Exception:
            pass

    # Check NPU driver
    if "NPU" in devices:
        try:
            npu_driver = core.get_property("NPU", "NPU_DRIVER_VERSION")
            print(f"\n[3] Intel NPU Driver Version: {npu_driver}")
        except Exception:
            pass

    # Benchmark test on available hardware
    xml_path = "backend/weights/yolo11n_openvino_model/yolo11n.xml"
    if os.path.exists(xml_path):
        model = core.read_model(xml_path)
        dummy = np.random.rand(1, 3, 384, 384).astype(np.float32)

        # Test NPU
        if "NPU" in devices:
            print("\n[4] Testing Intel NPU (Intel AI Boost) compilation...")
            try:
                compiled_npu = core.compile_model(model, "NPU")
                res = compiled_npu([dummy])
                print("    SUCCESS: Model compiled and executed on Intel AI Boost NPU!")
            except Exception as e:
                print(f"    NOTE: NPU Level 0 driver returned error: {e}")
                print("    Tip: Update your Intel NPU Driver via Intel Driver & Support Assistant (IDSA) or Windows Update.")

        # Test Intel Arc GPU
        if "GPU" in devices:
            print("\n[5] Testing Intel Arc GPU (Xe Matrix Engine)...")
            compiled_gpu = core.compile_model(model, "GPU")
            for _ in range(3):
                compiled_gpu([dummy])
            latencies = []
            for _ in range(15):
                t0 = time.perf_counter()
                compiled_gpu([dummy])
                latencies.append((time.perf_counter() - t0) * 1000)
            avg_lat = np.mean(latencies)
            print(f"    SUCCESS: Intel Arc GPU Latency: {avg_lat:.2f} ms ({1000/avg_lat:.1f} FPS)")

    print("\n" + "=" * 65)
    print("  Hardware acceleration configured in backend/app/cv/pipeline.py!")
    print("=" * 65)

except Exception as e:
    print(f"Error during diagnostics: {e}")
