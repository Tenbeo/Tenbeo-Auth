
npm run build

# Create and use CrossBuilder to be able to build for amd64 and arm64
docker buildx use CrossBuilder || (docker buildx create CrossBuilder && docker buildx use CrossBuilder)

docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile -t tenbeo/tenbeo-auth:latest --push .
