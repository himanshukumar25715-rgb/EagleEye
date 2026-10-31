with open('backend/app/cv/pipeline.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure model is explicitly set to cuda:0 if available
old_init = """        print(f"[EagleEye YOLO11] Initializing neural network from {weights_path}...")
        self.model = YOLO(weights_path)"""

new_init = """        print(f"[EagleEye YOLO11] Initializing neural network from {weights_path}...")
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
        self.model = YOLO(weights_path).to(self.device)
        print(f"[EagleEye YOLO11] Acceleration device active: {self.device.upper()} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")"""

if old_init in text:
    text = text.replace(old_init, new_init)
    print("Updated YOLO11 model to use device='cuda:0'")

# In track and call, pass device=self.device
text = text.replace("imgsz=320\n            )", "imgsz=480,\n                device=self.device\n            )")
text = text.replace("imgsz=320\r\n            )", "imgsz=480,\r\n                device=self.device\r\n            )")
text = text.replace("imgsz=320)", "imgsz=480, device=self.device)")

with open('backend/app/cv/pipeline.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("pipeline.py updated with CUDA acceleration and higher 480px resolution!")

