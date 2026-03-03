# Slate360 Credit System Pricing Analysis
## Comprehensive Cost & Margin Analysis for Subscription Tiers

**Date:** December 27, 2025  
**Objective:** Maintain 95% margin on subscriptions, pass-through costs on data/compute

---

## 1. CURRENT SUBSCRIPTION TIERS (from pricing.ts)

| Tier | Monthly Price | Annual (per mo) | Features |
|------|--------------|-----------------|----------|
| **Trial** | Free (14 days) | Free | All features, limited data |
| **Creator** | $79/mo | $63/mo | Content Studio, 360 Tour Builder |
| **Model** | $199/mo | $159/mo | + Design Studio, Geospatial |
| **Business** | $499/mo | $399/mo | All features, full access |
| **Enterprise** | Custom | Custom | Volume licensing, SSO, white-label |

---

## 2. REAL-WORLD COST ANALYSIS

### A. GPU Processing Costs (Industry Benchmarks)

| Service | Cost Basis | Your Cost |
|---------|-----------|-----------|
| **AWS EC2 g4dn.xlarge** | $0.526/hr (NVIDIA T4 GPU) | ~$0.01/minute |
| **AWS EC2 g5.xlarge** | $1.006/hr (NVIDIA A10G GPU) | ~$0.017/minute |
| **Google Cloud A100** | $2.87/hr | ~$0.048/minute |
| **Lambda Labs A100** | $1.10/hr | ~$0.018/minute |
| **RunPod A100** | $0.79/hr | ~$0.013/minute |

**Recommended Stack:** RunPod/Lambda for GPU-intensive (Gaussian Splat, NeRF)  
**Average GPU Cost:** ~$0.015/minute = $0.90/hour

### B. Storage Costs

| Provider | Cost/GB/month |
|----------|---------------|
| **AWS S3 Standard** | $0.023/GB |
| **Supabase Storage** | $0.021/GB |
| **Cloudflare R2** | $0.015/GB (no egress) |
| **Backblaze B2** | $0.006/GB + egress |

**Recommended:** Cloudflare R2 for hot storage, B2 for archives  
**Average Storage Cost:** ~$0.015/GB/month

### C. Processing Job Cost Estimates

| Job Type | GPU Minutes | Cost to You | Suggested Credits |
|----------|-------------|-------------|-------------------|
| **Gaussian Splat (200 photos)** | 8-12 min | $0.12-0.18 | 150-200 |
| **Gaussian Splat (500 photos)** | 20-30 min | $0.30-0.45 | 350-450 |
| **Gaussian Splat (1000 photos)** | 45-60 min | $0.68-0.90 | 800-1000 |
| **NeRF Training (200 photos)** | 15-20 min | $0.23-0.30 | 250-350 |
| **Mesh Export (GLB)** | 1-2 min | $0.015-0.03 | 20-40 |
| **Video Render (1 min 1080p)** | 3-5 min | $0.045-0.075 | 50-80 |
| **Video Render (1 min 4K)** | 8-12 min | $0.12-0.18 | 100-150 |
| **Orthomosaic (500 images)** | 30-45 min | $0.45-0.68 | 500-700 |
| **Point Cloud Processing** | 10-20 min | $0.15-0.30 | 150-250 |

---

## 3. CREDIT VALUE CALCULATION

### Setting the Credit Value

**Goal:** 1 credit should cost you ~$0.001 in actual compute/storage.

| Credit Value | Your Cost | User Sees | Margin on Credits |
|--------------|-----------|-----------|-------------------|
| 1 credit | $0.001 | Included in sub | 95% (on sub) |
| 1 credit purchased | $0.001 | $0.04-0.05 | 96-98% |

**1 GPU minute ≈ 15 credits** (at $0.015/minute ÷ $0.001/credit)

---

## 4. CREDIT ALLOCATION BY TIER (95% Margin Target)

### Calculation Formula

```
Available for Compute = Subscription Price × 5% (your cost budget)
Credits Included = Available for Compute ÷ $0.001 per credit
```

### Tier Breakdown

