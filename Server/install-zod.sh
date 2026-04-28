#!/bin/bash

# Install Zod validation library
npm install zod

# Verify installation
npm list zod

echo "✅ Zod installation complete!"
echo ""
echo "Usage:"
echo "  - Import schemas from src/validations/"
echo "  - Use validateRequest middleware in routes"
echo "  - See INTEGRATION_EXAMPLES.md for patterns"
echo "  - See README.md for documentation"
