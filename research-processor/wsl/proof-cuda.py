import torch

print("torch", torch.__version__)
print("cuda_available", bool(torch.cuda.is_available()))
print("cuda_version", torch.version.cuda)
if not torch.cuda.is_available():
    raise SystemExit("CUDA not available in this venv")
props = torch.cuda.get_device_properties(0)
print("device", torch.cuda.get_device_name(0))
print("capability", torch.cuda.get_device_capability(0))
print("vram_gb", round(props.total_memory / 1024**3, 1))
x = torch.zeros(1, device="cuda")
print("tensor_ok", x.is_cuda)