| Tier | Monthly Price | 5% Budget | Credits Included | Credits Value |
|------|--------------|-----------|------------------|---------------|
| **Trial** | $0 | $0 | 50 | $0.05 (loss leader) |
| **Creator** | $79 | $3.95 | 3,950 | $3.95 |
| **Model** | $199 | $9.95 | 9,950 | $9.95 |
| **Business** | $499 | $24.95 | 24,950 | $24.95 |
| **Enterprise** | Custom | Custom | 100,000+ | Negotiated |

### What Users Can Do With Their Credits

| Tier | Credits | Equivalent Processing |
|------|---------|----------------------|
| **Trial (50)** | 50 | ~3 small scans OR 10 min video render |
| **Creator (3,950)** | 3,950 | ~20 medium scans OR 6 hrs video render |
| **Model (9,950)** | 9,950 | ~50 medium scans OR 16 hrs video render |
| **Business (24,950)** | 24,950 | ~125 medium scans OR 40 hrs video render |

---

## 5. RECOMMENDED CREDIT COST TABLE

### A. Processing Jobs

| Job Type | Credits | Your Cost | User Value |
|----------|---------|-----------|------------|
| **Gaussian Splat (0-200 photos)** | 150-200 | $0.15-0.20 | - |
| **Gaussian Splat (200-500 photos)** | 300-450 | $0.30-0.45 | - |
| **Gaussian Splat (500-1000 photos)** | 600-900 | $0.60-0.90 | - |
| **Gaussian Splat (1000+ photos)** | 1,000-2,000 | $1.00-2.00 | - |
| **NeRF Enhancement (+40%)** | +40% of base | - | - |
| **Glass/Reflective Mode (+20%)** | +20% of base | - | - |

### B. Exports

| Export Type | Credits | Your Cost |
|-------------|---------|-----------|
| GLB (visual) | 30 | $0.03 |
| OBJ (textured) | 50 | $0.05 |
| LAS/E57 (heavy) | 100 | $0.10 |
| FBX | 40 | $0.04 |
| USDZ (AR) | 60 | $0.06 |
| PLY (point cloud) | 25 | $0.025 |

### C. Video/Animation

| Video Type | Credits | Your Cost |
|------------|---------|-----------|
| 30s flythrough (1080p) | 80 | $0.08 |
| 30s flythrough (4K) | 150 | $0.15 |
| Timelapse (30s) | 50 | $0.05 |
| Screen recording | 0 | $0 (client-side) |
| Virtual tour export | 100 | $0.10 |

### D. Analysis

| Analysis Type | Credits | Your Cost |
|---------------|---------|-----------|
| Flatness analysis | 75 | $0.075 |
| Thermal overlay | 40 | $0.04 |
| AI defect detection | 150 | $0.15 |
| Measurement batch | 25 | $0.025 |
| Comparison report | 60 | $0.06 |
| PDF report export | 10 | $0.01 |

### E. Storage (Monthly)

| Storage | Credits/Month | Your Cost |
|---------|---------------|-----------|
| Per GB | 2 | $0.002 (~$0.015 at cost + margin) |

---

## 6. CREDIT PURCHASE PACKAGES (Pass-Through + Margin)

### Pricing Strategy
**Markup:** 40-50x cost (you pay $0.001/credit, user pays $0.04-0.05/credit)

| Package | Credits | Price | Per Credit | Your Cost | Your Margin |
|---------|---------|-------|------------|-----------|-------------|
| **Starter** | 500 | $20 | $0.040 | $0.50 | 97.5% |
| **Standard** | 1,500 | $50 | $0.033 | $1.50 | 97.0% |
| **Pro** | 4,000 | $120 | $0.030 | $4.00 | 96.7% |
| **Business** | 10,000 | $250 | $0.025 | $10.00 | 96.0% |
| **Enterprise** | 50,000 | $1,000 | $0.020 | $50.00 | 95.0% |

---

## 7. GUARDRAIL LIMITS BY TIER

| Tier | Max Credits/Job | Max Credits/Month | Rollover |
|------|-----------------|-------------------|----------|
| **Trial** | 100 | 100 | 0 months |
| **Creator** | 1,000 | 6,000 | 1 month |
| **Model** | 2,500 | 15,000 | 1 month |
| **Business** | 6,000 | 40,000 | 2 months |
| **Enterprise** | 15,000 | 150,000 | 3 months |

