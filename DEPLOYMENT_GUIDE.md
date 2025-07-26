## Vercel Deployment Checklist for QR Image Issue

### Common Issues and Solutions:

#### 1. **Check File Case Sensitivity**
Vercel is case-sensitive. Ensure the file is exactly named `qr.png` (lowercase).

#### 2. **Verify Static Assets in Build**
After deployment, check if the image is accessible directly:
- `https://yourdomain.vercel.app/images/qr.png`

#### 3. **Environment Variables**
Make sure these are set in Vercel dashboard:
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `NEXT_PUBLIC_APP_URL` (if needed)

#### 4. **Vercel Configuration**
Create `vercel.json` in root if needed:

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "images": {
    "domains": ["localhost"],
    "formats": ["image/webp", "image/avif"]
  }
}
```

#### 5. **Image Optimization Settings**
The widget now includes:
- Error handling with fallback UI
- `unoptimized` flag for deployment compatibility
- Console warning for debugging

#### 6. **Debug Steps**
1. Open browser DevTools on deployed site
2. Check Console for "QR image failed to load" message
3. Check Network tab for 404 errors on `/images/qr.png`
4. Verify the image URL in browser: `yourdomain.vercel.app/images/qr.png`

#### 7. **Alternative Solutions**
If image still doesn't load, consider:
- Moving image to a CDN
- Converting to base64 inline image
- Using a different image format (JPG instead of PNG)

### Testing Locally
Run `npm run start` (production build) to test locally before deploying.
