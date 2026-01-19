# Cyber API

![Rust](https://img.shields.io/badge/Rust-stable-orange?logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-2.x-blue?logo=tauri)
![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)
![License](https://img.shields.io/github/license/GerrSwin/CyberAPI)

<p align="center">
    <img src="./cyberapi.png" alt="cyberapi" width="128">
</p>

<h3 align="center">
<a href="https://github.com/vicanso/cyberapi">CyberAPI</a> is a cross-platform API client built with <a href="https://github.com/tauri-apps/tauri">tauri</a>.
</h3>

> English | [简体中文](./README_zh.md) | [Українська](./README_uk.md)

This repository continues and improves on the original project at https://github.com/vicanso/cyberapi.

## TL;DR

A **simple, lightweight, cross-platform API client** for developers who want full control over their data.

- **Windows · Linux · macOS**
- No accounts, no logins, no subscriptions
- No heavy memory usage or feature bloat
- A single source of truth — preferably **your own**
- Free and **open-source**

📘 **Docs:**

- [Usage](USAGE.md)
<!-- Use [project wiki](../../wiki) for usage and additional documentation. -->

## Usage

- Create and configure HTTP requests (method, URL, headers, body)
- Send requests and inspect responses
- Organize requests into collections
- Keep your data stored locally or in your own storage backend

---

## Why this project exists

I wanted a **simple, lightweight tool** on every machine I work on — **Windows, Linux, and macOS** — focused on one clear purpose:

> working with HTTP requests in a calm, predictable, and fully controlled way.

I didn’t want to constantly **import and export collections** just to move between machines. I wanted **one place for my data**, ideally owned by me, not locked behind another service.

Equally important was what I wanted to avoid.

No applications consuming **hundreds of megabytes of memory**.  
No mandatory **accounts or registrations**.  
No “Swiss-army knife” trying to replace my IDE, browser, and operating system — when most of that functionality goes unused.

## How it started

While exploring alternatives, I discovered **Tauri** and a repository that already captured the core idea I was looking for:  
a **native, cross-platform application** with minimal overhead.

That repository is no longer maintained, but the idea was worth continuing.

I use it as a **foundation** — modernizing it, improving it, and evolving it carefully,  
without losing its original simplicity.

## Principles

This project follows a few simple principles:

- **Always free and open-source**
- Your data belongs **to you**
- No forced accounts or external services
- Simplicity and performance over feature lists

## Invitation

This project is not about building the biggest API tool.

It’s about building a **deliberately small and reliable tool**.

If this project resonates with you, feel free to explore the code,
open an issue, or contribute.

The goal is to keep it simple, lightweight, and focused.  
See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Features

- Supports macOS, Windows, and Linux; installers are under 10MB
- A single project with thousands of endpoints opens in seconds with low memory usage
- Supports Dark/Light themes and Chinese/English
- Simple, easy-to-use operations and configuration
- Quickly import configurations from Postman, Insomnia, or Swagger
- Keyword filtering supports Chinese pinyin or initials
- Export configurations by endpoint, by feature, or by project for team sharing
- Various custom functions for linking data between requests

<p align="center">
    <img src="./asset/cyberapi.png" alt="cyberapi">
</p>

CyberAPI is currently only a development version, a personal project in spare time. If you find bugs or want new features, please open an issue. For bugs, include system version information; I will try to handle them when I can.

## Installation

The installer can be downloaded from [release](https://github.com/vicanso/cyberapi/releases), including Windows, macOS, and Linux versions.

Note: If you are on Windows 7 or on Windows without Edge installed, the installer will prompt you to run MicrosoftEdgeUpdateSetup. If your antivirus prompts you, allow it.
If you are on macOS, due to system security adjustments, opening the app may show "CyberAPI can't be opened because Apple cannot check it for malicious software." In "System Settings" -> "Security & Privacy" -> "General", choose "Open Anyway". Or run: `sudo xattr -rd com.apple.quarantine /Applications/CyberAPI.app`

## Development

The project depends on Rust and Nodejs. If you want to build it yourself or participate in development, first install tauri dependencies by referring to [this guide](https://tauri.app/v1/guides/getting-started/prerequisites), then run:

Install tauri-cli (optional):

```shell
cargo install tauri-cli
```

To run as an app:

```shell
npm run tauri dev
```

To build the installer:

```shell
npm run tauri build
```