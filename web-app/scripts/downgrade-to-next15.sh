#!/bin/bash
# Script to downgrade to Next.js 15 for stability
# Run this if Next.js 16 continues to have route issues

echo "Downgrading to Next.js 15.5.7 (latest stable 15.x)..."
echo "This will also downgrade React to 18.x (required for Next.js 15)"

npm install next@15.5.7 react@18.3.1 react-dom@18.3.1 eslint-config-next@15.5.7

echo ""
echo "✅ Downgrade complete!"
echo "⚠️  Note: You may need to adjust your code for React 18 compatibility"
echo "⚠️  Some Next.js 16 features may not be available in 15.x"