---

## 8. STORAGE ALLOCATION BY TIER

| Tier | Included Storage | Overage (per GB/mo) |
|------|-----------------|---------------------|
| **Trial** | 1 GB | N/A (locked) |
| **Creator** | 25 GB | 2 credits |
| **Model** | 100 GB | 2 credits |
| **Business** | 500 GB | 1.5 credits |
| **Enterprise** | Unlimited | Custom |

---

## 9. UPDATED SUBSCRIPTION_TIERS CONSTANT

```typescript
export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    monthlyPrice: 0,
    includedCredits: 50,          // Loss leader - enough for 2-3 test scans
    storageGb: 1,
    maxJobCredits: 100,
    maxMonthlyCredits: 100,
    rolloverMonths: 0,
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    monthlyPrice: 79,
    includedCredits: 4000,         // ~$4 cost = 5.1% of $79
    storageGb: 25,
    maxJobCredits: 1000,
    maxMonthlyCredits: 6000,
    rolloverMonths: 1,
  },
  model: {
    id: 'model',
    name: 'Model',
    monthlyPrice: 199,
    includedCredits: 10000,        // ~$10 cost = 5.0% of $199
    storageGb: 100,
    maxJobCredits: 2500,
    maxMonthlyCredits: 15000,
    rolloverMonths: 1,
  },
  business: {
    id: 'business',
    name: 'Business',
    monthlyPrice: 499,
    includedCredits: 25000,        // ~$25 cost = 5.0% of $499
    storageGb: 500,
    maxJobCredits: 6000,
    maxMonthlyCredits: 40000,
    rolloverMonths: 2,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,               // Custom pricing
    includedCredits: 100000,       // Starting point for negotiation
    storageGb: 2000,
    maxJobCredits: 15000,
    maxMonthlyCredits: 150000,
    rolloverMonths: 3,
  },
};
```

---

## 10. SUMMARY: YOUR MARGINS

### Subscription Revenue Analysis

| Tier | Revenue | Credits Cost | Storage Cost (max) | Total Cost | Margin |
|------|---------|--------------|-------------------|------------|--------|
| **Creator** | $79/mo | $4.00 | $0.38 (25GB) | $4.38 | **94.5%** |
| **Model** | $199/mo | $10.00 | $1.50 (100GB) | $11.50 | **94.2%** |
| **Business** | $499/mo | $25.00 | $7.50 (500GB) | $32.50 | **93.5%** |

### Credit Purchase Revenue (Pure Profit)

| Package | Revenue | Cost | Margin |
|---------|---------|------|--------|
| **Starter** | $20 | $0.50 | **97.5%** |
| **Pro** | $120 | $4.00 | **96.7%** |
| **Enterprise** | $1,000 | $50.00 | **95.0%** |

---

## 11. COMPETITIVE COMPARISON

| Platform | Similar Tier | Price | Processing Included |
|----------|-------------|-------|---------------------|
| **DroneDeploy** | Business | $329/mo | 200 maps/year |
| **Pix4D Cloud** | Pro | $350/mo | Unlimited desktop, 20 cloud |
| **Propeller** | Pro | $499/mo | 100 surveys/year |
| **Slate360 Model** | Model | $199/mo | ~50 medium scans/month |
| **Slate360 Business** | Business | $499/mo | ~125 medium scans/month |

**Slate360 Advantage:** Transparent credit system lets users see exactly what they're paying for, unlike competitors with vague "map" or "survey" limits.

---

## 12. RECOMMENDATIONS

1. **Keep credit purchase markup at 96-97%** - This is competitive and profitable
2. **Included credits at 5% of subscription** - Maintains your 95% margin target
3. **Rollover credits** - 1-2 months rollover encourages commitment but prevents abuse
4. **Storage is cheap** - Include generous storage, charge for egress/exports
5. **Client-side processing = Free** - 360 tour rendering, screen recording = 0 credits
6. **Heavy GPU jobs** - Gaussian Splat, NeRF, Video Render = credit consumers

---

*This analysis assumes RunPod/Lambda pricing for GPU and Cloudflare R2 for storage. Actual costs may vary ±20% based on usage patterns and negotiated rates.*
