FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app
COPY . .

    # Use node user (already exists in node:20-slim)
    RUN chown -R node:node /app
    USER node

# Volume for persistent data
VOLUME ["/app/.env", "/app/memory.db", "/app/auth"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('fs').statSync('memory.db')" || exit 1

# Run
CMD ["npm", "start"]
