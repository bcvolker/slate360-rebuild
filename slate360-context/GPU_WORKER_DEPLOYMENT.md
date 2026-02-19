# Slate360 GPU Worker Deployment Guide

## Overview

This guide covers deploying a GPU-enabled worker server for processing 3D models, photogrammetry reconstruction, and point cloud tiling. The worker processes jobs from a Redis queue and runs compute-intensive operations using CUDA-accelerated tools.

---

## Architecture

```
┌─────────────────┐     ┌───────────────┐     ┌──────────────────┐
│  Next.js API    │────▶│  Redis/Upstash│────▶│  GPU Worker      │
│  /api/models/   │     │  Job Queue    │     │  (EC2 g4dn.xl)   │
│  process        │     └───────────────┘     │                  │
└─────────────────┘                           │  - COLMAP        │
         │                                    │  - OpenMVS       │
         │                                    │  - PDAL          │
         ▼                                    │  - Entwine       │
┌─────────────────┐                           │  - gltf-pipeline │
│  Supabase       │◀──────────────────────────│  - py3dtiles     │
│  model_process_ │                           └──────────────────┘
│  ing_jobs       │                                    │
└─────────────────┘                                    ▼
                                              ┌──────────────────┐
                                              │  AWS S3          │
                                              │  Processed       │
                                              │  Outputs         │
                                              └──────────────────┘
```

---

## 1. EC2 Instance Setup

### Recommended Instance Types

| Use Case | Instance | GPU | vCPU | RAM | Cost/hr |
|----------|----------|-----|------|-----|---------|
| Development | g4dn.xlarge | T4 16GB | 4 | 16GB | ~$0.526 |
| Production (small) | g4dn.2xlarge | T4 16GB | 8 | 32GB | ~$0.752 |
| Production (medium) | g4dn.4xlarge | T4 16GB | 16 | 64GB | ~$1.204 |
| Production (large) | g5.4xlarge | A10G 24GB | 16 | 64GB | ~$1.624 |
| Heavy photogrammetry | g5.8xlarge | A10G 24GB | 32 | 128GB | ~$2.448 |

### Launch EC2 Instance

```bash
# Using AWS CLI
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \  # Ubuntu 22.04 LTS
  --instance-type g4dn.xlarge \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":200,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=slate360-gpu-worker}]'
```

### Security Group Rules

```
Inbound:
- SSH (22) from your IP
- Custom TCP (6379) from VPC CIDR (if self-hosted Redis)

Outbound:
- All traffic (for S3, Supabase, Redis access)
```

---

## 2. System Dependencies

SSH into the instance and run:

```bash
#!/bin/bash
# setup-gpu-worker.sh

set -e

echo "=== Updating system ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing NVIDIA drivers ==="
sudo apt install -y nvidia-driver-535 nvidia-cuda-toolkit

# Verify GPU
nvidia-smi

echo "=== Installing build essentials ==="
sudo apt install -y \
  build-essential cmake git wget curl unzip \
  libboost-all-dev libeigen3-dev libflann-dev \
  libfreeimage-dev libmetis-dev libgoogle-glog-dev \
  libgflags-dev libsqlite3-dev libglew-dev \
  libatlas-base-dev libsuitesparse-dev \
  qtbase5-dev libqt5opengl5-dev libcgal-dev \
  libcgal-qt5-dev libtbb-dev python3-dev python3-pip

echo "=== Installing Docker ==="
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 3. Install COLMAP (Photogrammetry - SfM)

COLMAP performs Structure-from-Motion and Multi-View Stereo reconstruction.

```bash
#!/bin/bash
# install-colmap.sh

# Clone COLMAP
cd /opt
sudo git clone https://github.com/colmap/colmap.git
cd colmap

# Build with CUDA
sudo mkdir build && cd build
sudo cmake .. \
  -DCMAKE_CUDA_ARCHITECTURES=75 \
  -DCMAKE_BUILD_TYPE=Release \
  -DCUDA_ENABLED=ON

sudo make -j$(nproc)
sudo make install

# Verify
colmap -h
```

### COLMAP Usage in Worker

```python
# Python wrapper for COLMAP
import subprocess
import os

