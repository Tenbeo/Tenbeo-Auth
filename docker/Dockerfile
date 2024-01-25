FROM debian:12-slim
SHELL ["/bin/bash", "-c"]
WORKDIR /root

# Install Node 20.x - Version is fixed by debian:12-slim
RUN apt update -qy && apt install -qy nodejs npm

# Include directoties
COPY ../dist/ /root/dist/
COPY ../migrations/ /root/migrations/
COPY ../.env.default /root/.env
COPY ../package.json /root/package.json
COPY ../package-lock.json /root/package-lock.json

# Create data directory
RUN mkdir /root/data/

WORKDIR /root/dist

RUN npm i

EXPOSE 80

ENTRYPOINT ["node", "server.js"]
