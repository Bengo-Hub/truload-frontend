# Login and branding images

Used by the login layout (see `frontend-figma-design/Login.tsx`). Add these files under `public/images/`:

| File | Purpose |
|------|--------|
| `login-background-image.png` | **Default** right-panel background (truck/weighing scene). Used when org has no custom image. |
| `logos/kura-logo.png` | Tenant/org logo — **transparent PNG** for bottom-right overlay (`bg-white/30`, `rounded-2xl`). Fallback: `/kuraweigh-logo.svg`. |
| `logos/kuraweigh-logo.png` | Platform logo on the form (left). Fallback: `/kuraweigh-logo.svg`. |

Root: `public/kuraweigh-logo.svg` is used when the logos above are not present.