def run_colmap_reconstruction(image_dir: str, output_dir: str):
    """Run full COLMAP reconstruction pipeline"""
    
    database_path = os.path.join(output_dir, "database.db")
    sparse_dir = os.path.join(output_dir, "sparse")
    dense_dir = os.path.join(output_dir, "dense")
    
    os.makedirs(sparse_dir, exist_ok=True)
    os.makedirs(dense_dir, exist_ok=True)
    
    # 1. Feature extraction
    subprocess.run([
        "colmap", "feature_extractor",
        "--database_path", database_path,
        "--image_path", image_dir,
        "--ImageReader.camera_model", "SIMPLE_RADIAL",
        "--SiftExtraction.use_gpu", "1"
    ], check=True)
    
    # 2. Feature matching
    subprocess.run([
        "colmap", "exhaustive_matcher",
        "--database_path", database_path,
        "--SiftMatching.use_gpu", "1"
    ], check=True)
    
    # 3. Sparse reconstruction
    subprocess.run([
        "colmap", "mapper",
        "--database_path", database_path,
        "--image_path", image_dir,
        "--output_path", sparse_dir
    ], check=True)
    
    # 4. Dense reconstruction
    subprocess.run([
        "colmap", "image_undistorter",
        "--image_path", image_dir,
        "--input_path", os.path.join(sparse_dir, "0"),
        "--output_path", dense_dir,
        "--output_type", "COLMAP"
    ], check=True)
    
    subprocess.run([
        "colmap", "patch_match_stereo",
        "--workspace_path", dense_dir,
        "--workspace_format", "COLMAP",
        "--PatchMatchStereo.geom_consistency", "true"
    ], check=True)
    
    subprocess.run([
        "colmap", "stereo_fusion",
        "--workspace_path", dense_dir,
        "--workspace_format", "COLMAP",
        "--input_type", "geometric",
        "--output_path", os.path.join(dense_dir, "fused.ply")
    ], check=True)
    
    return os.path.join(dense_dir, "fused.ply")
```

---

## 4. Install OpenMVS (Dense Reconstruction & Meshing)

OpenMVS refines COLMAP output and generates high-quality meshes.

```bash
#!/bin/bash
# install-openmvs.sh

cd /opt

# VCG Library (dependency)
sudo git clone https://github.com/cdcseacave/VCG.git

# OpenMVS
sudo git clone https://github.com/cdcseacave/openMVS.git
cd openMVS
sudo mkdir build && cd build

sudo cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DVCG_ROOT=/opt/VCG \
  -DOpenMVS_USE_CUDA=ON

sudo make -j$(nproc)
sudo make install

# Verify
DensifyPointCloud --help
```

### OpenMVS Pipeline

```python
def run_openmvs_meshing(colmap_sparse_dir: str, dense_ply: str, output_dir: str):
    """Generate mesh from COLMAP reconstruction"""
    
    scene_mvs = os.path.join(output_dir, "scene.mvs")
    dense_mvs = os.path.join(output_dir, "scene_dense.mvs")
    mesh_mvs = os.path.join(output_dir, "scene_mesh.mvs")
    refined_mvs = os.path.join(output_dir, "scene_refined.mvs")
    textured_mvs = os.path.join(output_dir, "scene_textured.mvs")
    
    # 1. Convert COLMAP to OpenMVS format
    subprocess.run([
        "InterfaceCOLMAP",
        "-i", colmap_sparse_dir,
        "-o", scene_mvs
    ], check=True)
    
    # 2. Densify point cloud (optional, if not using COLMAP dense)
    subprocess.run([
        "DensifyPointCloud",
        scene_mvs,
        "-o", dense_mvs
    ], check=True)
    
    # 3. Reconstruct mesh
    subprocess.run([
        "ReconstructMesh",
        dense_mvs,
        "-o", mesh_mvs
    ], check=True)
    
    # 4. Refine mesh
    subprocess.run([
        "RefineMesh",
        mesh_mvs,
        "-o", refined_mvs,
        "--max-face-area", "16"
    ], check=True)
    
    # 5. Texture mesh
    subprocess.run([
        "TextureMesh",
        refined_mvs,
        "-o", textured_mvs,
        "--export-type", "obj"
    ], check=True)
    
    return os.path.join(output_dir, "scene_textured.obj")
```

---

## 5. Install PDAL & Entwine (Point Cloud Processing)

PDAL (Point Data Abstraction Library) for point cloud manipulation.
Entwine for generating Potree-compatible octree format.

```bash
#!/bin/bash
# install-pdal.sh

# PDAL from Conda (easier than building)
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh -b -p /opt/miniconda
source /opt/miniconda/bin/activate

conda install -c conda-forge pdal python-pdal entwine -y

