# syntax=docker/dockerfile:1.7
FROM ubuntu:22.04

ARG NODE_MAJOR=20
ARG RUST_TOOLCHAIN=stable

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NODE_OPTIONS=--max-old-space-size=8192 \
    PATH=/root/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# ---- Base OS deps for Tauri (Linux) + build tooling ----
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git xz-utils \
      build-essential pkg-config \
      libssl-dev openssl \
      libgtk-3-dev \
      libwebkit2gtk-4.1-dev \
      libsoup-3.0-dev \
      libappindicator3-dev \
      librsvg2-dev \
      patchelf \
    && rm -rf /var/lib/apt/lists/*

# ---- Node.js ----
RUN --mount=type=cache,target=/var/cache/apt \
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && node -v && npm -v \
    && rm -rf /var/lib/apt/lists/*

# ---- Rust ----
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain ${RUST_TOOLCHAIN} \
    && rustc -V && cargo -V

# cargo config: fewer flakes, faster metadata fetches
RUN mkdir -p /root/.cargo \
  && printf '%s\n' \
    '[net]' \
    'git-fetch-with-cli = true' \
    '' \
    '[registries.crates-io]' \
    'protocol = "sparse"' \
  > /root/.cargo/config.toml

WORKDIR /workspace
CMD ["bash"]
