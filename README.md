# Workshop: Flip, Match, & Secure: Scoped Access for AI-Powered Games

![Workshop Banner Image](workshop/assets/banner.png) <!-- Create a nice banner image later -->

Ever wonder how AI agents can securely use your personal data without getting access to your entire digital life? In this hands-on workshop, we'll build a fun, picture-matching game powered by an AI agent. You'll learn how to use Auth0's Token Vault to grant the agent secure, temporary access to a specific folder in Google Drive, allowing users to play the game with their own photos.

---

## 🚀 Get Started with Codespaces

This workshop is designed to be run in GitHub Codespaces to provide a consistent and easy-to-use environment.

1.  Click the button below to open this repository in a new Codespace.
2.  Be patient, the initial setup can take a few minutes. It's installing all the tools you'll need!

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=aydrian/picture-matching-game-auth0-workshop)

<!-- Don't forget to replace the repo URL above with your actual repo path! -->

---

## ✅ Prerequisites

Before you begin, please ensure you have the following:

#### Required Accounts

- **GitHub Account:** Required to use GitHub Codespaces.
- **Auth0 Account:** A free Auth0 tenant is all you need. If you don't have one, you can [sign up here](https://auth0.com/signup).
- **Google Account:** Any standard `@gmail.com` account will work. This will be used to access Google Drive.

#### Recommended Knowledge

- Basic understanding of JavaScript and React.
- Familiarity with using a command-line terminal.
- A conceptual understanding of what APIs are.

---

## 📖 Workshop Structure

This workshop is broken down into seven modules, located in the `/workshop` directory. Each module builds on the previous one, taking you from setup through a fully working Token Vault integration.

- **[00-Welcome](workshop/00-Welcome.md)** — Introduction and learning objectives
- **[01-Setup and First Run](workshop/01-Setup-and-First-Run.md)** — Spin up Codespace and play the game
- **[02-The Challenge of AI Access](workshop/02-The-Challenge-of-AI-Access.md)** — Understand why Token Vault matters
- **[03-Configuring Token Vault](workshop/03-Configuring-Token-Vault.md)** — Set up Auth0 and Google connection via CLI
- **[04-Connecting Google Drive](workshop/04-Connecting-Google-Drive.md)** — Implement token retrieval in API routes
- **[05-Enabling the Connect Flow](workshop/05-Enabling-the-Connect-Flow.md)** — Enable the UI and test end-to-end
- **[06-Recap and Next Steps](workshop/06-Recap-and-Next-Steps.md)** — Review what you built and explore further