# Verify
pdal --version
entwine --version
```

### Point Cloud Processing Pipeline

```python
def process_point_cloud(input_file: str, output_dir: str):
    """Process LAS/LAZ file to Potree format"""
    
    # 1. Get info and stats
    info = subprocess.run([
        "pdal", "info", "--metadata", input_file
    ], capture_output=True, text=True)
    
    # 2. Filter and clean
    filtered = os.path.join(output_dir, "filtered.laz")
    subprocess.run([
        "pdal", "translate", input_file, filtered,
        "--filter", "filters.outlier",
        "--filter", "filters.elm",  # Extended Local Minimum
        "--filter", "filters.smrf"  # Ground classification
    ], check=True)
    
    # 3. Generate Potree/Entwine format
    ept_dir = os.path.join(output_dir, "ept")
    subprocess.run([
        "entwine", "build",
        "-i", filtered,
        "-o", ept_dir
    ], check=True)
    
    # 4. Generate Cesium 3D Tiles
    tiles_dir = os.path.join(output_dir, "3dtiles")
    subprocess.run([
        "py3dtiles", "convert", filtered,
        "--out", tiles_dir,
        "--srs_in", "EPSG:4326"
    ], check=True)
    
    return {
        "ept": ept_dir,
        "tiles_3d": tiles_dir,
    }
```

---

## 6. Install gltf-pipeline (Mesh Optimization)

For Draco compression and GLB optimization.

```bash
#!/bin/bash
# install-gltf-tools.sh

# gltf-pipeline (Node.js)
sudo npm install -g gltf-pipeline

# gltf-transform (better API)
sudo npm install -g @gltf-transform/cli

# Verify
gltf-pipeline --help
gltf-transform --help
```

### GLB Optimization

```javascript
// optimize-glb.js
const { exec } = require('child_process');
const path = require('path');

