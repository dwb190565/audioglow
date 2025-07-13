#!/bin/bash

# AudioGlow Deployment Script

echo "🎵 AudioGlow - Building for production..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🚀 Ready for deployment!"
    echo ""
    echo "Deployment options:"
    echo "1. Vercel: vercel --prod"
    echo "2. Netlify: netlify deploy --prod"
    echo "3. Docker: docker build -t audioglow . && docker run -p 3000:3000 audioglow"
    echo "4. Local: npm start"
else
    echo "❌ Build failed!"
    exit 1
fi 