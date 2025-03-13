#!/bin/bash

# Create .scripts directory if it doesn't exist
mkdir -p .scripts

# Generate project structure
echo "Generating project structure..."
find . -type f -not -path "*/node_modules/*" -not -path "*/\.*" | sort > .scripts/project_structure.txt

# Generate component documentation
echo "Generating component documentation..."
find ./src/components -type f -name "*.tsx" | sort > .scripts/components_list.txt

echo "Project documentation updated successfully!" 