async function optimizeGLB(inputPath, outputDir, options = {}) {
  const {
    dracoCompression = 7,
    generateLOD = true,
    targetVertices = [1000000, 100000, 10000],
  } = options;
  
  const outputs = [];
  const baseName = path.basename(inputPath, '.glb');
  
  // 1. Draco-compressed full quality
  const dracoOutput = path.join(outputDir, `${baseName}_draco.glb`);
  await execPromise(`gltf-pipeline -i ${inputPath} -o ${dracoOutput} -d --draco.compressionLevel ${dracoCompression}`);
  outputs.push({ type: 'glb_draco', path: dracoOutput });
  
  // 2. Generate LODs using gltf-transform
  if (generateLOD) {
    for (let i = 0; i < targetVertices.length; i++) {
      const lodOutput = path.join(outputDir, `${baseName}_lod${i}.glb`);
      await execPromise(`gltf-transform simplify ${inputPath} ${lodOutput} --ratio ${targetVertices[i] / 1000000}`);
      await execPromise(`gltf-pipeline -i ${lodOutput} -o ${lodOutput} -d`);
      outputs.push({ type: `lod_${i}`, path: lodOutput, vertices: targetVertices[i] });
    }
  }
  
  // 3. Thumbnail preview (tiny mesh)
  const previewOutput = path.join(outputDir, `${baseName}_preview.glb`);
  await execPromise(`gltf-transform simplify ${inputPath} ${previewOutput} --ratio 0.001`);
  await execPromise(`gltf-pipeline -i ${previewOutput} -o ${previewOutput} -d`);
  outputs.push({ type: 'glb_preview', path: previewOutput });
  
  return outputs;
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

module.exports = { optimizeGLB };
```

---

## 7. Install py3dtiles (3D Tiles Generation)

For generating Cesium 3D Tiles from meshes and point clouds.

```bash
#!/bin/bash
# install-py3dtiles.sh

pip3 install py3dtiles
pip3 install py3dtiles[las]  # LAS/LAZ support

# Verify
py3dtiles convert --help
```

---

## 8. Worker Application

### Project Structure

```
/opt/slate360-worker/
├── package.json
├── src/
│   ├── index.ts           # Main worker entry
│   ├── queue.ts           # Redis queue consumer
│   ├── processors/
│   │   ├── mesh.ts        # Mesh processing
│   │   ├── photogrammetry.ts
│   │   ├── pointcloud.ts
│   │   └── thumbnail.ts
│   ├── storage.ts         # S3 upload/download
│   └── supabase.ts        # Database updates
├── scripts/
│   ├── colmap-wrapper.py
│   └── openmvs-wrapper.py
└── Dockerfile
```

### Worker Entry Point

```typescript
// src/index.ts
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { processJob } from './processors';
import { updateJobStatus } from './supabase';

const connection = new Redis(process.env.REDIS_URL!);

const worker = new Worker(
  'model-processing',
  async (job: Job) => {
    const { jobId, sourceUrl, sourceFormat, options } = job.data;
    
    console.log(`Processing job ${jobId}`);
    
    try {
      // Update status to processing
      await updateJobStatus(jobId, {
        status: 'processing',
        progress: 0,
        currentStep: 'Starting processing...',
      });
      
      // Process based on type
      const result = await processJob({
        jobId,
        sourceUrl,
        sourceFormat,
        options,
        onProgress: async (progress, step) => {
          await updateJobStatus(jobId, { progress, currentStep: step });
        },
      });
      
      // Mark complete
      await updateJobStatus(jobId, {
        status: 'completed',
        progress: 100,
        currentStep: 'Complete',
        outputs: result.outputs,
        thumbnailUrl: result.thumbnailUrl,
        analysis: result.analysis,
      });
      
      return result;
      
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      
      await updateJobStatus(jobId, {
        status: 'failed',
        error: error.message,
        errorDetails: error.stack,
      });
      
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 jobs simultaneously
    limiter: {
      max: 10,
      duration: 60000, // Max 10 jobs per minute
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

console.log('Worker started, waiting for jobs...');
```

### Environment Variables

```bash
# /opt/slate360-worker/.env

# Redis Queue Connection
REDIS_URL=redis://your-redis-host:6379
# OR for Upstash
UPSTASH_REDIS_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Supabase Connection
SUPABASE_URL=https://hadnfcenpcfaeclczsmm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AWS S3 for file storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=slate360-storage
AWS_REGION=us-east-2

# GPU Worker Authentication Key
# This key must match GPU_WORKER_SECRET_KEY in Vercel environment
GPU_WORKER_SECRET_KEY=your-gpu-worker-secret-key

# Callback URL for progress updates
SLATE360_API_URL=https://slate360.ai
```

### Getting the GPU_WORKER_SECRET_KEY

1. **Generate a secure key:**
   ```bash
   openssl rand -hex 32
   ```

2. **Add to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com) → Your Project → Settings → Environment Variables
   - Add `GPU_WORKER_SECRET_KEY` with the generated value
   - Apply to all environments (Production, Preview, Development)

3. **Add to GPU Worker:**
   - Copy the same key to the worker's `.env` file
   - The key must match exactly for callbacks to authenticate

---

## 9. Systemd Service

```bash
# /etc/systemd/system/slate360-worker.service
[Unit]
Description=Slate360 GPU Worker
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/slate360-worker
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable slate360-worker
sudo systemctl start slate360-worker
sudo systemctl status slate360-worker

# View logs
journalctl -u slate360-worker -f
```

---

## 10. Auto-Scaling with Spot Instances

For cost optimization, use spot instances with auto-scaling:

```bash
# Launch Template for Spot Instances
aws ec2 create-launch-template \
  --launch-template-name slate360-worker-spot \
  --version-description "GPU worker spot template" \
  --launch-template-data '{
    "InstanceType": "g4dn.xlarge",
    "ImageId": "ami-xxxxxxxxx",
    "InstanceMarketOptions": {
      "MarketType": "spot",
      "SpotOptions": {
        "MaxPrice": "0.30",
        "SpotInstanceType": "persistent"
      }
    },
    "UserData": "'"$(base64 -w0 worker-init.sh)"'"
  }'
```

---

## 11. Monitoring & Alerts

### CloudWatch Metrics

```bash
# Install CloudWatch agent
sudo apt install amazon-cloudwatch-agent

# Configure GPU metrics
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
  "metrics": {
    "append_dimensions": {
      "InstanceId": "\${aws:InstanceId}"
    },
    "metrics_collected": {
      "nvidia_smi": {
        "measurement": ["utilization_gpu", "utilization_memory", "memory_total", "memory_used"],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

---

## 12. Cost Estimation

| Component | Monthly Cost (Light) | Monthly Cost (Heavy) |
|-----------|---------------------|---------------------|
| EC2 g4dn.xlarge (8h/day) | ~$125 | ~$380 (24/7) |
| EC2 Spot (50% savings) | ~$62 | ~$190 |
| S3 Storage (100GB) | ~$2.30 | ~$23 (1TB) |
| Redis (Upstash) | $10 | $30 |
| Data Transfer | ~$5 | ~$50 |
| **Total** | **~$105** | **~$300** |

---

## 13. Quick Start Commands

```bash
# 1. Clone worker repo
git clone https://github.com/your-org/slate360-worker.git /opt/slate360-worker
cd /opt/slate360-worker

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Set environment
cp .env.example .env
nano .env  # Add your credentials

# 5. Test manually
npm run dev

# 6. Deploy as service
sudo cp slate360-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable slate360-worker
sudo systemctl start slate360-worker
```

---

## Next Steps

1. **Set up CI/CD** - Auto-deploy worker updates
2. **Add health checks** - `/health` endpoint for load balancer
3. **Implement graceful shutdown** - Complete in-progress jobs before stopping
4. **Add job prioritization** - Pro users get faster processing
5. **Set up cost alerts** - CloudWatch billing alerts
