# ==========================================
# Build Stage: Maven & Java 21
# ==========================================
FROM maven:3.9.9-eclipse-temurin-21-jammy AS build
WORKDIR /app

# Cache Maven dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build production fat JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==========================================
# Runtime Stage: JRE 21 + FFmpeg
# ==========================================
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

# Install FFmpeg, Fontconfig & fonts (required for PDFBox font rendering) and curl for healthchecks
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        fontconfig \
        fonts-dejavu-core \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and temp conversion workspace
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1001 appuser && \
    mkdir -p /tmp/flexconvert && \
    chown -R appuser:appgroup /tmp/flexconvert

# Copy compiled JAR from build stage
COPY --from=build --chown=appuser:appgroup /app/target/*.jar /app/app.jar

# Production runtime configuration
# Memory limits optimized for 512MB RAM free-tier cloud containers (Render/Koyeb)
ENV PORT=8080 \
    JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -Xmx384m -Xss512k -XX:MaxRAMPercentage=75" \
    APP_FFMPEG_PATH=/usr/bin/ffmpeg \
    APP_CONVERSION_TEMP_DIR=/tmp/flexconvert

EXPOSE 8080

USER appuser

# Container liveness check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_TOOL_OPTIONS -Dserver.port=${PORT} -jar /app/app.jar"]
