
npm run build

cd docker

# Create and use CrossBuilder to be able to build for amd64 and arm64
docker buildx use CrossBuilder || (docker buildx create CrossBuilder && docker buildx use CrossBuilder)

# Build for 64 bits - Classic and Apple Silicon
docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile -t tenbeo/tenbeo-auth:latest --push ..
