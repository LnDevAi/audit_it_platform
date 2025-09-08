FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Environment and base packages
ENV NODE_ENV=production
RUN apk add --no-cache curl

# Install dependencies (skip prepare script to avoid husky issues)
RUN npm ci --omit=dev --ignore-scripts

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node /app

# Run as non-root user
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
